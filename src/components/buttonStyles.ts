import type { CSSProperties } from 'react'

// Translucent secondary button (Next Round, Copy Result, ...).
export const secondaryButtonStyle: CSSProperties = {
  padding: '0.55rem 1.5rem',
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  cursor: 'pointer',
}

// Solid white primary button; callers pick the size via padding/fontSize/radius.
const primaryButton = (padding: string, fontSize: number, borderRadius: number): CSSProperties => ({
  padding,
  fontSize,
  fontWeight: 600,
  borderRadius,
  border: 'none',
  background: '#fff',
  color: '#111',
  cursor: 'pointer',
})

// Title-screen CTAs (Start Game, Play Daily Challenge).
export const primaryButtonLargeStyle = primaryButton('0.8rem 2.5rem', 18, 10)
// Game-over "Back to Menu", next to the secondary Copy Result button.
export const primaryButtonCompactStyle = primaryButton('0.55rem 1.5rem', 15, 8)
// Game-over "Play Again".
export const primaryButtonWideStyle = primaryButton('0.7rem 2.5rem', 15, 10)
