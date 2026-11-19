/* Draws one frame of the video onto a canvas */
const Render = {
  filters: {
    none: 'none',
    warm: 'sepia(0.35) saturate(1.3) hue-rotate(-10deg)',
    cool: 'saturate(1.1) hue-rotate(15deg) brightness(1.03)',
    bw: 'grayscale(1) contrast(1.1)',
    vivid: 'saturate(1.6) contrast(1.1)',
    vintage: 'sepia(0.6) contrast(0.95) brightness(1.05)'
  },

  size: { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1000, 1000] },

  drawPhoto(ctx, img, cw, ch, m) {
    const r = Math.max(cw / img.width, ch / img.height);
    const w = img.width * r * m.s, h = img.height * r * m.s;
    const mx = (w - cw) / 2, my = (h - ch) / 2;
    ctx.save();
    ctx.translate(cw / 2 + m.px * mx, ch / 2 + m.py * my);
    ctx.rotate(m.rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  },

  // st: {images:[canvas|img], seg, xf, motion, k, filter, vig, fade, caption}
  frame(ctx, cw, ch, st, t) {
    const n = st.images.length, total = n * st.seg;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    if (!n) return;
    const L = Motions.locate(t, n, st.seg, st.xf);
    ctx.filter = Render.filters[st.filter] || 'none';
    Render.drawPhoto(ctx, st.images[L.i], cw, ch, Motions.at(Motions.motionFor(st.motion, L.i), L.u, st.k));
    if (L.next > 0) {
      ctx.globalAlpha = L.next;
      Render.drawPhoto(ctx, st.images[L.i + 1], cw, ch, Motions.at(Motions.motionFor(st.motion, L.i + 1), 0, st.k));
      ctx.globalAlpha = 1;
    }
    ctx.filter = 'none';

    if (st.vig) {
      const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }
    if (st.caption) {
      const a = Math.min(1, Math.max(0, (t - 0.3) / 0.6)) * Math.min(1, Math.max(0, (total - t) / 0.6));
      if (a > 0) {
        const fs = Math.round(Math.min(cw, ch) * 0.06);
        ctx.save();
        ctx.globalAlpha = a; ctx.font = `600 ${fs}px Georgia,serif`; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = fs * 0.4;
        ctx.fillStyle = '#fff'; ctx.fillText(st.caption, cw / 2, ch - fs * 1.4, cw * 0.9);
        ctx.restore();
      }
    }
    if (st.fade) {
      const f = 0.6;
      const a = t < f ? 1 - t / f : t > total - f ? (t - (total - f)) / f : 0;
      if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, cw, ch); }
    }
  }
};
