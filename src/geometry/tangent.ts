/**
 * Afstand van hoekpunt tot raakpunt langs rechte been voor cirkelboog tussen twee rechten.
 * t = R / tan(A/2) met A in radialen.
 */
export function tangentDistanceFromVertexMm(
  radiusMm: number,
  angleDeg: number,
): number {
  if (radiusMm <= 0 || angleDeg <= 1e-3) return 0
  const half = ((angleDeg / 180) * Math.PI) / 2
  const tan = Math.tan(half)
  if (!Number.isFinite(tan) || Math.abs(tan) < 1e-9) return 0
  return radiusMm / tan
}
