import { useState, useEffect } from 'react'
import type { Difficulty, Mode } from '../utils/mapboxUtils'
import { DIFFICULTY_CONFIG } from '../utils/difficultyConfig'
import { supabase } from '../lib/supabase'
import { ScoreLineChart, type ScorePoint } from './ScoreLineChart'

// Full-screen player stats overlay, opened from the account menu. Mirrors the
// main menu's Daily / US / Global segmented selector. The Daily tab charts the
// player's own daily scores over time (read from daily_results). The US and
// Global tabs show one card per difficulty (games / best / avg), mirroring the
// game's Select-Difficulty screen — read from game_results. Both tables are
// owner-selectable under RLS, so the public key returns only this user's rows.

type Tab = 'daily' | 'us' | 'global'

interface GameRow { mode: Mode; difficulty: Difficulty; total_score: number }

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const MODE_LABEL: Record<Mode, string> = { us: 'US Cities', global: 'Global' }

const TABS: { id: Tab; label: string }[] = [
  { id: 'daily', label: 'Daily Challenge' },
  { id: 'us', label: 'US Cities' },
  { id: 'global', label: 'Global' },
]

export function StatsPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('daily')
  const [rows, setRows] = useState<ScorePoint[] | null>(null) // daily; null = loading
  const [games, setGames] = useState<GameRow[] | null>(null)  // us/global; null = loading

  useEffect(() => {
    let active = true
    if (!supabase) { setRows([]); setGames([]); return }

    supabase
      .from('daily_results')
      .select('date_key, total_score')
      .order('date_key', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.warn('StatsPage: daily_results fetch failed', error.message); setRows([]) }
        else setRows((data ?? []).map(r => ({ dateKey: r.date_key as string, score: r.total_score as number })))
      })

    supabase
      .from('game_results')
      .select('mode, difficulty, total_score')
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.warn('StatsPage: game_results fetch failed', error.message); setGames([]) }
        else setGames((data ?? []) as GameRow[])
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

        {tab !== 'daily' && (
          games === null
            ? <Placeholder text="Loading…" />
            : <DifficultyCards mode={tab} games={games} />
        )}
      </div>
    </div>
  )
}

// Per-difficulty summary cards for a US/Global mode, mirroring the game's
// Select-Difficulty screen. Always renders all three tiers (zeros when unplayed)
// so the layout stays stable regardless of history.
function DifficultyCards({ mode, games }: { mode: Mode; games: GameRow[] }) {
  const stats = DIFFICULTIES.map(difficulty => {
    const scores = games
      .filter(g => g.mode === mode && g.difficulty === difficulty)
      .map(g => g.total_score)
    const count = scores.length
    return {
      difficulty,
      count,
      best: count ? Math.max(...scores) : null,
      avg: count ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : null,
    }
  })
  const total = stats.reduce((s, x) => s + x.count, 0)

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 'clamp(0.5rem, 3vw, 1rem)',
      }}>
        {stats.map(s => {
          const cfg = DIFFICULTY_CONFIG[s.difficulty]
          return (
            <div key={s.difficulty} style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 14,
              padding: '1.25rem 1.5rem',
              minWidth: 'clamp(140px, 40vw, 180px)',
              boxSizing: 'border-box',
            }}>
              <div style={{ color: cfg.accent, fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.85rem' }}>
                {cfg.label}
              </div>
              <CardStat label="Games" value={String(s.count)} />
              <CardStat label="Best" value={s.best === null ? '—' : String(s.best)} />
              <CardStat label="Avg" value={s.avg === null ? '—' : String(s.avg)} />
            </div>
          )
        })}
      </div>
      {total === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '1.5rem' }}>
          No {MODE_LABEL[mode]} games recorded yet — play one to fill this in.
        </div>
      )}
    </div>
  )
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', padding: '0.2rem 0', fontSize: '0.92rem' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ color: '#f5f5f5', fontWeight: 700 }}>{value}</span>
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
