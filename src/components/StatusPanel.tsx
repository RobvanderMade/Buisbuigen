import { bboxOuterDimensionsMm, outerDimensionsLabel } from '../geometry'
import { useTubeStore } from '../store/tubeStore'

export function StatusPanel() {
  const totalLengthMm = useTubeStore((s) => s.totalLengthMm)
  const bends = useTubeStore((s) => s.bends)
  const bboxOuter = useTubeStore((s) => s.boundingBoxOuter)
  const materialId = useTubeStore((s) => s.materialId)
  const tubeDiameterMm = useTubeStore((s) => s.tubeDiameterMm)
  const wallThicknessMm = useTubeStore((s) => s.wallThicknessMm)

  const dims = bboxOuterDimensionsMm(bboxOuter)

  const cells = [
    { label: 'Totale lengte (hartlijn)', value: `${totalLengthMm.toFixed(1)} mm` },
    { label: 'Buitenmaten (omhullende)', value: outerDimensionsLabel(bboxOuter) },
    { label: 'Aantal bochten', value: String(bends.length) },
    { label: 'Materiaal', value: materialId },
    { label: 'Diameter', value: `${tubeDiameterMm.toFixed(1)} mm` },
    { label: 'Wanddikte', value: `${wallThicknessMm.toFixed(2)} mm` },
    { label: 'ΔX / ΔY / ΔZ', value: `${dims.dx.toFixed(0)} / ${dims.dy.toFixed(0)} / ${dims.dz.toFixed(0)}` },
  ]

  return (
    <footer className="tb-panel mt-2 grid shrink-0 grid-cols-2 gap-2 p-3 md:grid-cols-4 lg:grid-cols-7">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-[var(--tb-border)]/80 bg-black/25 px-3 py-2"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tb-muted)]">
            {c.label}
          </div>
          <div className="font-mono text-sm text-[var(--tb-text)]">{c.value}</div>
        </div>
      ))}
    </footer>
  )
}
