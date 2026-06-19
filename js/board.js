/* stick — boards: writable panels (blackboard / whiteboard). A board is a styled
   rectangle you write markdown to; text is laid out, wrapped, and revealed with a
   left-to-right "wipe" so it reads as handwriting, and the content auto-scrolls up
   when it overflows. Layout needs text measurement, so it happens at render-build
   time (buildBoard, browser only); compile() just records write blocks, keeping
   the headless path DOM-free. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const NS = 'http://www.w3.org/2000/svg';

  const STYLES = {
    chalk:  { bg: '#2f4f43', color: '#f3efe6', frame: '#6b5638' },
    marker: { bg: '#fbfaf6', color: '#23303a', frame: '#b9ad95' },
  };
  const FONTS = {
    handwriting: '"Caveat", "Bradley Hand", "Comic Sans MS", "Segoe Print", cursive',
    clean: 'Georgia, serif',
    mono: 'Consolas, monospace',
  };

  // chalk-friendly named colours; hex passes through, as do raw CSS colour names.
  const COLORS = {
    red: '#e0533a', orange: '#e08a3a', amber: '#e0b13a', yellow: '#ecd35a',
    green: '#5fae6b', teal: '#4fb0a0', blue: '#3a86e0', sky: '#7bb8ec',
    purple: '#9b6fd0', pink: '#e07ab0', gray: '#9aa0a8', grey: '#9aa0a8',
    white: '#f3efe6', black: '#23303a',
  };
  function resolveColor(c) {
    if (!c) return null;
    c = String(c);
    return c[0] === '#' ? c : (COLORS[c.toLowerCase()] || c);
  }
  STICK.resolveBoardColor = resolveColor;

  /* ---------------- math (MathJax SVG, lazy) ----------------
     MathJax v3 with SVG output: native paths (no web fonts) so equations survive
     the WebM export and tint to chalk colour. Supports LaTeX ($..$, $$..$$) and
     AsciiMath (`..`). Loaded on first use; falls back to raw text if unavailable. */
  STICK.mathReady = false;
  STICK.ensureMath = function () {
    if (STICK._mathP) return STICK._mathP;
    STICK._mathP = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') { reject(new Error('no dom')); return; }
      const url = (typeof window !== 'undefined' && window.STICK_MATHJAX_URL) || 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js';
      const done = () => { STICK.mathReady = typeof window.MathJax.tex2svg === 'function'; resolve(window.MathJax); };
      window.MathJax = {
        loader: { load: ['input/tex', 'input/asciimath', 'output/svg'] },
        startup: { typeset: false },
        svg: { fontCache: 'none' }, // self-contained paths per equation (export-safe)
      };
      const s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = () => {
        const st = window.MathJax && window.MathJax.startup;
        if (st && st.promise) st.promise.then(done).catch(done);
        // safety net: if startup never resolves, force-init and continue
        setTimeout(() => { if (!STICK.mathReady) { try { st && st.defaultReady && st.defaultReady(); } catch (e) {} done(); } }, 6000);
      };
      s.onerror = () => reject(new Error('mathjax failed to load'));
      document.head.appendChild(s);
    });
    return STICK._mathP;
  };

  // does this compiled doc write any math? (gates the lazy load before build)
  STICK.boardsNeedMath = function (rt) {
    for (const b of rt.boards.values()) for (const blk of b.blocks) if (blk.md && /\$|`/.test(blk.md)) return true;
    return false;
  };

  // kind: 'tex'|'ascii'. Returns {svg, vbW, vbH, minY, hEx} or null.
  STICK.renderMath = function (kind, src, display) {
    const MJ = typeof window !== 'undefined' && window.MathJax;
    if (!MJ || !STICK.mathReady) return null;
    try {
      const node = (kind === 'ascii' && MJ.asciimath2svg) ? MJ.asciimath2svg(src) : MJ.tex2svg(src, { display: !!display });
      const svg = node.querySelector('svg');
      if (!svg) return null;
      const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
      return { svg, vbW: vb[2] || 1, vbH: vb[3] || 1, minY: vb[1] || 0, hEx: parseFloat(svg.getAttribute('height')) || 1 };
    } catch (e) { return null; }
  };

  STICK.normalizeBoard = function (raw, i, warn) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const style = STYLES[raw.style] ? raw.style : 'chalk';
    const s = STYLES[style];
    const r = raw.rect || {};
    return {
      id: String(raw.id || raw.name || 'board' + i),
      style,
      layer: ['back', 'mid', 'fig', 'front'].includes(raw.layer) ? raw.layer : 'mid',
      rect: { x: num(r.x, 6), y: num(r.y, 6), w: num(r.w, 60), h: num(r.h, 58) },
      bg: raw.bg || s.bg,
      color: resolveColor(raw.color || raw.ink) || s.color,
      accent: raw.accent ? resolveColor(raw.accent) : null,
      frame: raw.frame === false ? null : (raw.frameColor || s.frame),
      font: FONTS[raw.font] || raw.font || FONTS.handwriting,
      fontSize: num(raw.fontSize, 3.2),
      pad: num(raw.pad, 2.5),
      hand: !!raw.hand, // show a chalk-holding hand that tracks the write/draw point
      blocks: [], // {kind:'write', t0, dur, md, by} | {kind:'clear', t0} | {kind:'erase', t0, n}
    };
  };

  /* ---------------- markdown subset (pure) ---------------- */
  function parseInline(text) {
    const segs = [];
    let i = 0, bold = false, italic = false, underline = false, buf = '';
    const push = () => { if (buf) { segs.push({ text: buf, bold, italic, underline }); buf = ''; } };
    while (i < text.length) {
      // math: $$display$$, $inline$ (LaTeX), `asciimath`
      if (text.startsWith('$$', i)) {
        const c = text.indexOf('$$', i + 2);
        if (c > i) { push(); segs.push({ math: true, kind: 'tex', src: text.slice(i + 2, c), display: true }); i = c + 2; continue; }
      }
      if (text[i] === '$') {
        const c = text.indexOf('$', i + 1);
        if (c > i) { push(); segs.push({ math: true, kind: 'tex', src: text.slice(i + 1, c) }); i = c + 1; continue; }
      }
      if (text[i] === '`') {
        const c = text.indexOf('`', i + 1);
        if (c > i) { push(); segs.push({ math: true, kind: 'ascii', src: text.slice(i + 1, c) }); i = c + 1; continue; }
      }
      // {colour|text} colour span (no nested styling inside)
      if (text[i] === '{') {
        const close = text.indexOf('}', i), bar = text.indexOf('|', i);
        if (close > i && bar > i && bar < close) {
          push();
          segs.push({ text: text.slice(bar + 1, close), bold, italic, underline, color: resolveColor(text.slice(i + 1, bar).trim()) });
          i = close + 1; continue;
        }
      }
      if (text.startsWith('**', i)) { push(); bold = !bold; i += 2; continue; }
      if (text.startsWith('__', i)) { push(); underline = !underline; i += 2; continue; }
      if (text[i] === '*') { push(); italic = !italic; i += 1; continue; }
      buf += text[i++];
    }
    push();
    return segs.length ? segs : [{ text: '', bold: false, italic: false, underline: false }];
  }

  function parseMarkdown(md) {
    const out = [];
    for (let raw of String(md).replace(/\r/g, '').split('\n')) {
      const line = raw.replace(/\s+$/, '');
      if (line.trim() === '') { out.push({ type: 'gap' }); continue; }
      if (line.trim() === '---') { out.push({ type: 'hr' }); continue; }
      let m;
      if ((m = line.match(/^#\s+(.*)$/))) { out.push({ type: 'h1', segs: parseInline(m[1]) }); continue; }
      if ((m = line.match(/^##\s+(.*)$/))) { out.push({ type: 'h2', segs: parseInline(m[1]) }); continue; }
      if ((m = line.match(/^[-*]\s+(.*)$/))) { out.push({ type: 'li', segs: parseInline(m[1]) }); continue; }
      out.push({ type: 'p', segs: parseInline(line) });
    }
    return out;
  }
  STICK.parseBoardMarkdown = parseMarkdown; // exported for tests

  /* ---------------- layout + build (browser) ---------------- */
  const mk = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  // A small hand holding chalk, with the chalk TIP at the local origin (0,0) so
  // translating the group to a point puts the tip exactly there.
  function buildChalkHand(board, parent) {
    const g = mk('g', {}, parent);
    mk('line', { x1: 0, y1: 0, x2: 1.7, y2: -1.6, stroke: board.style === 'marker' ? '#444' : board.color, 'stroke-width': 0.9, 'stroke-linecap': 'round' }, g);
    mk('ellipse', { cx: 2.8, cy: -2.6, rx: 1.7, ry: 1.2, fill: '#cda072', stroke: '#5b4a36', 'stroke-width': 0.18 }, g);
    mk('rect', { x: 3.4, y: -2.4, width: 1.8, height: 1.5, rx: 0.5, fill: '#6f6088', stroke: '#5b4a36', 'stroke-width': 0.18, transform: 'rotate(30 3.4 -2.4)' }, g);
    g.style.display = 'none';
    return g;
  }

  // The point the chalk tip should sit at for a line at reveal fraction `frac`.
  function writePoint(ln, frac) {
    if (ln.kind === 'stroke' && ln.el.getPointAtLength) {
      try { const p = ln.el.getPointAtLength(ln.len * frac); return { x: p.x, y: p.y }; } catch (e) { return null; }
    }
    if (ln.kind === 'dot') return { x: ln.cx, y: ln.cy };
    return { x: ln.x + (ln.width || 0) * frac, y: ln.baseY != null ? ln.baseY : ln.yBottom };
  }

  function sizeOf(board, type) {
    return type === 'h1' ? board.fontSize * 1.7 : type === 'h2' ? board.fontSize * 1.3 : board.fontSize;
  }

  // Greedy word-wrap one paragraph into visual lines of styled tokens.
  function layoutParagraph(para, board, innerW, measure) {
    const size = sizeOf(board, para.type);
    const heavy = para.type === 'h1' || para.type === 'h2';
    const indent = para.type === 'li' ? board.fontSize * 1.4 : 0;
    const avail = innerW - indent;
    const defColor = (para.type === 'h1' || para.type === 'h2') ? board.accent : null;
    const tokens = [];
    for (const seg of para.segs) {
      if (seg.math) {
        const fsM = seg.display ? size * 1.25 : size;
        const m = STICK.renderMath(seg.kind, seg.src, seg.display);
        if (m) {
          const H = m.hEx * 0.5 * fsM;          // ex -> board units (calibrated)
          tokens.push({ math: true, mathEl: m.svg, H, W: (m.vbW / m.vbH) * H, ascent: (-m.minY / m.vbH) * H, color: seg.color || defColor });
        } else { // fallback: show the source as plain text
          const raw = seg.kind === 'ascii' ? '`' + seg.src + '`' : '$' + seg.src + '$';
          for (const w of raw.split(/(\s+)/)) if (w.length) tokens.push({ text: w, space: /^\s+$/.test(w), color: seg.color || defColor });
        }
        continue;
      }
      for (const w of seg.text.split(/(\s+)/)) {
        if (!w.length) continue;
        tokens.push({ text: w, space: /^\s+$/.test(w), bold: heavy || seg.bold, italic: seg.italic, underline: seg.underline, color: seg.color || defColor });
      }
    }
    const spaceW = measure(' ', size, false, false);
    const vlines = [];
    let cur = [], curW = 0, started = false;
    for (const tk of tokens) {
      const w = tk.math ? tk.W : tk.space ? spaceW : measure(tk.text, size, tk.bold, tk.italic);
      tk.w = w;
      if (!tk.space && started && curW + w > avail) { vlines.push({ tokens: cur, width: curW, size, indent }); cur = []; curW = 0; started = false; }
      if (tk.space && !started) continue; // drop leading space on a wrapped line
      cur.push(tk); curW += w; if (!tk.space || tk.math) started = true;
    }
    if (cur.length || !vlines.length) vlines.push({ tokens: cur, width: curW, size, indent });
    if (para.type === 'li') vlines[0].bullet = true;
    return vlines;
  }

  STICK.buildBoard = function (board, layer, svg) {
    const r = board.rect, pad = board.pad, innerW = r.w - pad * 2, innerH = r.h - pad * 2;
    const boardG = mk('g', {}, layer);
    mk('rect', Object.assign({ x: r.x, y: r.y, width: r.w, height: r.h, rx: 0.8, fill: board.bg },
      board.frame ? { stroke: board.frame, 'stroke-width': 0.8 } : {}), boardG);

    let defs = svg.querySelector('defs') || mk('defs', {}, svg);
    const clipId = 'bbclip_' + board.id.replace(/[^a-z0-9]/gi, '') + '_' + Math.round(r.x) + '_' + Math.round(r.y);
    const clip = mk('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' }, defs);
    mk('rect', { x: r.x + 0.3, y: r.y + 0.3, width: r.w - 0.6, height: r.h - 0.6 }, clip);
    const wrap = mk('g', { 'clip-path': `url(#${clipId})` }, boardG);
    const contentG = mk('g', {}, wrap);

    // hidden text node for measurement (must be in the rendered tree)
    const meas = mk('text', { x: -9999, y: -9999, 'font-family': board.font, opacity: 0 }, svg);
    const measure = (str, size, bold, italic) => {
      meas.setAttribute('font-size', size);
      meas.setAttribute('font-weight', bold ? '700' : '400');
      meas.setAttribute('font-style', italic ? 'italic' : 'normal');
      meas.textContent = str;
      return meas.getComputedTextLength() || 0;
    };

    const lines = [];
    let cursorY = 0;
    for (const block of board.blocks) {
      if (block.kind === 'clear') { for (const ln of lines) if (ln.hideAt == null) ln.hideAt = block.t0; cursorY = 0; continue; }
      if (block.kind === 'erase') {
        let removed = 0;
        for (let j = lines.length - 1; j >= 0 && removed < block.n; j--) {
          if (lines[j].hideAt == null) { lines[j].hideAt = block.t0; cursorY = Math.max(0, cursorY - lines[j].lineH); removed++; }
        }
        continue;
      }
      if (block.kind === 'unhighlight') {
        for (const ln of lines) if (ln.highlight && ln.hideAt == null) ln.hideAt = block.t0;
        continue;
      }
      if (block.kind === 'highlight') {
        const tgt = block.target.toLowerCase();
        let match = null;
        for (const ln of lines) { if (ln.hideAt == null && ln.id && ln.id.toLowerCase() === tgt) { match = ln; break; } }
        if (!match) {
          for (const ln of lines) {
            if (ln.hideAt != null || ln.kind === 'stroke' || ln.kind === 'dot' || !ln.el.textContent) continue;
            if (ln.el.textContent.toLowerCase().indexOf(tgt) >= 0) { match = ln; break; }
          }
        }
        if (!match) continue;
        const wasHidden = match.el.style.display === 'none';
        if (wasHidden) match.el.style.display = '';
        let bb = null; try { bb = match.el.getBBox(); } catch (e) {}
        if (wasHidden) match.el.style.display = 'none';
        if (!bb || !bb.width) continue;
        const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        const el = mk('ellipse', { cx, cy, rx: bb.width / 2 + 2.4, ry: bb.height / 2 + 2.0, fill: 'none', stroke: resolveColor(block.color) || '#ecd35a', 'stroke-width': 0.55, 'stroke-linecap': 'round' }, contentG);
        const len = (el.getTotalLength && el.getTotalLength()) || 30;
        el.setAttribute('stroke-dasharray', len.toFixed(2));
        el.setAttribute('stroke-dashoffset', len.toFixed(2));
        el.style.display = 'none';
        lines.push({ el, kind: 'stroke', highlight: true, len: len || 1, revStart: block.t0, revEnd: block.t0 + block.drawDur, yBottom: 0, hideAt: block.stay == null ? null : block.t0 + block.drawDur + block.stay, x: cx, baseY: cy });
        continue;
      }
      if (block.kind === 'draw') {
        const boxW = Math.min(innerW, block.size > 0 ? block.size : Math.min(innerW, 42));
        const boxH = boxW * 0.78;
        const bx = r.x + pad, byTop = r.y + pad + cursorY;
        const X = nx => bx + nx * boxW, Y = ny => byTop + (1 - ny) * boxH;
        const items = [];
        const addStroke = (d, color) => {
          const el = mk('path', { d, fill: 'none', stroke: color || board.color, 'stroke-width': 0.45, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, contentG);
          const len = (el.getTotalLength && el.getTotalLength()) || 20;
          el.setAttribute('stroke-dasharray', len.toFixed(2));
          el.setAttribute('stroke-dashoffset', len.toFixed(2));
          el.style.display = 'none';
          items.push({ el, kind: 'stroke', len: len || 1 });
        };
        const addLabel = (x, y, text, size) => {
          const fs = size || board.fontSize * 0.78;
          const el = mk('text', { x, y, 'font-family': board.font, 'font-size': fs, fill: board.color }, contentG);
          el.textContent = String(text); el.style.display = 'none';
          items.push({ el, kind: 'label', width: measure(String(text), fs, false, false) || 2, x, baseY: y });
        };
        const addDot = (x, y, color) => {
          const el = mk('circle', { cx: x, cy: y, r: 0.9, fill: color || board.color }, contentG);
          el.style.display = 'none';
          items.push({ el, kind: 'dot', cx: x, cy: y });
        };
        for (const sh of block.shapes) {
          const i0 = items.length;
          const ty = sh.t || (sh.axes ? 'axes' : sh.dot ? 'dot' : sh.line ? 'line' : sh.label ? 'label' : 'curve');
          if (ty === 'axes') {
            const ox = X(0.06), oy = Y(0.06), xe = X(0.97), yt = Y(0.97);
            addStroke(`M ${ox} ${oy} L ${xe} ${oy} M ${(xe - 1.5).toFixed(2)} ${(oy - 0.9).toFixed(2)} L ${xe} ${oy} L ${(xe - 1.5).toFixed(2)} ${(oy + 0.9).toFixed(2)}`);
            addStroke(`M ${ox} ${oy} L ${ox} ${yt} M ${(ox - 0.9).toFixed(2)} ${(yt + 1.5).toFixed(2)} L ${ox} ${yt} L ${(ox + 0.9).toFixed(2)} ${(yt + 1.5).toFixed(2)}`);
            if (sh.xlabel) addLabel(X(0.58), oy + board.fontSize * 0.95, sh.xlabel, board.fontSize * 0.72);
            if (sh.ylabel) addLabel(X(0.0), yt - board.fontSize * 0.25, sh.ylabel, board.fontSize * 0.72);
          } else if (ty === 'curve' || ty === 'line') {
            const f = sh.from || [0.1, 0.1], to = sh.to || [0.9, 0.9];
            const x1 = X(f[0]), y1 = Y(f[1]), x2 = X(to[0]), y2 = Y(to[1]);
            const bow = num(sh.bow, 0);
            let d;
            if (ty === 'line' || !bow) d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`;
            else {
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, nl = Math.hypot(dx, dy) || 1;
              d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${(mx - dy / nl * bow * boxH * 0.5).toFixed(2)} ${(my + dx / nl * bow * boxH * 0.5).toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
            }
            addStroke(d, sh.color);
            if (sh.label) addLabel(x2 + 0.6, y2 + 0.3, sh.label, board.fontSize * 0.78);
          } else if (ty === 'dot') {
            const at = sh.at || [0.5, 0.5], x = X(at[0]), y = Y(at[1]);
            addDot(x, y, sh.color);
            if (sh.label) addLabel(x + 1.2, y + 0.2, sh.label, board.fontSize * 0.7);
          } else if (ty === 'label') {
            const at = sh.at || [0.5, 0.5];
            addLabel(X(at[0]), Y(at[1]), sh.text != null ? sh.text : '', sh.size || board.fontSize * 0.78);
          }
          if (sh.id != null) for (let k = i0; k < items.length; k++) items[k].id = String(sh.id);
        }
        const cost = it => it.kind === 'stroke' ? Math.max(2, it.len) : it.kind === 'label' ? Math.max(1.5, it.width) : 1.2;
        const total = items.reduce((s, it) => s + cost(it), 0) || 1;
        let acc = 0;
        for (const it of items) {
          it.revStart = block.t0 + block.dur * acc;
          acc += cost(it) / total;
          it.revEnd = block.t0 + block.dur * acc;
          it.yBottom = cursorY + boxH;
          it.hideAt = null;
          lines.push(it);
        }
        cursorY += boxH + board.fontSize * 0.8;
        continue;
      }

      // write
      const vlines = [];
      for (const para of parseMarkdown(block.md)) {
        if (para.type === 'gap') { vlines.push({ gap: true, lineH: board.fontSize * 0.7 }); continue; }
        if (para.type === 'hr') { vlines.push({ hr: true, lineH: board.fontSize * 1.1, indent: 0, width: innerW, size: board.fontSize }); continue; }
        for (const vl of layoutParagraph(para, board, innerW, measure)) {
          let asc = vl.size * 0.85, desc = vl.size * 0.35;
          for (const tk of vl.tokens) if (tk.math && tk.H != null) { asc = Math.max(asc, tk.ascent); desc = Math.max(desc, tk.H - tk.ascent); }
          vl.ascent = asc; vl.lineH = asc + desc + vl.size * 0.28;
          vlines.push(vl);
        }
      }
      const totalInk = vlines.reduce((s, vl) => s + (vl.gap ? 0 : (vl.width || 0.001)), 0) || 1;
      let acc = 0;
      for (const vl of vlines) {
        const yTop = cursorY;
        const revStart = block.t0 + block.dur * acc;
        acc += (vl.gap ? 0 : (vl.width || 0.001)) / totalInk;
        const revEnd = block.t0 + block.dur * acc;
        cursorY += vl.lineH;
        if (vl.gap) continue;
        const x = r.x + pad + (vl.indent || 0);
        const baseY = r.y + pad + yTop + (vl.ascent != null ? vl.ascent : (vl.size || board.fontSize) * 0.85);
        let el;
        if (vl.hr) {
          el = mk('line', { x1: x, y1: baseY, x2: x + innerW, y2: baseY, stroke: board.color, 'stroke-width': 0.3, 'stroke-linecap': 'round' }, contentG);
        } else if (vl.tokens && vl.tokens.some(t => t.math && t.mathEl)) {
          // flow layout: text runs interleaved with inline math SVGs
          el = mk('g', {}, contentG);
          let cx = x, runStart = x, run = null;
          const flush = () => { if (run) { cx = runStart + (run.getComputedTextLength() || 0); run = null; } };
          if (vl.bullet) { const b = mk('text', { x: cx, y: baseY, 'font-family': board.font, 'font-size': vl.size, fill: board.color }, el); b.textContent = '• '; cx += measure('• ', vl.size, false, false); }
          for (const tk of vl.tokens) {
            if (tk.math && tk.mathEl) {
              flush();
              const m = tk.mathEl;
              m.setAttribute('x', cx.toFixed(2)); m.setAttribute('y', (baseY - tk.ascent).toFixed(2));
              m.setAttribute('width', tk.W.toFixed(2)); m.setAttribute('height', tk.H.toFixed(2));
              m.style.width = ''; m.style.height = ''; m.style.color = tk.color || board.color;
              el.appendChild(m);
              cx += tk.W;
            } else {
              if (!run) { run = mk('text', { x: cx.toFixed(2), y: baseY, 'font-family': board.font, 'font-size': vl.size, fill: board.color }, el); run.style.whiteSpace = 'pre'; runStart = cx; }
              const ts = mk('tspan', {}, run);
              if (tk.bold) ts.setAttribute('font-weight', '700');
              if (tk.italic) ts.setAttribute('font-style', 'italic');
              if (tk.underline && !tk.space) ts.setAttribute('text-decoration', 'underline');
              if (tk.color) ts.setAttribute('fill', tk.color);
              ts.textContent = tk.text;
            }
          }
          flush();
        } else {
          el = mk('text', { x, y: baseY, 'font-family': board.font, 'font-size': vl.size, fill: board.color }, contentG);
          if (vl.bullet) { mk('tspan', {}, el).textContent = '• '; }
          for (const tk of vl.tokens) {
            const ts = mk('tspan', {}, el);
            if (tk.bold) ts.setAttribute('font-weight', '700');
            if (tk.italic) ts.setAttribute('font-style', 'italic');
            if (tk.underline && !tk.space) ts.setAttribute('text-decoration', 'underline');
            if (tk.color) ts.setAttribute('fill', tk.color);
            ts.textContent = tk.text;
          }
        }
        el.style.display = 'none';
        lines.push({ el, hr: !!vl.hr, revStart, revEnd, yBottom: yTop + vl.lineH, hideAt: null, x, baseY, width: vl.hr ? innerW : (vl.width || 0.001) });
      }
    }
    svg.removeChild(meas);
    const hand = (board.hand || board._hand) ? buildChalkHand(board, contentG) : null;
    return { board, lines, contentG, innerH, hand };
  };

  STICK.updateBoard = function (node, t) {
    const lines = node.lines;
    let maxBottom = 0, active = null, activeFrac = 0;
    for (const ln of lines) {
      const visible = t >= ln.revStart && (ln.hideAt == null || t < ln.hideAt);
      if (!visible) { ln.el.style.display = 'none'; continue; }
      ln.el.style.display = '';
      const frac = ln.revEnd > ln.revStart ? Math.min(1, Math.max(0, (t - ln.revStart) / (ln.revEnd - ln.revStart))) : 1;
      if (ln.kind === 'stroke') ln.el.setAttribute('stroke-dashoffset', (ln.len * (1 - frac)).toFixed(2));
      else if (ln.kind === 'dot') ln.el.setAttribute('opacity', frac.toFixed(2));
      else if (ln.hr) ln.el.setAttribute('x2', (ln.x + ln.width * frac).toFixed(2));
      else ln.el.style.clipPath = frac >= 1 ? 'none' : `inset(-20% ${((1 - frac) * 100).toFixed(2)}% -20% 0)`;
      if (ln.yBottom > maxBottom) maxBottom = ln.yBottom;
      if (frac > 0 && frac < 1 && (!active || ln.revStart >= active.revStart)) { active = ln; activeFrac = frac; }
    }
    node.contentG.setAttribute('transform', `translate(0 ${(-Math.max(0, maxBottom - node.innerH)).toFixed(2)})`);
    if (node.hand) {
      const p = active ? writePoint(active, activeFrac) : null;
      if (p) { node.hand.style.display = ''; node.hand.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`); }
      else node.hand.style.display = 'none';
    }
  };
})();
