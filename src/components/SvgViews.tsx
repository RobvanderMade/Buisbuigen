import { useCallback, useMemo, useState, type WheelEvent, type MouseEvent } from 'react'
import { sampleCenterlinePolyline, type Vec3 } from '../geometry'
import type { TubePoint } from '../types'

type ViewId = 'XY' | 'XZ' | 'YZ' | 'ISO'

interface Pt2 {
  x: number
  y: number
}

function projectXYZ(x: number, y: number, z: number, view: ViewId): Pt2 {
  switch (view) {
    case 'XY':
      return { x, y: -y }
    case 'XZ':
      return { x, y: -z }
    case 'YZ':
      return { x: y, y: -z }
    case 'ISO': {
      const c = Math.cos(Math.PI / 6)
      const s = Math.sin(Math.PI / 6)
      return { x: (x - y) * c, y: -((x + y) * s + z) }
    }
    default:
      return { x, y: -y }
  }
}

function project(point: TubePoint, view: ViewId): Pt2 {
  return projectXYZ(point.x, point.y, point.z, view)
}

function projectVec(v: Vec3, view: ViewId): Pt2 {
  return projectXYZ(v[0], v[1], v[2], view)
}

function bounds2d(pts: Pt2[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (pts.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

export function SvgViews({ points }: { points: TubePoint[] }) {
  const [view, setView] = useState<ViewId>('XY')
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState<{ sx: number; sy: number; px: number; py: number } | null>(
    null,
  )

  const centerline = useMemo(() => sampleCenterlinePolyline(points), [points])

  const projected = useMemo(
    () => points.map((p) => ({ p, q: project(p, view) })),
    [points, view],
  )

  const pathQs = useMemo(
    () => centerline.map((v) => projectVec(v, view)),
    [centerline, view],
  )

  const { vb, map } = useMemo(() => {
    const qs = [...projected.map((o) => o.q), ...pathQs]
    const b = bounds2d(qs)
    const w = Math.max(40, b.maxX - b.minX)
    const h = Math.max(40, b.maxY - b.minY)
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    const size = 560
    const s0 = (0.85 * size) / Math.max(w, h)
    const s = s0 * scale
    const ox = size / 2 - cx * s + pan.x
    const oy = size / 2 - cy * s + pan.y
    const map = (pt: Pt2) => ({ x: ox + pt.x * s, y: oy + pt.y * s })
    const vb = `0 0 ${size} ${size}`
    return { vb, map, s }
  }, [projected, pathQs, scale, pan])

  const pathD = useMemo(() => {
    if (pathQs.length === 0) return ''
    const parts: string[] = []
    pathQs.forEach((q, i) => {
      const m = map(q)
      parts.push(`${i === 0 ? 'M' : 'L'} ${m.x.toFixed(2)} ${m.y.toFixed(2)}`)
    })
    return parts.join(' ')
  }, [map, pathQs])

  const dim = useMemo(() => {
    if (projected.length < 2) return null
    const qs = projected.map((o) => o.q)
    const b = bounds2d(qs)
    const p1 = map({ x: b.minX, y: b.minY })
    const p2 = map({ x: b.maxX, y: b.maxY })
    return { p1, p2, w: b.maxX - b.minX, h: b.maxY - b.minY }
  }, [map, projected])

  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    setScale((s) => Math.min(8, Math.max(0.2, s * factor)))
  }, [])

  const onDown = useCallback((e: MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    setDrag({ sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y })
  }, [pan.x, pan.y])

  const onMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (!drag) return
      setPan({
        x: drag.px + (e.clientX - drag.sx),
        y: drag.py + (e.clientY - drag.sy),
      })
    },
    [drag],
  )

  const onUp = useCallback(() => setDrag(null), [])

  const resetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const views: ViewId[] = ['XY', 'XZ', 'YZ', 'ISO']

  return (
    <section className="tb-panel flex min-h-[320px] flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--tb-muted)]">
          SVG PROJECTIES
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v)
                resetView()
              }}
              className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
                view === v
                  ? 'border-[var(--tb-accent)] bg-[var(--tb-accent-dim)] text-white'
                  : 'border-[var(--tb-border)] bg-black/30 text-[var(--tb-muted)]'
              }`}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            onClick={resetView}
            className="rounded-lg border border-[var(--tb-border)] bg-black/30 px-3 py-1 text-xs text-[var(--tb-muted)]"
          >
            Reset zoom
          </button>
        </div>
      </div>
      <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-[var(--tb-border)] bg-[#0a0c11]">
        <svg
          role="img"
          aria-label={`Projectie ${view}`}
          viewBox={vb}
          className="h-full max-h-[420px] w-full cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <g>
            <path
              d={pathD}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {projected.map((o, i) => {
              const m = map(o.q)
              return (
                <g key={o.p.id}>
                  <circle cx={m.x} cy={m.y} r={5} fill="#1e293b" stroke="#93c5fd" strokeWidth={1.5} />
                  <text
                    x={m.x + 8}
                    y={m.y - 6}
                    fill="#cbd5e1"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                  >
                    {i + 1}
                  </text>
                </g>
              )
            })}
            {dim ? (
              <g opacity={0.85}>
                <line
                  x1={dim.p1.x}
                  y1={dim.p2.y + 28}
                  x2={dim.p2.x}
                  y2={dim.p2.y + 28}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                <line
                  x1={dim.p1.x - 6}
                  y1={dim.p2.y + 24}
                  x2={dim.p1.x - 6}
                  y2={dim.p2.y + 32}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                <line
                  x1={dim.p2.x + 6}
                  y1={dim.p2.y + 24}
                  x2={dim.p2.x + 6}
                  y2={dim.p2.y + 32}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                <text
                  x={(dim.p1.x + dim.p2.x) / 2}
                  y={dim.p2.y + 44}
                  fill="#94a3b8"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {dim.w.toFixed(0)} mm
                </text>
                <line
                  x1={dim.p2.x + 28}
                  y1={dim.p1.y}
                  x2={dim.p2.x + 28}
                  y2={dim.p2.y}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                <text
                  x={dim.p2.x + 40}
                  y={(dim.p1.y + dim.p2.y) / 2}
                  fill="#94a3b8"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                  dominantBaseline="middle"
                >
                  {dim.h.toFixed(0)} mm
                </text>
              </g>
            ) : null}
          </g>
        </svg>
      </div>
    </section>
  )
}
