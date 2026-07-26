import { useEffect } from 'react'
import { posts } from './posts'

const ACCENT = '#4ade80'

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function BlogIndexPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(() => { document.title = 'Tips & Tricks — SatGueser' }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: '#111',
      color: '#f5f5f5',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.25rem 4rem' }}>
        <button
          onClick={() => onNavigate('/')}
          style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            fontSize: '0.85rem', padding: 0, marginBottom: '1.5rem',
          }}
        >
          ← Back to game
        </button>

        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.9rem', fontWeight: 800 }}>Tips &amp; Tricks</h1>
        <p style={{ margin: '0 0 2.5rem', color: '#9ca3af', fontSize: '0.95rem' }}>
          How to spot cities from satellite imagery, one clue at a time.
        </p>

        {posts.length === 0 && (
          <p style={{ color: '#9ca3af' }}>No posts yet — check back soon.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {posts.map(post => (
            <button
              key={post.slug}
              onClick={() => onNavigate(`/blog/${post.slug}`)}
              style={{
                textAlign: 'left', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.9rem',
                padding: '1.25rem 1.4rem', cursor: 'pointer', color: 'inherit',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: ACCENT, fontWeight: 600, marginBottom: '0.3rem' }}>
                {formatDate(post.date)}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem' }}>{post.title}</div>
              {post.excerpt && (
                <div style={{ fontSize: '0.9rem', color: '#d4d4d4', lineHeight: 1.5 }}>{post.excerpt}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
