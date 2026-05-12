import type { BoundingBox } from '../types'
import type { Vec3 } from './vectors'

export function emptyBoundingBox(): BoundingBox {
  return {
    minX: 0,
    minY: 0,
    minZ: 0,
    maxX: 0,
    maxY: 0,
    maxZ: 0,
  }
}

export function boundingBoxFromPoints(points: Vec3[]): BoundingBox {
  if (points.length === 0) return emptyBoundingBox()
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p[0])
    minY = Math.min(minY, p[1])
    minZ = Math.min(minZ, p[2])
    maxX = Math.max(maxX, p[0])
    maxY = Math.max(maxY, p[1])
    maxZ = Math.max(maxZ, p[2])
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export function expandBoundingBox(
  box: BoundingBox,
  margin: number,
): BoundingBox {
  return {
    minX: box.minX - margin,
    minY: box.minY - margin,
    minZ: box.minZ - margin,
    maxX: box.maxX + margin,
    maxY: box.maxY + margin,
    maxZ: box.maxZ + margin,
  }
}

export function bboxOuterDimensionsMm(box: BoundingBox): {
  dx: number
  dy: number
  dz: number
} {
  return {
    dx: Math.abs(box.maxX - box.minX),
    dy: Math.abs(box.maxY - box.minY),
    dz: Math.abs(box.maxZ - box.minZ),
  }
}
