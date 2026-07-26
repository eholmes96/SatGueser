import { useEffect } from 'react'
import { getPost } from './posts'

const ACCENT = '#4ade80'

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function BlogPostPage({ slug, onNavigate }: { slug: string; onNavigate: (path: string) => void }) {
  const post = getPost(slug)

  useEffect(() => { document.title = post ? `${post.title} — SatGueser` : 'Post not found — SatGueser' }, [post])

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
          onClick={() => onNavigate('/blog')}
          style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            fontSize: '0.85rem', padding: 0, marginBottom: '1.5rem',
          }}
        >
          ← Back to Tips &amp; Tricks
        </button>

        {!post ? (
          <p style={{ color: '#9ca3af' }}>That post doesn't exist.</p>
        ) : (
          <>
            <div style={{ fontSize: '0.78rem', color: ACCENT, fontWeight: 600, marginBottom: '0.4rem' }}>
              {formatDate(post.date)}
            </div>
            <h1 style={{ margin: '0 0 1.75rem', fontSize: '2rem', fontWeight: 800, lineHeight: 1.2 }}>
              {post.title}
            </h1>
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.html }} />
          </>
        )}
      </div>

      <style>{`
        .blog-content { font-size: 1rem; line-height: 1.7; color: #e5e5e5; }
        .blog-content h2 { font-size: 1.3rem; font-weight: 700; margin: 2rem 0 0.75rem; color: #f5f5f5; }
        .blog-content h3 { font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 0.6rem; color: #f5f5f5; }
        .blog-content p { margin: 0 0 1rem; }
        .blog-content ul, .blog-content ol { margin: 0 0 1rem; padding-left: 1.4rem; }
        .blog-content li { margin-bottom: 0.4rem; }
        .blog-content a { color: ${ACCENT}; }
        .blog-content code { background: rgba(255,255,255,0.08); padding: 0.15rem 0.4rem; border-radius: 0.3rem; font-size: 0.9em; }
        .blog-content hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 2rem 0; }
        .blog-content img { max-width: 100%; border-radius: 0.6rem; }
        .blog-content blockquote { margin: 0 0 1rem; padding-left: 1rem; border-left: 3px solid rgba(255,255,255,0.2); color: #9ca3af; }
      `}</style>
    </div>
  )
}
