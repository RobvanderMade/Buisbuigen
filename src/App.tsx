import { useMemo, useState } from 'react'
import { isFirebaseConfigured, loadPart } from './firebase'
import { useTubeFirebaseSync } from './hooks/useTubeFirebaseSync'
import { newId } from './utils/id'
import { useTubeStore } from './store/tubeStore'
import type { TubePoint } from './types'
import { FutureFeaturesPanel } from './components/FutureFeaturesPanel'
import { StatusPanel } from './components/StatusPanel'
import { SvgViews } from './components/SvgViews'
import { ThomanSimPanel } from './components/ThomanSimPanel'
import { TubeViewer3D } from './components/TubeViewer3D'
import { XyzTable } from './components/XyzTable'

type AppMode = 'centerline' | 'thoman'

function AppHeader() {
  const partId = useTubeStore((s) => s.partId)
  const partName = useTubeStore((s) => s.partName)
  const tubeDiameterMm = useTubeStore((s) => s.tubeDiameterMm)
  const wallThicknessMm = useTubeStore((s) => s.wallThicknessMm)
  const materialId = useTubeStore((s) => s.materialId)
  const setPartMeta = useTubeStore((s) => s.setPartMeta)
  const hydrateFromPart = useTubeStore((s) => s.hydrateFromPart)

  const [sync, setSync] = useState(false)
  const [loadId, setLoadId] = useState('')
  const [loadErr, setLoadErr] = useState<string | null>(null)

  useTubeFirebaseSync(sync && isFirebaseConfigured(), partId)

  const fbOk = isFirebaseConfigured()

  const onLoad = async () => {
    setLoadErr(null)
    if (!loadId.trim()) {
      setLoadErr('Voer een part ID in.')
      return
    }
    if (!fbOk) {
      setLoadErr('Firebase niet geconfigureerd.')
      return
    }
    try {
      const remote = await loadPart(loadId.trim())
      if (!remote) {
        setLoadErr('Part niet gevonden.')
        return
      }
      hydrateFromPart({
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
      setLoadId('')
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Laden mislukt.')
    }
  }

  const newPart = () => {
    const p1: TubePoint = {
      id: newId(),
      x: 0,
      y: 0,
      z: 0,
      radius: 0,
      rotation: 0,
      remark: 'Start',
    }
    const p2: TubePoint = {
      id: newId(),
      x: 1200,
      y: 0,
      z: 0,
      radius: 0,
      rotation: 0,
      remark: 'Einde',
    }
    const now = Date.now()
    hydrateFromPart({
      partId: newId(),
      partName: 'Nieuw onderdeel',
      materialId: 'steel-s355',
      tubeDiameterMm: 40,
      wallThicknessMm: 2,
      points: [p1, p2],
      remoteEpoch: now,
    })
    useTubeStore.getState().setRemoteEpoch(now)
  }

  const bends = useTubeStore((s) => s.bends)

  const bendSummary = useMemo(() => {
    if (bends.length === 0) return '—'
    return bends
      .map(
        (b) =>
          `#${b.vertexIndex + 1}: ${b.angleDeg.toFixed(1)}° / Lbocht ${b.arcLengthMm.toFixed(1)} mm`,
      )
      .join(' · ')
  }, [bends])

  return (
    <header className="tb-panel mb-2 flex shrink-0 flex-col gap-3 p-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--tb-muted)]">
            TubeBend Studio
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              fbOk ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'
            }`}
          >
            {fbOk ? 'Firebase OK' : 'Firebase offline'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[var(--tb-muted)]">Naam</label>
          <input
            className="rounded-lg border border-[var(--tb-border)] bg-black/40 px-2 py-1 text-sm"
            value={partName}
            onChange={(e) => setPartMeta({ partName: e.target.value })}
          />
          <label className="text-xs text-[var(--tb-muted)]">Ø</label>
          <input
            type="number"
            className="w-20 rounded-lg border border-[var(--tb-border)] bg-black/40 px-2 py-1 font-mono text-sm"
            value={tubeDiameterMm}
            onChange={(e) =>
              setPartMeta({ tubeDiameterMm: Number.parseFloat(e.target.value) || 0 })
            }
          />
          <label className="text-xs text-[var(--tb-muted)]">wand</label>
          <input
            type="number"
            className="w-20 rounded-lg border border-[var(--tb-border)] bg-black/40 px-2 py-1 font-mono text-sm"
            value={wallThicknessMm}
            onChange={(e) =>
              setPartMeta({ wallThicknessMm: Number.parseFloat(e.target.value) || 0 })
            }
          />
          <label className="text-xs text-[var(--tb-muted)]">materiaal</label>
          <input
            className="w-36 rounded-lg border border-[var(--tb-border)] bg-black/40 px-2 py-1 font-mono text-sm"
            value={materialId}
            onChange={(e) => setPartMeta({ materialId: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-2 md:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--tb-muted)]">ID: {partId}</span>
          <button type="button" className="tb-btn tb-btn--secondary tb-btn--sm" onClick={newPart}>
            Nieuw part ID
          </button>
          <label className="flex items-center gap-2 text-xs text-[var(--tb-muted)]">
            <input
              type="checkbox"
              checked={sync}
              disabled={!fbOk}
              onChange={(e) => setSync(e.target.checked)}
            />
            Realtime sync + autosave
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Laad part ID…"
            className="min-w-[200px] rounded-lg border border-[var(--tb-border)] bg-black/40 px-2 py-1 font-mono text-xs"
            value={loadId}
            onChange={(e) => setLoadId(e.target.value)}
          />
          <button
            type="button"
            className="tb-btn tb-btn--primary tb-btn--sm"
            onClick={() => void onLoad()}
          >
            Laden
          </button>
          {loadErr ? (
            <span className="text-xs text-[var(--tb-danger)]">{loadErr}</span>
          ) : null}
        </div>
        <div
          className="max-w-[720px] text-right font-mono text-[10px] leading-snug text-[var(--tb-muted)]"
          title="Afgeleide bochten"
        >
          Bochten: {bendSummary}
        </div>
      </div>
    </header>
  )
}

function CenterlineView() {
  const points = useTubeStore((s) => s.points)
  const tubeDiameterMm = useTubeStore((s) => s.tubeDiameterMm)

  return (
    <>
      <AppHeader />
      <div className="flex min-h-0 flex-1 flex-col gap-2 xl:flex-row">
        <section className="tb-panel flex min-h-[360px] min-w-0 flex-1 flex-col p-3 xl:max-w-[52%]">
          <XyzTable />
        </section>
        <div className="flex min-h-[360px] min-w-0 flex-1 flex-col gap-2 xl:max-w-[48%]">
          <TubeViewer3D points={points} tubeDiameterMm={tubeDiameterMm} />
        </div>
        <FutureFeaturesPanel />
      </div>
      <SvgViews points={points} />
      <StatusPanel />
    </>
  )
}

function resolveInitialMode(): AppMode {
  if (typeof window === 'undefined') return 'thoman'
  const params = new URLSearchParams(window.location.search)
  if (params.get('mode') === 'centerline') return 'centerline'
  return 'thoman'
}

export default function App() {
  const [mode, setMode] = useState<AppMode>(resolveInitialMode)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 md:p-3">
      <nav className="tb-panel flex shrink-0 flex-wrap gap-2 p-2">
        <button
          type="button"
          className={`tb-btn tb-btn--sm ${mode === 'thoman' ? 'tb-btn--primary' : 'tb-btn--secondary'}`}
          onClick={() => setMode('thoman')}
        >
          Thoman STR
        </button>
        <button
          type="button"
          className={`tb-btn tb-btn--sm ${mode === 'centerline' ? 'tb-btn--primary' : 'tb-btn--secondary'}`}
          onClick={() => setMode('centerline')}
        >
          Centerline CAD
        </button>
      </nav>

      {mode === 'thoman' ? (
        <ThomanSimPanel />
      ) : (
        <CenterlineView />
      )}
    </div>
  )
}
