import * as THREE from 'three'
import { BEND_ARM_AXIS, BEND_OUTWARD, MACHINE_AXES } from './axisConfig.js'
import { PolylineCurve3 } from './polylineCurve.js'

const DEG = Math.PI / 180

/** Orthogonaal frame; binormal = buigmal (machine X / scene Y). */
function createFrame(tangent, normalHint = BEND_OUTWARD) {
  const t = tangent.clone().normalize()
  const bendAxis = BEND_ARM_AXIS

  let n = normalHint.clone().sub(t.clone().multiplyScalar(normalHint.dot(t)))
  if (n.lengthSq() < 1e-10) {
    n = new THREE.Vector3().crossVectors(bendAxis, t)
  }
  if (n.lengthSq() < 1e-10) {
    n = BEND_OUTWARD.clone().sub(t.clone().multiplyScalar(BEND_OUTWARD.dot(t)))
  }
  n.normalize()
  if (n.dot(BEND_OUTWARD) < 0) n.negate()

  n.sub(bendAxis.clone().multiplyScalar(n.dot(bendAxis)))
  if (n.lengthSq() < 1e-10) {
    n = new THREE.Vector3().crossVectors(bendAxis, t).normalize()
  } else {
    n.normalize()
  }

  return { tangent: t, normal: n, binormal: bendAxis.clone() }
}

/** Zorg dat normal/binormal kloppen vóór bocht (buigvlak ⊥ buigmal X). */
function syncFrameToBuigmal(frame) {
  const t = frame.tangent.clone().normalize()
  const bendAxis = BEND_ARM_AXIS
  let n = frame.normal.clone()
  n.sub(bendAxis.clone().multiplyScalar(n.dot(bendAxis)))
  if (n.lengthSq() < 1e-10) {
    n = new THREE.Vector3().crossVectors(bendAxis, t)
    if (n.lengthSq() < 1e-10) return false
    n.normalize()
    if (n.dot(BEND_OUTWARD) < 0) n.negate()
  } else {
    n.normalize()
  }
  frame.tangent.copy(t)
  frame.normal.copy(n)
  frame.binormal.copy(bendAxis)
  return true
}

/**
 * Buis centerlijn vanaf kruispunt (0,0,0) langs −Z.
 * Bochten om buigmal X (scene Y) — zelfde vlak als buigarm.
 */
export class TubeBuilder {
  constructor(options = {}) {
    this.diameterMm = options.diameterMm ?? 32
    this.bendRadiusMm = options.bendRadiusMm ?? 50
    this.arcSteps = options.arcSteps ?? 32
    this.straightStepMm = options.straightStepMm ?? 20
    this.reset()
  }

  reset() {
    this.points = [new THREE.Vector3(0, 0, 0)]
    this.bendFeatures = []
    this.pos = new THREE.Vector3(0, 0, 0)
    this.frame = createFrame(new THREE.Vector3(0, 0, -1))
    this.lastW = 0
  }

  setDiameterMm(value) {
    this.diameterMm = Math.max(2, Number(value) || 32)
  }

  setBendRadiusMm(value) {
    this.bendRadiusMm = Math.max(1, Number(value) || 50)
  }

  getPoints() {
    return this.points.map((p) => p.clone())
  }

  getBendFeatures() {
    return this.bendFeatures.map((f) => ({ ...f, clickPoint: f.clickPoint.clone() }))
  }

  applyOperation(op) {
    if (op.type === 'feed') {
      this.#appendStraight(op.feed ?? 0)
      return
    }
    if (op.type === 'roll') {
      this.#applyRoll(op.wDelta ?? 0)
      if (op.w != null) this.lastW = op.w
      return
    }
    if (op.type === 'bend') {
      const feature = this.#applyBend(op.y ?? 0, op)
      if (feature) this.bendFeatures.push(feature)
    }
  }

  rebuildThroughOperations(operations, opIndex, options = {}) {
    const stretchedLength = options.stretchedLength ?? 0
    const clampZ = options.clampZ ?? stretchedLength

    if (opIndex <= 0) {
      this.buildClampedStock(clampZ > 0.01 ? clampZ : stretchedLength)
      return
    }

    this.reset()
    for (let i = 0; i < opIndex && i < operations.length; i += 1) {
      this.applyOperation(operations[i])
    }

    if (this.points.length <= 1) {
      this.buildClampedStock(clampZ)
      return
    }

    this.#attachTailToClamp(clampZ)
  }

