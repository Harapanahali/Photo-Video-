/* Camera motions. Each returns {s, px, py, rot}:
   s = extra zoom (>= 1), px/py = position in -1..1 of the spare image edge, rot = radians */
const Motions = {
  list: { mix: 'Mix (changes per photo)', zoomIn: 'Zoom in', zoomOut: 'Zoom out', panLeft: 'Pan left', panRight: 'Pan right', panUp: 'Pan up', drift: 'Drift', orbit: 'Orbit', pulse: 'Pulse' },
  mixOrder: ['zoomIn', 'panLeft', 'drift', 'zoomOut', 'panRight', 'orbit', 'panUp'],

  ease(u) { return 0.5 - 0.5 * Math.cos(Math.PI * u); },

  at(name, u, k) {
    const e = Motions.ease(u);
    switch (name) {
      case 'zoomIn':   return { s: 1 + 0.25 * k * e, px: 0, py: 0, rot: 0 };
      case 'zoomOut':  return { s: 1 + 0.25 * k * (1 - e), px: 0, py: 0, rot: 0 };
      case 'panLeft':  return { s: 1 + 0.18 * k, px: 1 - 2 * e, py: 0, rot: 0 };
      case 'panRight': return { s: 1 + 0.18 * k, px: -1 + 2 * e, py: 0, rot: 0 };
      case 'panUp':    return { s: 1 + 0.18 * k, px: 0, py: 1 - 2 * e, rot: 0 };
      case 'drift':    return { s: 1 + 0.12 * k + 0.15 * k * e, px: 0.6 * Math.sin(u * Math.PI), py: -0.5 * e, rot: 0.01 * k * Math.sin(u * Math.PI * 2) };
      case 'orbit':    return { s: 1 + 0.2 * k, px: 0.7 * Math.cos(u * 2 * Math.PI), py: 0.7 * Math.sin(u * 2 * Math.PI), rot: 0 };
      case 'pulse':    return { s: 1 + 0.05 * k * (1 + Math.sin(u * Math.PI * 4)), px: 0, py: 0, rot: 0 };
      default:         return { s: 1, px: 0, py: 0, rot: 0 };
    }
  },

  // Which motion does photo number i use?
  motionFor(choice, i) { return choice === 'mix' ? Motions.mixOrder[i % Motions.mixOrder.length] : choice; },

  // Where are we at time t? Returns current photo index, progress u, and next-photo crossfade alpha
  locate(t, n, seg, xf) {
    const total = n * seg;
    t = Math.min(Math.max(t, 0), total - 1e-6);
    const i = Math.min(n - 1, Math.floor(t / seg));
    const u = (t - i * seg) / seg;
    const f = Math.min(xf, seg * 0.5) / seg;
    const next = i < n - 1 && f > 0 && u > 1 - f ? (u - (1 - f)) / f : 0;
    return { i, u, next };
  }
};
