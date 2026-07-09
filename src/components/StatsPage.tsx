import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ScoreLineChart, type ScorePoint } from './ScoreLineChart'

// Full-screen player stats overlay, opened from the account menu. Mirrors the
// main menu's Daily / US / Global segmented selector. The Daily tab charts the
// player's own daily scores over time (read from daily_results, which the
// owner can select under RLS); US and Global are intentionally blank for now.

type Tab = 'daily' | 'us' | 'global'

const TABS: { id: Tab; label: string }[] = [
  { id: 'daily', label: 'Daily Challenge' },
  { id: 'us', label: 'US Cities' },
  { id: 'global', label: 'Global' },
]

export function StatsPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('daily')
  const [rows, setRows] = useState<ScorePoint[] | null>(null) // null = loading

  useEffect(() => {
    let active = true
    if (!supabase) { setRows([]); return }
    supabase
      .from('daily_results')
      .select('date_key, total_score')
      .order('date_key', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.warn('StatsPage: daily_results fetch failed', error.message); setRows([]) }
        else setRows((data ?? []).map(r => ({ dateKey: r.date_key as string, score: r.total_score as number })))
      })
    return () => { active = false }
  }, [])

  const best = rows && rows.length ? Math.max(...rows.map(r => r.score)) : 0

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: '#111',
      color: '#f5f5f5',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Exit — top-left, matching the in-game exit button */}
      <button
        onClick={onClose}
        aria-label="Close stats"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          width: 36,
          height: 36,
          fontSize: 18,
          lineHeight: '36px',
          textAlign: 'center',
          padding: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12,
          color: '#fff',
          cursor: 'pointer',
          zIndex: 110,
        }}
      >
        ×
      </button>

      <div style={{ width: '100%', maxWidth: 680, padding: '4.5rem 1.25rem 3rem', boxSizing: 'border-box' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '2rem', fontWeight: 800 }}>Stats</h1>

        {/* Mode selector — same pill toggle as the main menu */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: 4,
            borderRadius: 999,
          }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '0.35rem 1rem',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: tab === t.id ? '#fff' : 'transparent',
                  color: tab === t.id ? '#111' : '#aaa',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'daily' && (
          <div>
            {rows === null ? (
              <Placeholder text="Loading…" />
            ) : rows.length === 0 ? (
              <Placeholder text="No Daily Challenge games recorded yet. Play today's challenge to start your history." />
            ) : (
              <div style={{
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '1.25rem 1rem 1rem',
              }}>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Stat label="Games" value={String(rows.length)} />
                  <Stat label="Best" value={String(best)} />
                </div>
                <ScoreLineChart data={rows} />
              </div>
            )}
          </div>
        )}

        {tab !== 'daily' && <Placeholder text="Coming soon." />}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f5f5f5' }}>{value}</div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.45)' }}>{label}</div>
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return (
    <div style={{
      textAlign: 'center',
      color: 'rgba(255,255,255,0.4)',
      fontSize: '0.95rem',
      padding: '3rem 1rem',
      lineHeight: 1.5,
    }}>
      {text}
    </div>
  )
}
