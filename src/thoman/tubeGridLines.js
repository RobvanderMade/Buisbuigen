import * as THREE from 'three'

/**
 * Rasterlijnen op TubeGeometry (omtrek- en lengterichting).
 * @param {THREE.TubeGeometry} tubeGeo
 * @param {number} radialSegments
 * @param {number} tubularSegments
 */
export function buildTubeGridLineGeometry(tubeGeo, radialSegments, tubularSegments) {
  const pos = tubeGeo.attributes.position
  const radial = radialSegments + 1
  const tubular = tubularSegments + 1
  const verts = []

  const pushSeg = (i0, i1) => {
    verts.push(pos.getX(i0), pos.getY(i0), pos.getZ(i0))
    verts.push(pos.getX(i1), pos.getY(i1), pos.getZ(i1))
  }

  const at = (t, r) => t * radial + r

  for (let t = 0; t < tubular - 1; t += 1) {
    for (let r = 0; r < radial; r += 1) {
      pushSeg(at(t, r), at(t + 1, r))
    }
  }

  for (let t = 0; t < tubular; t += 1) {
    if (t % 2 !== 0 && t % 8 !== 0) continue
    for (let r = 0; r < radial - 1; r += 1) {
      pushSeg(at(t, r), at(t, r + 1))
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  return geo
}

export function createClearTubeShellMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xb8d4f0,
    metalness: 0.05,
    roughness: 0.35,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
}

export function createTubeGridLineMaterial() {
  return new THREE.LineBasicMaterial({
    color: 0x0f172a,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })
}
