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
  };
})();
