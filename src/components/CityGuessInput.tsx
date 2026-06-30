import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import { US_CITIES } from '../data/usCities'

const MAX_SUGGESTIONS = 8
const MIN_CHARS = 3

function getSuggestions(query: string): string[] {
  if (query.length < MIN_CHARS) return []
  const q = query.toLowerCase()
  const prefix: string[] = []
  const contains: string[] = []
  for (const city of US_CITIES) {
    const c = city.toLowerCase()
    if (c.startsWith(q)) prefix.push(city)
    else if (c.includes(q)) contains.push(city)
  }
  return [...prefix, ...contains].slice(0, MAX_SUGGESTIONS)
}

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <strong>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  )
}

interface CityGuessInputProps {
  onSubmit: (city: string) => boolean
  disabled?: boolean
}

export function CityGuessInput({ onSubmit, disabled }: CityGuessInputProps) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlightedIdx, setHighlightedIdx] = useState(0)
  const [wrongFeedback, setWrongFeedback] = useState(false)
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const shakeTimerRef = useRef<number>(0)

  useEffect(() => {
    const results = getSuggestions(value)
    setSuggestions(results)
    setHighlightedIdx(0)
  }, [value])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[highlightedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx])

  const triggerShake = useCallback(() => {
    clearTimeout(shakeTimerRef.current)
    setShaking(false)
    // Reset on next tick so re-triggering restarts the animation
    requestAnimationFrame(() => {
      setWrongFeedback(true)
      setShaking(true)
      shakeTimerRef.current = window.setTimeout(() => {
        setShaking(false)
        setWrongFeedback(false)
      }, 500)
    })
  }, [])

  useEffect(() => () => clearTimeout(shakeTimerRef.current), [])

  const accept = useCallback((city: string) => {
    setSuggestions([])
    setHighlightedIdx(0)
    const isCorrect = onSubmit(city)
    if (isCorrect) {
      setValue('')
    } else {
      triggerShake()
    }
    inputRef.current?.focus()
  }, [onSubmit, triggerShake])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIdx(i => Math.max(i - 1, 0))
        break
      case 'Tab':
      case 'Enter':
        e.preventDefault()
        accept(suggestions[highlightedIdx])
        break
      case 'Escape':
        setSuggestions([])
        break
    }
  }

  return (
    <div style={{
      position: 'relative',
      width: 320,
      animation: shaking ? 'shake 0.45s ease-in-out' : 'none',
    }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type a city name…"
        autoComplete="off"
        spellCheck={false}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          fontSize: 16,
          boxSizing: 'border-box',
          border: wrongFeedback ? '1px solid #ef4444' : '1px solid #555',
          borderRadius: suggestions.length > 0 ? '4px 4px 0 0' : 4,
          background: wrongFeedback ? 'rgba(239,68,68,0.15)' : '#1a1a1a',
          color: '#eee',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      />

      {suggestions.length > 0 && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#1a1a1a',
            border: '1px solid #555',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            zIndex: 20,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((city, i) => (
            <li
              key={city}
              onMouseDown={e => { e.preventDefault(); accept(city) }}
              onMouseEnter={() => setHighlightedIdx(i)}
              style={{
                padding: '0.45rem 0.75rem',
                cursor: 'pointer',
                fontSize: 15,
                color: '#eee',
                background: i === highlightedIdx ? '#2d4a7a' : 'transparent',
                borderTop: i > 0 ? '1px solid #2a2a2a' : 'none',
              }}
            >
              <Highlight text={city} query={value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
