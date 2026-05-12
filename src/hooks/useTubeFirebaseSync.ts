import { useEffect, useRef } from 'react'
import { isFirebaseConfigured, savePart, subscribePart } from '../firebase'
import type { TubePart, TubePoint } from '../types'
import { useTubeStore } from '../store/tubeStore'

const AUTOSAVE_MS = 900

function buildPartFromStore(get: () => ReturnType<typeof useTubeStore.getState>): TubePart {
  const s = get()
  return {
    id: s.partId,
    name: s.partName,
    materialId: s.materialId,
    machineId: s.machineId,
    tubeDiameterMm: s.tubeDiameterMm,
    wallThicknessMm: s.wallThicknessMm,
    points: s.points,
    bends: s.bends,
    totalLengthMm: s.totalLengthMm,
    boundingBoxCenterline: s.boundingBoxCenterline,
    boundingBoxOuter: s.boundingBoxOuter,
    updatedAt: Date.now(),
  }
}

/**
 * Realtime luisteren + debounced autosave naar RTDB voor huidige partId.
 */
export function useTubeFirebaseSync(enabled: boolean, partId: string): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWritten = useRef<string>('')

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) return
    const unsub = subscribePart(partId, (remote) => {
      if (!remote) return
      const local = useTubeStore.getState()
      if ((remote.updatedAt ?? 0) <= (local.remoteEpoch ?? 0)) return
      useTubeStore.getState().hydrateFromPart({
        partId: remote.id,
        partName: remote.name,
        materialId: remote.materialId,
        machineId: remote.machineId,
        tubeDiameterMm: remote.tubeDiameterMm,
        wallThicknessMm: remote.wallThicknessMm,
        points: remote.points as TubePoint[],
        remoteEpoch: remote.updatedAt,
      })
      useTubeStore.getState().setRemoteEpoch(remote.updatedAt)
    })

    const scheduleSave = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        try {
          const part = buildPartFromStore(useTubeStore.getState)
          const key = JSON.stringify({
            p: part.points,
            n: part.name,
            m: part.materialId,
            d: part.tubeDiameterMm,
            w: part.wallThicknessMm,
            t: Math.floor(part.totalLengthMm * 1000),
          })
          if (key === lastWritten.current) return
          await savePart(part)
          lastWritten.current = key
          useTubeStore.getState().setRemoteEpoch(part.updatedAt)
        } catch {
          /* netwerk — volgende autosave opnieuw proberen */
        }
      }, AUTOSAVE_MS)
    }

    const unsubStore = useTubeStore.subscribe(scheduleSave)

    return () => {
      unsub()
      unsubStore()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [enabled, partId])
}
