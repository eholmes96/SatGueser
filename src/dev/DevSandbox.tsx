import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import citiesV2Json from '../Cities_v2.json'
import { MAPBOX_TOKEN, type Mode, type Difficulty, type CityWithPoints } from '../utils/mapboxUtils'
import { islands, ISLAND_CATEGORIES, type Island } from '../utils/islands'
import { easeOutQuad } from '../utils/easing'
import { resetDailyChallengeStorage } from '../utils/dailyChallengeStorage'

mapboxgl.accessToken = MAPBOX_TOKEN

// Point-of-interest pilot: Cities_v2.json gives every city several candidate
// start coordinates (landmarks) instead of just one, so real rounds vary the
// start point per city (see useGameState's resolveRoundCities). This sandbox
// is for eyeballing/correcting those coordinates against satellite imagery.
type SandboxCity = CityWithPoints
// A sandbox row is either a city (Cities_v2) or an island. They share
// name/displayName/difficulty/mode/points; islands add area/length/hints and
// per-island zoom bounds. Now that the game's Mode includes 'islands', mode no
// longer discriminates the union at the type level, so narrow on isIsland().
type SandboxEntry = SandboxCity | Island
const isIsland = (e: SandboxEntry): e is Island => 'areaKm2' in e
// Sandbox-local mode: the game's Mode plus a dev-only 'islands'. Kept local so
// adding it here never leaks into the game's own mode selector.
type SandboxMode = Mode | 'islands'

const citiesV2 = citiesV2Json as SandboxCity[]

// City reveal defaults. Islands override these per-entry (see DevMapView).
const START_ZOOM = 15
const END_ZOOM = 10
const LEG_DURATION = 30000

const MODES: SandboxMode[] = ['us', 'global', 'islands']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
// Self-contained copy of the game's mode labels — deliberately not imported
// from App.tsx, to keep the sandbox fully decoupled from game components.
const MODE_CONFIG: Record<SandboxMode, { label: string }> = {
  us: { label: 'US Cities' },
  global: { label: 'Global' },
  islands: { label: 'Islands' },
}

const STYLE_OPTIONS = {
  satellite: { label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
  'satellite-streets': { label: 'Satellite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  streets: { label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  outdoors: { label: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  light: { label: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  dark: { label: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
} as const
type StyleKey = keyof typeof STYLE_OPTIONS
const isSatelliteFamily = (key: StyleKey) => key === 'satellite' || key === 'satellite-streets'

const panelStyle: React.CSSProperties = {
  background: 'rgba(10,10,10,0.85)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#eee',
}

const btnStyle: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.25)',
  background: 'rgba(255,255,255,0.1)',
  color: '#fff',
  cursor: 'pointer',
}

