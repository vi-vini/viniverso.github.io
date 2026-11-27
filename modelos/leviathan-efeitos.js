// Efeitos do Leviathan no visualizador da loja: duas chamas azuis de gás, uma em cada órbita da caveira,
// com uma luz azul fraca que acende os ossos em volta. O bloom do visualizador faz o brilho.
// Uso: const fx = (await import("modelos/leviathan-efeitos.js")).default({THREE, scene, root, camera, renderer, key, leve});
//      a cada quadro fx.tick(dt, t); ao trocar de modelo fx.dispose().
// As medidas estão em metros, no espaço do GLB (chão em y = 0, frente para +Z), tiradas por raio na caveira.

export const P = {
  olhos: [[-0.143, 1.712, 0.2], [-0.097, 1.713, 0.212]],   // centro de cada órbita, na boca do buraco (a chama sai para fora do osso)
  chama: { altura: 0.12, largura: 0.05 },
  halo: { tam: 0.06, forca: 0.3 },
  luz: { cor: 0x3a7dff, forca: 0.0025, alcance: 0.035 },   // alcance em unidades do mundo: só os ossos em volta das órbitas
};

const RUIDO = /* glsl */ `
float h(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }`;

// quadrado sempre virado para a câmera, preso pela base (a chama cresce para cima a partir da órbita)
const VS = /* glsl */ `
uniform vec2 tam; varying vec2 vUv;
void main(){ vUv = uv; float e = length(modelMatrix[0].xyz);
  vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.); mv.xy += vec2(position.x * tam.x, (position.y + .5) * tam.y) * e;
  gl_Position = projectionMatrix * mv; }`;

// chama de gás: firme, azul por fora, núcleo ciano quase branco na base, ponta que tremula
const FS_GAS = /* glsl */ `
uniform float t, seed; varying vec2 vUv;
${RUIDO}
void main(){
  float y = vUv.y;
  float n = fbm(vec2(vUv.x * 4. + seed, y * 3. - t * 4.2));
  float w = mix(.34, .03, pow(y, .7)) * (.85 + .3 * n);
  float dx = abs(vUv.x - .5 + (n - .5) * .14 * y);
  float corpo = smoothstep(w, w * .35, dx) * smoothstep(0., .1, y) * smoothstep(1., .5, y + (n - .5) * .35);
  float nucleo = smoothstep(w * .6, 0., dx) * smoothstep(.02, .16, y) * (1. - smoothstep(.18, .5, y));
  vec3 c = vec3(.04, .22, 1.) * corpo * 2.2 + vec3(.5, .85, 1.) * nucleo * 3.;
  gl_FragColor = vec4(c, max(corpo * .7, nucleo));
}`;

const FS_HALO = /* glsl */ `
uniform float t, forca; varying vec2 vUv;
void main(){ float d = length(vUv - vec2(.5, .3)) * 2.;
  float g = pow(max(0., 1. - d), 2.4) * forca * (.9 + .1 * sin(t * 13.));
  gl_FragColor = vec4(vec3(.15, .45, 1.) * g, g); }`;

export default function criar({ THREE, scene, root }) {
  // presos à peça da cabeça (somem junto em "Ver peças"); a compressão guarda escala e deslocamento no nó, então
  // a transformação é desfeita para as medidas acima continuarem no espaço do modelo
  const pai = root.getObjectByName("cabeca-tentaculos") || root;
  const grupo = new THREE.Group(); grupo.name = "leviathan-efeitos"; pai.add(grupo);
  if (pai !== root) {
    root.updateMatrixWorld(true);
    new THREE.Matrix4().copy(pai.matrixWorld).invert().multiply(root.matrixWorld).decompose(grupo.position, grupo.quaternion, grupo.scale);
  }
  const mats = [], luzes = [];
  const quad = new THREE.PlaneGeometry(1, 1);
  const mat = (fs, u) => {
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: { t: { value: 0 }, seed: { value: Math.random() * 10 }, ...u },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    mats.push(m); return m;
  };
  for (const [x, y, z] of P.olhos) {
    const halo = new THREE.Mesh(quad, mat(FS_HALO, { tam: { value: new THREE.Vector2(P.halo.tam, P.halo.tam) }, forca: { value: P.halo.forca } }));
    halo.position.set(x, y - P.halo.tam * 0.3, z); halo.frustumCulled = false; halo.renderOrder = 10; grupo.add(halo);
    // duas línguas por órbita, com sementes diferentes, para a chama não parecer um recorte
    for (const k of [1, 0.7]) {
      const ch = new THREE.Mesh(quad, mat(FS_GAS, { tam: { value: new THREE.Vector2(P.chama.largura * k, P.chama.altura * (k === 1 ? 1 : 1.25)) } }));
      ch.position.set(x, y, z); ch.frustumCulled = false; ch.renderOrder = 11; grupo.add(ch);
    }
    const l = new THREE.PointLight(P.luz.cor, P.luz.forca, P.luz.alcance, 2); l.position.set(x, y + 0.02, z + 0.02); grupo.add(l); luzes.push(l);
  }
  let oculto = false;
  function tick(dt, t) {
    for (const m of mats) m.uniforms.t.value = t;
    luzes.forEach((l, i) => { l.intensity = P.luz.forca * (0.85 + 0.15 * Math.sin(t * 17 + i * 2.1) * Math.sin(t * 6.3 + i)); });
  }
  function ocultar(v) { oculto = !!v; grupo.visible = !oculto; }
  function dispose() { if (grupo.parent) grupo.parent.remove(grupo); quad.dispose(); mats.forEach((m) => m.dispose()); }
  return { tick, dispose, ocultar, grupo, P };
}
