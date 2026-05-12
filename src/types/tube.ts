/** Centerline waypoint in machine space (mm). */
export interface TubePoint {
  id: string
  x: number
  y: number
  z: number
  /** Bochtradius op dit hoekpunt (mm). 0 = scherp / geen boog. */
  radius: number
  /** Rotatiehoek rond de buis-as (deg) — gereserveerd voor uitbreiding. */
  rotation: number
  remark: string
}

/** Afgeleide bochtinformatie op een hoekpunt. */
export interface Bend {
  vertexIndex: number
  angleDeg: number
  arcLengthMm: number
  tangentLeadInMm: number
  tangentLeadOutMm: number
}

export interface BoundingBox {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

export interface Material {
  id: string
  name: string
  /** E-modulus (MPa) — optioneel voor veer terug. */
  eModulusGpa?: number
}

export interface Machine {
  id: string
  name: string
  /** Maximale bochtradius (mm). */
  maxRadiusMm?: number
}

export interface TubePart {
  id: string
  name: string
  materialId: string
  machineId?: string
  tubeDiameterMm: number
  wallThicknessMm: number
  points: TubePoint[]
  bends: Bend[]
  totalLengthMm: number
  boundingBoxCenterline: BoundingBox
  boundingBoxOuter: BoundingBox
  updatedAt: number
}