function CityPicker({ mode, onModeChange, onSelect }: {
  mode: SandboxMode
  onModeChange: (m: SandboxMode) => void
  onSelect: (entry: SandboxEntry) => void
}) {
  // Islands come from their own dataset with a 4th 'undetermined' bucket; cities
  // keep the usual three difficulties. Both share the mode → category → buttons
  // grouping below (the empty-group guard hides categories with no entries).
  const isIslands = mode === 'islands'
  const entries: SandboxEntry[] = isIslands ? islands : citiesV2
  const categories: string[] = isIslands ? ISLAND_CATEGORIES : DIFFICULTIES

  // Lets a tester replay the Daily Challenge without waiting for the real
  // midnight-ET rollover — clears the localStorage record entirely (today's
  // completion AND the streak). Only reachable from this dev-only screen.
  const [dailyReset, setDailyReset] = useState(false)
  const handleResetDaily = useCallback(() => {
    resetDailyChallengeStorage()
    setDailyReset(true)
    setTimeout(() => setDailyReset(false), 1500)
  }, [])

  return (
    // height (not minHeight) + its own overflowY:auto makes this scrollable
    // on its own terms — #root/html/body are overflow:hidden globally (for
    // the game's mobile-keyboard fix), so this can't rely on page-level
    // scroll and has to be a self-contained scroll container.
    <div style={{
      height: '100dvh',
      width: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto',
      padding: '2rem',
      background: '#111',
      color: '#eee',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
          SatGueser Dev Sandbox
        </h1>
        <button onClick={handleResetDaily} style={btnStyle}>
          {dailyReset ? 'Daily Challenge reset!' : 'Reset Daily Challenge'}
        </button>
      </div>

      {/* Mode filter — same visual pattern as the game's US/Global toggle,
          reimplemented locally rather than imported from App.tsx. */}
      <div style={{
        display: 'inline-flex',
        gap: '0.25rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: 4,
        borderRadius: 999,
        marginBottom: '1.5rem',
      }}>
        {MODES.map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            style={{
              padding: '0.35rem 1rem',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: mode === m ? '#fff' : 'transparent',
              color: mode === m ? '#111' : '#aaa',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      {categories.map(category => {
        const filtered = entries.filter(c => c.mode === mode && c.difficulty === category)
        if (filtered.length === 0) return null
        return (
          <div key={category} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#aaa', margin: '0 0 0.5rem' }}>
              {category} ({filtered.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {filtered.map(entry => (
                <button
                  key={entry.name}
                  onClick={() => onSelect(entry)}
                  style={{
                    ...btnStyle,
                    padding: '0.5rem 0.9rem',
                  }}
                >
                  {entry.displayName}
                  {isIsland(entry) && (
                    <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 5 }}>
                      {entry.lengthKm ? `${entry.lengthKm} km` : `${Math.round(entry.areaKm2 / 1000)}k km²`}
                    </span>
                  )}
                  {!isIsland(entry) && entry.points.length > 1 && (
                    <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 5 }}>×{entry.points.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DevMapView({ city, onExit }: { city: SandboxEntry; onExit: () => void }) {
  // Per-island reveal bounds when previewing an island; cities keep the shared
  // 15→10 defaults. Everything below reads these (via refs, so the RAF closures
  // stay fresh) instead of the old module-level START_ZOOM/END_ZOOM constants.
  const initialStart = isIsland(city) ? city.startZoom : START_ZOOM
  const initialEnd = isIsland(city) ? city.endZoom : END_ZOOM

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const rafRef = useRef<number>(0)
  // Which of city.points is currently loaded. Doesn't remount the map (the
  // creation effect below only keys off city.name) — selectPoint() re-centers
  // the existing map instance instead, so switching points feels instant.
  const [pointIndex, setPointIndex] = useState(0)
  const point = city.points[pointIndex]
  // 1 = zooming out (decreasing, heading toward endZoom), -1 = zooming in
  // (increasing, heading toward startZoom). Preserved across pause/resume
  // and drag so a resume from mid-band continues the same direction.
  const directionRef = useRef<1 | -1>(1)
  // The single source of truth for "what zoom is the map at right now" —
  // tick() is a stable useCallback closure, so it can never read fresh
  // React state; every read/write of the live zoom goes through this ref.
  const zoomRef = useRef(initialStart)
  // Editable reveal bounds (islands only, via the Set start/end buttons). Held
  // in refs too so the RAF leg math reads the current values, not a stale close.
  const [startZoom, setStartZoom] = useState(initialStart)
  const [endZoom, setEndZoom] = useState(initialEnd)
  const startZoomRef = useRef(initialStart)
  const endZoomRef = useRef(initialEnd)
  useEffect(() => { startZoomRef.current = startZoom }, [startZoom])
  useEffect(() => { endZoomRef.current = endZoom }, [endZoom])
  // Slider travel: the reveal band plus manual-inspection headroom on each side.
  const sliderMin = Math.min(startZoom, endZoom) - 2
  const sliderMax = Math.max(startZoom, endZoom) + 3
  // Timestamp anchor + start/end/duration for the CURRENT leg. A "leg" is
  // recomputed fresh every time playback (re)starts (via startLeg()), so
  // resuming from a manual drag or an interrupted mid-band position both
  // just become "a leg from wherever we are now to the relevant edge."
  const legStartRef = useRef<number | null>(null)
  const legStartZoomRef = useRef(initialStart)
  const legEndZoomRef = useRef(initialEnd)
  const legDurationRef = useRef(LEG_DURATION)

  const [lat, setLat] = useState(point.lat)
  const [lng, setLng] = useState(point.lng)
  const centerRef = useRef({ lat, lng })
  useEffect(() => { centerRef.current = { lat, lng } }, [lat, lng])

  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const [liveZoom, setLiveZoom] = useState(initialStart)
  const [liveCenter, setLiveCenter] = useState({ lat, lng })
  const [copied, setCopied] = useState(false)
  const [styleKey, setStyleKey] = useState<StyleKey>('satellite')

  // Applies a zoom to the map and mirrors it into zoomRef/liveZoom — the
  // one place that actually writes the "current zoom" everywhere it lives.
  const applyZoom = useCallback((zoom: number) => {
    const map = mapRef.current
    if (!map) return
    const lo = Math.min(startZoomRef.current, endZoomRef.current) - 2
    const hi = Math.max(startZoomRef.current, endZoomRef.current) + 3
    const clamped = Math.min(Math.max(zoom, lo), hi)
    map.setZoom(clamped)
    zoomRef.current = clamped
    setLiveZoom(clamped)
    const c = map.getCenter()
    setLiveCenter({ lat: c.lat, lng: c.lng })
  }, [])

  // Starts a fresh leg from the current zoom toward the edge implied by
  // directionRef (END_ZOOM if zooming out, START_ZOOM if zooming in), at
  // the same rate as the normal 30s/5-zoom-level loop — so a rejoin leg
  // from e.g. 17 down to 15 takes proportionally less time, then the very
  // next leg (15 -> 10) is the classic full-length loop, forever after.
  const startLeg = useCallback(() => {
    const from = zoomRef.current
    const to = directionRef.current === 1 ? endZoomRef.current : startZoomRef.current
    const fullSpan = startZoomRef.current - endZoomRef.current
    legStartZoomRef.current = from
    legEndZoomRef.current = to
    legDurationRef.current = fullSpan === 0 ? LEG_DURATION : LEG_DURATION * Math.abs(to - from) / fullSpan
    legStartRef.current = null
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tick = useCallback((timestamp: number) => {
    const map = mapRef.current
    if (!map) return

    if (legStartRef.current === null) legStartRef.current = timestamp
    const elapsed = timestamp - legStartRef.current
    const duration = legDurationRef.current || 1
    const t = Math.min(elapsed / duration, 1)
    const eased = easeOutQuad(t)
    const zoom = legStartZoomRef.current + (legEndZoomRef.current - legStartZoomRef.current) * eased
    applyZoom(zoom)

    if (t >= 1) {
      directionRef.current = directionRef.current === 1 ? -1 : 1
      startLeg()
      return
    }
    rafRef.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyZoom])

  // Create one map instance for this city, torn down on unmount (exit / city switch).
  useEffect(() => {
    if (!containerRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_OPTIONS.satellite.url,
      center: [centerRef.current.lng, centerRef.current.lat],
      zoom: startZoomRef.current,
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
    mapRef.current = map

    map.once('load', () => {
      legStartZoomRef.current = startZoomRef.current
      legEndZoomRef.current = endZoomRef.current
      legDurationRef.current = LEG_DURATION
      rafRef.current = requestAnimationFrame(tick)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.name])

  // Re-center immediately when the lat/lng inputs are edited, without
  // disturbing the zoom animation loop (which only ever touches zoom).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.jumpTo({ center: [lng, lat], zoom: map.getZoom() })
  }, [lat, lng])

  // Single pause state drives both the slider's play/pause button and
  // (previously) the separate top-right control — consolidated into one.
  const handlePauseToggle = () => {
    if (paused) {
      // Resume direction rules: >=15 -> out, <=10 -> in, otherwise preserve
      // whatever direction was already in progress when interrupted.
      if (zoomRef.current >= startZoomRef.current) directionRef.current = 1
      else if (zoomRef.current <= endZoomRef.current) directionRef.current = -1
      setPaused(false)
      startLeg()
    } else {
      cancelAnimationFrame(rafRef.current)
      setPaused(true)
    }
  }

  // Manual drag: pause immediately and hold at exactly the dragged zoom.
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelAnimationFrame(rafRef.current)
    setPaused(true)
    applyZoom(Number(e.target.value))
  }

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current)
    directionRef.current = 1
    const map = mapRef.current
    if (map) {
      map.jumpTo({ center: [centerRef.current.lng, centerRef.current.lat], zoom: startZoomRef.current })
    }
    zoomRef.current = startZoomRef.current
    setLiveZoom(startZoomRef.current)
    setPaused(false)
    startLeg()
  }

  // Jumps to a different point on the SAME city (map instance stays put —
  // see the pointIndex comment above) and restarts the reveal from
  // START_ZOOM, mirroring handleReset but for the newly selected point.
  const selectPoint = (index: number) => {
    const p = city.points[index]
    if (!p) return
    setPointIndex(index)
    setLat(p.lat)
    setLng(p.lng)
    centerRef.current = { lat: p.lat, lng: p.lng }
    cancelAnimationFrame(rafRef.current)
    directionRef.current = 1
    const map = mapRef.current
    if (map) {
      map.jumpTo({ center: [p.lng, p.lat], zoom: startZoomRef.current })
    }
    zoomRef.current = startZoomRef.current
    setLiveZoom(startZoomRef.current)
    setPaused(false)
    startLeg()
  }

  const round1 = (v: number) => Math.round(v * 10) / 10

  // Islands: capture the currently-framed zoom as the new start/end bound, so a
  // reveal can be tuned by scrubbing the slider and read back via Copy JSON.
  const captureStart = () => { const z = round1(liveZoom); setStartZoom(z); startZoomRef.current = z }
  const captureEnd = () => { const z = round1(liveZoom); setEndZoom(z); endZoomRef.current = z }

  const handleCopyJson = async () => {
    const text = isIsland(city)
      ? JSON.stringify({
          name: city.name,
          displayName: city.displayName,
          difficulty: city.difficulty,
          mode: 'islands',
          areaKm2: city.areaKm2,
          lengthKm: city.lengthKm,
          lists: city.lists,
          startZoom,
          endZoom,
          hints: city.hints,
          points: [{ label: point.label, lat, lng }],
        }, null, 2)
      : `{ "label": "${point.label}", "lat": ${lat}, "lng": ${lng} }`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Shared by both the style dropdown and the labels toggle. setStyle()
  // tears down and rebuilds the map's style, so the camera has to be
  // re-applied on style.load (not assumed to survive), and the RAF loop
  // is explicitly cancelled before restarting to avoid ever running two
  // loops at once across the swap.
  const changeStyle = (key: StyleKey) => {
    const map = mapRef.current
    if (!map) return
    setStyleKey(key)
    cancelAnimationFrame(rafRef.current)
    map.setStyle(STYLE_OPTIONS[key].url)
    map.once('style.load', () => {
      map.jumpTo({ center: [centerRef.current.lng, centerRef.current.lat], zoom: zoomRef.current })
      cancelAnimationFrame(rafRef.current)
      if (!pausedRef.current) startLeg()
    })
  }

  const handleLabelsToggle = () => {
    if (!isSatelliteFamily(styleKey)) return
    changeStyle(styleKey === 'satellite' ? 'satellite-streets' : 'satellite')
  }

  const showHighZoomNote = liveZoom > startZoom && isSatelliteFamily(styleKey)
  const labelsOn = styleKey === 'satellite-streets'
  const labelsToggleEnabled = isSatelliteFamily(styleKey)

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', background: '#111' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Exit */}
      <button
        onClick={onExit}
        style={{
          ...panelStyle,
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          width: 36,
          height: 36,
          fontSize: 18,
          lineHeight: '36px',
          textAlign: 'center',
          padding: 0,
          cursor: 'pointer',
        }}
        aria-label="Exit to city picker"
      >
        ×
      </button>

      {/* Point switcher — only shown for multi-point (Cities_v2.json)
          cities. Each button re-centers the SAME map instance on that
          point (see selectPoint) rather than remounting. */}
      {city.points.length > 1 && (
        <div style={{
          ...panelStyle,
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.5rem',
          display: 'flex',
          gap: '0.4rem',
        }}>
          {city.points.map((p, i) => (
            <button
              key={p.label + i}
              onClick={() => selectPoint(i)}
              style={{
                ...btnStyle,
                background: i === pointIndex ? '#fff' : 'rgba(255,255,255,0.1)',
                color: i === pointIndex ? '#111' : '#fff',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Right-side column: style/labels/reset controls, then the vertical
          zoom slider with its play/pause button. Kept in one flex column
          so nothing needs a guessed pixel offset to avoid overlapping. */}
      <div style={{
        ...panelStyle,
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <select
          value={styleKey}
          onChange={e => changeStyle(e.target.value as StyleKey)}
          style={{
            width: '100%',
            padding: '0.35rem',
            background: '#1a1a1a',
            border: '1px solid #555',
            borderRadius: 4,
            color: '#eee',
            fontSize: 12,
          }}
        >
          {Object.entries(STYLE_OPTIONS).map(([key, opt]) => (
            <option key={key} value={key}>{opt.label}</option>
          ))}
        </select>

        <button
          onClick={handleLabelsToggle}
          disabled={!labelsToggleEnabled}
          style={{
            ...btnStyle,
            width: '100%',
            opacity: labelsToggleEnabled ? 1 : 0.4,
            cursor: labelsToggleEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          Labels: {labelsOn ? 'On' : 'Off'}
        </button>

        <button onClick={handleReset} style={{ ...btnStyle, width: '100%' }}>
          Reset
        </button>

        <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '0.2rem 0' }} />

        <button onClick={handlePauseToggle} style={{ ...btnStyle, width: '100%' }}>
          {paused ? 'Play' : 'Pause'}
        </button>

        {/* Vertical slider: zoom SLIDER_MAX at top, SLIDER_MIN at bottom.
            Built by rotating a normal horizontal range input, positioned
            absolutely centered in a box sized to the POST-rotation footprint. */}
        <div style={{ position: 'relative', width: 28, height: 220 }}>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={0.1}
            value={liveZoom}
            onChange={handleSliderChange}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 220,
              height: 24,
              margin: 0,
              transform: 'translate(-50%, -50%) rotate(-90deg)',
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontFamily: 'ui-monospace, Consolas, monospace' }}>
          {liveZoom.toFixed(1)}
        </span>
      </div>

      {/* Live info + editable coordinates */}
      <div style={{
        ...panelStyle,
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        padding: '1rem',
        minWidth: 240,
        fontSize: 13,
        fontFamily: 'ui-monospace, Consolas, monospace',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
          {city.displayName}
        </div>
        {city.points.length > 1 && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7dd3fc' }}>
            {point.label} ({pointIndex + 1}/{city.points.length})
          </div>
        )}
        <div>difficulty: {city.difficulty}</div>
        <div>mode: {city.mode}</div>
        {isIsland(city) && (
          <>
            <div>area: {city.areaKm2.toLocaleString()} km²</div>
            {city.lengthKm != null && <div>length: {city.lengthKm.toLocaleString()} km</div>}
            <div>lists: {city.lists.join(', ')}</div>
            <div>zoom range: {startZoom} → {endZoom}</div>
          </>
        )}
        <div>zoom: {liveZoom.toFixed(2)}</div>
        <div>center: {liveCenter.lat.toFixed(4)}, {liveCenter.lng.toFixed(4)}</div>

        {showHighZoomNote && (
          <div style={{ color: '#f59e0b', fontSize: 11, maxWidth: 220 }}>
            High zoom — satellite tiles may be blurry (imagery limit, not a bug).
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            lat
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) setLat(v)
              }}
              style={{
                width: 90,
                padding: '0.3rem',
                background: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: 4,
                color: '#eee',
                fontFamily: 'inherit',
                fontSize: 12,
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            lng
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) setLng(v)
              }}
              style={{
                width: 90,
                padding: '0.3rem',
                background: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: 4,
                color: '#eee',
                fontFamily: 'inherit',
                fontSize: 12,
              }}
            />
          </label>
        </div>

        {isIsland(city) && (
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
            <button onClick={captureStart} style={{ ...btnStyle, flex: 1, fontSize: 11, padding: '0.4rem 0.5rem' }}>
              Set start = {liveZoom.toFixed(1)}
            </button>
            <button onClick={captureEnd} style={{ ...btnStyle, flex: 1, fontSize: 11, padding: '0.4rem 0.5rem' }}>
              Set end = {liveZoom.toFixed(1)}
            </button>
          </div>
        )}
        <button onClick={handleCopyJson} style={{ ...btnStyle, marginTop: '0.4rem' }}>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
    </div>
  )
}

export function DevSandbox() {
  // Lifted out of CityPicker so it survives returning from the map view —
  // CityPicker unmounts entirely while a city is selected, so state living
  // inside it would otherwise reset back to 'us' every time.
  const [mode, setMode] = useState<SandboxMode>('us')
  const [selectedCity, setSelectedCity] = useState<SandboxEntry | null>(null)

  if (!selectedCity) {
    return <CityPicker mode={mode} onModeChange={setMode} onSelect={setSelectedCity} />
  }

  return (
    <DevMapView
      key={selectedCity.name}
      city={selectedCity}
      onExit={() => setSelectedCity(null)}
    />
  )
}
