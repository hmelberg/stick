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
        { id: 'dad', archetype: ['man'], hair: 'short', beard: true, pos: { x: 16, y: 72 } },
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
        { id: 'ben', archetype: ['man'], beard: true, pos: { x: 72, y: 72 }, facing: 'left' },
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
        { id: 'leo', archetype: ['man'], beard: true, pos: { x: 62, y: 72 }, facing: 'left', mood: 'happy' },
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
  };
})();
