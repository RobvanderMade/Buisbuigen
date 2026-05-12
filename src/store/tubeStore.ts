import type { Bend, BoundingBox, TubePoint } from '../types'
import { computeTubeGeometry } from '../geometry'
import { newId } from '../utils/id'
import { create } from 'zustand'

const DEFAULT_MATERIAL_ID = 'steel-s355'

function createInitialPoints(): TubePoint[] {
  return [
    {
      id: newId(),
      x: 0,
      y: 0,
      z: 0,
      radius: 0,
      rotation: 0,
      remark: 'Start',
    },
    {
      id: newId(),
      x: 1200,
      y: 0,
      z: 0,
      radius: 0,
      rotation: 0,
      remark: 'Einde',
    },
  ]
}

function deriveFromPoints(
  points: TubePoint[],
  tubeDiameterMm: number,
): {
  bends: Bend[]
  totalLengthMm: number
  boundingBoxCenterline: BoundingBox
  boundingBoxOuter: BoundingBox
} {
  const tubeRadiusMm = tubeDiameterMm / 2
  const g = computeTubeGeometry(points, tubeRadiusMm)
  return {
    bends: g.bends,
    totalLengthMm: g.totalLengthMm,
    boundingBoxCenterline: g.boundingBoxCenterline,
    boundingBoxOuter: g.boundingBoxOuter,
  }
}

export interface TubeStoreState {
  partId: string
  partName: string
  materialId: string
  machineId: string | undefined
  tubeDiameterMm: number
  wallThicknessMm: number
  points: TubePoint[]
  bends: Bend[]
  totalLengthMm: number
  boundingBoxCenterline: BoundingBox
  boundingBoxOuter: BoundingBox
  selectedPointId: string | null
  selectedSegmentIndex: number | null
  remoteEpoch: number
  setRemoteEpoch: (n: number) => void
  setPartMeta: (p: {
    partName?: string
    materialId?: string
    machineId?: string | undefined
    tubeDiameterMm?: number
    wallThicknessMm?: number
  }) => void
  setPoints: (points: TubePoint[]) => void
  updatePoint: (id: string, patch: Partial<Omit<TubePoint, 'id'>>) => void
  addPoint: () => void
  removePoint: (id: string) => void
  selectPoint: (id: string | null) => void
  selectSegment: (index: number | null) => void
  hydrateFromPart: (payload: {
    partId: string
    partName: string
    materialId: string
    machineId?: string
    tubeDiameterMm: number
    wallThicknessMm: number
    points: TubePoint[]
    remoteEpoch?: number
  }) => void
}

function recompute(
  points: TubePoint[],
  tubeDiameterMm: number,
): Pick<
  TubeStoreState,
  | 'bends'
  | 'totalLengthMm'
  | 'boundingBoxCenterline'
  | 'boundingBoxOuter'
> {
  return deriveFromPoints(points, tubeDiameterMm)
}

export const useTubeStore = create<TubeStoreState>((set, get) => {
  const initialPoints = createInitialPoints()
  const initialTubeDiameter = 40
  const initialDerived = recompute(initialPoints, initialTubeDiameter)

  return {
    partId: newId(),
    partName: 'Nieuw onderdeel',
    materialId: DEFAULT_MATERIAL_ID,
    machineId: undefined,
    tubeDiameterMm: initialTubeDiameter,
    wallThicknessMm: 2,
    points: initialPoints,
    ...initialDerived,
    selectedPointId: null,
    selectedSegmentIndex: null,
    remoteEpoch: 0,
    setRemoteEpoch: (n) => set({ remoteEpoch: n }),
    setPartMeta: (p) => {
      const next = { ...get(), ...p }
      const d = recompute(next.points, next.tubeDiameterMm)
      set({ ...p, ...d })
    },
    setPoints: (points) => {
      const { tubeDiameterMm } = get()
      set({ points, ...recompute(points, tubeDiameterMm) })
    },
    updatePoint: (id, patch) => {
      const { points, tubeDiameterMm } = get()
      const next = points.map((pt) =>
        pt.id === id ? { ...pt, ...patch } : pt,
      )
      set({ points: next, ...recompute(next, tubeDiameterMm) })
    },
    addPoint: () => {
      const { points, tubeDiameterMm } = get()
      const last = points[points.length - 1]
      const base = last
        ? { x: last.x + 200, y: last.y, z: last.z }
        : { x: 0, y: 0, z: 0 }
      const row: TubePoint = {
        id: newId(),
        x: base.x,
        y: base.y,
        z: base.z,
        radius: 150,
        rotation: 0,
        remark: '',
      }
      const next = [...points, row]
      set({ points: next, ...recompute(next, tubeDiameterMm) })
    },
    removePoint: (id) => {
      const { points, tubeDiameterMm } = get()
      if (points.length <= 2) return
      const next = points.filter((p) => p.id !== id)
      set({
        points: next,
        selectedPointId: get().selectedPointId === id ? null : get().selectedPointId,
        ...recompute(next, tubeDiameterMm),
      })
    },
    selectPoint: (id) => set({ selectedPointId: id }),
    selectSegment: (index) => set({ selectedSegmentIndex: index }),
    hydrateFromPart: (payload) => {
      const d = recompute(payload.points, payload.tubeDiameterMm)
      set({
        partId: payload.partId,
        partName: payload.partName,
        materialId: payload.materialId,
        machineId: payload.machineId,
        tubeDiameterMm: payload.tubeDiameterMm,
        wallThicknessMm: payload.wallThicknessMm,
        points: payload.points,
        ...d,
        remoteEpoch: payload.remoteEpoch ?? get().remoteEpoch,
      })
    },
  }
})
