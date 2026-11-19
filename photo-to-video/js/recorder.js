/* Records the canvas animation into a downloadable video file */
const Recorder = {
  audioCtx: null, audioSrc: null,

  pickType() {
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  },

  supported() { return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream); },

  // draw(t) paints the frame at time t (seconds). Resolves with {blob, ext}
  record({ canvas, fps, duration, draw, audioEl, onProgress }) {
    return new Promise((resolve, reject) => {
      const stream = canvas.captureStream(fps);
      let usedAudio = false;
      if (audioEl) {
        try {
          if (!Recorder.audioCtx) Recorder.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          if (!Recorder.audioSrc) Recorder.audioSrc = Recorder.audioCtx.createMediaElementSource(audioEl);
          const dest = Recorder.audioCtx.createMediaStreamDestination();
          Recorder.audioSrc.disconnect();
          Recorder.audioSrc.connect(dest);
          dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
          audioEl.currentTime = 0;
          audioEl.play();
          usedAudio = true;
        } catch (e) { usedAudio = false; }
      }
      const mime = Recorder.pickType();
      let rec;
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : {}); }
      catch (e) { reject(e); return; }
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        if (usedAudio) audioEl.pause();
        const type = rec.mimeType || mime || 'video/webm';
        resolve({ blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm', audio: usedAudio });
      };
      rec.onerror = e => reject(e.error || e);
      rec.start(250);
      const t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 1000;
        if (t >= duration) { draw(duration); onProgress(1); setTimeout(() => rec.stop(), 200); return; }
        draw(t); onProgress(t / duration);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
};
