import type { Vec3 } from './vectors'
import { angleBetweenDeg, sub } from './vectors'

/**
 * Buig-/deflectiehoek op hoekpunt index i (1 … n-2).
 * Hoek tussen inkomend en uitgaand rechte segment (180° − geometrische hoek).
 */
export function bendDeflectionDeg(prev: Vec3, curr: Vec3, next: Vec3): number {
  const incoming = sub(curr, prev)
  const outgoing = sub(next, curr)
  const theta = angleBetweenDeg(incoming, outgoing)
  return Math.max(0, 180 - theta)
}

/**
 * Bochtlengte langs hartlijn:
 * BL = π × R × A / 180
 */
export function bendArcLengthMm(radiusMm: number, angleDeg: number): number {
  if (radiusMm <= 0 || angleDeg <= 1e-6) return 0
  return (Math.PI * radiusMm * angleDeg) / 180
}
