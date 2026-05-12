import type { TubePoint } from '../types'
import { computeTangentCuts } from './computeTube'
import type { Vec3 } from './vectors'
import { add, cross, dot, length, normalize, scale, sub, vec3 } from './vectors'

function pointOnChord(a: Vec3, b: Vec3, distFromA: number): Vec3 {
  const d = length(sub(b, a))
  if (d < 1e-12) return a
  return add(a, scale(normalize(sub(b, a)), distFromA))
}

function bendArcSamples(
  prev: Vec3,
  curr: Vec3,
  next: Vec3,
  R: number,
  t: number,
  segments: number,
): Vec3[] {
  const T1 = add(curr, scale(normalize(sub(prev, curr)), t))
  const T2 = add(curr, scale(normalize(sub(next, curr)), t))
  const w1 = normalize(sub(T1, curr))
  const w2 = normalize(sub(T2, curr))
  const bis = add(w1, w2)
  const bisLen = length(bis)
  if (bisLen < 1e-9) return []

  const d = Math.sqrt(R * R + t * t)
  const O = add(curr, scale(normalize(bis), d))

  const n = normalize(cross(sub(curr, prev), sub(next, curr)))
  if (length(n) < 1e-9) return []

  const r0 = sub(T1, O)
  const r = length(r0)
  if (r < 1e-9) return []

  const e0 = normalize(r0)
  const e1 = normalize(cross(n, e0))
  const x2 = dot(sub(T2, O), e0)
  const y2 = dot(sub(T2, O), e1)
  /** Korte boog van T1 naar T2 in hetzelfde vlak als de fillet. */
  let sweep = Math.atan2(y2, x2)
  const twoPi = 2 * Math.PI
  while (sweep <= -Math.PI) sweep += twoPi
  while (sweep > Math.PI) sweep -= twoPi

  const out: Vec3[] = []
  const steps = Math.max(2, segments)
  for (let i = 1; i < steps; i++) {
    const a = (i / steps) * sweep
    out.push(add(O, add(scale(e0, Math.cos(a) * r), scale(e1, Math.sin(a) * r))))
  }
  return out
}

/**
 * Hartlijn als polyline: rechte stukken volgens tangentknip + cirkelbogen op bochten.
 * Geschikt voor 2D-projectie (SVG) zodat de tekening visueel aansluit bij de berekende lengte.
 */
export function sampleCenterlinePolyline(
  points: TubePoint[],
  arcSegments = 14,
): Vec3[] {
  const W = points.map((p) => vec3(p.x, p.y, p.z))
  const n = W.length
  if (n === 0) return []
  if (n === 1) return [W[0]!]

  const { startCut, endCut, bends } = computeTangentCuts(W, points)
  const bendByVertex = new Map(bends.map((b) => [b.vertexIndex, b]))

  const chordLen = (i: number) => {
    const a = W[i]
    const b = W[i + 1]
    if (!a || !b) return 0
    return length(sub(b, a))
  }

  const out: Vec3[] = []
  let last = pointOnChord(W[0]!, W[1]!, startCut[0] ?? 0)
  out.push(last)

  for (let i = 0; i < n - 1; i++) {
    const L = chordLen(i)
    const Pi = W[i]
    const Pj = W[i + 1]
    if (!Pi || !Pj) continue
    const endStr = pointOnChord(Pi, Pj, L - (endCut[i] ?? 0))
    if (length(sub(endStr, last)) > 1e-4) {
      out.push(endStr)
      last = endStr
    }

    if (i >= n - 2) break

    const bendV = i + 1
    const R = Math.max(0, points[bendV]?.radius ?? 0)
    const bend = bendByVertex.get(bendV)
    const phiDeg = bend?.angleDeg ?? 0
    const t = bend?.tangentLeadInMm ?? 0
    const tout = pointOnChord(W[bendV]!, W[bendV + 1]!, startCut[bendV] ?? 0)

    if (R <= 1e-6 || phiDeg <= 1e-3 || t <= 1e-6 || !bend) {
      if (length(sub(tout, last)) > 1e-4) {
        out.push(tout)
        last = tout
      }
      continue
    }

    const prev = W[bendV - 1]!
    const curr = W[bendV]!
    const next = W[bendV + 1]!
    const arcPts = bendArcSamples(prev, curr, next, R, t, arcSegments)
    for (const p of arcPts) {
      if (length(sub(p, last)) > 1e-4) {
        out.push(p)
        last = p
      }
    }
    if (length(sub(tout, last)) > 1e-4) {
      out.push(tout)
      last = tout
    }
  }

  return out
}
