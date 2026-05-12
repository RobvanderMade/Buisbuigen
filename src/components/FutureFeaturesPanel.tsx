const items = [
  { title: 'DXF export', hint: '2D fabrieksplattegrond / UNFOLD' },
  { title: 'STEP export', hint: 'Solide voor CAD/CAM' },
  { title: 'CNC postprocessor', hint: 'YBC / LRA naar machinebesturing' },
  { title: 'Springback compensatie', hint: 'Materiaalmodel + correctie' },
  { title: 'Machine simulatie', hint: 'Virtuele slinger + koppeling' },
  { title: 'Collision detection', hint: 'Mal / omgeving / vork' },
] as const

export function FutureFeaturesPanel() {
  return (
    <aside className="tb-panel hidden w-56 shrink-0 flex-col gap-2 p-3 xl:flex">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--tb-muted)]">
        Roadmap
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.title}
            className="rounded-lg border border-dashed border-[var(--tb-border)] bg-black/20 px-2 py-2"
          >
            <div className="text-xs font-medium text-[var(--tb-text)]">{it.title}</div>
            <div className="text-[10px] text-[var(--tb-muted)]">{it.hint}</div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
