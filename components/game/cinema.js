import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

export function resolutionFor(width, height, dpr, quality = 'high') {
  const budget = quality === 'high' ? 3600000 : 1500000;
  const scale = Math.min(Math.max(dpr, 1), quality === 'high' ? 1.65 : 1, Math.sqrt(budget / Math.max(1, width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function createDaylight(scene, renderer) {
  const sky = new Sky();
  sky.name = 'Golden hour atmosphere';
  sky.scale.setScalar(180);
  sky.userData.excludeFromDepth = true;
  const u = sky.material.uniforms;
  u.turbidity.value = 3.8;
  u.rayleigh.value = 1.3;
  u.mieCoefficient.value = 0.003;
  u.mieDirectionalG.value = 0.78;
  // Lower visible sun, while a wider key light keeps faces and the arena readable.
  u.sunPosition.value.set(-0.6, 0.25, -0.75).normalize();
  scene.add(sky);
  const environment = new T.Scene();
  environment.add(sky.clone());
  const pmrem = new T.PMREMGenerator(renderer);
  const target = pmrem.fromScene(environment, 0.04, 0.1, 400);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();
  return { sky, target };
}

function withSolidGeometry(scene, draw) {
  const hidden = [];
  scene.traverse((o) => {
    if (!o.visible) return;
    if (o.userData.excludeFromDepth || o.isPoints || o.isLine ||
      (o.material?.transparent && !o.userData.keepInDepth && o.material.opacity < 0.98)) {
      hidden.push(o);
      o.visible = false;
    }
  });
  try { draw(); } finally { hidden.forEach((o) => (o.visible = true)); }
}

export class ContactShadows extends GTAOPass {
  constructor(scene, camera) {
    super(scene, camera, 512, 512, undefined,
      { radius: 0.55, distanceExponent: 1.6, thickness: 0.8, samples: 12 },
      { radius: 5, samples: 8, depthPhi: 2, normalPhi: 4 });
    this.blendIntensity = 0.8;
  }
  setSize(w, h) { super.setSize(Math.max(1, Math.round(w * 0.65)), Math.max(1, Math.round(h * 0.65))); }
  setCamera(camera) {
    this.camera = camera;
    const perspective = camera.isPerspectiveCamera ? 1 : 0;
    if (this.gtaoMaterial.defines.PERSPECTIVE_CAMERA !== perspective) {
      this.gtaoMaterial.defines.PERSPECTIVE_CAMERA = perspective;
      this.gtaoMaterial.needsUpdate = true;
    }
  }
  render(...args) { withSolidGeometry(this.scene, () => super.render(...args)); }
}

export class LobbyDepthOfField extends BokehPass {
  constructor(scene, camera) {
    super(scene, camera, { focus: 26, aperture: 0.00009, maxblur: 0.006 });
  }
  render(...args) { withSolidGeometry(this.scene, () => super.render(...args)); }
}

export function surfaceMaps() {
  const size = 128, rough = new Uint8Array(size * size * 4), bump = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = noise - Math.floor(noise);
      const pools = Math.sin(x * 0.075 + Math.sin(y * 0.09)) * Math.cos(y * 0.065);
      const r = pools > 0.2 ? 45 + grain * 25 : 125 + grain * 75;
      const b = 118 + grain * 20;
      for (let c = 0; c < 3; c++) { rough[offset + c] = r; bump[offset + c] = b; }
      rough[offset + 3] = bump[offset + 3] = 255;
    }
  }
  const textures = [rough, bump].map((data) => {
    const t = new T.DataTexture(data, size, size, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.magFilter = T.LinearFilter;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.repeat.set(12, 10);
    t.needsUpdate = true;
    return t;
  });
  return { roughness: textures[0], bump: textures[1] };
}
