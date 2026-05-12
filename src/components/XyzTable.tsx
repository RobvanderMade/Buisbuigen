import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { TubePoint } from '../types'
import { useTubeStore } from '../store/tubeStore'

const columnHelper = createColumnHelper<TubePoint>()

function num(v: string): number {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function XyzTable() {
  const points = useTubeStore((s) => s.points)
  const selectedPointId = useTubeStore((s) => s.selectedPointId)
  const updatePoint = useTubeStore((s) => s.updatePoint)
  const removePoint = useTubeStore((s) => s.removePoint)
  const addPoint = useTubeStore((s) => s.addPoint)
  const selectPoint = useTubeStore((s) => s.selectPoint)

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'idx',
        header: 'Punt',
        cell: (ctx) => (
          <span className="font-mono text-xs text-[var(--tb-muted)]">
            P{ctx.row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (ctx) => (
          <span className="font-mono text-[10px] text-[var(--tb-muted)]">
            {ctx.getValue().slice(0, 8)}…
          </span>
        ),
      }),
      columnHelper.accessor('x', {
        header: 'X',
        cell: (ctx) => (
          <input
            className="tb-input w-full"
            type="number"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, { x: num(e.target.value) })
            }
          />
        ),
      }),
      columnHelper.accessor('y', {
        header: 'Y',
        cell: (ctx) => (
          <input
            className="tb-input w-full"
            type="number"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, { y: num(e.target.value) })
            }
          />
        ),
      }),
      columnHelper.accessor('z', {
        header: 'Z',
        cell: (ctx) => (
          <input
            className="tb-input w-full"
            type="number"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, { z: num(e.target.value) })
            }
          />
        ),
      }),
      columnHelper.accessor('radius', {
        header: 'R',
        cell: (ctx) => (
          <input
            className="tb-input w-full"
            type="number"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, { radius: num(e.target.value) })
            }
          />
        ),
      }),
      columnHelper.accessor('rotation', {
        header: 'Rot°',
        cell: (ctx) => (
          <input
            className="tb-input w-full"
            type="number"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, {
                rotation: num(e.target.value),
              })
            }
          />
        ),
      }),
      columnHelper.accessor('remark', {
        header: 'Opmerking',
        cell: (ctx) => (
          <input
            className="tb-input w-full min-w-[120px]"
            type="text"
            value={ctx.getValue()}
            onChange={(e) =>
              updatePoint(ctx.row.original.id, { remark: e.target.value })
            }
          />
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (ctx) => (
          <button
            type="button"
            className="tb-btn-danger px-2 py-1 text-xs"
            onClick={() => removePoint(ctx.row.original.id)}
            title="Rij verwijderen"
          >
            ✕
          </button>
        ),
      }),
    ],
    [removePoint, updatePoint],
  )

  const table = useReactTable({
    data: points,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--tb-muted)]">
          XYZ HARTLIJN
        </h2>
        <button type="button" className="tb-btn-primary text-xs" onClick={addPoint}>
          + Punt
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--tb-border)] bg-[#0e1118]">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#141824] shadow-sm">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--tb-border)]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="whitespace-nowrap px-2 py-2 text-xs font-medium uppercase tracking-wider text-[var(--tb-muted)]"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const active = row.original.id === selectedPointId
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b border-[var(--tb-border)]/60 hover:bg-white/5 ${
                    active ? 'bg-[var(--tb-accent-dim)]' : ''
                  }`}
                  onClick={() => selectPoint(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-1 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <style>{`
        .tb-input {
          background: #0b0e14;
          border: 1px solid var(--tb-border);
          border-radius: 6px;
          color: var(--tb-text);
          padding: 6px 8px;
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .tb-input:focus {
          outline: 2px solid rgba(59, 130, 246, 0.35);
          border-color: rgba(59, 130, 246, 0.55);
        }
        .tb-btn-primary {
          background: linear-gradient(180deg, #3b82f6, #2563eb);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
        }
        .tb-btn-danger {
          background: rgba(248, 113, 113, 0.12);
          border: 1px solid rgba(248, 113, 113, 0.35);
          color: #fecaca;
          border-radius: 6px;
        }
      `}</style>
    </div>
  )
}
