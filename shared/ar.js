// Moteur commun : reconnaissance des photos (MindAR) et effets en réalité augmentée (three.js).
// Utilisé par l'espace visiteur et par l'espace artiste (bouton « Tester »).

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Réduit une image à `max` pixels sur son grand côté et la renvoie dans un canvas. */
export function toCanvas(img, max = 1000) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function blobToCanvas(blob, max = 1000) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return toCanvas(img, max);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Apprend à reconnaître une liste de photos. Renvoie les données du fichier « cibles.mind ». */
export async function compileTargets(canvases, onProgress) {
  const { Compiler } = await import("mindar-image");
  const compiler = new Compiler();
  await compiler.compileImageTargets(canvases, (p) => onProgress && onProgress(Math.min(100, p)));
  return compiler.exportData();
}

/** Un son muet, joué pendant le geste du visiteur pour autoriser le son ensuite (iPhone). */
export function silentWavUrl() {
  const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function dotTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,240,210,1)");
  grd.addColorStop(0.35, "rgba(255,190,90,.65)");
  grd.addColorStop(1, "rgba(255,170,60,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function wrapLines(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

function drawCard(THREE, work) {
  const W = 1024, pad = 56, inner = W - pad * 2;
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const serif = "'Instrument Serif', Georgia, serif", sans = "Manrope, system-ui, sans-serif";
  g.font = `400 76px ${serif}`;
  const tLines = wrapLines(g, work.titre || "", inner);
  g.font = `400 32px ${sans}`;
  const bLines = work.texte ? wrapLines(g, work.texte, inner) : [];
  const H = pad + tLines.length * 80 + 18 + 40 + 26 + bLines.length * 46 + pad;
  c.width = W; c.height = H;
  g.fillStyle = "rgba(21,23,26,0.86)";
  g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, W, H, 28); else g.rect(0, 0, W, H);
  g.fill();
  g.fillStyle = "#f0a640"; g.fillRect(pad, pad - 18, 64, 4);
  let y = pad + 62;
  g.fillStyle = "#ece7df"; g.font = `400 76px ${serif}`;
  for (const l of tLines) { g.fillText(l, pad, y); y += 80; }
  y += 6;
  g.fillStyle = "#f0a640"; g.font = `700 26px ${sans}`;
  if ("letterSpacing" in g) g.letterSpacing = "4px";
  g.fillText((work.meta || "").toUpperCase(), pad, y);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
  y += 58;
  g.fillStyle = "#d8d2c8"; g.font = `400 32px ${sans}`;
  for (const l of bLines) { g.fillText(l, pad, y); y += 46; }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: H / W };
}

/** Construit les effets d'une œuvre sur son repère (largeur de la photo = 1 unité). */
async function buildWorkScene(THREE, group, work) {
  const h = work.ratio || 1;
  const fx = work.effets || {};
  const parts = {};

  if (fx.cadre !== false) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xf0a640, transparent: true, opacity: 0.95, depthTest: false });
    const t = 0.012;
    const mk = (w, hh, x, y) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), mat);
      m.position.set(x, y, 0.002); group.add(m); return m;
    };
    parts.frame = {
      mat,
      top: mk(1 + t, t, 0, h / 2), bottom: mk(1 + t, t, 0, -h / 2),
      left: mk(t, h + t, -0.5, 0), right: mk(t, h + t, 0.5, 0),
    };
  }

  if (work.video) {
    const v = document.createElement("video");
    v.src = work.video; v.loop = true; v.muted = true; v.playsInline = true;
    v.setAttribute("playsinline", ""); v.setAttribute("muted", ""); v.preload = "auto";
    await new Promise((r) => { v.onloadedmetadata = r; v.onerror = r; setTimeout(r, 8000); });
    const tex = new THREE.VideoTexture(v);
    tex.colorSpace = THREE.SRGBColorSpace;
    const va = (v.videoHeight || 1) / (v.videoWidth || 1);
    if (va > h) { tex.repeat.set(1, h / va); tex.offset.set(0, (1 - h / va) / 2); }
    else { tex.repeat.set(va / h, 1); tex.offset.set((1 - va / h) / 2, 0); }
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, h), mat);
    mesh.position.z = 0.001; group.add(mesh);
    parts.video = { el: v, mat };
  }

  if (fx.poussiere !== false) {
    const N = 260;
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), life = new Float32Array(N);
    const reset = (i, initial) => {
      pos[i * 3] = Math.random() - 0.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * h;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.03;
      vel[i * 3 + 1] = 0.02 + Math.random() * 0.05;
      vel[i * 3 + 2] = 0.05 + Math.random() * 0.12;
      life[i] = initial ? Math.random() * 4 : 0;
    };
    for (let i = 0; i < N; i++) reset(i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.035, map: dotTexture(THREE), transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(geo, mat));
    parts.dust = { geo, mat, pos, vel, life, reset, N };
  }

  if (fx.cartel !== false && (work.titre || work.meta || work.texte)) {
    const { tex, aspect } = drawCard(THREE, work);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, aspect), mat);
    mesh.position.set(0, -h / 2 - aspect / 2 - 0.06, 0.004);
    group.add(mesh);
    parts.card = { mesh, mat, baseY: mesh.position.y };
  }
  return parts;
}

