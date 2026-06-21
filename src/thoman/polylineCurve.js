import * as THREE from 'three'

/** Exacte polyline door mm-punten (geen CatmullRom-overshoot). */
export class PolylineCurve3 extends THREE.Curve {
  constructor(points) {
    super()
    this.type = 'PolylineCurve3'
    this.points = points.length > 0 ? points : [new THREE.Vector3()]
    this.arcLengths = [0]
    this.totalLength = 1
    this.#recompute()
  }

  #recompute() {
    let acc = 0
    this.arcLengths = [0]
    for (let i = 1; i < this.points.length; i += 1) {
      acc += this.points[i].distanceTo(this.points[i - 1])
      this.arcLengths.push(acc)
    }
    this.totalLength = Math.max(acc, 1e-6)
  }

  getLength() {
    return this.totalLength
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const u = Math.min(1, Math.max(0, t)) * this.totalLength
    let j = 0
    while (j < this.arcLengths.length - 1 && this.arcLengths[j + 1] < u) j += 1
    const s0 = this.arcLengths[j]
    const s1 = this.arcLengths[j + 1]
    const alpha = s1 > s0 ? (u - s0) / (s1 - s0) : 0
    return optionalTarget.copy(this.points[j]).lerp(this.points[j + 1], alpha)
  }
}
