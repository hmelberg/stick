/* stick — presets: durations, moods, archetypes, characters, clips, themes.
   Loaded first; everything hangs off window.STICK. */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const STICK = (G.STICK = G.STICK || {});

  STICK.DUR = {
    veryFast: 0.15,
    fast: 0.3,
    quick: 0.5,
    normal: 1.0,
    slow: 2.0,
    verySlow: 4.0,
  };

  /* Moods: expression targets + posture targets + idle-motion profile.
     idle.energy scales breathing speed, sway scales drift, bounce adds joy-bounce. */
  STICK.presets = {};
  STICK.presets.moods = {
    neutral:   { expr: { smile: 0.08, eyeOpen: 1,    browTilt: 0,     browRaise: 0,    mouthOpen: 0 },    pose: { bend: 0.02,  headTilt: 0 },     idle: { energy: 0.4, sway: 0.4, bounce: 0 } },
    happy:     { expr: { smile: 0.65, eyeOpen: 0.95, browTilt: 0,     browRaise: 0.35, mouthOpen: 0 },    pose: { bend: -0.02, headTilt: -0.02 }, idle: { energy: 0.8, sway: 0.5, bounce: 0.25 } },
    ecstatic:  { expr: { smile: 1,    eyeOpen: 1,    browTilt: 0,     browRaise: 0.8,  mouthOpen: 0.45 }, pose: { bend: -0.05, headTilt: -0.05 }, idle: { energy: 1.6, sway: 0.6, bounce: 1 } },
    bored:     { expr: { smile: -0.18, eyeOpen: 0.45, browTilt: 0.1,  browRaise: 0,    mouthOpen: 0 },    pose: { bend: 0.1,   headTilt: 0.14 },  idle: { energy: 0.25, sway: 1, bounce: 0 } },
    thinking:  { expr: { smile: -0.05, eyeOpen: 0.85, browTilt: 0,    browRaise: 0.45, mouthOpen: 0, pupilX: 0.6, pupilY: -0.7 }, pose: { bend: 0.03, headTilt: -0.1 }, idle: { energy: 0.35, sway: 0.5, bounce: 0 } },
    angry:     { expr: { smile: -0.55, eyeOpen: 0.75, browTilt: -0.85, browRaise: 0.1, mouthOpen: 0.1 },  pose: { bend: 0.05,  headTilt: 0.04 },  idle: { energy: 0.9, sway: 0.3, bounce: 0 } },
    sad:       { expr: { smile: -0.5, eyeOpen: 0.55, browTilt: 0.7,   browRaise: 0.2,  mouthOpen: 0 },    pose: { bend: 0.14,  headTilt: 0.12 },  idle: { energy: 0.2, sway: 0.6, bounce: 0 } },
    surprised: { expr: { smile: 0.05, eyeOpen: 1,    browTilt: 0,     browRaise: 1,    mouthOpen: 0.7 },  pose: { bend: -0.04, headTilt: -0.04 }, idle: { energy: 0.6, sway: 0.3, bounce: 0 } },
    sleepy:    { expr: { smile: 0.02, eyeOpen: 0.18, browTilt: 0.2,   browRaise: 0,    mouthOpen: 0.08 }, pose: { bend: 0.12,  headTilt: 0.18 },  idle: { energy: 0.15, sway: 0.8, bounce: 0 } },
    laughing:  { expr: { smile: 1,    eyeOpen: 0.8,  browTilt: 0,     browRaise: 0.5,  mouthOpen: 0.55 }, pose: { bend: -0.05, headTilt: -0.1 },  idle: { energy: 1.5, sway: 0.5, bounce: 1.1 } },
    crying:    { expr: { smile: -0.6, eyeOpen: 0.3,  browTilt: 0.8,   browRaise: 0.2,  mouthOpen: 0.32, tears: 1 },        pose: { bend: 0.12,  headTilt: 0.14 }, idle: { energy: 0.5, sway: 0.6, bounce: 0.3 } },
    scared:    { expr: { smile: -0.3, eyeOpen: 1,    browTilt: 0.2,   browRaise: 1,    mouthOpen: 0.4 },  pose: { bend: 0.06,  headTilt: 0.05, lean: -0.12 }, idle: { energy: 1.3, sway: 0.3, bounce: 0 } },
    worried:   { expr: { smile: -0.2, eyeOpen: 0.8,  browTilt: 0.5,   browRaise: 0.5,  mouthOpen: 0 },    pose: { bend: 0.08,  headTilt: 0.08 }, idle: { energy: 0.4, sway: 0.7, bounce: 0 } },
    proud:     { expr: { smile: 0.45, eyeOpen: 0.8,  browTilt: -0.15, browRaise: 0,    mouthOpen: 0 },    pose: { bend: -0.06, headTilt: -0.14, lean: -0.04 }, idle: { energy: 0.4, sway: 0.3, bounce: 0 } },
    disgusted: { expr: { smile: -0.5, eyeOpen: 0.6,  browTilt: -0.4,  browRaise: 0.1,  mouthOpen: 0.12, browSkew: 0.5 },  pose: { bend: 0.02,  headTilt: -0.05, lean: -0.05 }, idle: { energy: 0.4, sway: 0.4, bounce: 0 } },
    confused:  { expr: { smile: -0.05, eyeOpen: 0.9, browTilt: 0,     browRaise: 0.4,  mouthOpen: 0.05, browSkew: 1, pupilX: 0.4 }, pose: { bend: 0.03, headTilt: 0.15 }, idle: { energy: 0.4, sway: 0.6, bounce: 0 } },
    embarrassed:{ expr: { smile: 0.15, eyeOpen: 0.7, browTilt: 0.3,   browRaise: 0.2,  mouthOpen: 0, blush: 1, pupilY: 0.5 }, pose: { bend: 0.06, headTilt: 0.12 }, idle: { energy: 0.3, sway: 0.5, bounce: 0 } },
    love:      { expr: { smile: 0.8,  eyeOpen: 0.6,  browTilt: 0,     browRaise: 0.5,  mouthOpen: 0.1, blush: 0.8 },     pose: { bend: -0.03, headTilt: 0.06 }, idle: { energy: 0.7, sway: 0.6, bounce: 0.2 } },
  };

  // No hair by default for everyone — set `hair` explicitly to add it.
  STICK.presets.archetypes = {
    person: {},
    man:    {},
    woman:  {},
    kid:    { height: 13, headScale: 1.35 },               // same head, shorter body
  };

  STICK.presets.characters = {
    professor: { glasses: true, height: 21, mood: 'neutral' }, // bald + glasses (no bald-spot hair)
    student:   { height: 19, mood: 'bored' },
    dancer:    { hat: 'fedora', height: 20 },
  };

  /* Built-in clips, written in the same event language users write.
     Inside a clip, omitted `at` = sequential; "<" = with previous. */
  STICK.presets.clips = {
    wave: [
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 130, elbowR: 35 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 75 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 30 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 75 } },
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 0, elbowR: 8 } },
    ],
    clapOnce: [
      { cmd: 'joints', dur: 'veryFast', args: { shoulderL: 62, elbowL: 55, shoulderR: 80, elbowR: 35 } },
      { cmd: 'joints', dur: 'veryFast', args: { shoulderL: 45, elbowL: 80, shoulderR: 95, elbowR: 15 } },
      { cmd: 'joints', dur: 'fast', args: { shoulderL: 0, elbowL: 8, shoulderR: 0, elbowR: 8 } },
    ],
    shrugOnce: [
      { cmd: 'joints', dur: 'fast', args: { shoulderL: 55, elbowL: 115, shoulderR: 55, elbowR: 115 } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { bend: 0.08, headTilt: 0.14 } },
      { cmd: 'wait', dur: 'fast' },
      { cmd: 'joints', dur: 'quick', args: { shoulderL: 0, elbowL: 8, shoulderR: 0, elbowR: 8 } },
      { at: '<', cmd: 'pose.tween', dur: 'quick', args: { bend: 0.03, headTilt: 0.02 } },
    ],
    scratchHead: [
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 150, elbowR: 105 } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0.1 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 88 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 108 } },
      { cmd: 'joints', dur: 'veryFast', args: { elbowR: 88 } },
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 0, elbowR: 8 } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0 } },
    ],
    nod: [
      { cmd: 'pose.tween', dur: 'veryFast', args: { headTilt: 0.16 } },
      { cmd: 'pose.tween', dur: 'veryFast', args: { headTilt: -0.02 } },
      { cmd: 'pose.tween', dur: 'veryFast', args: { headTilt: 0.14 } },
      { cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0 } },
    ],
    bow: [
      { cmd: 'pose.tween', dur: 'quick', args: { bend: 0.42, headTilt: 0.2 } },
      { at: '<', cmd: 'joints', dur: 'quick', args: { shoulderL: -25, shoulderR: -25 } },
      { cmd: 'wait', dur: 'quick' },
      { cmd: 'pose.tween', dur: 'quick', args: { bend: 0.02, headTilt: 0 } },
      { at: '<', cmd: 'joints', dur: 'quick', args: { shoulderL: 0, shoulderR: 0 } },
    ],
    hopJoy: [
      { cmd: 'joints', dur: 'veryFast', args: { shoulderL: 160, shoulderR: 160, elbowL: 10, elbowR: 10 } },
      { at: '<', cmd: 'hop', args: { height: 2.4, dur: 0.55 } },
      { cmd: 'joints', dur: 'fast', args: { shoulderL: 0, shoulderR: 0, elbowL: 8, elbowR: 8 } },
    ],
    facepalm: [
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 135, elbowR: 125 } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0.16, bend: 0.08 } },
      { cmd: 'wait', dur: 'normal' },
      { cmd: 'joints', dur: 'quick', args: { shoulderR: 0, elbowR: 8 } },
      { at: '<', cmd: 'pose.tween', dur: 'quick', args: { headTilt: 0.02, bend: 0.03 } },
    ],
    thinkChin: [
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 30, elbowR: 138 } },
      { at: '<', cmd: 'hands', args: { hand: 'right', shape: 'fist' } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0.1, bend: 0.06 } },
      { cmd: 'wait', dur: 'slow' },
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 0, elbowR: 8 } },
      { at: '<', cmd: 'hands', args: { hand: 'right', shape: 'relaxed' } },
      { at: '<', cmd: 'pose.tween', dur: 'fast', args: { headTilt: 0, bend: 0.02 } },
    ],
    victory: [
      { cmd: 'joints', dur: 'fast', ease: 'backOut', args: { shoulderL: 150, shoulderR: 158, elbowL: 22, elbowR: 18 } },
      { at: '<', cmd: 'hands', args: { shape: 'spread' } },
      { at: '<', cmd: 'expression', dur: 'fast', args: { smile: 0.9, mouthOpen: 0.4 } },
      { cmd: 'wait', dur: 'normal' },
      { cmd: 'joints', dur: 'quick', args: { shoulderL: 0, shoulderR: 0, elbowL: 8, elbowR: 8 } },
      { at: '<', cmd: 'hands', args: { shape: 'relaxed' } },
      { at: '<', cmd: 'expression', dur: 'quick', args: { mouthOpen: 0 } },
    ],
    phoneCall: [
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 18, elbowR: 152 } },
      { at: '<', cmd: 'hands', args: { hand: 'right', shape: 'fist' } },
      { cmd: 'wait', dur: 'slow' },
      { cmd: 'joints', dur: 'fast', args: { shoulderR: 0, elbowR: 8 } },
      { at: '<', cmd: 'hands', args: { hand: 'right', shape: 'relaxed' } },
    ],
    coolLean: [
      { cmd: 'pose.tween', dur: 'quick', args: { lean: -0.07, tilt: -6, stance: 'together' } },
      { at: '<', cmd: 'joints', dur: 'quick', args: { hipL: 10, kneeL: 26, shoulderL: -12, shoulderR: -12 } },
      { cmd: 'wait', dur: 'slow' },
      { cmd: 'pose.tween', dur: 'quick', args: { lean: 0, tilt: 0, stance: 'normal' } },
      { at: '<', cmd: 'joints', dur: 'quick', args: { hipL: 0, kneeL: 0, shoulderL: 0, shoulderR: 0 } },
    ],
    stretchYawn: [
      { cmd: 'joints', dur: 'quick', args: { shoulderL: 168, shoulderR: 172, elbowL: 8, elbowR: 6 } },
      { at: '<', cmd: 'expression', dur: 'quick', args: { mouthOpen: 0.65, eyeOpen: 0.25 } },
      { at: '<', cmd: 'pose.tween', dur: 'quick', args: { headTilt: -0.12, bend: -0.06 } },
      { cmd: 'wait', dur: 'fast' },
      { cmd: 'joints', dur: 'normal', args: { shoulderL: 4, shoulderR: 4, elbowL: 10, elbowR: 10 } },
      { at: '<', cmd: 'expression', dur: 'normal', args: { mouthOpen: 0, eyeOpen: 0.5 } },
      { at: '<', cmd: 'pose.tween', dur: 'normal', args: { headTilt: 0.08, bend: 0.06 } },
    ],
  };
  STICK.presets.clips.clap = STICK.presets.clips.clapOnce;
  STICK.presets.clips.shrug = STICK.presets.clips.shrugOnce;

  /* Themes: scene element lists with anchors. Floor is at y=70 by default. */
  STICK.presets.themes = {
    blank: { bg: '#f7f2e9', elements: [] },
    classroom: {
      bg: '#f7f2e9',
      elements: [
        { id: 'board', type: 'rect', layer: 'mid',
          props: { x: 10, y: 30, w: 36, h: 22, fill: '#2f4f43', stroke: '#8a6f4d', strokeWidth: 1.1, rx: 0.6 },
          anchors: { center: [28, 41], write: [41.5, 51], left: [13, 41] } },
        { id: 'boardLegL', type: 'line', layer: 'mid', props: { x1: 13, y1: 52, x2: 11, y2: 70, stroke: '#8a6f4d', strokeWidth: 0.7 } },
        { id: 'boardLegR', type: 'line', layer: 'mid', props: { x1: 43, y1: 52, x2: 45, y2: 70, stroke: '#8a6f4d', strokeWidth: 0.7 } },
        { id: 'tray', type: 'line', layer: 'mid', props: { x1: 11.5, y1: 53.2, x2: 44.5, y2: 53.2, stroke: '#8a6f4d', strokeWidth: 0.8 } },
      ],
    },
    street: {
      bg: '#f5efe2',
      elements: [
        { id: 'bldgA', type: 'rect', layer: 'back', props: { x: 4, y: 34, w: 16, h: 36, fill: '#e3d8c6' } },
        { id: 'bldgB', type: 'rect', layer: 'back', props: { x: 24, y: 26, w: 13, h: 44, fill: '#dccfba' } },
        { id: 'bldgC', type: 'rect', layer: 'back', props: { x: 72, y: 38, w: 20, h: 32, fill: '#e3d8c6' } },
        { id: 'sun', type: 'circle', layer: 'back', props: { cx: 57, cy: 14, r: 5, fill: '#f2c66d' },
          anchors: { center: [57, 14] } },
        { id: 'lampPole', type: 'line', layer: 'mid', props: { x1: 62, y1: 70, x2: 62, y2: 40, stroke: '#9a8c74', strokeWidth: 0.8 } },
        { id: 'lamp', type: 'circle', layer: 'mid', props: { cx: 62, cy: 38.6, r: 1.6, fill: '#f2c66d', stroke: '#9a8c74', strokeWidth: 0.4 },
          anchors: { center: [62, 38.6] } },
      ],
    },
    bedroom: {
      bg: '#f3eee6',
      elements: [
        { id: 'window', type: 'rect', layer: 'back', props: { x: 14, y: 18, w: 16, h: 16, fill: '#dce8ee', stroke: '#a89a82', strokeWidth: 0.8, rx: 0.5 },
          anchors: { center: [22, 26] } },
        { id: 'moon', type: 'circle', layer: 'back', props: { cx: 25, cy: 23, r: 2.6, fill: '#f2e2a8' } },
        { id: 'bed', type: 'rect', layer: 'mid', props: { x: 52, y: 64.5, w: 38, h: 5.5, fill: '#cdb9a0', rx: 1.4 },
          anchors: { center: [71, 64.5], pillow: [60, 63.5], foot: [86, 64.5] } },
        { id: 'bedLegL', type: 'line', layer: 'mid', props: { x1: 54, y1: 69.8, x2: 54, y2: 70, stroke: '#a89a82', strokeWidth: 0.9 } },
        { id: 'bedLegR', type: 'line', layer: 'mid', props: { x1: 88, y1: 69.8, x2: 88, y2: 70, stroke: '#a89a82', strokeWidth: 0.9 } },
        { id: 'pillow', type: 'rect', layer: 'mid', props: { x: 54, y: 62.6, w: 10, h: 2.6, fill: '#efe7d8', stroke: '#a89a82', strokeWidth: 0.4, rx: 1.2 } },
      ],
    },
  };
})();
