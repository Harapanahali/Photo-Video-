const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const state = { photos: [], t: 0, playing: false, last: 0, recording: false, audioEl: null };

function settings() {
  return {
    images: state.photos.map(p => p.el), seg: +$('seg').value, xf: +$('xf').value, motion: $('motion').value,
    k: +$('k').value, filter: $('filter').value, vig: $('vig').checked, fade: $('fade').checked, caption: $('caption').value.trim()
  };
}
function duration() { return state.photos.length * +$('seg').value; }
function mmss(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

function draw() {
  Render.frame(ctx, cv.width, cv.height, settings(), state.t);
  const D = duration();
  $('time').textContent = `${mmss(state.t)} / ${mmss(D)}`;
  if (!state.playing && D) $('seek').value = Math.round(state.t / D * 1000);
}

function setSize() {
  const [w, h] = Render.size[$('ratio').value];
  cv.width = w; cv.height = h; draw();
}

function loop(now) {
  if (state.playing) {
    state.t += (now - state.last) / 1000;
    const D = duration();
    if (state.t >= D) state.t = 0;
    $('seek').value = Math.round(state.t / D * 1000);
    draw();
  }
  state.last = now;
  requestAnimationFrame(loop);
}

function refreshUI() {
  const has = state.photos.length > 0;
  ['play', 'seek', 'rec'].forEach(id => $(id).disabled = !has);
  if (!has) { state.playing = false; $('play').textContent = 'Play'; state.t = 0; $('msg').textContent = 'Add at least one photo to begin.'; }
  else if (!state.recording) $('msg').textContent = `${state.photos.length} photo(s), ${mmss(duration())} long. Press Play to preview, then Record video.`;
  $('list').innerHTML = state.photos.map((p, i) => `<li><img src="${p.thumb}" alt=""><span>${p.name}</span>
    <button data-a="up" data-i="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
    <button data-a="down" data-i="${i}" title="Move down" ${i === state.photos.length - 1 ? 'disabled' : ''}>&darr;</button>
    <button data-a="del" data-i="${i}" title="Remove">&times;</button></li>`).join('');
  draw();
}

function addFiles(files) {
  [...files].filter(f => f.type.startsWith('image/')).forEach(f => {
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => { state.photos.push({ name: f.name, el: img, thumb: url }); refreshUI(); };
    img.src = url;
  });
}

function sample() {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1000;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 700);
  sky.addColorStop(0, '#2b3a67'); sky.addColorStop(0.5, '#e07a5f'); sky.addColorStop(1, '#f2cc8f');
  g.fillStyle = sky; g.fillRect(0, 0, 1600, 1000);
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(1100, 520, 110, 0, 7); g.fill();
  [['#3d405b', 700, 140], ['#2f3250', 780, 110], ['#1f2138', 860, 90]].forEach(([col, y, a], i) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 1000);
    for (let x = 0; x <= 1600; x += 40) g.lineTo(x, y + Math.sin(x / 170 + i * 2) * a * 0.4 + Math.sin(x / 60 + i) * 12);
    g.lineTo(1600, 1000); g.fill();
  });
  state.photos.push({ name: 'sample-sunset.png', el: c, thumb: c.toDataURL('image/jpeg', 0.7) });
  refreshUI();
}

async function record() {
  if (!Recorder.supported()) { $('msg').textContent = 'This browser cannot record video. Use Chrome, Edge or Firefox on a computer.'; return; }
  state.playing = false; $('play').textContent = 'Play'; state.recording = true;
  ['rec', 'play', 'seek'].forEach(id => $(id).disabled = true);
  $('result').innerHTML = ''; $('msg').textContent = 'Recording in real time. Keep this tab open until it finishes.';
  const st = settings(), D = duration();
  try {
    const out = await Recorder.record({
      canvas: cv, fps: +$('fps').value, duration: D, audioEl: state.audioEl,
      draw: t => { state.t = t; Render.frame(ctx, cv.width, cv.height, st, t); $('time').textContent = `${mmss(t)} / ${mmss(D)}`; },
      onProgress: p => $('prog').style.width = (p * 100) + '%'
    });
    const url = URL.createObjectURL(out.blob);
    $('result').innerHTML = `<video src="${url}" controls></video><br><a href="${url}" download="photo-video.${out.ext}">Download video (.${out.ext}, ${(out.blob.size / 1048576).toFixed(1)} MB)</a>`;
    $('msg').textContent = 'Done.' + (state.audioEl && !out.audio ? ' Music could not be added in this browser.' : '') + (out.ext === 'webm' ? ' This browser saves WebM. For Instagram or WhatsApp, convert it to MP4.' : '');
  } catch (e) {
    $('msg').textContent = 'Recording failed: ' + (e.message || e);
  }
  state.recording = false; state.t = 0; $('prog').style.width = '0';
  ['rec', 'play', 'seek'].forEach(id => $(id).disabled = false); draw();
}

window.addEventListener('DOMContentLoaded', () => {
  $('motion').innerHTML = Object.entries(Motions.list).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('files').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  $('sample').onclick = sample;
  $('list').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.dataset.i, a = b.dataset.a, L = state.photos;
    if (a === 'del') L.splice(i, 1);
    else { const j = a === 'up' ? i - 1 : i + 1; [L[i], L[j]] = [L[j], L[i]]; }
    refreshUI();
  };
  [['k', 'kVal'], ['seg', 'segVal'], ['xf', 'xfVal']].forEach(([a, b]) => $(a).oninput = () => { $(b).textContent = $(a).value; refreshUI(); });
  ['motion', 'filter', 'vig', 'fade', 'caption'].forEach(id => $(id).oninput = draw);
  $('ratio').onchange = setSize;
  $('play').onclick = () => { state.playing = !state.playing; $('play').textContent = state.playing ? 'Pause' : 'Play'; };
  $('seek').oninput = e => { state.playing = false; $('play').textContent = 'Play'; state.t = e.target.value / 1000 * duration(); draw(); };
  $('music').onchange = e => {
    const f = e.target.files[0];
    state.audioEl = f ? Object.assign(new Audio(), { src: URL.createObjectURL(f) }) : null;
    Recorder.audioSrc = null;
  };
  $('rec').onclick = record;
  refreshUI();
  requestAnimationFrame(loop);
});
