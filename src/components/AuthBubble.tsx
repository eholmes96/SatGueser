import { useState, useEffect, useRef, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// A small persistent auth control that lives in the bottom-right corner on
// every screen. Signed out, it's a bubble that opens a centered popup asking
// for an email; we send a Supabase magic link and the popup shows a
// "check your email" state. Signed in, the bubble becomes an initial-avatar
// that opens a tiny menu with the email and a Sign out action.
//
// Entirely self-contained: it manages its own session via supabase.auth and
// renders nothing when Supabase isn't configured (guest-only builds), so the
// game keeps working without a backend.

const ACCENT = '#4ade80'

type Popup = 'closed' | 'email' | 'sent'

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function AuthBubble() {
  const [session, setSession] = useState<Session | null>(null)
  const [popup, setPopup] = useState<Popup>('closed')
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Track the session: current value on mount, then live updates (the magic
  // link redirect resolves to a SIGNED_IN event once the URL hash is parsed).
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) setPopup('closed')
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Close popup/menu on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPopup('closed'); setMenuOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus the email field when the popup opens to it.
  useEffect(() => {
    if (popup === 'email') emailInputRef.current?.focus()
  }, [popup])

  const sendMagicLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || sending) return
    const trimmed = email.trim()
    if (!isValidEmail(trimmed)) { setError('Enter a valid email address.'); return }
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    })
    setSending(false)
    if (error) { setError(error.message); return }
    setPopup('sent')
  }, [email, sending])

  const signOut = useCallback(async () => {
    setMenuOpen(false)
    if (supabase) await supabase.auth.signOut()
  }, [])

  // Guest-only build: no backend, nothing to sign into.
  if (!isSupabaseConfigured) return null

  const userEmail = session?.user.email ?? ''
  const initial = userEmail.charAt(0).toUpperCase() || '?'

  return (
    <>
      {/* The bubble itself */}
      <button
        onClick={() => (session ? setMenuOpen(o => !o) : setPopup('email'))}
        aria-label={session ? 'Account' : 'Sign in'}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 50,
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          border: `1px solid ${session ? ACCENT : 'rgba(255,255,255,0.2)'}`,
          background: session ? ACCENT : 'rgba(20,20,20,0.85)',
          color: session ? '#0a0a0a' : '#e5e5e5',
          fontSize: '1.05rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          transition: 'transform 0.15s, background 0.2s',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {session ? initial : (
          // Person glyph
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </button>

      {/* Signed-in menu */}
      {session && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={backdropStyle(false)} />
          <div
            role="menu"
            style={{
              position: 'fixed',
              bottom: '4.25rem',
              right: '1rem',
              zIndex: 60,
              minWidth: '13rem',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.75rem',
              padding: '0.5rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.72rem', color: '#9ca3af' }}>Signed in as</div>
            <div style={{ padding: '0 0.6rem 0.5rem', fontSize: '0.85rem', color: '#e5e5e5', wordBreak: 'break-all' }}>{userEmail}</div>
            <button onClick={signOut} role="menuitem" style={menuItemStyle}>Sign out</button>
          </div>
        </>
      )}

      {/* Centered email popup — grows out of the bubble's corner */}
      {popup !== 'closed' && (
        <>
          <div onClick={() => setPopup('closed')} style={backdropStyle(true)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sign in"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              zIndex: 70,
              width: 'calc(100vw - 2rem)',
              maxWidth: '22rem',
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'bottom right',
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '1rem',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'authPopIn 0.18s ease-out',
            }}
          >
            <style>{`@keyframes authPopIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.85) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }`}</style>

            {popup === 'email' && (
              <form onSubmit={sendMagicLink}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f5f5f5' }}>Save your streak</h2>
                <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  Sign in to appear on the leaderboard and keep your streak across devices.
                </p>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  placeholder="you@email.com"
                  autoComplete="email"
                  style={inputStyle}
                />
                {error && <div style={errorStyle}>{error}</div>}
                <button type="submit" disabled={sending} style={primaryButtonStyle(sending)}>
                  {sending ? 'Sending…' : 'Email me a link'}
                </button>
              </form>
            )}

            {popup === 'sent' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📬</div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f5f5f5' }}>Check your email</h2>
                <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  We sent a sign-in link to <span style={{ color: '#e5e5e5' }}>{email.trim()}</span>. Click it to finish
                  — you can close this once you're signed in.
                </p>
                <button onClick={() => setPopup('email')} style={linkButtonStyle}>Use a different email</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

const backdropStyle = (dim: boolean): React.CSSProperties => ({
  position: 'fixed',
  inset: 0,
  zIndex: dim ? 65 : 55,
  background: dim ? 'rgba(0,0,0,0.5)' : 'transparent',
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.7rem 0.8rem',
  fontSize: '0.95rem',
  color: '#f5f5f5',
  background: '#0e0e0e',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '0.6rem',
  outline: 'none',
}

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  marginTop: '0.75rem',
  padding: '0.7rem',
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#0a0a0a',
  background: ACCENT,
  border: 'none',
  borderRadius: '0.6rem',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.6 : 1,
})

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: ACCENT,
  fontSize: '0.85rem',
  cursor: 'pointer',
  textDecoration: 'underline',
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '0.55rem 0.6rem',
  fontSize: '0.85rem',
  color: '#f87171',
  background: 'none',
  border: 'none',
  borderRadius: '0.5rem',
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  fontSize: '0.78rem',
  color: '#f87171',
}
