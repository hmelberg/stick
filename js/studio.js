/* stick — studio: AI create panel (login-gated), JSON upload, and
   JSON / WebM downloads. Uses window.StickApp (player) + window.StickAuth. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const App = () => window.StickApp;
  const Auth = () => window.StickAuth;

  /* ---------------- login gating ---------------- */
  function updateGate() {
    const logged = Auth().isLoggedIn();
    $('createPanel').classList.toggle('hidden', !logged);
    $('createHint').classList.toggle('hidden', logged);
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

  async function runCreate() {
    const text = ($('createText').value || '').trim();
    if (!text) { setStatus('Describe the scene first.', true); return; }
    if (!Auth().isLoggedIn()) { setStatus('Sign in first.', true); return; }
    const btn = $('btnCreate');
    btn.disabled = true;
    setStatus('Asking Claude…');
    try {
      const resp = await fetch('/api/create-animation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + Auth().token,
        },
        body: JSON.stringify({ description: text }),
      });
      if (resp.status === 401) {
        setStatus('Sign-in expired or code not accepted — sign in again.', true);
        return;
      }
      if (resp.status === 429) {
        const retry = parseInt(resp.headers.get('Retry-After') || '0', 10);
        setStatus('Rate limited — try again in ~' + Math.max(1, Math.ceil(retry / 60)) + ' min.', true);
        return;
      }
      if (!resp.ok || !resp.body) {
        setStatus('Server error: ' + ((await resp.text()) || resp.status), true);
        return;
      }

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
            setStatus('Writing the scene… ' + acc.length + ' chars');
          } else if (obj.type === 'error') {
            failed = obj.message || 'generation failed';
          }
        }
      }
      // Build the document. If the reply was cut off at the length limit, salvage
      // whatever completed so the partial scene still plays (failed is set when
      // the server saw a max_tokens stop).
      const built = docFromReply(acc);
      if (!built) { setStatus('Error: ' + (failed || 'could not read the generated scene'), true); return; }
      const { doc, partial } = built;

      const name = App().saveMyAnim(nameFrom(text), doc);
      App().refreshDropdown('my:' + name);
      App().setEditor(JSON.stringify(doc, null, 2));
      App().render();
      const warnings = App().state.rt ? App().state.rt.warnings.length : 0;
      const warnNote = warnings ? ' (' + warnings + ' warning' + (warnings > 1 ? 's' : '') + ')' : '';
      if (partial || failed) {
        setStatus('⚠ cut off at the length limit — playing the partial scene' + warnNote, true);
      } else {
        setStatus(warnings ? '✓ created' + warnNote + ' — see panel' : '✓ created');
      }
    } catch (e) {
      setStatus('Could not build the animation: ' + e.message, true);
    } finally {
      btn.disabled = false;
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

    const dur = app.state.rt.duration;
    const SIZE = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
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
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });

    const svg = $('stage');
    const drawFrame = async t => {
      app.drawAt(t);
      let xml = new XMLSerializer().serializeToString(svg);
      xml = xml.split('var(--paper, #f7f2e9)').join(paper);
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      try { await img.decode(); } catch (e) { return; }
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
    };

    await drawFrame(0);
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
          await drawFrame(t);
          busy = false;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    rec.stop();
    await stopped;

    downloadBlob(new Blob(chunks, { type: 'video/webm' }), slug(App().currentName()) + '.webm');
    btn.textContent = '⬇ WebM';
    btn.disabled = false;
    exporting = false;
    app.setPlaying(wasPlaying);
  }

  /* ---------------- boot ---------------- */
  window.addEventListener('DOMContentLoaded', () => {
    $('btnCreate').addEventListener('click', runCreate);
    $('createText').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCreate(); }
    });
    $('btnUpload').addEventListener('click', () => $('fileUpload').click());
    $('fileUpload').addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) onUpload(e.target.files[0]);
      e.target.value = '';
    });
    $('btnJsonDl').addEventListener('click', downloadJson);
    $('btnWebm').addEventListener('click', exportWebM);
    $('lnkHint').addEventListener('click', e => { e.preventDefault(); $('btnLogin').click(); });

    window.StickAuth.onChange(updateGate);
    updateGate();
  });
})();
