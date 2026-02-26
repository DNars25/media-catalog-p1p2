'use client'
import type { UserStat, MonthlyPoint } from '@/lib/analytics'

const COLORS = {
  requests: '#3b82f6',
  corrections: '#ef4444',
  updates: '#a855f7',
  titles: '#22c55e',
}

const LINES = [
  { key: 'requests' as const, name: 'Pedidos', color: COLORS.requests },
  { key: 'corrections' as const, name: 'Correções', color: COLORS.corrections },
  { key: 'updates' as const, name: 'Atualizações', color: COLORS.updates },
  { key: 'titles' as const, name: 'Títulos', color: COLORS.titles },
]

// ─── Bar Chart (CSS/Tailwind — zero external deps) ────────────────────────────
export function UserBarChart({ data }: { data: UserStat[] }) {
  const max = Math.max(
    ...data.flatMap(u => [u.requests, u.corrections, u.updates, u.titles]),
    1
  )

  return (
    <div>
      <div className='flex items-end gap-4 h-52 overflow-x-auto pb-2'>
        {data.map(u => (
          <div key={u.userId} className='flex flex-col items-center gap-1 min-w-[3.5rem] flex-1'>
            <div className='flex items-end gap-0.5 h-44 w-full justify-center'>
              {[
                { value: u.requests, color: 'bg-blue-500' },
                { value: u.corrections, color: 'bg-red-500' },
                { value: u.updates, color: 'bg-purple-500' },
                { value: u.titles, color: 'bg-green-500' },
              ].map((bar, i) => (
                <div
                  key={i}
                  title={bar.value.toString()}
                  className={`w-4 rounded-t-sm ${bar.color} transition-all`}
                  style={{ height: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 2 : 0)}%` }}
                />
              ))}
            </div>
            <span className='text-xs text-muted-foreground text-center truncate w-full px-1'>
              {u.userName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
      <div className='flex gap-4 flex-wrap mt-3'>
        {LINES.map(l => (
          <div key={l.key} className='flex items-center gap-1.5'>
            <div className='w-3 h-3 rounded-sm' style={{ backgroundColor: l.color }} />
            <span className='text-xs text-muted-foreground'>{l.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Line Chart (SVG puro — zero external deps) ───────────────────────────────
export function MonthlyLineChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length < 2) return null

  const W = 600, H = 220
  const PL = 38, PR = 12, PT = 12, PB = 36
  const IW = W - PL - PR
  const IH = H - PT - PB

  const maxVal = Math.max(
    ...data.flatMap(d => LINES.map(l => d[l.key])),
    1
  )

  const px = (i: number) => PL + (i / (data.length - 1)) * IW
  const py = (v: number) => PT + IH - (v / maxVal) * IH

  const gridValues = [0, 0.5, 1]
  const step = Math.ceil(data.length / 7)

  return (
    <div>
      <svg width='100%' viewBox={`0 0 ${W} ${H}`} className='overflow-visible'>
        {/* Grid lines + Y labels */}
        {gridValues.map(r => {
          const yv = py(maxVal * r)
          return (
            <g key={r}>
              <line x1={PL} y1={yv} x2={W - PR} y2={yv} stroke='#1e293b' strokeDasharray='4 3' />
              <text x={PL - 4} y={yv + 4} textAnchor='end' fontSize='10' fill='#64748b'>
                {Math.round(maxVal * r)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.map((d, i) =>
          i % step === 0 || i === data.length - 1 ? (
            <text key={i} x={px(i)} y={H - PB + 14} textAnchor='middle' fontSize='10' fill='#64748b'>
              {d.month}
            </text>
          ) : null
        )}

        {/* Lines */}
        {LINES.map(line => {
          const points = data.map((d, i) => `${px(i)},${py(d[line.key])}`).join(' ')
          return (
            <polyline
              key={line.key}
              points={points}
              fill='none'
              stroke={line.color}
              strokeWidth='2'
              strokeLinejoin='round'
              strokeLinecap='round'
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className='flex gap-4 flex-wrap mt-1'>
        {LINES.map(l => (
          <div key={l.key} className='flex items-center gap-1.5'>
            <div className='w-6 h-0.5 rounded' style={{ backgroundColor: l.color }} />
            <span className='text-xs text-muted-foreground'>{l.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
