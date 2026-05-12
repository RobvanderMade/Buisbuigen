import type { TubePoint } from '../types'

function isTubePointLike(v: unknown): v is TubePoint {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    typeof o['x'] === 'number' &&
    typeof o['y'] === 'number' &&
    typeof o['z'] === 'number' &&
    Number.isFinite(o['x']) &&
    Number.isFinite(o['y']) &&
    Number.isFinite(o['z'])
  )
}

/**
 * Firebase RTDB kan arrays soms als object met indices teruggeven.
 * Zorgt voor een echte array in volgorde P0, P1, …
 */
export function normalizePointsArray(raw: unknown): TubePoint[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter(isTubePointLike).map((p) => ({
      ...p,
      radius: typeof p.radius === 'number' && Number.isFinite(p.radius) ? p.radius : 0,
      rotation:
        typeof p.rotation === 'number' && Number.isFinite(p.rotation) ? p.rotation : 0,
      remark: typeof p.remark === 'string' ? p.remark : '',
    }))
  }
  if (typeof raw !== 'object') return []
  const obj = raw as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return []

  const allNumericIndices = keys.every((k) => /^\d+$/.test(k))
  if (allNumericIndices) {
    return keys
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map((k) => obj[String(k)])
      .filter(isTubePointLike)
      .map((p) => ({
        ...p,
        radius: typeof p.radius === 'number' && Number.isFinite(p.radius) ? p.radius : 0,
        rotation:
          typeof p.rotation === 'number' && Number.isFinite(p.rotation) ? p.rotation : 0,
        remark: typeof p.remark === 'string' ? p.remark : '',
      }))
  }

  return Object.values(obj)
    .filter(isTubePointLike)
    .map((p) => ({
      ...p,
      radius: typeof p.radius === 'number' && Number.isFinite(p.radius) ? p.radius : 0,
      rotation:
        typeof p.rotation === 'number' && Number.isFinite(p.rotation) ? p.rotation : 0,
      remark: typeof p.remark === 'string' ? p.remark : '',
    }))
}
