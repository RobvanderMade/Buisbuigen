import type { Vec3 } from './vectors'
import { length, sub } from './vectors'

/**
 * Rechte segmentlengte tussen twee hartlijnpunten:
 * L = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)
 */
export function segmentLength(a: Vec3, b: Vec3): number {
  return length(sub(b, a))
}

export function polylineChordalLength(points: Vec3[]): number {
  if (points.length < 2) return 0
  let sum = 0
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]
    const q = points[i + 1]
    if (!p || !q) continue
    sum += segmentLength(p, q)
  }
  return sum
}
