// Efeitos do The Fury no visualizador da loja: luz de cena escura, fogo e fumaça saindo do capacete,
// brilho no colar e reflexo alaranjado do fogo na armadura.
// Uso: const fx = (await import("modelos/fury-efeitos.js")).default({THREE, scene, root, camera, renderer, key, leve});
//      a cada quadro fx.tick(dt, t); ao trocar de modelo fx.dispose().
// As medidas estão em metros, no espaço do GLB (chão em y = 0, frente para +Z).

export const P = {
  capacete: { x: -0.083, z: -0.07, base: 4.62, topo: 5.62, raio: 0.165 },
  nucleo: { de: 4.6, ate: 5.6, raio: 0.14, raioBase: 0.075, forca: 2.6 },
  bacia: { de: 4.62, ate: 4.98, raioBase: 0.16, raioTopo: 0.27, forca: 3.0 },
  halo: [[0, 4.8, 0.3, 1.3, 0.5, true], [0, 5.66, 0, 0.9, 0.35, false]],
  chama: { altura: 0.45, largura: 0.2, y: -0.2 },
  fumaca: { altura: 1.5, largura: 0.75, opacidade: 0.75 },
  luz: {
    fundo: 0x000000,
    ambiente: 0.55,
    chave: [0xf3f0ea, 1.1, [1.2, 2.2, 2.6]],
    recortes: [
      [0xa9c8ff, 0.9, [-2.5, 2.4, -2.2]],
      [0xffd2b0, 0.6, [2.6, 1.6, -2.0]],
    ],
    hemi: [0x7fa6a8, 0x3a1a14, 0.6],
    fogo: [0xff4010, 0.06, [0, 4.82, 0.22]],
    chamaLuz: [0xff7a28, 0.02, [0, 5.75, 0.05]],
    dentro: [0xff8a30, 0.01, [0, 5.4, 0]],
    colar: [0xff3c06, 0.13, [0, 4.74, 0]],
    exposicao: 1.0,
  },
};

const VS = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const RUIDO = /* glsl */ `
float h(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }`;

// chama: corpo largo na base que se divide em línguas e se apaga no alto
const FS_CHAMA = /* glsl */ `
uniform float t; uniform float seed; varying vec2 vUv;
${RUIDO}
void main(){
  vec2 uv = vUv; float y = uv.y;
  float n = fbm(vec2(uv.x*3.2 + seed, y*2.4 - t*2.1));
  float n2v = fbm(vec2(uv.x*6.0 - seed, y*4.5 - t*3.4));
  float largura = mix(.42, .06, pow(y, .8)) * (0.75 + .5*n);
  float dx = abs(uv.x - .5 + (n2v-.5)*.25*y);
  float corpo = smoothstep(largura, largura*.35, dx);
  float topo = smoothstep(1.0, .15, y + (n-.5)*.55);
  float f = corpo * topo * smoothstep(0.0, .08, y);
  float quente = clamp(f*1.6 - y*.6, 0., 1.);
  vec3 c = mix(vec3(.9,.18,.02), vec3(1.,.55,.12), smoothstep(.15,.6,quente));
  c = mix(c, vec3(1.,.85,.55), smoothstep(.8,1.,quente));
  gl_FragColor = vec4(c * f * 1.6, f);
}`;

// fumaça: rolos de fumaça cinza que sobem, abrem e somem
const FS_FUMACA = /* glsl */ `
uniform float t; uniform float seed; uniform float opac; varying vec2 vUv;
${RUIDO}
void main(){
  vec2 uv = vUv; float y = uv.y;
  float sobe = t*.32;
  vec2 q = vec2((uv.x-.5)*(1.9 - y*1.0), y);
  float ondula = (fbm(vec2(y*1.6 - sobe, seed)) - .5) * .5 * y;
  float dx = abs(q.x - ondula);
  float n = fbm(vec2(q.x*3.0 + seed, y*2.6 - sobe*2.2));
  float m = fbm(vec2(q.x*6.5 - n, y*5.0 - sobe*3.0 + seed));
  float raio = mix(.14, .5, smoothstep(0., .7, y)) * (.7 + .6*n);
  float puff = smoothstep(raio, raio*.3, dx) * (.35 + .9*smoothstep(.3, .7, m + n*.3));
  float a = puff * smoothstep(0., .1, y) * smoothstep(1., .5, y);
  vec3 c = mix(vec3(.55,.5,.48), vec3(.95,.9,.86), smoothstep(.3,.8,m));
  c = mix(vec3(1.,.55,.25)*1.3, c, smoothstep(.0,.25,y)); // base acesa pelo fogo
  gl_FragColor = vec4(c, clamp(a*opac, 0., 1.));
}`;

