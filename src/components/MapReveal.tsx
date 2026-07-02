import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { MAPBOX_TOKEN, type City } from '../utils/mapboxUtils'
import { easeOutQuad } from '../utils/easing'

mapboxgl.accessToken = MAPBOX_TOKEN

const START_ZOOM = 15
const END_ZOOM = 10

// Time to let the first tiles paint after the camera snap before the round
// timer/zoom animation begins — replaces the old full-image preload wait.
const SETTLE_DELAY = 500

interface MapRevealProps {
  city: City | undefined
  // Incremented by the parent exactly once per round start. The map is a
  // single persistent instance, so we can't rely on `city` identity alone
  // to detect a new round (the same city can recur across separate games).
  roundToken: number
  duration?: number
  onRoundStart?: () => void
  onAnimationComplete?: () => void
  onError?: (message: string) => void
  debug?: boolean
}

export function MapReveal({ city, roundToken, duration = 30000, onRoundStart, onAnimationComplete, onError, debug }: MapRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const rafRef = useRef<number>(0)
  const settleTimerRef = useRef<number>(0)
  // Set exactly once, on the map's one-and-only 'load' event. We deliberately
  // don't use map.loaded() to gate later rounds — that reflects "style loaded
  // AND current-viewport tiles loaded AND no transition in progress", which
  // can go false again after any jumpTo. Since 'load' never fires a second
  // time, waiting on it again would stall that round's camera jump forever.
  const styleReadyRef = useRef(false)
  const [debugInfo, setDebugInfo] = useState({ lng: 0, lat: 0, zoom: 0 })

  const cityRef = useRef(city)
  useEffect(() => { cityRef.current = city }, [city])
  const onRoundStartRef = useRef(onRoundStart)
  useEffect(() => { onRoundStartRef.current = onRoundStart }, [onRoundStart])
  const onAnimationCompleteRef = useRef(onAnimationComplete)
  useEffect(() => { onAnimationCompleteRef.current = onAnimationComplete }, [onAnimationComplete])
  const onErrorRef = useRef(onError)
  useEffect(() => { onErrorRef.current = onError }, [onError])

  // Initialize ONE map instance for the lifetime of the app — this is the
  // only Mapbox "map load" the whole game session incurs.
  useEffect(() => {
    if (!containerRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: [0, 20],
      zoom: 1,
      attributionControl: false,
      interactive: false,
      dragPan: false,
      scrollZoom: false,
      boxZoom: false,
      dragRotate: false,
      keyboard: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
    })
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.once('load', () => { styleReadyRef.current = true })
    map.on('error', (e) => {
      onErrorRef.current?.(`MAP_ERR: ${e.error?.message ?? 'unknown map error'}`)
    })
    mapRef.current = map

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(settleTimerRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Snap to the round's city and run the zoom-out reveal — fires exactly
  // once per round via roundToken, independent of whether the city repeats.
  useEffect(() => {
    if (roundToken === 0) return
    const map = mapRef.current
    const activeCity = cityRef.current
    if (!map || !activeCity) {
      onErrorRef.current?.(`ROUND_START_NO_TARGET: map=${!!map} city=${!!activeCity} token=${roundToken}`)
      return
    }

    cancelAnimationFrame(rafRef.current)
    clearTimeout(settleTimerRef.current)

    const beginRound = () => {
      map.jumpTo({ center: [activeCity.lng, activeCity.lat], zoom: START_ZOOM })

      settleTimerRef.current = window.setTimeout(() => {
        onRoundStartRef.current?.()

        let startTime: number | null = null
        const tick = (timestamp: number) => {
          if (startTime === null) startTime = timestamp
          const elapsed = timestamp - startTime
          const t = Math.min(elapsed / duration, 1)
          const eased = easeOutQuad(t)
          map.setZoom(START_ZOOM - eased * (START_ZOOM - END_ZOOM))

          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick)
          } else {
            onAnimationCompleteRef.current?.()
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }, SETTLE_DELAY)
    }

    if (styleReadyRef.current) {
      beginRound()
    } else {
      map.once('load', () => {
        styleReadyRef.current = true
        beginRound()
      })
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(settleTimerRef.current)
    }
  }, [roundToken, duration])

  // Diagnostic readout only — polls the map's live center/zoom so a stalled
  // round (state advanced but the camera didn't move) is visible on screen.
  useEffect(() => {
    if (!debug) return
    const id = window.setInterval(() => {
      const map = mapRef.current
      if (!map) return
      const c = map.getCenter()
      setDebugInfo({ lng: c.lng, lat: c.lat, zoom: map.getZoom() })
    }, 300)
    return () => clearInterval(id)
  }, [debug])

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {debug && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#0f0',
          background: 'rgba(0,0,0,0.6)',
          padding: '4px 8px',
          borderRadius: 4,
          zIndex: 999,
        }}>
          token={roundToken} city={cityRef.current?.name ?? 'none'} styleReady={String(styleReadyRef.current)}
          <br />
          map: {debugInfo.lat.toFixed(3)},{debugInfo.lng.toFixed(3)} z{debugInfo.zoom.toFixed(2)}
        </div>
      )}
    </div>
  )
}
