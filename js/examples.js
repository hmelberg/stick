/* stick — bundled examples. These double as the regression suite and as
   few-shot material for PROMPT.md. Kept as plain JS so file:// works. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  STICK.examples = {
    'three styles': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'inky', style: 'ink', archetype: ['man'], pos: { x: 22, y: 70 }, mood: 'happy' },
        { id: 'sketchy', style: 'sketch', archetype: ['woman'], pos: { x: 50, y: 70 }, mood: 'happy' },
        { id: 'toony', style: 'toon', archetype: ['man'], pos: { x: 78, y: 70 }, mood: 'happy', bodyColor: '#b9cfe4' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'ink · sketch · toon — same JSON, different style', dur: 'slow' } },
        { at: 0.4, target: ['inky', 'sketchy', 'toony'], cmd: 'playClip', args: { name: 'wave' } },
        { target: 'sketchy', cmd: 'say', args: { text: 'I am the default now.' } },
        { at: '<', target: 'inky', cmd: 'lookAt', args: { to: 'sketchy.head' } },
        { at: '<', target: 'toony', cmd: 'lookAt', args: { to: 'sketchy.head' } },
        { target: ['inky', 'sketchy', 'toony'], cmd: 'playClip', args: { name: 'victory' } },
        { target: ['inky', 'sketchy', 'toony'], cmd: 'playClip', args: { name: 'bow' } },
      ],
    },

    'hello wave': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'pip', archetype: ['kid'], pos: { x: 16, y: 70 }, mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'stick — scenes from JSON', dur: 'slow' } },
        { at: 0, target: 'pip', cmd: 'move', args: { style: 'walk', to: { x: 46, y: 70 } } },
        { target: 'pip', cmd: 'playClip', args: { name: 'wave' } },
        { target: 'pip', cmd: 'say', args: { text: 'Hi! I came from JSON.' } },
        { target: 'pip', cmd: 'playClip', args: { name: 'hopJoy' } },
        { at: '<', target: 'pip', cmd: 'mood', args: { name: 'ecstatic' } },
        { cmd: 'scene.caption', args: { text: '(easily pleased)', dur: 'slow' } },
      ],
    },

    'classroom': {
      v: 1,
      scene: { theme: 'classroom' },
      figures: [
        { id: 'prof', character: 'professor', pos: { x: 62, y: 70 }, facing: 'left' },
        { id: 'stu', character: 'student', pos: { x: 82, y: 70 }, facing: 'left', mood: 'bored' },
      ],
      clips: {
        write: [
          { cmd: 'reachTo', dur: 'fast', args: { hand: 'right', to: 'board.write' } },
          { cmd: 'reachTo', dur: 'veryFast', args: { hand: 'right', to: [40.5, 50.2] } },
          { cmd: 'reachTo', dur: 'veryFast', args: { hand: 'right', to: [42.5, 51.3] } },
          { cmd: 'reachTo', dur: 'veryFast', args: { hand: 'right', to: [41, 50.6] } },
        ],
      },
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Lecture 7: Something Simple', dur: 'slow' } },
        { at: 0, target: 'prof', cmd: 'move', args: { style: 'walk', to: { x: 45.5, y: 70 } } },
        { target: 'prof', cmd: 'playClip', args: { name: 'write', repeat: 2 } },
        { at: '<', target: 'stu', cmd: 'mood', dur: 'slow', args: { name: 'bored' } },
        { target: 'prof', cmd: 'release', args: { hand: 'right' } },
        { target: 'prof', cmd: 'facing', args: { dir: 'right' } },
        { target: 'prof', cmd: 'say', args: { text: 'And that, obviously, is that.' } },
        { at: '<+fast', target: 'stu', cmd: 'emote', args: { symbol: '?' } },
        { at: '<', target: 'stu', cmd: 'mood', args: { name: 'thinking' } },
        { target: 'stu', cmd: 'playClip', args: { name: 'scratchHead' } },
        { target: 'stu', cmd: 'playClip', args: { name: 'shrugOnce' } },
        { target: 'stu', cmd: 'say', args: { text: 'Crystal clear.' } },
        { cmd: 'scene.caption', args: { text: 'It was not.', dur: 'slow' } },
      ],
    },

    'moonwalk': {
      v: 1,
      scene: { theme: 'street' },
      figures: [
        { id: 'mj', character: 'dancer', pos: { x: 18, y: 70 } },
        { id: 'fan', archetype: ['woman'], pos: { x: 88, y: 70 }, facing: 'left', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Friday night.', dur: 'normal' } },
        { at: 0, target: 'mj', cmd: 'move', args: { style: 'walk', to: { x: 40, y: 70 } } },
        { target: 'mj', cmd: 'pose.tween', dur: 'fast', args: { stance: 'together' } },
        { target: 'mj', cmd: 'pin', args: { foot: 'both' } },
        { target: 'mj', cmd: 'pose.tween', dur: 'quick', args: { tilt: 24, bend: -0.04 } },
        { at: '<', target: 'fan', cmd: 'mood', args: { name: 'surprised' } },
        { at: '<+quick', target: 'mj', cmd: 'emote', args: { symbol: 'music' } },
        { target: 'mj', cmd: 'pose.tween', dur: 'quick', args: { tilt: 0 } },
        { target: 'mj', cmd: 'release', args: { foot: 'both' } },
        { target: 'mj', cmd: 'move', args: { style: 'moonwalk', to: { x: 72, y: 70 } } },
        { at: '<', target: 'fan', cmd: 'playClip', args: { name: 'clapOnce', repeat: 3 } },
        { at: '<', target: 'fan', cmd: 'mood', args: { name: 'ecstatic' } },
        { target: 'fan', cmd: 'say', args: { text: 'He floats!' } },
        { at: '<', target: 'mj', cmd: 'playClip', args: { name: 'bow' } },
        { cmd: 'scene.caption', args: { text: 'Physics left the chat.', dur: 'slow' } },
      ],
    },

    'John Cleese silly walks': {
      v: 1,
      scene: { theme: 'street' },
      figures: [
        { id: 'mr', archetype: ['man'], hat: 'fedora', pos: { x: 14, y: 70 }, mood: 'neutral' },
        { id: 'clerk', archetype: ['woman'], pos: { x: 90, y: 70 }, facing: 'left', mood: 'neutral' },
      ],
      clips: {
        // one full silly stride: a straight-legged high kick on each side,
        // stiff arms swinging opposite, torso held bolt upright
        silly: [
          { cmd: 'joints', dur: 'fast', ease: 'backOut', args: { hipL: 122, kneeL: 0, shoulderR: 72, elbowR: 0, shoulderL: -28, elbowL: 0 } },
          { at: '<', cmd: 'pose.tween', dur: 'fast', args: { bend: -0.07, headTilt: -0.05 } },
          { cmd: 'joints', dur: 'fast', args: { hipL: 0, kneeL: 0, shoulderR: 0, shoulderL: 0 } },
          { cmd: 'joints', dur: 'fast', ease: 'backOut', args: { hipR: 122, kneeR: 0, shoulderL: 72, elbowL: 0, shoulderR: -28, elbowR: 0 } },
          { cmd: 'joints', dur: 'fast', args: { hipR: 0, kneeR: 0, shoulderL: 0, shoulderR: 0 } },
        ],
      },
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'The Ministry of Silly Walks', dur: 'slow' } },
        { at: 0, target: 'mr', cmd: 'move', dur: 'normal', args: { style: 'walk', to: { x: 30, y: 70 } } },
        { target: 'mr', cmd: 'say', args: { text: 'Good morning. I have a silly walk.' } },
        { cmd: 'scene.caption', args: { text: 'He would like it subsidised.', dur: 'normal' } },
        // travels across while performing the walk — move and clip run together,
        // so the kicks layer on top of the gait
        { target: 'mr', cmd: 'move', dur: 'verySlow', args: { style: 'walk', to: { x: 72, y: 70 } } },
        { at: '<', target: 'mr', cmd: 'playClip', args: { name: 'silly', repeat: 3 } },
        { at: '<+normal', target: 'clerk', cmd: 'mood', args: { name: 'surprised' } },
        { at: '<', target: 'clerk', cmd: 'emote', args: { symbol: '!' } },
        { target: 'clerk', cmd: 'say', args: { text: 'That is a very silly walk.' } },
        { at: '<', target: 'mr', cmd: 'playClip', args: { name: 'bow' } },
        { cmd: 'scene.caption', args: { text: 'Funding approved.', dur: 'slow' } },
      ],
    },

    'juggler': {
      v: 1,
      scene: { theme: 'street' },
      figures: [
        { id: 'jo', archetype: ['man'], pos: { x: 50, y: 70 }, mood: 'happy' },
      ],
      objects: [
        { id: 'b1', shape: 'circle', layer: 'front', props: { cx: 46, cy: 58, r: 2.2, fill: '#e0533a' } },
        { id: 'b2', shape: 'circle', layer: 'front', props: { cx: 54, cy: 58, r: 2.2, fill: '#3a86e0' } },
        { id: 'b3', shape: 'circle', layer: 'front', props: { cx: 46, cy: 58, r: 2.2, fill: '#2fae66' } },
      ],
      clips: {
        // one full cycle: toss to the far hand, then back. arc does the parabola.
        cycleL: [
          { cmd: 'arc', dur: 'quick', args: { to: { x: 54, y: 58 }, height: 22, spin: 1 } },
          { cmd: 'arc', dur: 'quick', args: { to: { x: 46, y: 58 }, height: 22, spin: 1 } },
        ],
        cycleR: [
          { cmd: 'arc', dur: 'quick', args: { to: { x: 46, y: 58 }, height: 24, spin: -1 } },
          { cmd: 'arc', dur: 'quick', args: { to: { x: 54, y: 58 }, height: 24, spin: -1 } },
        ],
      },
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Three balls, no dropping. Allegedly.', dur: 'slow' } },
        // raise forearms into a juggling stance and look up
        { at: 0, target: 'jo', cmd: 'joints', dur: 'fast', args: { shoulderL: 38, elbowL: 112, shoulderR: 38, elbowR: 112 } },
        { at: '<', target: 'jo', cmd: 'pose.tween', dur: 'fast', args: { headTilt: -0.12 } },
        // three balls staggered one third of a cycle apart -> a cascade
        { at: 0.5, target: 'b1', cmd: 'playClip', args: { name: 'cycleL', repeat: 4 } },
        { at: 0.83, target: 'b2', cmd: 'playClip', args: { name: 'cycleR', repeat: 4 } },
        { at: 1.16, target: 'b3', cmd: 'playClip', args: { name: 'cycleL', repeat: 4 } },
        { at: 4.2, cmd: 'scene.caption', args: { text: 'Ta-da.', dur: 'slow' } },
      ],
    },

    'lecture': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [
        { id: 'bb', rect: { x: 5, y: 6, w: 56, h: 60 }, style: 'chalk' },
      ],
      figures: [
        { id: 'prof', character: 'professor', pos: { x: 70, y: 70 }, facing: 'front' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Econ 101', dur: 'normal' } },
        { at: 0, target: 'bb', cmd: 'board.write', by: 'prof', dur: 'normal', args: { md: '# {amber|Supply} & {sky|Demand}' } },
        { target: 'prof', cmd: 'say', args: { text: 'Two curves, one story.' } },
        { target: 'prof', cmd: 'turn', args: { to: 'back' } }, // turn to the board to draw
        { target: 'bb', cmd: 'board.draw', by: 'prof', dur: 'slow', args: { chart: 'supply-demand', xlabel: 'Quantity', ylabel: 'Price' } },
        { at: '<+slow', target: 'prof', cmd: 'turn', args: { to: 'front' } }, // back to the class
        { target: 'bb', cmd: 'board.highlight', args: { target: 'demand', color: 'sky', dur: 2.2 } },
        { at: '<', target: 'prof', cmd: 'say', args: { text: 'Demand slopes down.' } },
        { target: 'bb', cmd: 'board.highlight', args: { target: 'supply', color: 'amber', dur: 2.2 } },
        { at: '<', target: 'prof', cmd: 'say', args: { text: 'Supply slopes up.' } },
        { target: 'bb', cmd: 'board.highlight', args: { target: 'equilibrium', color: 'yellow', dur: 2.8 } },
        { at: '<', target: 'prof', cmd: 'say', args: { text: 'They meet here — equilibrium.' } },
        { at: '<', target: 'prof', cmd: 'playClip', args: { name: 'nod' } },
        { cmd: 'camera.focus', dur: 'normal', args: { on: 'bb' } },
        { cmd: 'scene.caption', args: { text: 'Read it well.', dur: 'normal' } },
        { cmd: 'camera.reset', dur: 'normal' },
        { cmd: 'scene.caption', args: { text: 'Class dismissed.', dur: 'slow' } },
      ],
    },

    'standup': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [
        { id: 'wb', rect: { x: 6, y: 6, w: 58, h: 60 }, style: 'marker' },
      ],
      figures: [
        { id: 'lee', archetype: ['woman'], pos: { x: 72, y: 70 }, facing: 'left', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Monday standup', dur: 'normal' } },
        { at: 0, target: 'wb', cmd: 'board.write', by: 'lee', dur: 'slow', args: { md: '# Sprint Goals\n\n- Ship **boards**\n- Fix the *scroll* bug\n- Write the demo' } },
        { target: 'lee', cmd: 'say', args: { text: 'Three things this week.' } },
        { at: '<', target: 'lee', cmd: 'playClip', args: { name: 'nod' } },
        { target: 'wb', cmd: 'board.write', by: 'lee', dur: 'normal', args: { md: '\n---\nDone by __Friday__.' } },
        { target: 'lee', cmd: 'say', args: { text: 'Then we ship.' } },
        { at: '<', target: 'lee', cmd: 'playClip', args: { name: 'victory' } },
        { cmd: 'scene.caption', args: { text: 'Easy.', dur: 'slow' } },
      ],
    },

    'journey': {
      v: 1,
      scene: {
        theme: 'blank', parallax: true,
        elements: [
          { type: 'repeat', props: { of: { type: 'rect', props: { x: 0, y: 38, w: 9, h: 32, fill: '#e3d8c6' } }, from: 8, to: 220, step: 28 } },
          { type: 'repeat', props: { of: { type: 'circle', props: { cx: 0, cy: 16, r: 1.2, fill: '#ccc2ad' } }, from: 20, to: 220, step: 17 } },
        ],
      },
      figures: [
        { id: 'sam', archetype: ['man'], pos: { x: 16, y: 70 }, mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Off we go.', dur: 'normal' } },
        { at: 0, target: 'sam', cmd: 'move', args: { style: 'walk', to: { x: 150, y: 70 } }, dur: 6 },
        { at: '<', cmd: 'camera.follow', args: { target: 'sam', offset: -6 }, dur: 6 },
        { at: 2, cmd: 'scene.fade', args: { to: 'street' }, dur: 2 },
        { at: 4.4, target: 'sam', cmd: 'say', args: { text: 'Almost there…' } },
        { at: 5.4, cmd: 'camera.tilt', args: { to: 5, dur: 'quick' } },
        { cmd: 'scene.caption', args: { text: 'Fin.', dur: 'slow' } },
      ],
    },

    'the pitch': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [{ id: 'wb', rect: { x: 5, y: 6, w: 54, h: 58 }, style: 'marker' }],
      figures: [
        { id: 'founder', archetype: ['man'], pos: { x: 68, y: 70 }, facing: 'left', mood: 'ecstatic' },
        { id: 'vc', archetype: ['woman'], pos: { x: 88, y: 70 }, facing: 'left', mood: 'bored' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Series A pitch', dur: 'normal' } },
        { at: 0, target: 'wb', cmd: 'board.write', by: 'founder', dur: 'normal', args: { md: '# {green|Growth}' } },
        { target: 'wb', cmd: 'board.draw', by: 'founder', dur: 'slow', args: { shapes: [
          { t: 'axes', xlabel: 'Time', ylabel: '$' },
          { t: 'curve', id: 'hockey', from: [0.08, 0.12], to: [0.92, 0.95], bow: -0.6, label: 'us', color: 'green' },
        ] } },
        { target: 'founder', cmd: 'say', args: { text: 'It only goes up!' } },
        { target: 'wb', cmd: 'board.highlight', args: { target: 'hockey', color: 'green', dur: 2.4 } },
        { at: '<', target: 'vc', cmd: 'say', args: { text: 'And revenue?' } },
        { target: 'founder', cmd: 'say', args: { text: 'Pre-revenue. Post-vibes.' } },
        { at: '<', target: 'vc', cmd: 'emote', args: { symbol: '?' } },
        { target: 'vc', cmd: 'mood', args: { name: 'thinking' } },
        { cmd: 'scene.caption', args: { text: 'They invested anyway.', dur: 'slow' } },
      ],
    },

    'motivation': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [{ id: 'bb', rect: { x: 6, y: 6, w: 58, h: 58 }, style: 'chalk' }],
      figures: [{ id: 'guru', character: 'professor', pos: { x: 72, y: 70 }, facing: 'left', mood: 'ecstatic' }],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Seminar: Crushing It™', dur: 'normal' } },
        { at: 0, target: 'bb', cmd: 'board.write', by: 'guru', dur: 'normal', args: { md: '# {amber|Believe!}' } },
        { target: 'bb', cmd: 'board.draw', by: 'guru', dur: 'slow', args: { shapes: [
          { t: 'axes', xlabel: 'Effort', ylabel: 'Success' },
          { t: 'curve', from: [0.08, 0.9], to: [0.92, 0.12], label: 'me', color: 'red' },
        ] } },
        { target: 'guru', cmd: 'say', args: { text: 'Up and to the right!' } },
        { at: '<', target: 'guru', cmd: 'playClip', args: { name: 'victory' } },
        { cmd: 'scene.caption', args: { text: '(it was down and to the right)', dur: 'slow' } },
      ],
    },

    'breaking news': {
      v: 1,
      scene: { theme: 'street' },
      figures: [{ id: 'anchor', archetype: ['woman'], pos: { x: 50, y: 70 }, mood: 'surprised' }],
      timeline: [
        { at: 0, cmd: 'camera.shake', args: { amount: 1.8, dur: 'quick' } },
        { at: 0, cmd: 'scene.caption', args: { text: 'BREAKING NEWS', dur: 'normal' } },
        { at: 0.5, target: 'anchor', cmd: 'say', args: { text: 'Local man animates stick figures instead of working.' } },
        { target: 'anchor', cmd: 'mood', args: { name: 'thinking' } },
        { cmd: 'camera.zoom', dur: 'normal', args: { scale: 1.6, to: 'anchor.head' } },
        { target: 'anchor', cmd: 'say', args: { text: 'He calls it "research".' } },
        { cmd: 'camera.tilt', args: { to: 6, dur: 'quick' } },
        { cmd: 'scene.caption', args: { text: 'More at 11.', dur: 'slow' } },
        { cmd: 'camera.reset', dur: 'normal' },
      ],
    },

    'marginal cost': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [{ id: 'bb', rect: { x: 5, y: 6, w: 58, h: 60 }, style: 'chalk' }],
      figures: [{ id: 'prof', character: 'professor', pos: { x: 72, y: 70 }, facing: 'left' }],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'A little calculus', dur: 'normal' } },
        { at: 0, target: 'bb', cmd: 'board.write', by: 'prof', dur: 'slow', args: { md: '# {amber|Marginal cost}\n\nThe derivative of total cost:\n\n$$MC = \\frac{dC}{dQ}$$' } },
        { target: 'prof', cmd: 'say', args: { text: 'The slope of the cost curve.' } },
        { target: 'bb', cmd: 'board.write', by: 'prof', dur: 'slow', args: { md: 'So if $C = Q^2$ then $MC = 2Q$.\n\nAsciiMath too: `sum_(i=1)^n i = n(n+1)/2`' } },
        { at: '<', target: 'prof', cmd: 'playClip', args: { name: 'nod' } },
        { cmd: 'scene.caption', args: { text: 'Q.E.D.', dur: 'slow' } },
      ],
    },

    'naptime': {
      v: 1,
      scene: { theme: 'bedroom' },
      figures: [
        { id: 'mo', archetype: ['kid'], pos: { x: 24, y: 70 }, mood: 'sleepy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'A long day of being JSON.', dur: 'slow' } },
        { at: 0, target: 'mo', cmd: 'move', args: { style: 'walk', to: { x: 62, y: 70 } } },
        { target: 'mo', cmd: 'playClip', args: { name: 'stretchYawn' } },
        { target: 'mo', cmd: 'move', dur: 'quick', args: { style: 'walk', to: { x: 72, y: 64.8 } } },
        { target: 'mo', cmd: 'pose.tween', dur: 'slow', args: { base: 'lie' } },
        { at: '<', cmd: 'camera.zoom', dur: 'verySlow', args: { scale: 1.45, to: { x: 66, y: 56 } } },
        { target: 'mo', cmd: 'emote', args: { symbol: 'zzz', dur: 'verySlow' } },
        { at: '-slow', target: 'mo', cmd: 'emote', args: { symbol: 'zzz', dur: 'verySlow' } },
        { cmd: 'scene.caption', args: { text: 'goodnight.', dur: 'verySlow' } },
      ],
    },

    'floating heads': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'prof', character: 'professor', body: 'bust', pos: { x: 32, y: 46 }, facing: 'front', mood: 'happy' },
        { id: 'tutor', archetype: ['woman'], body: 'bust', pos: { x: 70, y: 46 }, facing: 'front' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Talking heads (body: "bust")', dur: 'normal' } },
        { at: 0.3, target: 'prof', cmd: 'raiseArm', dur: 'quick', args: { side: 'right', angle: 150 } },
        { at: '<', cmd: 'camera.focus', dur: 'normal', args: { on: 'prof.face' } },
        { target: 'prof', cmd: 'say', args: { text: 'No body needed to explain things.' } },
        { at: '<', target: 'prof', cmd: 'playClip', args: { name: 'nod' } },
        { target: 'prof', cmd: 'lowerArm', dur: 'quick', args: { side: 'right' } },
        { cmd: 'camera.focus', dur: 'normal', args: { on: 'tutor.face' } },
        { target: 'tutor', cmd: 'say', args: { text: 'Just a head, a neck, and waving arms.' } },
        { at: '<', target: 'tutor', cmd: 'playClip', args: { name: 'wave' } },
        { cmd: 'camera.reset', dur: 'normal' },
        { cmd: 'scene.caption', args: { text: 'Handy for explainers.', dur: 'slow' } },
      ],
    },

    'feelings': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'mira', archetype: ['woman'], pos: { x: 50, y: 72 }, facing: 'front', mood: 'neutral' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Subtle emotions, up close', dur: 'normal' } },
        { at: 0.2, cmd: 'camera.focus', dur: 'normal', args: { on: 'mira.face' } },
        { target: 'mira', cmd: 'mood', dur: 'slow', args: { name: 'happy', animated: true } },
        { target: 'mira', cmd: 'say', args: { text: 'A close-up reads the smallest change.' } },
        { target: 'mira', cmd: 'mood', dur: 'slow', args: { name: 'sad', animated: true } },
        { at: '<', target: 'mira', cmd: 'say', args: { text: '…or a quiet frown.' } },
        { target: 'mira', cmd: 'mood', dur: 'slow', args: { name: 'surprised', animated: true } },
        { at: '<', target: 'mira', cmd: 'emote', args: { symbol: '!' } },
        { target: 'mira', cmd: 'mood', dur: 'normal', args: { name: 'happy', animated: true } },
        { cmd: 'camera.reset', dur: 'normal' },
        { cmd: 'scene.caption', args: { text: 'Zoom in for feeling.', dur: 'slow' } },
      ],
    },

    'family walk': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'dad', archetype: ['man'], hair: 'short', pos: { x: 16, y: 72 } },
        { id: 'mum', archetype: ['woman'], hair: 'long', pos: { x: 13, y: 72 } },
        { id: 'girl', archetype: ['kid'], hair: 'long', pos: { x: 10, y: 72 }, mood: 'happy' },
        { id: 'boy', archetype: ['kid'], hair: 'tuft', pos: { x: 7, y: 72 }, mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Family outing', dur: 'normal' } },
        { at: 0, target: 'dad', cmd: 'move', args: { style: 'walk', to: { x: 84, y: 72 } }, dur: 7 },
        { at: 0, target: 'mum', cmd: 'move', args: { style: 'walk', to: { x: 80, y: 72 } }, dur: 7 },
        { at: 0, target: 'girl', cmd: 'move', args: { style: 'walk', to: { x: 75, y: 72 } }, dur: 7 },
        { at: 0, target: 'boy', cmd: 'move', args: { style: 'walk', to: { x: 70, y: 72 } }, dur: 7 },
        { at: 2.0, target: 'boy', cmd: 'say', args: { text: 'Are we there yet?' } },
        { at: 3.2, target: 'dad', cmd: 'say', args: { text: 'Almost!' } },
        { at: 4.4, target: 'girl', cmd: 'say', args: { text: 'Race you!' } },
        { at: '<', target: 'girl', cmd: 'playClip', args: { name: 'hopJoy' } },
        { at: 6.2, cmd: 'scene.caption', args: { text: '(the kids bounce, the grown-ups trudge)', dur: 'slow' } },
      ],
    },

    'three generations': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'kid', archetype: ['kid'], pos: { x: 14, y: 72 }, mood: 'happy' },
        { id: 'mum', archetype: ['woman'], age: 'adult', pos: { x: 12, y: 72 } },
        { id: 'gran', archetype: ['woman'], age: 'elderly', pos: { x: 10, y: 72 } },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Same walk, three ages', dur: 'normal' } },
        { at: 0, target: 'kid', cmd: 'move', args: { style: 'walk', to: { x: 92, y: 72 } }, dur: 6 },
        { at: 0, target: 'mum', cmd: 'move', args: { style: 'walk', to: { x: 80, y: 72 } }, dur: 6 },
        { at: 0, target: 'gran', cmd: 'move', args: { style: 'walk', to: { x: 56, y: 72 } }, dur: 6 },
        { at: 2.2, target: 'kid', cmd: 'say', args: { text: 'Keep up!' } },
        { at: 3.0, target: 'gran', cmd: 'say', args: { text: 'In my day we shuffled.' } },
        { at: 6.2, cmd: 'scene.caption', args: { text: 'kid bounces · gran shuffles', dur: 'slow' } },
      ],
    },

    'props': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'ann', archetype: ['woman'], hair: 'long', pos: { x: 24, y: 72 }, facing: 'right' },
        { id: 'ben', archetype: ['man'], hair: 'short', pos: { x: 72, y: 72 }, facing: 'left' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Heads up!', dur: 'normal' } },
        { at: 0.4, target: 'ann', cmd: 'give', args: { prop: 'ball', hand: 'right' } },
        { at: 0.9, target: 'ann', cmd: 'say', args: { text: 'Catch!' } },
        { at: 1.9, target: 'ann', cmd: 'throw', args: { hand: 'right', to: { x: 67, y: 62 }, spin: 2 } },
        { at: 3.1, target: 'ben', cmd: 'pickUp', args: { object: 'ann_ball', hand: 'right' } },
        { at: 4.1, target: 'ben', cmd: 'say', args: { text: 'Thanks!' } },
        { at: 4.5, target: 'ben', cmd: 'give', args: { prop: 'coffee', hand: 'left' } },
        { at: 5.3, target: 'ben', cmd: 'handOff', args: { to: 'ann', hand: 'left', toHand: 'right' } },
        { at: '<', target: 'ben', cmd: 'say', args: { text: 'Coffee?' } },
        { at: 6.6, cmd: 'scene.caption', args: { text: 'give · throw · catch · hand off', dur: 'slow' } },
      ],
    },

    'cheers': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'mia', archetype: ['woman'], hair: 'long', pos: { x: 36, y: 72 }, facing: 'right', mood: 'happy' },
        { id: 'leo', archetype: ['man'], pos: { x: 62, y: 72 }, facing: 'left', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'A toast', dur: 'normal' } },
        { at: 0.3, target: 'mia', cmd: 'give', args: { prop: 'coffee', hand: 'right' } },
        { at: 0.3, target: 'leo', cmd: 'give', args: { prop: 'coffee', hand: 'left' } },
        { at: 1.2, target: 'mia', cmd: 'raiseArm', args: { side: 'right', angle: 70 } },
        { at: '<', target: 'leo', cmd: 'raiseArm', args: { side: 'left', angle: 70 } },
        { target: 'mia', cmd: 'say', args: { text: 'To props!' } },
        { at: '<', target: 'leo', cmd: 'say', args: { text: 'Cheers!' } },
        { target: ['mia', 'leo'], cmd: 'playClip', args: { name: 'nod' } },
      ],
    },

    'en garde': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'kai', archetype: ['man'], pos: { x: 42, y: 72 }, facing: 'right', mood: 'angry' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'En garde!', dur: 'normal' } },
        { at: 0.3, target: 'kai', cmd: 'give', args: { prop: 'sword', hand: 'right' } },
        { at: 0.8, target: 'kai', cmd: 'raiseArm', args: { side: 'right', angle: 92 } },
        { target: 'kai', cmd: 'say', args: { text: 'Have at you!' } },
        { target: 'kai', cmd: 'raiseArm', dur: 'fast', args: { side: 'right', angle: 130 } },
        { target: 'kai', cmd: 'raiseArm', dur: 'fast', args: { side: 'right', angle: 70 } },
        { target: 'kai', cmd: 'raiseArm', dur: 'fast', args: { side: 'right', angle: 95 } },
        { cmd: 'scene.caption', args: { text: 'Touché.', dur: 'slow' } },
      ],
    },

    'balloon': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'pip', archetype: ['kid'], hair: 'tuft', pos: { x: 28, y: 72 }, facing: 'right', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'My balloon!', dur: 'normal' } },
        { at: 0.3, target: 'pip', cmd: 'give', args: { prop: 'balloon', hand: 'right', color: '#e74c3c' } },
        { at: 1.0, target: 'pip', cmd: 'move', args: { style: 'walk', to: { x: 56, y: 72 } }, dur: 2.2 },
        { at: 3.6, target: 'pip', cmd: 'drop', args: { hand: 'right', to: { x: 64, y: 6 } } },
        { at: '<', target: 'pip', cmd: 'mood', args: { name: 'surprised' } },
        { at: '+fast', target: 'pip', cmd: 'lookAt', args: { to: { x: 64, y: 10 } } },
        { target: 'pip', cmd: 'say', args: { text: 'Come back!' } },
        { cmd: 'scene.caption', args: { text: '(gone)', dur: 'slow' } },
      ],
    },

    'emotions': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'mo', archetype: ['woman'], hair: 'long', pos: { x: 50, y: 74 }, facing: 'front', mood: 'neutral' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Feelings, now with more feelings', dur: 'normal' } },
        { at: 0.3, cmd: 'camera.focus', dur: 'normal', args: { on: 'mo.face' } },
        { target: 'mo', cmd: 'mood', dur: 'slow', args: { name: 'laughing', animated: true } },
        { at: '<', target: 'mo', cmd: 'say', args: { text: 'Ha! Brilliant.' } },
        { target: 'mo', cmd: 'mood', dur: 'slow', args: { name: 'confused', animated: true } },
        { at: '<', target: 'mo', cmd: 'emote', args: { symbol: '?' } },
        { target: 'mo', cmd: 'mood', dur: 'slow', args: { name: 'crying', animated: true } },
        { at: '<', target: 'mo', cmd: 'say', args: { text: '…oh no.' } },
        { target: 'mo', cmd: 'mood', dur: 'slow', args: { name: 'love', animated: true } },
        { at: '<', target: 'mo', cmd: 'emote', args: { symbol: 'heart' } },
        { target: 'mo', cmd: 'mood', dur: 'normal', args: { name: 'proud', animated: true } },
        { cmd: 'camera.reset', dur: 'normal' },
        { cmd: 'scene.caption', args: { text: 'laugh · confused · cry · love · proud', dur: 'slow' } },
      ],
    },

    'intensity': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'a', archetype: ['man'], pos: { x: 22, y: 72 }, facing: 'front' },
        { id: 'b', archetype: ['man'], pos: { x: 50, y: 72 }, facing: 'front' },
        { id: 'c', archetype: ['man'], pos: { x: 78, y: 72 }, facing: 'front' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Same mood, dialled up', dur: 'normal' } },
        { at: 1.0, target: 'a', cmd: 'mood', dur: 'slow', args: { name: 'angry', intensity: 0.5, animated: true } },
        { at: '<', target: 'b', cmd: 'mood', dur: 'slow', args: { name: 'angry', animated: true } },
        { at: '<', target: 'c', cmd: 'mood', dur: 'slow', args: { name: 'very angry', animated: true } },
        { at: '+normal', target: 'a', cmd: 'say', args: { text: 'A bit cross.' } },
        { target: 'c', cmd: 'say', args: { text: 'FURIOUS!' } },
        { at: '<', target: 'c', cmd: 'emote', args: { symbol: '!' } },
        { cmd: 'scene.caption', args: { text: 'slightly · normal · very', dur: 'slow' } },
      ],
    },

    'mood gallery': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'fa', archetype: ['woman'], hair: 'long', pos: { x: 50, y: 78 }, facing: 'front', mood: 'neutral' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Every mood', dur: 'normal' } },
        { at: 0, cmd: 'camera.cut', args: { on: 'fa.face' } },
        { at: 1.1, target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'happy', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'happy', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'laughing', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'laughing', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'sad', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'sad', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'crying', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'crying', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'angry', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'angry', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'surprised', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'surprised', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'scared', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'scared', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'confused', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'confused', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'disgusted', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'disgusted', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'embarrassed', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'embarrassed', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'love', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'in love', dur: 'normal' } },
        { at: '<', target: 'fa', cmd: 'emote', args: { symbol: 'heart' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'proud', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'proud', dur: 'normal' } },
        { target: 'fa', cmd: 'mood', dur: 'fast', args: { name: 'sleepy', animated: true } },
        { at: '<', cmd: 'scene.caption', args: { text: 'sleepy', dur: 'normal' } },
        { cmd: 'camera.reset', dur: 'normal' },
      ],
    },

    'sunset': {
      v: 1,
      scene: { theme: 'street' },
      figures: [
        { id: 'sam', archetype: ['man'], pos: { x: 30, y: 70 }, facing: 'right', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Golden hour', dur: 'normal' } },
        { at: 0.4, cmd: 'scene.tint', dur: 'slow', args: { to: 'sunset' } },
        { at: '<', target: 'sam', cmd: 'move', args: { style: 'walk', to: { x: 64, y: 70 } }, dur: 3 },
        { target: 'sam', cmd: 'say', args: { text: 'What a view.' } },
        { cmd: 'scene.tint', dur: 'verySlow', args: { to: 'night', amount: 0.5 } },
        { at: '<+slow', target: 'sam', cmd: 'mood', args: { name: 'sleepy', animated: true } },
        { cmd: 'scene.caption', args: { text: 'Night falls.', dur: 'slow' } },
      ],
    },

    'daydream': {
      v: 1,
      scene: { theme: 'classroom' },
      figures: [
        { id: 'stu', character: 'student', pos: { x: 76, y: 70 }, facing: 'left', mood: 'bored' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Double maths', dur: 'normal' } },
        { at: 0.6, target: 'stu', cmd: 'think', args: { text: 'Is it lunch yet?' } },
        { target: 'stu', cmd: 'mood', args: { name: 'sleepy', animated: true } },
        { target: 'stu', cmd: 'think', args: { text: 'Pizza would be nice.' } },
        { at: '<', target: 'stu', cmd: 'emote', args: { symbol: 'idea' } },
        { cmd: 'scene.caption', args: { text: 'Focus, kid.', dur: 'slow' } },
      ],
    },

    'flowchart': {
      v: 1,
      scene: { theme: 'blank' },
      objects: [
        { id: 'idea', shape: 'text', layer: 'mid', props: { x: 24, y: 30, text: 'Idea', size: 5, fill: '#2a2a35' } },
        { id: 'ship', shape: 'text', layer: 'mid', props: { x: 70, y: 30, text: 'Ship it', size: 5, fill: '#2a2a35' } },
        { id: 'prof', shape: 'text', layer: 'mid', props: { x: 47, y: 56, text: 'Profit?', size: 5, fill: '#2a2a35' } },
      ],
      figures: [
        { id: 'p', archetype: ['man'], pos: { x: 14, y: 70 }, facing: 'right', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'The plan', dur: 'normal' } },
        { at: 0.5, cmd: 'arrow', dur: 'fast', args: { from: { x: 33, y: 29 }, to: { x: 61, y: 29 }, color: '#3a86e0' } },
        { cmd: 'arrow', dur: 'fast', args: { from: { x: 71, y: 35 }, to: { x: 51, y: 52 }, color: '#3a86e0' } },
        { target: 'p', cmd: 'point', args: { hand: 'right', to: 'prof' } },
        { target: 'p', cmd: 'say', args: { text: 'Foolproof.' } },
      ],
    },

    'detour': {
      v: 1,
      scene: { theme: 'blank' },
      objects: [
        { id: 'puddle', shape: 'ellipse', layer: 'back', props: { cx: 50, cy: 70, rx: 9, ry: 1.8, fill: '#9cc3e0' } },
      ],
      figures: [
        { id: 'sam', archetype: ['man'], pos: { x: 12, y: 70 }, facing: 'right', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Mind the puddle', dur: 'normal' } },
        { at: 0.6, target: 'sam', cmd: 'move', args: { style: 'walk', to: { x: 86, y: 70 }, via: [{ x: 40, y: 70 }, { x: 50, y: 58 }, { x: 60, y: 70 }] }, dur: 4 },
        { target: 'sam', cmd: 'say', args: { text: 'Phew.' } },
      ],
    },

    'celebrate': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'win', archetype: ['woman'], hair: 'long', pos: { x: 50, y: 70 }, facing: 'front', mood: 'ecstatic' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'We won!', dur: 'normal' } },
        { at: 0.4, target: 'win', cmd: 'playClip', args: { name: 'victory' } },
        { at: '<', target: 'win', cmd: 'burst', args: { count: 24 } },
        { target: 'win', cmd: 'say', args: { text: 'Yesss!' } },
        { at: '<', target: 'win', cmd: 'burst', args: { count: 18, spread: 1.4 } },
        { target: 'win', cmd: 'playClip', args: { name: 'hopJoy' } },
      ],
    },

    'moving day': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'mover', archetype: ['man'], pos: { x: 18, y: 70 }, facing: 'right', mood: 'neutral' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Moving day', dur: 'normal' } },
        { at: 0.4, target: 'mover', cmd: 'give', args: { prop: 'box', hand: 'both' } },
        { target: 'mover', cmd: 'say', args: { text: 'Heavy…' } },
        { at: '<', target: 'mover', cmd: 'mood', args: { name: 'worried', animated: true } },
        { target: 'mover', cmd: 'move', args: { style: 'walk', to: { x: 78, y: 70 } }, dur: 3 },
        { target: 'mover', cmd: 'drop', args: { hand: 'both', to: 'ground' } },
        { at: '<', target: 'mover', cmd: 'mood', args: { name: 'happy', animated: true } },
        { cmd: 'scene.caption', args: { text: 'Just 40 more.', dur: 'slow' } },
      ],
    },

    'sound effects': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'bo', archetype: ['man'], pos: { x: 30, y: 70 }, facing: 'right', mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Turn sound on 🔊', dur: 'normal' } },
        { at: 1.0, target: 'bo', cmd: 'hop', args: { height: 3 } },
        { at: '<', cmd: 'sfx', args: { name: 'boing' } },
        { target: 'bo', cmd: 'give', args: { prop: 'ball', hand: 'right' } },
        { target: 'bo', cmd: 'throw', args: { hand: 'right', to: { x: 80, y: 62 } } },
        { at: '<', cmd: 'sfx', args: { name: 'whoosh' } },
        { at: '+slow', cmd: 'sfx', args: { name: 'coin' } },
        { at: '<', target: 'bo', cmd: 'burst', args: { count: 16 } },
        { target: 'bo', cmd: 'say', args: { text: 'Ta-da!' } },
      ],
    },

    'flowers': {
      v: 1,
      scene: { theme: 'blank' },
      objects: [
        { id: 'snow', shape: 'group', layer: 'mid', props: { children: [
          { type: 'circle', props: { cx: 80, cy: 66, r: 4, fill: '#ffffff', stroke: '#2a2a35', strokeWidth: 0.22 } },
          { type: 'circle', props: { cx: 80, cy: 59.5, r: 3, fill: '#ffffff', stroke: '#2a2a35', strokeWidth: 0.22 } },
          { type: 'circle', props: { cx: 80, cy: 54.2, r: 2.2, fill: '#ffffff', stroke: '#2a2a35', strokeWidth: 0.22 } },
          { type: 'circle', props: { cx: 79.2, cy: 53.7, r: 0.32, fill: '#2a2a35' } },
          { type: 'circle', props: { cx: 80.8, cy: 53.7, r: 0.32, fill: '#2a2a35' } },
          { type: 'path', props: { d: 'M 80 54.5 L 81.4 55', stroke: '#e67e22', strokeWidth: 0.35 } },
        ] } },
      ],
      figures: [
        { id: 'amy', archetype: ['woman'], hair: 'long', pos: { x: 32, y: 70 }, facing: 'right', mood: 'love' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'For you', dur: 'normal' } },
        { at: 0.4, target: 'amy', cmd: 'give', args: { prop: 'flower', hand: 'right' } },
        { target: 'amy', cmd: 'say', args: { text: 'A flower!' } },
        { at: '<', target: 'amy', cmd: 'emote', args: { symbol: 'heart' } },
        { target: 'snow', cmd: 'spin', args: { turns: 1 } },
      ],
    },

    'beards': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'f', archetype: ['man'], hair: 'short', beard: true, body: 'bust', pos: { x: 24, y: 64 }, facing: 'front', mood: 'happy' },
        { id: 'g', archetype: ['man'], hair: 'short', beard: 'goatee', body: 'bust', pos: { x: 50, y: 64 }, facing: 'front' },
        { id: 's', archetype: ['man'], beard: 'stubble', body: 'bust', pos: { x: 76, y: 64 }, facing: 'front', mood: 'bored' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'full · goatee · stubble', dur: 'slow' } },
        { at: 0.4, target: 'f', cmd: 'say', args: { text: 'Nice beard.' } },
        { target: 'g', cmd: 'say', args: { text: 'You too.' } },
        { at: '<', target: 'g', cmd: 'playClip', args: { name: 'nod' } },
        { target: 's', cmd: 'say', args: { text: 'Mine grows back fast.' } },
      ],
    },

    'guided tour': {
      v: 1,
      scene: { theme: 'blank' },
      boards: [{ id: 'bb', rect: { x: 6, y: 8, w: 40, h: 40 }, style: 'chalk' }],
      figures: [
        { id: 'guide', character: 'professor', pos: { x: 60, y: 72 }, facing: 'front', mood: 'happy' },
        { id: 'pup', archetype: ['kid'], pos: { x: 84, y: 74 }, mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'A little tour (auto-fit zoom)', dur: 'normal' } },
        { at: 0, target: 'bb', cmd: 'board.write', by: 'guide', dur: 'normal', args: { md: '# Welcome' } },
        { target: 'guide', cmd: 'say', args: { text: 'Let me show you around.' } },
        { cmd: 'camera.focus', dur: 'normal', args: { on: 'guide' } },
        { at: '<', target: 'guide', cmd: 'playClip', args: { name: 'wave' } },
        { target: 'guide', cmd: 'say', args: { text: 'That is me — whole figure framed.' } },
        { cmd: 'camera.focus', dur: 'normal', args: { on: 'pup' } },
        { target: 'pup', cmd: 'say', args: { text: 'And that is me!' } },
        { at: '<', target: 'pup', cmd: 'playClip', args: { name: 'hopJoy' } },
        { cmd: 'camera.focus', dur: 'normal', args: { rect: { x: 6, y: 8, w: 40, h: 40 } } },
        { cmd: 'scene.caption', args: { text: 'A region, framed by rect.', dur: 'normal' } },
        { cmd: 'camera.reset', dur: 'normal' },
        { cmd: 'scene.caption', args: { text: 'End of tour.', dur: 'slow' } },
      ],
    },

    'widescreen': {
      v: 1,
      scene: { theme: 'blank', aspect: '16:9' },
      figures: [
        { id: 'ana', archetype: ['woman'], hair: 'long', pos: { x: -14, y: 72 }, mood: 'happy' },
        { id: 'raj', archetype: ['man'], hair: 'short', pos: { x: 116, y: 72 }, facing: 'left' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Widescreen: 16:9 shows x from -39 to 139', dur: 'slow' } },
        { at: 0, target: 'ana', cmd: 'move', args: { style: 'walk', to: { x: 36, y: 72 } }, dur: 4 },
        { at: 0, target: 'raj', cmd: 'move', args: { style: 'walk', to: { x: 66, y: 72 } }, dur: 4 },
        { target: 'ana', cmd: 'say', args: { text: 'Plenty of room out here!' } },
        { target: 'raj', cmd: 'say', args: { text: 'Mind the edges.' } },
        { target: ['ana', 'raj'], cmd: 'playClip', args: { name: 'wave' } },
      ],
    },
    'wobble dial': {
      v: 1,
      scene: {
        theme: 'blank',
        elements: [
          { id: 'l0', type: 'text', props: { x: 24, y: 80, text: 'wobble: 0', size: 2.6 } },
          { id: 'l1', type: 'text', props: { x: 50, y: 80, text: '0.6 (default)', size: 2.6 } },
          { id: 'l2', type: 'text', props: { x: 76, y: 80, text: '1.6', size: 2.6 } },
        ],
      },
      figures: [
        { id: 'stone', pos: { x: 24, y: 72 }, facing: 'front', wobble: 0 },
        { id: 'calm', pos: { x: 50, y: 72 }, facing: 'front' },
        { id: 'buzz', pos: { x: 76, y: 72 }, facing: 'front', wobble: 1.6 },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Same figure, three wobble settings', dur: 3 } },
        { at: 3, target: 'stone', cmd: 'say', args: { text: 'Statue.' } },
        { target: 'calm', cmd: 'say', args: { text: 'Just breathing.' } },
        { target: 'buzz', cmd: 'say', args: { text: 'Too much coffee.' } },
        { cmd: 'wait', dur: 2 },
        { target: ['stone', 'calm', 'buzz'], cmd: 'playClip', args: { name: 'wave' } },
      ],
    },

    'group chat': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'ada', archetype: ['woman'], hair: 'bun', pos: { x: 20, y: 72 }, facing: 'right', mood: 'happy' },
        { id: 'ben', archetype: ['man'], hair: 'short', pos: { x: 40, y: 72 }, facing: 'right', mood: 'happy' },
        { id: 'cy', archetype: ['man'], beard: 'goatee', pos: { x: 60, y: 72 }, facing: 'left' },
        { id: 'di', archetype: ['woman'], hair: 'long', pos: { x: 80, y: 72 }, facing: 'left' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Everyone talks at once — bubbles make room', dur: 'slow' } },
        { at: 0.6, target: 'ada', cmd: 'say', args: { text: 'Did you see the game?', dur: 3.4 } },
        { at: '<+quick', target: 'ben', cmd: 'say', args: { text: 'What a goal!', dur: 2.9 } },
        { at: '<+quick', target: 'cy', cmd: 'say', args: { text: 'I recorded it.', dur: 2.4 } },
        { at: '<+quick', target: 'di', cmd: 'say', args: { text: 'No spoilers!', dur: 1.9 } },
        { target: 'cy', cmd: 'mood', args: { name: 'very sad' } },
        { at: '<', target: 'cy', cmd: 'emote', args: { symbol: '...' } },
        { target: ['ada', 'ben'], cmd: 'mood', args: { name: 'embarrassed' } },
        { at: '<', target: 'ada', cmd: 'say', args: { text: 'Sorry!' } },
        { at: '<+fast', target: 'ben', cmd: 'say', args: { text: 'Sorry!' } },
        { target: 'di', cmd: 'playClip', args: { name: 'facepalm' } },
      ],
    },

    'bus stop': {
      v: 1,
      scene: {
        theme: 'blank', aspect: '16:9',
        elements: [
          { id: 'pole', type: 'line', props: { x1: 30, y1: 70, x2: 30, y2: 47, stroke: '#7a7f88', strokeWidth: 0.6 } },
          { id: 'sign', type: 'rect', props: { x: 26.5, y: 42, w: 7, h: 5, rx: 0.8, fill: '#3a86e0' } },
          { id: 'signT', type: 'text', props: { x: 30, y: 45.6, text: 'BUS', size: 2.4, fill: '#ffffff' } },
          { id: 'seat', type: 'rect', props: { x: 37, y: 64.5, w: 16, h: 1.2, rx: 0.4, fill: '#8a6f4d' } },
          { id: 'legA', type: 'rect', props: { x: 38.5, y: 65.7, w: 0.9, h: 4.3, fill: '#8a6f4d' } },
          { id: 'legB', type: 'rect', props: { x: 50.6, y: 65.7, w: 0.9, h: 4.3, fill: '#8a6f4d' } },
        ],
      },
      objects: [
        { id: 'bus', shape: 'group', layer: 'front', props: { cx: 175, cy: 60, children: [
          { type: 'rect', props: { x: 153, y: 50, w: 44, h: 17, rx: 2.5, fill: '#e3a53a' } },
          { type: 'rect', props: { x: 156, y: 53, w: 8, h: 6, rx: 0.8, fill: '#dff1fb' } },
          { type: 'rect', props: { x: 166, y: 53, w: 8, h: 6, rx: 0.8, fill: '#dff1fb' } },
          { type: 'rect', props: { x: 176, y: 53, w: 8, h: 6, rx: 0.8, fill: '#dff1fb' } },
          { type: 'rect', props: { x: 186, y: 53, w: 8, h: 6, rx: 0.8, fill: '#dff1fb' } },
          { type: 'circle', props: { cx: 162, cy: 67.5, r: 2.6, fill: '#2a2a35' } },
          { type: 'circle', props: { cx: 188, cy: 67.5, r: 2.6, fill: '#2a2a35' } },
        ] } },
      ],
      figures: [
        { id: 'tom', archetype: ['man'], hair: 'short', pos: { x: 44, y: 70 }, facing: 'right', pose: { base: 'sit' }, mood: 'bored' },
      ],
      timeline: [
        { at: 0, cmd: 'camera.set', args: { x: 52, y: 56, scale: 1.9 } },
        { at: 0, cmd: 'scene.caption', args: { text: 'Waiting for the 8:15', dur: 'slow' } },
        { at: 0.4, target: 'tom', cmd: 'give', args: { prop: 'phone', hand: 'right' } },
        { target: 'tom', cmd: 'think', args: { text: 'Any minute now…' } },
        { target: 'tom', cmd: 'lookAt', args: { to: { x: 130, y: 60 } } },
        { at: '<', target: 'tom', cmd: 'mood', args: { name: 'happy' } },
        { target: 'bus', cmd: 'moveTo', dur: 1.5, args: { to: { x: -90, y: 60 } } },
        { at: '<', cmd: 'sfx', args: { name: 'whoosh' } },
        { at: '<+quick', target: 'tom', cmd: 'lookAt', args: { to: { x: -30, y: 60 } } },
        { target: 'tom', cmd: 'pose.tween', dur: 'quick', args: { base: 'stand' } },
        { at: '<', target: 'tom', cmd: 'mood', args: { name: 'surprised' } },
        { at: '<', target: 'tom', cmd: 'emote', args: { symbol: '!' } },
        { target: 'tom', cmd: 'move', args: { style: 'walk', to: { x: 60, y: 70 } } },
        { target: 'tom', cmd: 'facing', args: { dir: 'left' } },
        { target: 'tom', cmd: 'say', args: { text: 'That was my bus.' } },
        { target: 'tom', cmd: 'playClip', args: { name: 'shrugOnce' } },
        { cmd: 'scene.caption', args: { text: 'Next one: 9:15', dur: 'slow' } },
      ],
    },

    'penalty kick': {
      v: 1,
      scene: {
        theme: 'blank', aspect: '16:9', bg: '#e9f3e2',
        elements: [
          { id: 'post', type: 'line', props: { x1: 118, y1: 70, x2: 118, y2: 46, stroke: '#ffffff', strokeWidth: 1 } },
          { id: 'bar', type: 'line', props: { x1: 118, y1: 46, x2: 124, y2: 46, stroke: '#ffffff', strokeWidth: 1 } },
          { id: 'net1', type: 'line', props: { x1: 124, y1: 46, x2: 132, y2: 70, stroke: '#b9c4b2', strokeWidth: 0.3 } },
          { id: 'net2', type: 'line', props: { x1: 121, y1: 46, x2: 127, y2: 70, stroke: '#b9c4b2', strokeWidth: 0.3 } },
          { id: 'net3', type: 'line', props: { x1: 118, y1: 54, x2: 126.5, y2: 54, stroke: '#b9c4b2', strokeWidth: 0.3 } },
          { id: 'net4', type: 'line', props: { x1: 118, y1: 62, x2: 129.3, y2: 62, stroke: '#b9c4b2', strokeWidth: 0.3 } },
          { id: 'spot', type: 'ellipse', props: { cx: 52, cy: 70.4, rx: 1.6, ry: 0.4, fill: '#ffffff' } },
        ],
      },
      objects: [
        { id: 'ball', shape: 'circle', layer: 'front', props: { cx: 52, cy: 68.6, r: 1.4, fill: '#ffffff', stroke: '#2a2a35', strokeWidth: 0.3 } },
      ],
      figures: [
        { id: 'leo', archetype: ['man'], hair: 'tuft', style: 'toon', bodyColor: '#d9534f', pos: { x: 22, y: 70 }, facing: 'right', mood: 'thinking' },
        { id: 'kip', archetype: ['man'], style: 'toon', bodyColor: '#f0c330', pos: { x: 110, y: 70 }, facing: 'left', pose: { stance: 'wide' } },
      ],
      timeline: [
        { at: 0, cmd: 'camera.set', args: { x: 70, y: 56, scale: 1.4 } },
        { at: 0, cmd: 'scene.caption', args: { text: 'Last minute. Penalty.', dur: 'slow' } },
        { at: 0.3, target: 'kip', cmd: 'raiseArm', args: { side: 'both', angle: 70 } },
        { target: 'leo', cmd: 'think', args: { text: 'Top corner.' } },
        { target: 'leo', cmd: 'mood', dur: 'fast', args: { name: 'angry' } },
        { target: 'leo', cmd: 'move', args: { style: 'run', to: { x: 47, y: 70 } } },
        { target: 'leo', cmd: 'liftLeg', dur: 'veryFast', args: { side: 'right', angle: 65 } },
        { at: '<', cmd: 'sfx', args: { name: 'whoosh' } },
        { at: '<', target: 'kip', cmd: 'raiseArm', dur: 'fast', args: { side: 'both', angle: 175 } },
        { at: '<', target: 'kip', cmd: 'hop', args: { height: 4 } },
        { at: '<', target: 'ball', cmd: 'arc', dur: 0.9, args: { to: { x: 122, y: 50 }, height: 9, spin: 3 } },
        { target: 'ball', cmd: 'moveTo', dur: 'quick', args: { to: { x: 124, y: 68.6 } } },
        { at: '<', target: 'leo', cmd: 'lowerLeg', dur: 'fast', args: { side: 'right' } },
        { at: '<', cmd: 'burst', args: { at: { x: 122, y: 50 }, count: 16, color: ['#d9534f', '#ffffff', '#f0c330'] } },
        { at: '<', cmd: 'sfx', args: { name: 'success' } },
        { cmd: 'scene.caption', args: { text: 'Goal!', dur: 'normal' } },
        { at: '<', target: 'leo', cmd: 'mood', args: { name: 'ecstatic' } },
        { at: '<', target: 'leo', cmd: 'playClip', args: { name: 'victory' } },
        { at: '<', target: 'kip', cmd: 'lowerArm', args: { side: 'both' } },
        { target: 'kip', cmd: 'playClip', args: { name: 'facepalm' } },
      ],
    },

    'campfire': {
      v: 1,
      scene: {
        theme: 'blank', bg: '#18203a', wobble: 0.3,
        elements: [
          { id: 'moon', type: 'circle', layer: 'back', props: { cx: 78, cy: 20, r: 5, fill: '#f3ecc8' } },
          { id: 's1', type: 'circle', layer: 'back', props: { cx: 14, cy: 14, r: 0.5, fill: '#f3ecc8' } },
          { id: 's2', type: 'circle', layer: 'back', props: { cx: 30, cy: 26, r: 0.4, fill: '#f3ecc8' } },
          { id: 's3', type: 'circle', layer: 'back', props: { cx: 46, cy: 10, r: 0.5, fill: '#f3ecc8' } },
          { id: 's4', type: 'circle', layer: 'back', props: { cx: 62, cy: 30, r: 0.4, fill: '#f3ecc8' } },
          { id: 's5', type: 'circle', layer: 'back', props: { cx: 90, cy: 36, r: 0.5, fill: '#f3ecc8' } },
          { id: 'logL', type: 'rect', props: { x: 27, y: 64.5, w: 11, h: 5.5, rx: 2, fill: '#6b4a2f' } },
          { id: 'logR', type: 'rect', props: { x: 62, y: 64.5, w: 11, h: 5.5, rx: 2, fill: '#6b4a2f' } },
          { id: 'wood1', type: 'line', props: { x1: 45.5, y1: 69.6, x2: 54, y2: 67.6, stroke: '#6b4a2f', strokeWidth: 1.1 } },
          { id: 'wood2', type: 'line', props: { x1: 54.5, y1: 69.6, x2: 46, y2: 67.6, stroke: '#6b4a2f', strokeWidth: 1.1 } },
        ],
      },
      objects: [
        { id: 'fire', shape: 'group', layer: 'fig', props: { cx: 50, cy: 69, children: [
          { type: 'path', props: { d: 'M 46.5 69 C 45 64 49 62 50 56 C 51 62 55 64 53.5 69 Z', fill: '#e8792e', stroke: 'none' } },
          { type: 'path', props: { d: 'M 48.3 69 C 47.6 66 49.6 65 50 61.5 C 50.6 65 52.4 66 51.7 69 Z', fill: '#f7d154', stroke: 'none' } },
        ] } },
      ],
      clips: {
        flicker: [
          { cmd: 'scale', dur: 0.22, args: { to: 1.14 } },
          { cmd: 'scale', dur: 0.18, args: { to: 0.93 } },
          { cmd: 'scale', dur: 0.2, args: { to: 1.07 } },
          { cmd: 'scale', dur: 0.24, args: { to: 1 } },
        ],
      },
      figures: [
        { id: 'ma', archetype: ['woman'], hair: 'long', pos: { x: 33, y: 70 }, facing: 'right', pose: { base: 'sit' }, mood: 'happy' },
        { id: 'pa', archetype: ['man'], beard: 'full', pos: { x: 67, y: 70 }, facing: 'left', pose: { base: 'sit' } },
      ],
      timeline: [
        { at: 0, target: 'fire', cmd: 'playClip', args: { name: 'flicker', repeat: 16 } },
        { at: 0, cmd: 'scene.caption', args: { text: 'Later that night', dur: 'slow' } },
        { at: 1.2, target: 'pa', cmd: 'say', args: { text: 'Row, row, row your boat…', sing: true, dur: 3 } },
        { at: '<', target: 'pa', cmd: 'emote', args: { symbol: 'music' } },
        { target: 'ma', cmd: 'playClip', args: { name: 'clapOnce', repeat: 2 } },
        { target: 'ma', cmd: 'say', args: { text: 'Encore!' } },
        { at: '<', target: 'pa', cmd: 'mood', args: { name: 'proud' } },
        { target: ['ma', 'pa'], cmd: 'lookAt', args: { to: 'moon.center' } },
        { target: 'ma', cmd: 'think', args: { text: 'Did I lock the car?' } },
        { at: '<+normal', target: 'ma', cmd: 'mood', args: { name: 'worried' } },
        { cmd: 'scene.caption', args: { text: '(she did not)', dur: 'slow' } },
      ],
    },

    'first date': {
      v: 1,
      scene: {
        theme: 'blank',
        elements: [
          { id: 'top', type: 'rect', props: { x: 44, y: 60.4, w: 12, h: 1, rx: 0.4, fill: '#8a6f4d' } },
          { id: 'stem', type: 'rect', props: { x: 49.5, y: 61.4, w: 1, h: 8.6, fill: '#8a6f4d' } },
          { id: 'chairL', type: 'rect', props: { x: 32, y: 64.5, w: 7, h: 1, rx: 0.3, fill: '#b9a78a' } },
          { id: 'chairLb', type: 'rect', props: { x: 32, y: 53, w: 0.9, h: 17, fill: '#b9a78a' } },
          { id: 'chairR', type: 'rect', props: { x: 61, y: 64.5, w: 7, h: 1, rx: 0.3, fill: '#b9a78a' } },
          { id: 'chairRb', type: 'rect', props: { x: 67.1, y: 53, w: 0.9, h: 17, fill: '#b9a78a' } },
        ],
      },
      figures: [
        { id: 'mia', archetype: ['woman'], hair: 'long', pos: { x: 36, y: 70 }, facing: 'right', pose: { base: 'sit' }, mood: 'happy' },
        { id: 'dan', archetype: ['man'], hair: 'short', glasses: true, pos: { x: 64, y: 70 }, facing: 'left', pose: { base: 'sit' }, mood: 'happy' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'First date', dur: 'normal' } },
        { at: 0.8, target: 'dan', cmd: 'say', args: { text: 'I love hiking.' } },
        { target: 'dan', cmd: 'think', args: { text: 'I own no boots.' } },
        { target: 'mia', cmd: 'say', args: { text: 'Me too!' } },
        { target: 'mia', cmd: 'think', args: { text: 'I hate hills.' } },
        { target: 'dan', cmd: 'say', args: { text: 'Mountains on Sunday?', dur: 2.4 } },
        { at: '<+normal', target: 'mia', cmd: 'say', args: { text: 'Perfect!', dur: 1.4 } },
        { target: ['mia', 'dan'], cmd: 'mood', args: { name: 'worried' } },
        { at: '<', target: 'mia', cmd: 'think', args: { text: 'Oh no.', dur: 2 } },
        { at: '<', target: 'dan', cmd: 'think', args: { text: 'Oh no.', dur: 2 } },
        { cmd: 'scene.caption', args: { text: 'Second date: bowling.', dur: 'slow' } },
      ],
    },

    'meet the cast': {
      v: 1,
      scene: { theme: 'blank' },
      figures: [
        { id: 'pip', character: 'pip', pos: { x: 12, y: 70 }, facing: 'front' },
        { id: 'mo', character: 'mo', pos: { x: 27, y: 70 }, facing: 'front' },
        { id: 'bea', character: 'bea', pos: { x: 42, y: 70 }, facing: 'front' },
        { id: 'gus', character: 'gus', pos: { x: 58, y: 70 }, facing: 'front' },
        { id: 'zed', character: 'zed', pos: { x: 73, y: 70 }, facing: 'front' },
        { id: 'nan', character: 'nan', pos: { x: 88, y: 70 }, facing: 'front' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Meet the cast', dur: 'slow' } },
        { at: 0.6, target: 'pip', cmd: 'say', args: { text: 'Hi hi hi!' } },
        { at: '<', target: 'pip', cmd: 'playClip', args: { name: 'hopJoy' } },
        { target: 'mo', cmd: 'say', args: { text: '...sup.' } },
        { at: '<', target: 'mo', cmd: 'playClip', args: { name: 'shrugOnce' } },
        { target: 'bea', cmd: 'say', args: { text: 'Tea, anyone?' } },
        { at: '<', target: 'bea', cmd: 'playClip', args: { name: 'wave' } },
        { target: 'gus', cmd: 'say', args: { text: 'Hmm. Right.' } },
        { at: '<', target: 'gus', cmd: 'playClip', args: { name: 'nod' } },
        { target: 'zed', cmd: 'say', args: { text: 'Obviously me.' } },
        { at: '<', target: 'zed', cmd: 'playClip', args: { name: 'coolLean' } },
        { target: 'nan', cmd: 'say', args: { text: 'Mind the step!' } },
        { at: '<', target: 'nan', cmd: 'playClip', args: { name: 'wave' } },
        { cmd: 'scene.caption', args: { text: 'pip · mo · bea · gus · zed · nan', dur: 'slow' } },
      ],
    },

    'custom characters': {
      v: 1,
      scene: { theme: 'blank' },
      characters: {
        boss: { hat: 'fedora', beard: 'full', hunch: 0.3, height: 27, mood: 'proud' },
        intern: { extends: 'pip', hat: 'cap', mood: 'worried', height: 19 },
      },
      figures: [
        { id: 'b', character: 'boss', pos: { x: 30, y: 70 }, facing: 'right' },
        { id: 'i', character: 'intern', pos: { x: 62, y: 70 }, facing: 'left' },
        { id: 'x', pos: { x: 84, y: 70 }, facing: 'left' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Characters defined in the scene itself', dur: 'slow' } },
        { at: 0.6, target: 'b', cmd: 'say', args: { text: 'Coffee. Now.' } },
        { target: 'i', cmd: 'say', args: { text: 'Yes boss!' } },
        { at: '<', target: 'i', cmd: 'playClip', args: { name: 'hopJoy' } },
        { target: 'x', cmd: 'say', args: { text: 'I am just a plain figure.' } },
        { cmd: 'scene.caption', args: { text: 'unnamed figures stay generic', dur: 'slow' } },
      ],
    },

    'high dive': {
      v: 1,
      scene: {
        theme: 'blank', aspect: '9:16', floor: false, shadows: false, bg: '#eef6fb',
        elements: [
          { id: 'tower', type: 'rect', layer: 'back', props: { x: 16, y: 8, w: 4, h: 134, fill: '#9aa3ad' } },
          { id: 'plank', type: 'rect', layer: 'back', props: { x: 16, y: 8, w: 32, h: 1.6, rx: 0.5, fill: '#7a8490' } },
          { id: 'water', type: 'rect', layer: 'front', props: { x: 20, y: 116, w: 82, h: 26, fill: '#6fbbe6', opacity: 0.9 } },
          { id: 'deck', type: 'rect', layer: 'front', props: { x: -2, y: 114, w: 22, h: 28, fill: '#c9bfae' } },
        ],
      },
      figures: [
        { id: 'dee', archetype: ['woman'], hair: 'bun', pos: { x: 26, y: 8 }, height: 26, facing: 'right', mood: 'worried' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Portrait frame: the 10-metre board', dur: 'slow' } },
        { at: 0.4, target: 'dee', cmd: 'move', args: { style: 'walk', to: { x: 44, y: 8 } } },
        { target: 'dee', cmd: 'lookAt', args: { to: { x: 62, y: 116 } } },
        { target: 'dee', cmd: 'think', args: { text: 'That is far.' } },
        { target: 'dee', cmd: 'mood', dur: 'quick', args: { name: 'proud' } },
        { target: 'dee', cmd: 'raiseArm', dur: 'quick', args: { side: 'both', angle: 178 } },
        { target: 'dee', cmd: 'hop', args: { height: 3 } },
        { target: 'dee', cmd: 'pose.tween', dur: 0.7, args: { tilt: 172 } },
        { at: '<', cmd: 'sfx', args: { name: 'whoosh' } },
        { at: '<', target: 'dee', cmd: 'move', dur: 1.3, ease: 'in', args: { style: 'slide', to: { x: 64, y: 156 } } },
        { at: '-fast', cmd: 'sfx', args: { name: 'thud' } },
        { at: '<', cmd: 'burst', dur: 1.4, args: { at: { x: 66, y: 116 }, count: 22, spread: 1.4, color: ['#6fbbe6', '#ffffff', '#3a86e0'] } },
        { target: 'dee', cmd: 'pose.tween', dur: 'veryFast', args: { tilt: 0 } },
        { at: '<', target: 'dee', cmd: 'lowerArm', dur: 'veryFast', args: { side: 'both' } },
        { target: 'dee', cmd: 'move', dur: 0.8, args: { style: 'slide', to: { x: 60, y: 133 } } },
        { at: '<', target: 'dee', cmd: 'mood', args: { name: 'ecstatic' } },
        { target: 'dee', cmd: 'facing', args: { dir: 'left' } },
        { target: 'dee', cmd: 'say', args: { text: 'Again!' } },
        { cmd: 'scene.caption', args: { text: 'Judges: 9.5', dur: 'slow' } },
      ],
    },

    'fetch': {
      v: 1,
      scene: { theme: 'blank', bg: '#eff5e8' },
      figures: [
        { id: 'bea', character: 'bea', pos: { x: 10, y: 70 } },
        { id: 'rex', character: 'rex', pos: { x: 31, y: 70 }, facing: 'left' },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Rex has exactly one hobby.', dur: 'slow' } },
        { at: 0.3, target: 'bea', cmd: 'give', args: { prop: 'ball' } },
        { at: '<', target: 'rex', cmd: 'lookAt', args: { to: 'bea.chest' } },
        { target: 'rex', cmd: 'playClip', args: { name: 'playBow' } },
        { at: '<', target: 'bea', cmd: 'say', args: { text: 'Ready, Rex?' } },
        { target: 'rex', cmd: 'say', args: { text: 'Woof!', dur: 0.7 } },
        { at: '<', target: 'rex', cmd: 'playClip', args: { name: 'bark' } },
        { target: 'bea', cmd: 'throw', args: { to: { x: 90, y: 68.4 } } },
        { at: '<', cmd: 'sfx', args: { name: 'whoosh' } },
        { at: '<+fast', target: 'rex', cmd: 'move', args: { style: 'run', to: 'bea_ball' } },
        { target: 'rex', cmd: 'pickUp', args: { object: 'bea_ball' } },
        { target: 'rex', cmd: 'mood', args: { name: 'proud' } },
        { target: 'rex', cmd: 'move', args: { style: 'run', to: { x: 23, y: 70 } } },
        { target: 'rex', cmd: 'pose.tween', dur: 'fast', args: { base: 'sit' } },
        { target: 'rex', cmd: 'handOff', args: { to: 'bea', toHand: 'right' } },
        { target: 'bea', cmd: 'say', args: { text: 'Good boy!' } },
        { at: '<', target: 'rex', cmd: 'mood', args: { name: 'ecstatic' } },
        { target: 'rex', cmd: 'think', args: { text: 'Again. Again. Again.' } },
        { at: '<', target: 'rex', cmd: 'playClip', args: { name: 'wag' } },
      ],
    },

    'the W-word': {
      v: 1,
      scene: {
        theme: 'blank',
        elements: [
          { id: 'rug', type: 'ellipse', layer: 'back', props: { cx: 50, cy: 71.6, rx: 15, ry: 1.5, fill: '#dccbb0' } },
        ],
      },
      figures: [
        { id: 'mo', character: 'mo', pos: { x: 18, y: 70 } },
        { id: 'bea', character: 'bea', pos: { x: 84, y: 70 }, facing: 'left' },
        { id: 'rex', character: 'rex', pos: { x: 48, y: 70 }, mood: 'sleepy', pose: { base: 'lie' } },
      ],
      timeline: [
        { at: 0, cmd: 'scene.caption', args: { text: 'Never say the W-word.', dur: 'slow' } },
        { at: 0.3, target: 'rex', cmd: 'emote', dur: 'slow', args: { symbol: 'zzz' } },
        { target: 'bea', cmd: 'say', args: { text: 'Lovely evening. Fancy a walk?' } },
        { at: '-quick', target: 'rex', cmd: 'mood', dur: 'fast', args: { name: 'surprised' } },
        { at: '<', target: 'rex', cmd: 'emote', args: { symbol: '!' } },
        { target: 'rex', cmd: 'pose.tween', dur: 'fast', args: { base: 'sit' } },
        { at: '<', target: 'rex', cmd: 'lookAt', args: { to: 'bea.head' } },
        { target: 'rex', cmd: 'think', args: { text: 'Walk?!' } },
        { at: '<', target: 'rex', cmd: 'mood', args: { name: 'happy' } },
        { target: 'mo', cmd: 'say', args: { text: 'Nah. It is raining.' } },
        { at: '<+quick', target: 'rex', cmd: 'turn', args: { to: 'left' } },
        { target: 'rex', cmd: 'mood', args: { name: 'sad' } },
        { at: '<', target: 'rex', cmd: 'think', args: { text: 'Rain…' } },
        { target: 'bea', cmd: 'say', args: { text: 'We could bring his ball.' } },
        { at: '-quick', target: 'rex', cmd: 'turn', dur: 'fast', args: { to: 'right' } },
        { at: '<', target: 'rex', cmd: 'mood', args: { name: 'ecstatic' } },
        { target: 'rex', cmd: 'think', args: { text: 'BALL!' } },
        { at: '<', target: 'rex', cmd: 'pose.tween', dur: 'fast', args: { base: 'stand' } },
        { target: 'rex', cmd: 'move', args: { style: 'run', to: { x: 64, y: 70 } } },
        { target: 'rex', cmd: 'playClip', args: { name: 'beg' } },
        { at: '<', target: 'rex', cmd: 'say', args: { text: 'Woof!', dur: 0.8 } },
        { at: '<', target: 'rex', cmd: 'playClip', args: { name: 'bark' } },
        { at: '<+quick', target: 'mo', cmd: 'say', args: { text: 'Fine. I will get my coat.' } },
        { target: 'rex', cmd: 'playClip', args: { name: 'wag' } },
        { at: '<', target: 'rex', cmd: 'playClip', args: { name: 'hopJoy' } },
      ],
    },
  };
})();