// brilho na parede interna do colar: forte embaixo, some na borda
const FS_BACIA = /* glsl */ `
uniform float t; uniform float forca; varying vec2 vUv;
${RUIDO}
void main(){
  float n = fbm(vec2(vUv.x*18., vUv.y*2. - t*.5));
  float g = pow(1. - vUv.y, .9) * (.55 + .8*n);
  vec3 c = mix(vec3(.85,.12,.02), vec3(1.,.45,.1), smoothstep(.4,1.,g));
  gl_FragColor = vec4(c*g*forca, g);
}`;

// brasa do colar e núcleo do capacete: lava que pulsa
const FS_BRASA = /* glsl */ `
uniform float t; uniform float forca; varying vec2 vUv;
${RUIDO}
void main(){
  float n = fbm(vec2(vUv.x*14., vUv.y*3. - t*.7));
  float k = .55 + .6*n;
  vec3 c = mix(vec3(.85,.12,.01), vec3(1.,.62,.15), smoothstep(.45,.95,k));
  c = mix(c, vec3(1.,.92,.65), smoothstep(.9,1.15,k));
  gl_FragColor = vec4(c*forca*k, 1.);
}`;

export default function criar({ THREE, scene, root, camera, renderer, key, leve, imersivo }) {
  const L = P.luz, C = P.capacete;
  const antes = {
    bg: scene.background, env: scene.environmentIntensity, exp: renderer.toneMappingExposure,
    key: key ? [key.color.getHex(), key.intensity, key.position.clone()] : null,
  };
  // os efeitos vão presos ao capacete (quando o modelo vem separado em peças): acompanham a montagem e somem com ele em "Ver peças".
  const pai = root.getObjectByName("capacete") || root;
  const grupo = new THREE.Group(); grupo.name = "fury-efeitos"; pai.add(grupo);
  // a peça pode ter transformação própria (a compressão do GLB quantiza as posições e guarda escala e deslocamento no nó):
  // desfaz isso para que as medidas abaixo continuem no espaço do modelo
  if (pai !== root) {
    root.updateMatrixWorld(true);
    const rel = new THREE.Matrix4().copy(pai.matrixWorld).invert().multiply(root.matrixWorld);
    rel.decompose(grupo.position, grupo.quaternion, grupo.scale);
  }
  const luzes = new THREE.Group(); scene.add(luzes);
  const mats = [];

  // luz de cena: fundo preto, ambiente baixo, recortes frios atrás e uma chave neutra
  if (!imersivo) scene.background = new THREE.Color(L.fundo);
  scene.environmentIntensity = L.ambiente;
  renderer.toneMappingExposure = L.exposicao;
  if (key) { key.color.setHex(L.chave[0]); key.intensity = L.chave[1]; key.position.set(...L.chave[2]); }
  for (const [cor, i, pos] of L.recortes) { const d = new THREE.DirectionalLight(cor, i); d.position.set(...pos); luzes.add(d); }
  luzes.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));

  // fogo do capacete ilumina peito e ombros
  const fogo = new THREE.PointLight(L.fogo[0], L.fogo[1], 0, 2);
  fogo.position.set(C.x + L.fogo[2][0], L.fogo[2][1], C.z + L.fogo[2][2]); grupo.add(fogo);
  const fogo2 = new THREE.PointLight(L.chamaLuz[0], L.chamaLuz[1], 0, 2);
  fogo2.position.set(C.x + L.chamaLuz[2][0], L.chamaLuz[2][1], C.z + L.chamaLuz[2][2]); grupo.add(fogo2);
  const fogo3 = new THREE.PointLight(L.dentro[0], L.dentro[1], 0, 2);
  fogo3.position.set(C.x + L.dentro[2][0], L.dentro[2][1], C.z + L.dentro[2][2]); grupo.add(fogo3);
  // no eixo do capacete: acende só as paredes internas do colar (as normais delas apontam para cá)
  const fogo4 = new THREE.PointLight(L.colar[0], L.colar[1], 0, 2);
  fogo4.position.set(C.x + L.colar[2][0], L.colar[2][1], C.z + L.colar[2][2]); grupo.add(fogo4);

  const sh = (fs, extra = {}) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: fs, uniforms: { t: { value: 0 }, seed: { value: Math.random() * 10 }, forca: { value: 1 }, ...extra },
      transparent: true, depthWrite: false, toneMapped: false,
    });
    mats.push(m); return m;
  };

  // núcleo incandescente dentro do capacete: aparece pelos furos e pelas fendas
  const N = P.nucleo;
  const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(N.raio, N.raioBase, N.ate - N.de, 24, 1, true),
    sh(FS_BRASA, { forca: { value: N.forca } }));
  nucleo.material.transparent = false; nucleo.material.depthWrite = true; nucleo.material.side = THREE.DoubleSide;
  nucleo.position.set(C.x, (N.de + N.ate) / 2, C.z); grupo.add(nucleo);

  // (sem disco de brasa no colar: de cima ele aparecia como um anel opaco em volta do capacete; o brilho do colar vem da bacia e da luz fogo4)

  const B = P.bacia;
  const bacia = new THREE.Mesh(new THREE.CylinderGeometry(B.raioTopo, B.raioBase, B.ate - B.de, 48, 1, true), sh(FS_BACIA, { forca: { value: B.forca } }));
  bacia.material.blending = THREE.AdditiveBlending; bacia.material.side = THREE.BackSide;
  bacia.position.set(C.x, (B.de + B.ate) / 2, C.z); bacia.renderOrder = 4; grupo.add(bacia);

  // chama e fumaça: partículas que sobem do topo do capacete (cada uma é um quadrado virado para a câmera)
  const sistemas = [];
  function particulas(o) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    const seed = new Float32Array(o.n), fase = new Float32Array(o.n);
    for (let i = 0; i < o.n; i++) { seed[i] = Math.random() * 100; fase[i] = (i + Math.random() * 0.6) / o.n; }
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1)); g.setAttribute("aFase", new THREE.InstancedBufferAttribute(fase, 1));
    g.instanceCount = o.n;
    const m = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, origem: { value: new THREE.Vector3(...o.origem) }, vida: { value: o.vida }, subida: { value: o.subida },
        tam: { value: new THREE.Vector2(o.tam0, o.tam1) }, espalha: { value: o.espalha }, opac: { value: o.opac } },
      vertexShader: /* glsl */ `
        uniform float t, vida, subida, espalha; uniform vec3 origem; uniform vec2 tam;
        attribute float aSeed, aFase; varying vec2 vUv; varying float vVida, vSeed;
        float h1(float x){ return fract(sin(x*127.1)*43758.5453); }
        void main(){
          float idade = fract(t / vida + aFase); vVida = idade; vSeed = aSeed; vUv = uv;
          float ciclo = floor(t / vida + aFase);
          float s = aSeed + ciclo * 7.13;
          vec3 c = origem;
          c.x += (h1(s) - .5) * espalha * (0.35 + idade) + sin(idade*4. + s) * espalha * .25 * idade;
          c.z += (h1(s + 3.1) - .5) * espalha * (0.35 + idade);
          c.y += subida * (idade + .25 * idade * idade);
          float escala = length(modelMatrix[0].xyz);
          float sz = mix(tam.x, tam.y, sqrt(idade)) * (0.75 + .5 * h1(s + 9.)) * escala;
          vec4 mv = viewMatrix * vec4((modelMatrix * vec4(c, 1.)).xyz, 1.);
          float r = h1(s + 5.) * 6.28 + idade * (h1(s + 2.) - .5) * 2.;
          vec2 p = mat2(cos(r), -sin(r), sin(r), cos(r)) * position.xy;
          mv.xy += p * sz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float t, opac; varying vec2 vUv; varying float vVida, vSeed;
        ${RUIDO}
        void main(){
          vec2 q = vUv - .5; float d = length(q) * 2.;
          float n = fbm(vUv * 3.2 + vec2(vSeed, vSeed * .7) + vec2(0., -t * .3));
          float forma = smoothstep(1., .25, d + (n - .5) * .9);
          ${o.frag}
        }`,
      transparent: true, depthWrite: false, toneMapped: false,
      blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    mats.push(m);
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = o.ordem; grupo.add(mesh); sistemas.push(mesh);
    return mesh;
  }
  const topo = [C.x, C.topo - 0.12, C.z];
  // fumaça: cinza claro, base tingida pelo fogo, abre ao subir e some
  if (!leve || true) particulas({
    n: leve ? 14 : 26, origem: [C.x, C.topo - 0.02, C.z], vida: 3.2, subida: P.fumaca.altura, tam0: 0.22, tam1: P.fumaca.largura, espalha: 0.28, opac: P.fumaca.opacidade, ordem: 6,
    frag: `float a = forma * smoothstep(0., .12, vVida) * (1. - smoothstep(.45, 1., vVida)) * (.55 + .6 * n);
           vec3 c = mix(vec3(.5,.46,.44), vec3(.92,.88,.84), n);
           c = mix(vec3(1.,.5,.2) * 1.4, c, smoothstep(.0, .3, vVida));
           gl_FragColor = vec4(c, a * opac);`,
  });
  // chama: línguas curtas, amarelo no começo, laranja e vermelho no fim, somadas à luz
  particulas({
    n: leve ? 16 : 28, origem: topo, vida: 0.75, subida: P.chama.altura, tam0: P.chama.largura, tam1: P.chama.largura * 0.35, espalha: 0.12, opac: 1, ordem: 8, aditivo: true,
    frag: `float a = forma * smoothstep(0., .08, vVida) * (1. - smoothstep(.35, 1., vVida)) * (.5 + .8 * n);
           vec3 c = mix(vec3(1.,.82,.45), vec3(1.,.42,.08), smoothstep(.1,.45,vVida));
           c = mix(c, vec3(.7,.1,.02), smoothstep(.45,.9,vVida));
           gl_FragColor = vec4(c * a * 1.5, a);`,
  });

  // halos aditivos: imitam o bloom do Unreal em volta do colar e do topo
  for (const [hx, hy, hz, tam, forca, prof] of P.halo) {
    const m = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, tam: { value: tam }, forca: { value: forca } },
      vertexShader: /* glsl */ `uniform float tam; varying vec2 vUv; void main(){ vUv = uv;
        float e = length(modelMatrix[0].xyz); vec4 mv = modelViewMatrix * vec4(0.,0.,0.,1.); mv.xy += position.xy * tam * e; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform float t, forca; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.;
        float g = pow(max(0., 1. - d), 2.2) * forca * (0.9 + 0.1 * sin(t * 9.));
        gl_FragColor = vec4(vec3(1., .38, .08) * g, g); }`,
      transparent: true, depthWrite: false, depthTest: prof, toneMapped: false, blending: THREE.AdditiveBlending,
    });
    mats.push(m);
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); q.position.set(C.x + hx, hy, C.z + hz); q.frustumCulled = false; q.renderOrder = 12; grupo.add(q);
  }

  // pelo: recorte alfa com cobertura (MSAA) quando houver antialias
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.name === "pelo") {
      o.material.alphaToCoverage = !!renderer.getContext().getContextAttributes().antialias;
      o.material.needsUpdate = true;
    }
  });

    function tick(dt, t) {
    for (const m of mats) m.uniforms.t.value = t;
    const f = 0.82 + 0.18 * Math.sin(t * 11.0) * Math.sin(t * 7.3 + 1.0) + 0.08 * Math.sin(t * 23.0);
    fogo.intensity = L.fogo[1] * f; fogo4.intensity = L.colar[1] * (0.8 + 0.2 * f); fogo2.intensity = L.chamaLuz[1] * (0.7 + 0.3 * f);
  }

  function dispose() {
    if (grupo.parent) grupo.parent.remove(grupo); scene.remove(luzes);
    grupo.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    if (!imersivo) scene.background = antes.bg; scene.environmentIntensity = antes.env; renderer.toneMappingExposure = antes.exp;
    if (key && antes.key) { key.color.setHex(antes.key[0]); key.intensity = antes.key[1]; key.position.copy(antes.key[2]); }
  }
  return { tick, dispose, P };
}
