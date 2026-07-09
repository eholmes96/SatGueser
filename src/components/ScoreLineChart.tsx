import { useState } from 'react'

// A single-series line chart of Daily Challenge score over time. Presentational
// only — the caller supplies already-sorted points. Built as inline SVG (no
// chart dep, matching the app's from-scratch styling): one 2px accent line,
// ≥8px markers ringed against the surface, recessive grid/axes, and a hover
// crosshair + tooltip. One series, so no legend — the heading names it.

export interface ScorePoint {
  dateKey: string // 'YYYY-MM-DD'
  score: number
}

const ACCENT = '#4ade80'
const SURFACE = '#141414'
const GRID = 'rgba(255,255,255,0.08)'
const AXIS_TEXT = 'rgba(255,255,255,0.45)'

// viewBox space — the SVG scales to its container width.
const W = 640
const H = 300
const PAD = { l: 52, r: 18, t: 18, b: 34 }
const plotW = W - PAD.l - PAD.r
const plotH = H - PAD.t - PAD.b

function niceCeil(v: number): number {
  if (v <= 0) return 1000
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / mag) * mag
}

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-')
  return `${Number(m)}/${Number(d)}`
}

export function ScoreLineChart({ data }: { data: ScorePoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const n = data.length
  const maxScore = Math.max(...data.map(d => d.score), 0)
  const yMax = niceCeil(maxScore)

  const xOf = (i: number) => (n <= 1 ? PAD.l + plotW / 2 : PAD.l + (i / (n - 1)) * plotW)
  const yOf = (s: number) => PAD.t + plotH - (s / yMax) * plotH

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(yMax * f))
  // With many points, thin the x labels to ~7 to avoid collisions.
  const labelStep = Math.max(1, Math.ceil(n / 7))

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(d.score)}`).join(' ')

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (n === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const vbX = frac * W
    // Nearest point by x.
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xOf(i) - vbX)
      if (d < bestDist) { bestDist = d; best = i }
    }
    setHover(best)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img"
        aria-label={`Daily Challenge scores over ${n} day${n === 1 ? '' : 's'}`}>
        {/* Horizontal gridlines + y labels */}
        {yTicks.map((t, i) => {
          const y = yOf(t)
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize={12} fill={AXIS_TEXT}>{t}</text>
            </g>
          )
        })}

        {/* x labels */}
        {data.map((d, i) => (
          (i % labelStep === 0 || i === n - 1) && (
            <text key={i} x={xOf(i)} y={H - PAD.b + 20} textAnchor="middle" fontSize={12} fill={AXIS_TEXT}>
              {shortDate(d.dateKey)}
            </text>
          )
        ))}

        {/* Hover crosshair */}
        {hover !== null && (
          <line x1={xOf(hover)} y1={PAD.t} x2={xOf(hover)} y2={PAD.t + plotH}
            stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
        )}

        {/* The line (skipped for a single point) */}
        {n > 1 && <path d={linePath} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

        {/* Markers — 8px, ringed against the surface; the hovered one grows */}
        {data.map((d, i) => (
          <circle key={i} cx={xOf(i)} cy={yOf(d.score)} r={hover === i ? 6 : 4}
            fill={ACCENT} stroke={SURFACE} strokeWidth={2} />
        ))}
      </svg>

      {/* Tooltip */}
      {hover !== null && (
        <div style={{
          position: 'absolute',
          left: `${(xOf(hover) / W) * 100}%`,
          top: `${(yOf(data[hover].score) / H) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 10px))',
          pointerEvents: 'none',
          background: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '0.4rem 0.6rem',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 11, color: AXIS_TEXT }}>{shortDate(data[hover].dateKey)}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f5' }}>{data[hover].score} pts</div>
        </div>
      )}
    </div>
  )
}
