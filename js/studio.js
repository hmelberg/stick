/* stick — studio: AI create panel (login-gated), JSON upload, and
   JSON / WebM downloads. Uses window.StickApp (player) + window.StickAuth. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const App = () => window.StickApp;
  const Auth = () => window.StickAuth;

  /* ---------------- login gating ---------------- */
  function updateGate() {
    const access = Auth().hasAccess(); // signed in, or brought their own API key
    $('createPanel').classList.toggle('hidden', !access);
    $('createHint').classList.toggle('hidden', access);
  }

  /* ---------------- create (text -> Claude -> animation) ---------------- */
  function setStatus(msg, isError) {
    const el = $('createStatus');
    el.textContent = msg || '';
    el.classList.toggle('err', !!isError);
  }

  function extractJson(text) {
    let s = text.trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('no JSON object in the reply');
    return s.slice(a, b + 1);
  }

  /* Salvage a truncated reply: scan to the last position where a nested element
     (object/array) closed cleanly, cut there, and append the brackets needed to
     close everything still open. Figures/scene come before the timeline, so this
     typically yields a valid doc with all complete figures + the first N events.
     The engine tolerates the rest. Returns a parseable string or null. */
  function repairTruncatedJson(s) {
    const stack = [];
    let inStr = false, esc = false, safeCut = -1, safeStack = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') stack.push(c);
      else if (c === '}' || c === ']') {
        stack.pop();
        if (stack.length > 0) { safeCut = i + 1; safeStack = stack.slice(); } // closed a nested element while still inside the doc
      }
    }
    if (safeCut < 0 || !safeStack) return null;
    let out = s.slice(0, safeCut).replace(/[\s,]+$/, '');
    for (let i = safeStack.length - 1; i >= 0; i--) out += safeStack[i] === '{' ? '}' : ']';
    return out;
  }

  // Parse the reply; if it won't parse (e.g. cut off), try to salvage a partial.
  // Returns { doc, partial } or null.
  function docFromReply(acc) {
    let jsonText = null;
    try { jsonText = extractJson(acc); } catch (e) { /* no object at all */ }
    if (jsonText) { try { return { doc: JSON.parse(jsonText), partial: false }; } catch (e) { /* fall through */ } }
    const start = acc.indexOf('{');
    if (start >= 0) {
      const repaired = repairTruncatedJson(acc.slice(start));
      if (repaired) { try { return { doc: JSON.parse(repaired), partial: true }; } catch (e) { /* give up */ } }
    }
    return null;
  }

  function nameFrom(text) {
    const words = text.trim().split(/\s+/).slice(0, 5).join(' ');
    return (words.length > 36 ? words.slice(0, 36) + '…' : words) || 'created scene';
  }

  const plural = n => n + ' warning' + (n === 1 ? '' : 's');

  function compileWarnings(doc) {
    try { return window.STICK.compile(doc).warnings || []; }
    catch (e) { return null; } // compile itself failed: treat as unusable
  }

  // One request to the edge function; resolves { acc, failed } (the accumulated
  // reply text, and a message if the server reported a cut-off/error) or throws
  // an Error whose .message is ready to show the user.
  async function callApi(payload, onText) {
    // Own key wins: the request is billed to the user's key, no sign-in needed.
    const ownKey = Auth().apiKey;
    const headers = { 'Content-Type': 'application/json' };
    if (ownKey) headers['X-Anthropic-Key'] = ownKey;
    if (Auth().token) headers['Authorization'] = 'Bearer ' + Auth().token;
    const resp = await fetch('/api/create-animation', { method: 'POST', headers, body: JSON.stringify(payload) });
    if (resp.status === 401) {
      throw new Error(ownKey
        ? 'Your API key was rejected — check it, or remove it (header button) and sign in.'
        : 'Sign-in expired or code not accepted — sign in again.');
    }
    if (resp.status === 429) {
      const retry = parseInt(resp.headers.get('Retry-After') || '0', 10);
      throw new Error('Rate limited — try again in ~' + Math.max(1, Math.ceil(retry / 60)) + ' min.');
    }
    if (resp.status === 413) throw new Error('This scene is too large to send to the model.');
    if (!resp.ok || !resp.body) throw new Error('Server error: ' + ((await resp.text()) || resp.status));

    // accumulate the SSE text stream
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '', acc = '', failed = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const ev = buf.slice(0, i); buf = buf.slice(i + 2);
        const line = ev.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        let obj;
        try { obj = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (obj.type === 'text') {
          acc += obj.text;
          if (onText) onText(acc.length);
        } else if (obj.type === 'error') {
          failed = obj.message || 'generation failed';
        }
      }
    }
    return { acc, failed };
  }

  // Ask for a document ({description[, current]}), then run at most ONE automatic
  // repair pass if it compiles with warnings. The repair is best-effort: any
  // failure keeps the original. Returns { doc, partial, failed, before, after }.
  async function generate(payload, verb) {
    const first = await callApi(payload, n => setStatus(verb + '… ' + n + ' chars'));
    // If the reply was cut off at the length limit, docFromReply salvages whatever
    // completed so the partial scene still plays (failed is set on a max_tokens stop).
    const built = docFromReply(first.acc);
    if (!built) throw new Error(first.failed || 'could not read the generated scene');
    let { doc } = built;
    const partial = built.partial || !!first.failed;
    const before = compileWarnings(doc);
    const res = { doc, partial, failed: first.failed, before: before ? before.length : 0, after: before ? before.length : 0 };
    if (partial || !before || !before.length) return res;

    setStatus('Fixing ' + plural(before.length) + '…');
    try {
      const rep = await callApi({ current: JSON.stringify(doc), warnings: before },
        n => setStatus('Fixing ' + plural(before.length) + '… ' + n + ' chars'));
      const rb = docFromReply(rep.acc);
      if (rb && !rb.partial && !rep.failed) {
        const w = compileWarnings(rb.doc);
        if (w && w.length < before.length) {
          res.doc = rb.doc;
          res.after = w.length;
        }
      }
    } catch (e) { /* keep the original */ }
    return res;
  }

  // mode: 'create' (fresh scene from the text) or 'refine' (revise the loaded one).
  async function runCreate(mode) {
    mode = mode === 'refine' ? 'refine' : 'create';
    const text = ($('createText').value || '').trim();
    if (!text) { setStatus(mode === 'refine' ? 'Say what to change first.' : 'Describe the scene first.', true); return; }
    if (!Auth().hasAccess()) { setStatus('Sign in or add your API key first.', true); return; }

    const payload = { description: text };
    let target = null; // my-animation name to overwrite on refine
    if (mode === 'refine') {
      let cur;
      try { cur = JSON.parse($('ed').value); }
      catch (e) { setStatus('Fix the JSON in the editor first — it does not parse.', true); return; }
      payload.current = JSON.stringify(cur);
      if (payload.current.length > 60000) { setStatus('This scene is too large to refine (limit 60000 characters).', true); return; }
      const sel = $('selExample').value || '';
      if (sel.startsWith('my:') && App().getMyAnims()[sel.slice(3)]) target = sel.slice(3);
    }

    const btns = [$('btnCreate'), $('btnRefine')];
    btns.forEach(b => { b.disabled = true; });
    setStatus('Asking Claude…');
    try {
      const r = await generate(payload, mode === 'refine' ? 'Revising the scene' : 'Writing the scene');
      let name;
      if (target) { App().deleteMyAnim(target); name = App().saveMyAnim(target, r.doc); }
      else name = App().saveMyAnim(mode === 'refine' ? App().currentName() + ' (edited)' : nameFrom(text), r.doc);
      App().refreshDropdown('my:' + name);
      App().setEditor(JSON.stringify(r.doc, null, 2));
      App().render();
      const warnings = App().state.rt ? App().state.rt.warnings.length : r.after;
      const warnNote = warnings ? ' (' + plural(warnings) + ')' : '';
      const verbDone = mode === 'refine' ? 'revised' : 'created';
      if (r.partial) {
        setStatus('⚠ cut off at the length limit — playing the partial scene' + warnNote, true);
      } else if (r.after < r.before) {
        const fixed = r.before - r.after;
        setStatus('✓ ' + verbDone + ' (fixed ' + plural(fixed) + ')' + (warnings ? ' — ' + plural(warnings) + ' left, see panel' : ''));
      } else {
        setStatus(warnings ? '✓ ' + verbDone + warnNote + ' — see panel' : '✓ ' + verbDone);
      }
    } catch (e) {
      setStatus(/^(Your API|Sign-in|Rate|Server|This scene)/.test(e.message) ? e.message : 'Error: ' + e.message, true);
    } finally {
      btns.forEach(b => { b.disabled = false; });
    }
  }

  /* ---------------- upload ---------------- */
  function onUpload(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const doc = JSON.parse(String(reader.result));
        const base = file.name.replace(/\.json$/i, '') || 'uploaded';
        const name = App().saveMyAnim(base, doc);
        App().refreshDropdown('my:' + name);
        App().setEditor(JSON.stringify(doc, null, 2));
        App().render();
      } catch (e) {
        alert('Not a valid JSON file: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- downloads ---------------- */
  function slug(name) {
    return (name || 'animation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'animation';
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function downloadJson() {
    const text = $('ed').value;
    downloadBlob(new Blob([text], { type: 'application/json' }), slug(App().currentName()) + '.json');
  }

  // Build an .srt subtitle track from the say lines + captions (for the WebM).
  function srtTime(s) {
    const ms = Math.round(Math.max(0, s) * 1000), p = (n, w) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor(ms / 60000) % 60, 2)}:${p(Math.floor(ms / 1000) % 60, 2)},${p(ms % 1000, 3)}`;
  }
  function buildSrt(rt) {
    const subs = (rt.overlays || []).filter(o => (o.type === 'say' || o.type === 'caption') && o.text).slice().sort((a, b) => a.t0 - b.t0);
    return subs.map((o, i) => `${i + 1}\n${srtTime(o.t0)} --> ${srtTime(o.t1)}\n${o.text}`).join('\n\n') + '\n';
  }

  /* WebM export: replays the animation in real time, painting each frame of
     the live SVG onto a canvas captured by MediaRecorder. Export therefore
     takes as long as the animation lasts. */
  let exporting = false;
  async function exportWebM() {
    const app = App();
    if (exporting || !app.state.rt) return;
    exporting = true;
    const btn = $('btnWebm');
    btn.disabled = true;
    const wasPlaying = app.state.playing;
    app.setPlaying(false);

    // Optional audio: speechSynthesis can't be routed into a MediaStream, so the
    // only way to record it is to capture the tab's own audio via getDisplayMedia.
    // Gated on the sound checkbox. Must run inside the click gesture (no await before it).
    let audioStream = null;
    if (app.state.sound && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      alert('To include the spoken audio, pick "This Tab" in the next dialog and turn ON "Share tab audio".');
      try {
        audioStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        audioStream.getVideoTracks().forEach(t => t.stop()); // keep only the audio
        if (!audioStream.getAudioTracks().length) {
          audioStream.getTracks().forEach(t => t.stop());
          audioStream = null;
          alert('No tab audio was shared, so the video will be silent. (Enable "Share tab audio" next time.)');
        }
      } catch (e) { audioStream = null; }
    }

    const dur = app.state.rt.duration;
    const SIZE = 1080; // long side
    const asp = (app.state.rt.view && app.state.rt.view.aspect) || 1;
    const even = n => Math.max(2, 2 * Math.round(n / 2)); // video codecs want even dimensions
    const CW = asp >= 1 ? SIZE : even(SIZE * asp), CH = asp >= 1 ? even(SIZE / asp) : SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d');
    const paper = app.state.rt.scene.bg;

    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
    if (!mime) {
      alert('This browser cannot record WebM (MediaRecorder missing). Try Chrome or Edge.');
      btn.disabled = false; exporting = false;
      return;
    }

    const stream = canvas.captureStream(30);
    const recStream = new MediaStream(
      stream.getVideoTracks().concat(audioStream ? audioStream.getAudioTracks() : []));
    const rec = new MediaRecorder(recStream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });

    const svg = $('stage');
    const drawFrame = async (t, fireSpeech) => {
      app.drawAt(t);
      if (fireSpeech && audioStream) app.speakFrame(); // speak lines as the playhead crosses them
      let xml = new XMLSerializer().serializeToString(svg);
      xml = xml.split('var(--paper, #f7f2e9)').join(paper);
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      try { await img.decode(); } catch (e) { return; }
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, CW, CH);
      ctx.drawImage(img, 0, 0, CW, CH);
    };

    await drawFrame(0, false); // prime the canvas without speaking
    if (audioStream) app.resetSpeech(); // fire say-lines from t=0 during the recording
    rec.start(250);
    const t0 = performance.now();
    let busy = false;
    await new Promise(resolve => {
      const step = async now => {
        const t = (now - t0) / 1000;
        if (t >= dur) { resolve(); return; }
        if (!busy) {
          busy = true;
          btn.textContent = 'recording ' + t.toFixed(0) + '/' + dur.toFixed(0) + 's';
          await drawFrame(t, true);
          busy = false;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    rec.stop();
    await stopped;
    if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); app.resetSpeech(); }

    downloadBlob(new Blob(chunks, { type: 'video/webm' }), slug(App().currentName()) + '.webm');
    // sidecar subtitles from the dialogue/captions, for an accessible video
    const srt = App().state.rt && buildSrt(App().state.rt);
    if (srt && srt.trim().length > 1) downloadBlob(new Blob([srt], { type: 'text/plain' }), slug(App().currentName()) + '.srt');
    btn.textContent = '⬇ WebM';
    btn.disabled = false;
    exporting = false;
    app.setPlaying(wasPlaying);
  }

  /* ---------------- boot ---------------- */
  window.addEventListener('DOMContentLoaded', () => {
    $('btnCreate').addEventListener('click', () => runCreate('create'));
    $('btnRefine').addEventListener('click', () => runCreate('refine'));
    $('createText').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCreate('create'); }
    });
    $('btnUpload').addEventListener('click', () => $('fileUpload').click());
    $('fileUpload').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
      e.target.value = '';
    });
    $('btnJsonDl').addEventListener('click', downloadJson);
    $('btnWebm').addEventListener('click', exportWebM);
    $('lnkHint').addEventListener('click', e => { e.preventDefault(); $('btnLogin').click(); });
    $('lnkHintKey').addEventListener('click', e => { e.preventDefault(); Auth().showKeyEntry(); });

    window.StickAuth.onChange(updateGate);
    updateGate();
  });
})();