  /** Gestrekte buis vanaf kruispunt naar achter (−Z). */
  buildClampedStock(lengthMm) {
    const L = Math.max(0, Number(lengthMm) || 0)
    this.reset()
    if (L < 0.01) return
    this.points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -L)]
    this.pos.set(0, 0, 0)
    this.frame = createFrame(new THREE.Vector3(0, 0, -1))
  }

  /** Rechte voorraad langs −Z van klem (clampZ) naar kruispunt. */
  #attachTailToClamp(clampZmm) {
    const L = Math.max(0, Number(clampZmm) || 0)
    if (L < 0.01) return

    const tailEnd = new THREE.Vector3(0, 0, -L)
    const origin = new THREE.Vector3(0, 0, 0)

    if (this.points[0].distanceTo(origin) > 0.01) {
      this.points.unshift(origin.clone())
    }
    if (this.points[0].distanceTo(tailEnd) > 0.01) {
      this.points.unshift(tailEnd)
    }
  }

  buildTubeGeometry() {
    if (this.points.length < 2) return null
    const curve = new PolylineCurve3(this.points)
    const lengthMm = curve.getLength()
    const tubularSegments = Math.min(512, Math.max(32, Math.floor(lengthMm / 3)))
    const radialSegments = 24
    const radiusMm = this.diameterMm / 2
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radiusMm, radialSegments, false)
    geometry.userData.tubularSegments = tubularSegments
    geometry.userData.radialSegments = radialSegments
    return geometry
  }

  buildCenterlineGeometry() {
    if (this.points.length < 2) return null
    return new THREE.BufferGeometry().setFromPoints(this.points)
  }

  #appendStraight(lengthMm) {
    if (lengthMm <= 0.01) return
    const steps = Math.max(2, Math.ceil(lengthMm / this.straightStepMm))
    for (let s = 1; s <= steps; s += 1) {
      this.points.push(
        this.pos.clone().add(this.frame.tangent.clone().multiplyScalar((lengthMm * s) / steps)),
      )
    }
    this.pos.add(this.frame.tangent.clone().multiplyScalar(lengthMm))
  }

  #applyRoll(degrees) {
    if (Math.abs(degrees) < 1e-6) return
    const q = new THREE.Quaternion().setFromAxisAngle(this.frame.tangent, degrees * DEG)
    this.frame.normal.applyQuaternion(q)
    syncFrameToBuigmal(this.frame)
  }

  /** Bocht om buigmal X: center + normal×R, rotatie om scene Y. */
  #applyBend(angleDeg, meta) {
    const R = this.bendRadiusMm
    const theta = angleDeg * DEG
    if (Math.abs(theta) < 1e-6) return null
    if (!syncFrameToBuigmal(this.frame)) return null

    const bendAxis = BEND_ARM_AXIS
    const arcStartIdx = this.points.length - 1
    const center = this.pos.clone().add(this.frame.normal.clone().multiplyScalar(R))
    const startVec = this.pos.clone().sub(center)

    for (let s = 1; s <= this.arcSteps; s += 1) {
      const a = (theta * s) / this.arcSteps
      const q = new THREE.Quaternion().setFromAxisAngle(bendAxis, a)
      this.points.push(center.clone().add(startVec.clone().applyQuaternion(q)))
    }

    const endQ = new THREE.Quaternion().setFromAxisAngle(bendAxis, theta)
    this.frame.tangent.applyQuaternion(endQ).normalize()
    this.frame.normal.applyQuaternion(endQ)
    syncFrameToBuigmal(this.frame)

    this.pos.copy(this.points[this.points.length - 1])
    const arcEndIdx = this.points.length - 1
    const midIdx = Math.floor((arcStartIdx + arcEndIdx) / 2)

    return {
      step: meta.step,
      z: meta.z,
      w: meta.w,
      y: meta.y,
      clickPoint: this.points[midIdx].clone(),
      arcStartIdx,
      arcEndIdx,
    }
  }
}

export { MACHINE_AXES }
