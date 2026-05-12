import type { Bend, BoundingBox, TubePoint } from '../types'
import { bendArcLengthMm, bendDeflectionDeg } from './bend'
import {
  bboxOuterDimensionsMm,
  boundingBoxFromPoints,
  emptyBoundingBox,
  expandBoundingBox,
} from './boundingBox'
import { polylineChordalLength } from './segment'
import { tangentDistanceFromVertexMm } from './tangent'
import type { Vec3 } from './vectors'
import { length, sub, vec3 } from './vectors'

export interface TubeComputed {
  pointsVec: Vec3[]
  bends: Bend[]
  /** Hartlijn: rechte stukken minus raakknippen + bogen. */
  totalLengthMm: number
  /** Som van koorde-segmenten (referentie). */
  chordalLengthMm: number
  boundingBoxCenterline: BoundingBox
  boundingBoxOuter: BoundingBox
}

function toVec3(p: TubePoint): Vec3 {
  return vec3(p.x, p.y, p.z)
}

export interface TangentCuts {
  startCut: number[]
  endCut: number[]
  bends: Bend[]
}

/** Tangentafstanden per segment (zelfde logica als hartlijnlengte). */
export function computeTangentCuts(
  pointsVec: Vec3[],
  points: TubePoint[],
): TangentCuts {
  const n = pointsVec.length
  const bends: Bend[] = []
  const startCut = Array.from({ length: Math.max(0, n - 1) }, () => 0)
  const endCut = Array.from({ length: Math.max(0, n - 1) }, () => 0)

  for (let i = 1; i < n - 1; i++) {
    const prev = pointsVec[i - 1]
    const curr = pointsVec[i]
    const next = pointsVec[i + 1]
    if (!prev || !curr || !next) continue

    const angleDeg = bendDeflectionDeg(prev, curr, next)
    const R = Math.max(0, points[i]?.radius ?? 0)
    const arc = bendArcLengthMm(R, angleDeg)
    const t = tangentDistanceFromVertexMm(R, angleDeg)

    bends.push({
      vertexIndex: i,
      angleDeg,
      arcLengthMm: arc,
      tangentLeadInMm: t,
      tangentLeadOutMm: t,
    })

    endCut[i - 1] = (endCut[i - 1] ?? 0) + t
    startCut[i] = (startCut[i] ?? 0) + t
  }

  return { startCut, endCut, bends }
}

/**
 * Berekent bochten, tangentknippen, totale hartlijnlengte en bounding boxes.
 */
export function computeTubeGeometry(
  points: TubePoint[],
  tubeRadiusMm: number,
): TubeComputed {
  const pointsVec = points.map(toVec3)
  const n = pointsVec.length

  if (n === 0) {
    return {
      pointsVec: [],
      bends: [],
      totalLengthMm: 0,
      chordalLengthMm: 0,
      boundingBoxCenterline: emptyBoundingBox(),
      boundingBoxOuter: emptyBoundingBox(),
    }
  }

  const { startCut, endCut, bends } = computeTangentCuts(pointsVec, points)

  let straightSum = 0
  for (let i = 0; i < n - 1; i++) {
    const a = pointsVec[i]
    const b = pointsVec[i + 1]
    if (!a || !b) continue
    const full = length(sub(b, a))
    const sc = startCut[i] ?? 0
    const ec = endCut[i] ?? 0
    straightSum += Math.max(0, full - sc - ec)
  }

  const arcSum = bends.reduce((s, b) => s + b.arcLengthMm, 0)
  const totalLengthMm = straightSum + arcSum
  const chordalLengthMm = polylineChordalLength(pointsVec)

  const boundingBoxCenterline = boundingBoxFromPoints(pointsVec)
  const outerMargin = Math.max(0, tubeRadiusMm)
  const boundingBoxOuter = expandBoundingBox(
    boundingBoxCenterline,
    outerMargin,
  )

  return {
    pointsVec,
    bends,
    totalLengthMm,
    chordalLengthMm,
    boundingBoxCenterline,
    boundingBoxOuter,
  }
}

export function outerDimensionsLabel(box: BoundingBox): string {
  const { dx, dy, dz } = bboxOuterDimensionsMm(box)
  return `${dx.toFixed(1)} × ${dy.toFixed(1)} × ${dz.toFixed(1)} mm`
}
