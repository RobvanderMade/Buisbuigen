export type Vec3 = readonly [number, number, number]

export function vec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v)
  if (len < 1e-12) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** Hoek tussen twee vectoren (0–180°). */
export function angleBetweenDeg(u: Vec3, v: Vec3): number {
  const nu = normalize(u)
  const nv = normalize(v)
  const c = Math.min(1, Math.max(-1, dot(nu, nv)))
  return (Math.acos(c) * 180) / Math.PI
}
