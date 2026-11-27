// Liest glTF-2.0-Binärdateien (.glb) ohne Bibliothek: ein Mesh mit einem Primitive, optional Skelett (Skin) und Animationsclips.
// Reine Datenfunktion (läuft auch in Node für Tests). Texturen bleiben als Byte-Ausschnitte; der Renderer macht daraus Bilder.
const COMP = { 5120: [Int8Array, 1, 127], 5121: [Uint8Array, 1, 255], 5122: [Int16Array, 2, 32767], 5123: [Uint16Array, 2, 65535], 5125: [Uint32Array, 4, 4294967295], 5126: [Float32Array, 4, 1] };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
export function parseGlb(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('keine glb-Datei');
  const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), binAt = 20 + jl + 8;
  const view = (i) => { const v = json.bufferViews[i]; return { off: binAt + (v.byteOffset || 0), len: v.byteLength, stride: v.byteStride || 0 }; };
  // Accessor -> Float32Array (normalisierte Ganzzahlen werden auf 0..1 bzw. -1..1 gebracht), raw = true lässt Ganzzahlen unverändert
  const read = (i, raw = false) => {
    const a = json.accessors[i], [Ty, size, max] = COMP[a.componentType], n = NUM[a.type], v = view(a.bufferView), stride = v.stride || size * n, base = v.off + (a.byteOffset || 0);
    const out = new Float32Array(a.count * n), get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const x = dv[get](base + k * stride + c * size, true); out[k * n + c] = a.normalized && !raw && Ty !== Float32Array ? Math.max(-1, x / max) : x; }
    return out;
  };
  const prim = json.meshes[0].primitives[0], A = prim.attributes, pos = read(A.POSITION), nv = pos.length / 3;
  const nrm = A.NORMAL !== undefined ? read(A.NORMAL) : new Float32Array(nv * 3), uv = A.TEXCOORD_0 !== undefined ? read(A.TEXCOORD_0) : new Float32Array(nv * 2);
  let colr = new Float32Array(nv * 4).fill(1);
  if (A.COLOR_0 !== undefined) { const c = read(A.COLOR_0), n = NUM[json.accessors[A.COLOR_0].type]; for (let k = 0; k < nv; k++) for (let q = 0; q < n; q++) colr[k * 4 + q] = c[k * n + q]; }
  const joints = A.JOINTS_0 !== undefined ? read(A.JOINTS_0, true) : null, weights = A.WEIGHTS_0 !== undefined ? read(A.WEIGHTS_0) : null;
  const idx = prim.indices !== undefined ? Uint32Array.from(read(prim.indices, true)) : Uint32Array.from({ length: nv }, (_, k) => k);
  // Material: Grundfarbe und Leuchten als Bild-Ausschnitte
  const mat = (json.materials || [])[prim.material ?? 0] || {}, pbr = mat.pbrMetallicRoughness || {};
  const img = (t) => { if (!t) return null; const im = json.images[json.textures[t.index].source], v = view(im.bufferView); return { mime: im.mimeType || 'image/png', bytes: new Uint8Array(buf, v.off, v.len) }; };
  const nodes = (json.nodes || []).map((n) => ({ name: n.name || '', t: n.translation || [0, 0, 0], r: n.rotation || [0, 0, 0, 1], s: n.scale || [1, 1, 1], children: n.children || [], parent: -1 }));
  nodes.forEach((n, i) => { for (const c of n.children) nodes[c].parent = i; });
  const sk = (json.skins || [])[0], skin = sk ? { joints: sk.joints, ibm: read(sk.inverseBindMatrices) } : null;
  const clips = {};
  for (const a of json.animations || []) {
    let dur = 0; const ch = [];
    for (const c of a.channels) { const s = a.samplers[c.sampler], times = read(s.input), values = read(s.output), comps = c.target.path === 'rotation' ? 4 : 3; if (c.target.path === 'weights') continue; dur = Math.max(dur, times[times.length - 1] || 0); ch.push({ node: c.target.node, path: c.target.path, times, values, comps, step: s.interpolation === 'STEP', cubic: s.interpolation === 'CUBICSPLINE' }); }
    const ex = a.extras || {}, markers = {}; for (const m of ex.markers || []) markers[m.name] = m.seconds;
    clips[a.name] = { name: a.name, dur, channels: ch, loop: !!ex.loop, markers };
  }
  return { pos, nrm, uv, col: colr, joints, weights, idx, nv, tris: idx.length / 3, nodes, skin, clips,
    baseColor: img(pbr.baseColorTexture), emissive: img(mat.emissiveTexture), emissiveFactor: mat.emissiveFactor || [0, 0, 0], baseFactor: pbr.baseColorFactor || [1, 1, 1, 1] };
}