function animate(parts, t, now, dt, active, reduce) {
  const k = (start, dur) => (reduce ? 1 : ease((t - start) / dur));
  if (parts.frame) {
    const f = parts.frame, p = k(0, 0.9);
    f.top.scale.x = f.bottom.scale.x = Math.max(0.001, p);
    f.left.scale.y = f.right.scale.y = Math.max(0.001, p);
    f.mat.opacity = (0.35 + 0.6 * (0.5 + 0.5 * Math.sin(now / 500))) * p;
  }
  if (parts.video) parts.video.mat.opacity = k(0.6, 1.2);
  if (parts.card) {
    const p = k(0.9, 0.8);
    parts.card.mat.opacity = p;
    parts.card.mesh.position.y = parts.card.baseY - (1 - p) * 0.12;
  }
  if (parts.dust) {
    const d = parts.dust;
    d.mat.opacity = 0.9 * k(0.3, 1);
    if (active && !reduce) {
      for (let i = 0; i < d.N; i++) {
        d.life[i] += dt;
        if (d.life[i] > 4) d.reset(i, false);
        d.pos[i * 3] += d.vel[i * 3] * dt;
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      }
      d.geo.attributes.position.needsUpdate = true;
    }
  }
}

/**
 * Ouvre la caméra et lance la reconnaissance.
 * works[i] correspond à la i-ème photo du fichier de cibles :
 * { titre, meta, texte, ratio, effets: {cadre, poussiere, cartel}, video: url|null, son: url|null }
 * audioEl : élément <audio> déjà débloqué par un geste du visiteur.
 */
export async function startAR({ container, targetSrc, works, audioEl, onFound, onLost }) {
  const THREE = await import("three");
  const { MindARThree } = await import("mindar-image-three");
  try {
    await Promise.all([
      document.fonts.load("76px 'Instrument Serif'"),
      document.fonts.load("400 32px Manrope"),
      document.fonts.load("700 26px Manrope"),
    ]);
  } catch {}
  container.innerHTML = "";
  const mindar = new MindARThree({
    container, imageTargetSrc: targetSrc, maxTrack: 1,
    filterMinCF: 0.0001, filterBeta: 0.001, uiScanning: "yes", uiLoading: "yes",
  });
  const { renderer, scene, camera } = mindar;
  const states = works.map(() => ({ parts: null, building: null, foundAt: null }));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  works.forEach((work, i) => {
    const anchor = mindar.addAnchor(i);
    const st = states[i];
    anchor.onTargetFound = async () => {
      st.foundAt = performance.now();
      onFound && onFound(work, i);
      if (audioEl && work.son) {
        if (audioEl.dataset.src !== work.son) { audioEl.src = work.son; audioEl.dataset.src = work.son; }
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
      }
      if (!st.parts) {
        st.building = st.building || buildWorkScene(THREE, anchor.group, work);
        st.parts = await st.building;
        if (st.foundAt !== null) st.foundAt = performance.now();
      }
      if (st.foundAt !== null && st.parts.video) {
        st.parts.video.el.currentTime = 0;
        st.parts.video.el.play().catch(() => {});
      }
    };
    anchor.onTargetLost = () => {
      st.foundAt = null;
      if (st.parts && st.parts.video) st.parts.video.el.pause();
      if (audioEl && work.son) audioEl.pause();
      onLost && onLost(work, i);
    };
  });

  const hideUi = () => { try { mindar.ui.hideLoading(); mindar.ui.hideScanning(); } catch {} };
  try {
    await mindar.start();
  } catch (e) {
    hideUi();
    try { mindar.stop(); } catch {}
    container.innerHTML = "";
    throw new Error("camera");
  }

  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const st of states) {
      if (!st.parts) continue;
      const t = st.foundAt === null ? 0 : (now - st.foundAt) / 1000;
      animate(st.parts, t, now, dt, st.foundAt !== null, reduce);
    }
    renderer.render(scene, camera);
  });

  return {
    stop() {
      try { renderer.setAnimationLoop(null); } catch {}
      try { mindar.stop(); } catch {}
      hideUi();
      for (const st of states) if (st.parts && st.parts.video) { st.parts.video.el.pause(); st.parts.video.el.removeAttribute("src"); }
      if (audioEl) audioEl.pause();
      try { renderer.dispose(); } catch {}
      container.innerHTML = "";
    },
  };
}
