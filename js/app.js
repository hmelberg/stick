/* stick — playground app: compile, stage construction, rAF loop, transport,
   warnings panel, overlays, animation library (examples + saved "my animations").
   Exposes window.StickApp for studio.js (create/upload/download). */
(function () {
  'use strict';
  const STICK = window.STICK;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);

  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  const LS_ANIMS = 'stick.myAnimations';

  /* ---------------- speech (Web Speech API) ----------------
     Voices are derived from a figure's archetype + current mood, with optional
     per-figure (figure.voice) and per-line (say args.voice / sing) overrides.
     The API can't truly sing, so "sing" fakes a melody by speaking word-by-word
     at varied pitch. */
  const Speech = (function () {
    const synth = (typeof window !== 'undefined' && window.speechSynthesis) || null;
    let voices = [];
    const loadVoices = () => { if (synth) voices = synth.getVoices() || []; };
    if (synth) { loadVoices(); try { synth.addEventListener('voiceschanged', loadVoices); } catch (e) {} }

    const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    // Stable 0..1 hash of a string (FNV-1a). Gives each figure a fixed but
    // distinct voice variation without Math.random, so replays stay identical.
    function hash01(s) {
      let h = 2166136261; const str = String(s || '');
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return ((h >>> 0) % 100000) / 100000;
    }
    // best-effort name hints; pitch/rate do the real differentiating
    const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|zira|susan|allison|ava|serena|kate|google uk english female/i;
    const MALE = /male|man|daniel|arthur|alex|fred|david|george|thomas|oliver|rishi|aaron|google uk english male/i;

    // Default voice for any figure: British English, male. Override per figure
    // or per `say` line with voice.lang / voice.accent (see normLang aliases).
    const DEFAULT_LANG = 'en-GB';
    // Friendly accent/language names -> BCP-47 tags, so an LLM can write
    // "british" or "french" instead of memorising locale codes. Bare codes
    // ("en-GB", "fr", "pt-BR") also work and skip this table.
    const LANG_ALIAS = {
      british: 'en-GB', 'british english': 'en-GB', uk: 'en-GB', english: 'en-GB', 'en-uk': 'en-GB',
      american: 'en-US', 'american english': 'en-US', us: 'en-US',
      australian: 'en-AU', aussie: 'en-AU', irish: 'en-IE', scottish: 'en-GB', indian: 'en-IN', 'south african': 'en-ZA',
      french: 'fr-FR', 'canadian french': 'fr-CA',
      spanish: 'es-ES', 'mexican spanish': 'es-MX', 'latin american spanish': 'es-419',
      german: 'de-DE', italian: 'it-IT',
      portuguese: 'pt-PT', brazilian: 'pt-BR', 'brazilian portuguese': 'pt-BR',
      dutch: 'nl-NL', russian: 'ru-RU', polish: 'pl-PL', swedish: 'sv-SE', norwegian: 'nb-NO', danish: 'da-DK', finnish: 'fi-FI',
      turkish: 'tr-TR', greek: 'el-GR', czech: 'cs-CZ',
      japanese: 'ja-JP', korean: 'ko-KR', chinese: 'zh-CN', mandarin: 'zh-CN', cantonese: 'zh-HK',
      hindi: 'hi-IN', arabic: 'ar-SA', hebrew: 'he-IL', thai: 'th-TH', vietnamese: 'vi-VN', indonesian: 'id-ID',
    };
    function normLang(lang) {
      if (!lang) return null;
      const s = String(lang).trim().toLowerCase();
      return LANG_ALIAS[s] || s.replace(/_/g, '-');
    }

    function pickVoice(kind, lang, variant) {
      if (!voices.length) return null;
      const want = (normLang(lang) || DEFAULT_LANG).toLowerCase();
      const byLang = v => (v.lang || '').toLowerCase().replace(/_/g, '-');
      // narrow to the requested locale, then the language family (en-* etc.),
      // then everything — so a missing en-GB still yields some English voice.
      let pool = voices.filter(v => byLang(v).startsWith(want));
      if (!pool.length) { const fam = want.slice(0, 2); pool = voices.filter(v => byLang(v).startsWith(fam)); }
      if (!pool.length) pool = voices;
      // female/male by name hint; default prefers male per the app default;
      // child stays gender-neutral (raised pitch does the work).
      const re = kind === 'female' ? FEMALE : kind === 'child' ? null : MALE;
      let cands = re ? pool.filter(v => re.test(v.name)) : pool;
      if (!cands.length) cands = pool;
      // variant spreads distinct figures across the matching voices so a crowd
      // doesn't all share voice #0; null -> the first (best default) voice.
      const i = variant == null ? 0 : (((variant % cands.length) + cands.length) % cands.length);
      return cands[i] || pool[0] || null;
    }

    const MOOD = {
      neutral:   { p: 0,     r: 0 },
      happy:     { p: 0.15,  r: 0.08 },
      ecstatic:  { p: 0.28,  r: 0.18, v: 1 },
      sad:       { p: -0.12, r: -0.25 },
      angry:     { p: -0.05, r: 0.18, v: 1 },
      bored:     { p: -0.05, r: -0.2 },
      thinking:  { p: 0,     r: -0.1 },
      surprised: { p: 0.2,   r: 0.1 },
      sleepy:    { p: -0.1,  r: -0.32 },
    };

    function baseFor(fig) {
      const arch = (fig && fig.archetype) || [];
      if (arch.includes('kid')) return { kind: 'child', pitch: 1.6, rate: 1.08 };
      if (arch.includes('woman')) return { kind: 'female', pitch: 1.25, rate: 1.04 };
      if (arch.includes('man')) return { kind: 'male', pitch: 0.82, rate: 1.0 };
      if (fig && fig.character === 'professor') return { kind: 'male', pitch: 0.7, rate: 0.92 };
      if (fig && fig.character === 'student') return { kind: 'male', pitch: 1.05, rate: 1.05 };
      return { kind: 'default', pitch: 1.0, rate: 1.0 };
    }

    const SCALE_P = { high: 1.3, low: 0.75, normal: 1 };
    const SCALE_R = { fast: 1.3, slow: 0.7, normal: 1 };

    function paramsFor(fig, mood, sayArgs, vary) {
      const b = baseFor(fig);
      let pitch = b.pitch, rate = b.rate, volume = 1, kind = b.kind;
      // With several figures on stage, give each a stable, distinct voice so they
      // don't all sound identical: spread generic figures across genders, jitter
      // pitch/rate a touch, and (via `variant` below) pick a different system
      // voice per figure. Explicit voice settings always override this.
      const id = fig && fig.id;
      const seedP = vary && id ? hash01(id) : 0.5;
      const seedR = vary && id ? hash01(id + '#r') : 0.5;
      if (vary && kind === 'default') {
        kind = seedP < 0.5 ? 'male' : 'female';
        if (kind === 'female') { pitch = 1.2; rate = 1.04; } else { pitch = 0.9; }
      }
      if (vary && id) { pitch += (seedP - 0.5) * 0.3; rate += (seedR - 0.5) * 0.2; }
      const m = MOOD[mood]; if (m) { pitch += m.p; rate += m.r; if (m.v != null) volume = m.v; }
      const ov = Object.assign({}, fig && fig.voice, sayArgs && sayArgs.voice);
      if (ov.gender === 'female') kind = 'female';
      else if (ov.gender === 'male') kind = 'male';
      else if (ov.gender === 'child' || ov.age === 'child') { kind = 'child'; pitch = Math.max(pitch, 1.5); }
      if (typeof ov.pitch === 'number') pitch = ov.pitch;
      else if (typeof ov.pitch === 'string') pitch *= (SCALE_P[ov.pitch] || 1);
      if (typeof ov.rate === 'number') rate = ov.rate;
      else if (typeof ov.rate === 'string') rate *= (SCALE_R[ov.rate] || 1);
      if (typeof ov.volume === 'number') volume = ov.volume;
      const lang = ov.lang || ov.accent || ov.language || null; // friendly name or BCP-47
      const variant = vary && id ? Math.floor(seedP * 997) : null;
      return {
        pitch: clampN(pitch, 0.1, 2),
        rate: clampN(rate, 0.4, 2.2),
        volume: clampN(volume, 0, 1),
        voice: pickVoice(kind, lang, variant),
        sing: !!((sayArgs && sayArgs.sing) || ov.sing),
      };
    }

    function mkUtter(text, p, speed) {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = p.pitch; u.volume = p.volume;
      u.rate = clampN(p.rate * (speed || 1), 0.1, 10);
      if (p.voice) { u.voice = p.voice; if (p.voice.lang) u.lang = p.voice.lang; }
      return u;
    }

    return {
      available: !!synth,
      cancel() { if (synth) { try { synth.cancel(); } catch (e) {} } },
      speak(text, fig, mood, sayArgs, speed, vary) {
        if (!synth || !text) return;
        const p = paramsFor(fig, mood, sayArgs, vary);
        if (p.sing) {
          const words = String(text).split(/\s+/).filter(Boolean);
          const melody = [0, 0.12, 0.22, 0.12, -0.05, 0.16, 0.28, 0.1];
          words.forEach((w, i) => {
            const pp = Object.assign({}, p, { pitch: clampN(p.pitch + melody[i % melody.length], 0.1, 2), rate: p.rate * 0.85 });
            synth.speak(mkUtter(w, pp, speed));
          });
        } else {
          synth.speak(mkUtter(text, p, speed));
        }
      },
    };
  })();

  /* Fire each say line as the playhead crosses its start; reset on loop/seek-back. */
  function processSpeech() {
    if (!Speech.available) return;
    const rt = state.rt; if (!rt) return;
    const t = state.t;
    if (t < state.lastSpeakT - 0.001) { state.spoken.clear(); Speech.cancel(); state.lastSpeakT = -1; }
    if (state.sound) {
      for (const o of rt.overlays) {
        if (o.type !== 'say') continue;
        if (o.t0 > state.lastSpeakT && o.t0 <= t && !state.spoken.has(o)) {
          state.spoken.add(o);
          const fig = rt.figs.get(o.fig);
          const mood = rt.ch.getDef(o.fig + '.mood', o.t0, fig ? fig.mood : 'neutral');
          Speech.speak(o.text, fig, mood, o.args, state.speed, rt.figs.size > 1);
        }
      }
    }
    state.lastSpeakT = t;
  }

  const state = {
    rt: null, dom: null, t: 0,
    playing: false, loop: true, speed: 1,
    last: performance.now(),
    sound: false, lastSpeakT: 0, spoken: new Set(),
  };

  /* ---------------- my animations (localStorage) ---------------- */
  function getMyAnims() {
    try { return JSON.parse(localStorage.getItem(LS_ANIMS)) || {}; }
    catch (e) { return {}; }
  }
  function saveMyAnim(name, doc) {
    const m = getMyAnims();
    let n = name, i = 2;
    while (m[n]) n = name + ' ' + (i++);
    m[n] = doc;
    localStorage.setItem(LS_ANIMS, JSON.stringify(m));
    return n;
  }
  function deleteMyAnim(name) {
    const m = getMyAnims();
    delete m[name];
    localStorage.setItem(LS_ANIMS, JSON.stringify(m));
  }

  /* ---------------- stage construction ---------------- */
  function rebuildStage(rt) {
    const svg = $('stage');
    svg.innerHTML = '';
    svg.style.setProperty('--paper', rt.scene.bg);

    const dom = { svg, figNodes: new Map() };
    dom.cam = mk('g', {}, svg);
    dom.parallax = rt.scene.parallax;

    // backdrops: scenery (bg + floor + scene elements) per backdrop, crossfaded.
    dom.backdropG = mk('g', {}, dom.cam);
    dom.backdrops = [];
    rt.backdrops.forEach((bd, i) => {
      const g = mk('g', {}, dom.backdropG);
      const sc = bd.scene;
      mk('rect', { x: -300, y: -300, width: 700, height: 700, fill: sc.bg }, g);
      if (sc.floor) mk('line', { x1: -300, y1: sc.floorY, x2: 400, y2: sc.floorY, stroke: '#c9bfae', 'stroke-width': 0.35 }, g);
      for (const el of sc.elements) STICK.drawSceneElement(el, g, sc.ink);
      if (i > 0) g.style.opacity = '0';
      dom.backdrops.push({ g, t0: bd.t0, fade: bd.fade });
    });

    // content layers sit above the backdrops
    dom.layers = {
      back: mk('g', {}, dom.cam),
      mid: mk('g', {}, dom.cam),
      fig: mk('g', {}, dom.cam),
      front: mk('g', {}, dom.cam),
      bubbles: mk('g', {}, dom.cam),
    };
    dom.fixed = mk('g', {}, svg);

    for (const fig of rt.figs.values()) {
      const style = STICK.styles[fig.style] || STICK.styles.sketch;
      dom.figNodes.set(fig.id, { style, nodes: style.build(fig, dom.layers.fig) });
    }
    dom.objNodes = new Map();
    for (const obj of rt.objs.values()) {
      const layer = dom.layers[obj.layer] || dom.layers.front;
      const g = mk('g', {}, layer);
      const shapeEl = STICK.drawSceneElement({ type: obj.shape, props: obj.props }, g, rt.scene.ink);
      dom.objNodes.set(obj.id, { g, shapeEl, obj, lastFill: null });
    }
    dom.boardNodes = new Map();
    for (const board of rt.boards.values()) {
      const layer = dom.layers[board.layer] || dom.layers.mid;
      dom.boardNodes.set(board.id, STICK.buildBoard(board, layer, svg));
    }
    return dom;
  }

  /* ---------------- overlays ---------------- */
  function wrapText(text, width) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      if (line && (line + ' ' + w).length > width) { lines.push(line); line = w; }
      else line = line ? line + ' ' + w : w;
      if (lines.length === 3) break;
    }
    if (lines.length < 3 && line) lines.push(line);
    return lines.length ? lines : ['…'];
  }

  function fade(o, t) {
    return Math.max(0, Math.min(1, (t - o.t0) / 0.2, (o.t1 - t) / 0.25));
  }

  function drawOverlays(rt, dom, t, Ps) {
    dom.layers.bubbles.innerHTML = '';
    dom.fixed.innerHTML = '';
    const ink = rt.scene.ink;

    for (const o of rt.overlays) {
      if (t < o.t0 || t > o.t1) continue;
      const alpha = fade(o, t);
      if (alpha <= 0) continue;

      if (o.type === 'caption') {
        const g = mk('g', { opacity: alpha.toFixed(2) }, dom.fixed);
        const w = Math.min(92, o.text.length * 1.6 + 5);
        mk('rect', { x: 50 - w / 2, y: 88.6, width: w, height: 5.4, rx: 1.2, fill: 'rgba(42,42,53,0.82)' }, g);
        const tx = mk('text', {
          x: 50, y: 92.3, 'font-size': 3, fill: '#f7f2e9',
          'text-anchor': 'middle', 'font-family': 'Georgia, serif', 'font-style': 'italic',
        }, g);
        tx.textContent = o.text;
        continue;
      }

      const P = Ps.get(o.fig);
      if (!P) continue;
      const head = P.world.head, r = P.g.headR;

      if (o.type === 'say') {
        const lines = wrapText(o.text, 20);
        const maxLen = Math.max(...lines.map(l => l.length));
        const fs = 2.5, lineH = fs * 1.25;
        const w = maxLen * fs * 0.52 + 3;
        const h = lines.length * lineH + 2.2;
        const cx = Math.max(w / 2 + 2, Math.min(98 - w / 2, head.x + P.fc * 4));
        const by = Math.max(2, head.y - r * 1.6 - h - 2.6);
        const g = mk('g', { opacity: alpha.toFixed(2) }, dom.layers.bubbles);
        mk('path', {
          d: `M ${head.x + P.fc * 2.2} ${by + h - 0.3} L ${head.x + P.fc * 0.6} ${head.y - r * 1.1} L ${head.x + P.fc * 3.6} ${by + h - 0.3} Z`,
          fill: '#fffdf6', stroke: ink, 'stroke-width': 0.22, 'stroke-linejoin': 'round',
        }, g);
        mk('rect', {
          x: cx - w / 2, y: by, width: w, height: h, rx: 1.4,
          fill: '#fffdf6', stroke: ink, 'stroke-width': 0.25,
        }, g);
        lines.forEach((ln, i) => {
          const tx = mk('text', {
            x: cx, y: by + 1.6 + (i + 0.72) * lineH, 'font-size': fs, fill: ink,
            'text-anchor': 'middle', 'font-family': 'Trebuchet MS, Comic Sans MS, sans-serif',
          }, g);
          tx.textContent = ln;
        });
      } else if (o.type === 'emote') {
        const prog = (t - o.t0) / (o.t1 - o.t0);
        const ex = head.x + P.fc * 1.6;
        const ey = head.y - r * 2.4 - prog * 1.6;
        const g = mk('g', { opacity: alpha.toFixed(2) }, dom.layers.bubbles);
        if (o.symbol === 'zzz') {
          [2.8, 2.2, 1.7].forEach((s, i) => {
            const tx = mk('text', {
              x: ex + i * 1.7, y: ey - i * 1.5, 'font-size': s, fill: ink,
              'font-family': 'Georgia, serif', 'font-style': 'italic',
            }, g);
            tx.textContent = 'z';
          });
        } else {
          const tx = mk('text', {
            x: ex, y: ey, 'font-size': 4.2, fill: ink, 'text-anchor': 'middle',
            'font-family': 'Trebuchet MS, sans-serif', 'font-weight': 'bold',
          }, g);
          tx.textContent = o.symbol;
        }
      }
    }
  }

  // Latest grip holding this object at time t (later grips win — handoffs).
  function activeGrip(rt, objId, t) {
    let g = null;
    if (rt.grips) for (const gr of rt.grips) if (gr.obj === objId && t >= gr.t0 && t < gr.t1) g = gr;
    return g;
  }

  /* ---------------- frame ---------------- */
  function draw() {
    const rt = state.rt, dom = state.dom;
    if (!rt || !dom) return;
    const t = state.t;

    const Ps = new Map();
    for (const fig of rt.figs.values()) {
      const P = STICK.computeFigure(rt, fig, t);
      Ps.set(fig.id, P);
      const entry = dom.figNodes.get(fig.id);
      if (!entry) continue; // dom not yet rebuilt for this rt (defensive)
      entry.style.update(entry.nodes, P, t);
    }
    for (const obj of rt.objs.values()) {
      const node = dom.objNodes && dom.objNodes.get(obj.id);
      if (!node) continue;
      const sc = rt.ch.getDef(obj.id + '.scale', t, 1);
      const op = rt.ch.getDef(obj.id + '.opacity', t, 1);
      const px = obj.pivot.x, py = obj.pivot.y;
      // held? follow the holder's hand (overriding tx/ty/rot); else channel-driven.
      const grip = activeGrip(rt, obj.id, t);
      const gP = grip && Ps.get(grip.fig);
      if (gP) {
        const handW = grip.hand === 'L' ? gP.world.handL : gP.world.handR;
        const tx = handW.x - px, ty = handW.y - py;
        const directional = grip.follow == null ? obj.directional : grip.follow;
        let rot = 0, scY = sc;
        if (directional) {
          rot = STICK.propAngle(gP, grip.hand, obj.baseAngle || 0);
          if (Math.cos(rot * Math.PI / 180) < 0) scY = -sc; // keep upright when aiming left
        }
        node.g.setAttribute('transform',
          `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) translate(${px} ${py}) rotate(${rot.toFixed(2)}) scale(${sc.toFixed(4)} ${scY.toFixed(4)}) translate(${(-px)} ${(-py)})`);
      } else {
        const tx = rt.ch.get(obj.id + '.tx', t), ty = rt.ch.get(obj.id + '.ty', t), rot = rt.ch.get(obj.id + '.rot', t);
        node.g.setAttribute('transform',
          `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) translate(${px} ${py}) rotate(${rot.toFixed(2)}) scale(${sc.toFixed(4)}) translate(${(-px)} ${(-py)})`);
      }
      node.g.setAttribute('opacity', op.toFixed(3));
      const fill = rt.ch.getDef(obj.id + '.fill', t, null);
      if (fill != null && fill !== node.lastFill) { node.shapeEl.setAttribute('fill', fill); node.lastFill = fill; }
    }
    if (dom.boardNodes) for (const board of rt.boards.values()) {
      const node = dom.boardNodes.get(board.id);
      if (node) STICK.updateBoard(node, t);
    }
    drawOverlays(rt, dom, t, Ps);

    const cx = rt.ch.get('cam.x', t), cy = rt.ch.get('cam.y', t), z = rt.ch.get('cam.z', t) || 1;
    const rot = rt.ch.get('cam.rot', t) || 0, sh = rt.ch.getDef('cam.shake', t, 0) || 0;
    const jx = sh ? sh * (Math.sin(t * 53) * 0.6 + Math.sin(t * 97) * 0.4) : 0;
    const jy = sh ? sh * (Math.cos(t * 61) * 0.6 + Math.cos(t * 89) * 0.4) : 0;
    const par = dom.parallax;
    const xform = f => `translate(${(50 + jx).toFixed(2)} ${(50 + jy).toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${z.toFixed(3)}) translate(${(-(50 + (cx - 50) * f)).toFixed(2)} ${(-(50 + (cy - 50) * f)).toFixed(2)})`;
    dom.backdropG.setAttribute('transform', xform(par ? par.backdrop : 1));
    for (const name in dom.layers) dom.layers[name].setAttribute('transform', xform(par && par[name] != null ? par[name] : 1));
    // backdrop crossfade
    for (let i = 0; i < dom.backdrops.length; i++) {
      const cur = dom.backdrops[i], next = dom.backdrops[i + 1];
      let op;
      if (t < cur.t0) op = 0;
      else {
        const aIn = cur.fade > 0 ? Math.min(1, (t - cur.t0) / cur.fade) : 1;
        let aOut = 1;
        if (next) aOut = next.fade > 0 ? Math.max(0, Math.min(1, (next.t0 + next.fade - t) / next.fade)) : (t < next.t0 ? 1 : 0);
        op = Math.max(0, Math.min(aIn, aOut));
      }
      cur.g.style.opacity = op.toFixed(3);
      cur.g.style.display = op <= 0.001 ? 'none' : '';
    }

    if (!state.scrubbing) $('scrub').value = String(Math.round((t / rt.duration) * 1000));
    $('timeLbl').textContent = t.toFixed(1) + ' / ' + rt.duration.toFixed(1) + 's';
  }

  function tick(now) {
    const dt = Math.min(0.1, (now - state.last) / 1000);
    state.last = now;
    if (state.playing && state.rt) {
      state.t += dt * state.speed;
      if (state.t >= state.rt.duration) {
        if (state.loop) state.t = 0;
        else { state.t = state.rt.duration; setPlaying(false); }
      }
      draw();
      processSpeech();
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- compile & UI ---------------- */
  function showWarnings(list, isError) {
    const box = $('warnings');
    box.innerHTML = '';
    box.className = isError ? 'warnings error' : 'warnings';
    if (!list.length) {
      const d = document.createElement('div');
      d.className = 'ok';
      d.textContent = '✓ no warnings';
      box.appendChild(d);
      return;
    }
    for (const w of list) {
      const d = document.createElement('div');
      d.textContent = (isError ? '✕ ' : '⚠ ') + w;
      box.appendChild(d);
    }
  }

  function render() {
    let doc;
    try {
      doc = JSON.parse($('ed').value);
    } catch (e) {
      showWarnings(['JSON parse error: ' + e.message], true);
      return;
    }
    let rt;
    try { rt = STICK.compile(doc); }
    catch (e) { showWarnings(['engine error: ' + e.message + (e.stack ? ' @ ' + String(e.stack).split('\n')[1] : '')], true); return; }
    // Build the stage into locals, then swap state.rt + state.dom together. This
    // keeps the running frame loop consistent if the build is deferred (e.g. while
    // MathJax loads) — otherwise draw() would run the new rt against the old dom.
    const finish = () => {
      let dom;
      try { dom = rebuildStage(rt); }
      catch (e) { showWarnings(['engine error: ' + e.message + (e.stack ? ' @ ' + String(e.stack).split('\n')[1] : '')], true); return; }
      state.rt = rt; state.dom = dom; state.t = 0;
      // Obey the sound checkbox for the new animation (it may have been toggled,
      // or restored checked by the browser on reload, without firing 'change').
      const snd = $('chkSound'); if (snd) state.sound = snd.checked;
      Speech.cancel(); state.spoken.clear(); state.lastSpeakT = -1;
      showWarnings(rt.warnings, false);
      setPlaying(true);
      draw();
    };
    if (STICK.boardsNeedMath && STICK.boardsNeedMath(rt) && !STICK.mathReady && STICK.ensureMath) {
      showWarnings(['loading math…'], false);
      STICK.ensureMath().then(finish).catch(finish); // fall back to raw text if it fails
    } else finish();
  }

  function setPlaying(p) {
    state.playing = p;
    $('btnPlay').textContent = p ? '❚❚' : '▶';
    if (!p) Speech.cancel();
    // no lastSpeakT reset here: while paused processSpeech doesn't run, so it
    // already holds the pause point — resuming continues forward, no backlog.
  }

  /* ---------------- animation library dropdown ---------------- */
  function refreshDropdown(selValue) {
    const sel = $('selExample');
    sel.innerHTML = '';
    const mine = getMyAnims();
    const mineNames = Object.keys(mine);
    if (mineNames.length) {
      const og = document.createElement('optgroup');
      og.label = 'my animations';
      for (const n of mineNames) {
        const o = document.createElement('option');
        o.value = 'my:' + n; o.textContent = n;
        og.appendChild(o);
      }
      sel.appendChild(og);
    }
    const og2 = document.createElement('optgroup');
    og2.label = 'examples';
    for (const n of Object.keys(STICK.examples)) {
      const o = document.createElement('option');
      o.value = 'ex:' + n; o.textContent = n;
      og2.appendChild(o);
    }
    sel.appendChild(og2);
    if (selValue) sel.value = selValue;
    updateDeleteBtn();
  }

  function currentName() {
    const v = $('selExample').value || '';
    return v.indexOf(':') > 0 ? v.slice(v.indexOf(':') + 1) : 'animation';
  }

  function loadSelection() {
    const v = $('selExample').value || '';
    let doc = null;
    if (v.startsWith('ex:')) doc = STICK.examples[v.slice(3)];
    else if (v.startsWith('my:')) doc = getMyAnims()[v.slice(3)];
    if (!doc) return;
    $('ed').value = JSON.stringify(doc, null, 2);
    render();
    updateDeleteBtn();
  }

  function updateDeleteBtn() {
    const v = $('selExample').value || '';
    $('btnDelete').classList.toggle('hidden', !v.startsWith('my:'));
  }

  /* ---------------- boot ---------------- */
  window.addEventListener('DOMContentLoaded', () => {
    refreshDropdown();
    const sel = $('selExample');
    sel.addEventListener('change', loadSelection);

    $('btnDelete').addEventListener('click', () => {
      const v = sel.value || '';
      if (!v.startsWith('my:')) return;
      const name = v.slice(3);
      if (!confirm('Delete "' + name + '" from my animations?')) return;
      deleteMyAnim(name);
      refreshDropdown('ex:' + (STICK.examples.moonwalk ? 'moonwalk' : Object.keys(STICK.examples)[0]));
      loadSelection();
    });

    $('btnRender').addEventListener('click', render);
    $('ed').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); render(); }
    });

    $('btnJsonToggle').addEventListener('click', () => {
      $('jsonWrap').classList.toggle('hidden');
    });

    $('btnPlay').addEventListener('click', () => {
      if (!state.rt) return;
      if (!state.playing && state.t >= state.rt.duration) state.t = 0;
      setPlaying(!state.playing);
    });
    $('btnRestart').addEventListener('click', () => { state.t = 0; state.spoken.clear(); state.lastSpeakT = -1; Speech.cancel(); if (state.rt) { setPlaying(true); draw(); } });

    const scrub = $('scrub');
    scrub.addEventListener('input', () => {
      if (!state.rt) return;
      state.scrubbing = true;
      state.t = (Number(scrub.value) / 1000) * state.rt.duration;
      Speech.cancel(); state.lastSpeakT = state.t;
      draw();
      state.scrubbing = false;
    });

    $('btnFull').addEventListener('click', () => {
      const el = $('stageWrap');
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      }
    });

    $('chkLoop').addEventListener('change', e => { state.loop = e.target.checked; });
    $('chkSound').addEventListener('change', e => {
      state.sound = e.target.checked;
      if (!state.sound) Speech.cancel();
      else state.lastSpeakT = state.t; // start from here, don't dump backlog
    });
    $('selSpeed').addEventListener('change', e => { state.speed = Number(e.target.value); });

    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        $('btnPlay').click();
      }
    });

    // ?ex=name&t=seconds opens an example paused at a moment — handy for debugging
    const q = new URLSearchParams(location.search);
    const exName = q.get('ex');
    const defaultEx = STICK.examples.moonwalk ? 'moonwalk' : Object.keys(STICK.examples)[0];
    sel.value = exName && STICK.examples[exName] ? 'ex:' + exName : 'ex:' + defaultEx;
    loadSelection();
    if (q.has('t') && state.rt) {
      state.t = Math.min(state.rt.duration, Math.max(0, parseFloat(q.get('t')) || 0));
      setPlaying(false);
      draw();
    }
    requestAnimationFrame(tick);
  });

  window.StickApp = {
    state, render, draw, setPlaying, refreshDropdown, currentName,
    saveMyAnim, deleteMyAnim, getMyAnims,
    drawAt(t) {
      if (!state.rt) return;
      state.t = Math.min(state.rt.duration, Math.max(0, t));
      draw();
    },
    // Used by the WebM exporter to speak in sync while replaying frames.
    speakFrame() { processSpeech(); },
    resetSpeech() { state.spoken.clear(); state.lastSpeakT = -1; Speech.cancel(); },
    setEditor(text) { $('ed').value = text; },
  };
})();
