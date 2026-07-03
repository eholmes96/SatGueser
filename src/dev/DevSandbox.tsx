import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import allCitiesJson from '../cities.json'
import testCitiesJson from '../testCities.json'
import { MAPBOX_TOKEN, type City, type Mode, type Difficulty, type CityWithPoints } from '../utils/mapboxUtils'
import { easeOutQuad } from '../utils/easing'

mapboxgl.accessToken = MAPBOX_TOKEN

const allCities = allCitiesJson as City[]

// Point-of-interest pilot: testCities.json gives every city several candidate
// start coordinates (landmarks) instead of just one, so real rounds vary the
// start point per city (see useGameState's resolveRoundCities). This sandbox
// is for eyeballing/correcting those coordinates against satellite imagery.
type SandboxCity = CityWithPoints
type Dataset = 'test' | 'all'

const testCities = testCitiesJson as SandboxCity[]
// cities.json entries only ever had one coordinate — normalized to the same
// { points } shape as testCities so CityPicker/DevMapView don't need to
// branch on which dataset they're rendering.
const allCitiesNormalized: SandboxCity[] = allCities.map(c => ({
  name: c.name,
  displayName: c.displayName,
  difficulty: c.difficulty,
  mode: c.mode,
  country: c.country,
  points: [{ label: 'Center', lat: c.lat, lng: c.lng }],
}))

const START_ZOOM = 15
const END_ZOOM = 10
const LEG_DURATION = 30000
// Manual-inspection headroom — the auto-loop never travels here on its own,
// only reachable by dragging the slider. See DevMapView's startLeg().
const SLIDER_MIN = 8
const SLIDER_MAX = 18

const MODES: Mode[] = ['us', 'global']
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
// Self-contained copy of the game's mode labels — deliberately not imported
// from App.tsx, to keep the sandbox fully decoupled from game components.
const MODE_CONFIG: Record<Mode, { label: string }> = {
  us: { label: 'US Cities' },
  global: { label: 'Global' },
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

function CityPicker({ dataset, onDatasetChange, onSelect }: {
  dataset: Dataset
  onDatasetChange: (d: Dataset) => void
  onSelect: (city: SandboxCity) => void
}) {
  const [mode, setMode] = useState<Mode>('us')
  const cities = dataset === 'test' ? testCities : allCitiesNormalized

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
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.75rem', fontWeight: 800 }}>
        SatGueser Dev Sandbox
      </h1>

      {/* Dataset toggle — testCities.json (multi-point pilot) vs the
          production cities.json (single point each), normalized above so
          the rest of this component doesn't care which one is active. */}
      <div style={{
        display: 'inline-flex',
        gap: '0.25rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: 4,
        borderRadius: 999,
        marginBottom: '0.75rem',
      }}>
        {([['test', `Test Points (${testCities.length})`], ['all', `All Cities (${allCitiesNormalized.length})`]] as const).map(([d, label]) => (
          <button
            key={d}
            onClick={() => onDatasetChange(d)}
            style={{
              padding: '0.35rem 1rem',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              background: dataset === d ? '#fff' : 'transparent',
              color: dataset === d ? '#111' : '#aaa',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
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
            onClick={() => setMode(m)}
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

      {DIFFICULTIES.map(difficulty => {
        const filtered = cities.filter(c => c.mode === mode && c.difficulty === difficulty)
        if (filtered.length === 0) return null
        return (
          <div key={difficulty} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#aaa', margin: '0 0 0.5rem' }}>
              {difficulty} ({filtered.length})
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {filtered.map(city => (
                <button
                  key={city.name}
                  onClick={() => onSelect(city)}
                  style={{
                    ...btnStyle,
                    padding: '0.5rem 0.9rem',
                  }}
                >
                  {city.displayName}
                  {city.points.length > 1 && (
                    <span style={{ opacity: 0.55, fontSize: 11, marginLeft: 5 }}>×{city.points.length}</span>
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

function DevMapView({ city, onExit }: { city: SandboxCity; onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const rafRef = useRef<number>(0)
  // Which of city.points is currently loaded. Doesn't remount the map (the
  // creation effect below only keys off city.name) — selectPoint() re-centers
  // the existing map instance instead, so switching points feels instant.
  const [pointIndex, setPointIndex] = useState(0)
  const point = city.points[pointIndex]
  // 1 = zooming out (decreasing, heading toward END_ZOOM), -1 = zooming in
  // (increasing, heading toward START_ZOOM). Preserved across pause/resume
  // and drag so a resume from mid-band continues the same direction.
  const directionRef = useRef<1 | -1>(1)
  // The single source of truth for "what zoom is the map at right now" —
  // tick() is a stable useCallback closure, so it can never read fresh
  // React state; every read/write of the live zoom goes through this ref.
  const zoomRef = useRef(START_ZOOM)
  // Timestamp anchor + start/end/duration for the CURRENT leg. A "leg" is
  // recomputed fresh every time playback (re)starts (via startLeg()), so
  // resuming from a manual drag or an interrupted mid-band position both
  // just become "a leg from wherever we are now to the relevant edge."
  const legStartRef = useRef<number | null>(null)
  const legStartZoomRef = useRef(START_ZOOM)
  const legEndZoomRef = useRef(END_ZOOM)
  const legDurationRef = useRef(LEG_DURATION)

  const [lat, setLat] = useState(point.lat)
  const [lng, setLng] = useState(point.lng)
  const centerRef = useRef({ lat, lng })
  useEffect(() => { centerRef.current = { lat, lng } }, [lat, lng])

  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const [liveZoom, setLiveZoom] = useState(START_ZOOM)
  const [liveCenter, setLiveCenter] = useState({ lat, lng })
  const [copied, setCopied] = useState(false)
  const [styleKey, setStyleKey] = useState<StyleKey>('satellite')

  // Applies a zoom to the map and mirrors it into zoomRef/liveZoom — the
  // one place that actually writes the "current zoom" everywhere it lives.
  const applyZoom = useCallback((zoom: number) => {
    const map = mapRef.current
    if (!map) return
    const clamped = Math.min(Math.max(zoom, SLIDER_MIN), SLIDER_MAX)
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
    const to = directionRef.current === 1 ? END_ZOOM : START_ZOOM
    const fullSpan = START_ZOOM - END_ZOOM
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
      zoom: START_ZOOM,
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
      legStartZoomRef.current = START_ZOOM
      legEndZoomRef.current = END_ZOOM
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
      if (zoomRef.current >= START_ZOOM) directionRef.current = 1
      else if (zoomRef.current <= END_ZOOM) directionRef.current = -1
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
      map.jumpTo({ center: [centerRef.current.lng, centerRef.current.lat], zoom: START_ZOOM })
    }
    zoomRef.current = START_ZOOM
    setLiveZoom(START_ZOOM)
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
      map.jumpTo({ center: [p.lng, p.lat], zoom: START_ZOOM })
    }
    zoomRef.current = START_ZOOM
    setLiveZoom(START_ZOOM)
    setPaused(false)
    startLeg()
  }

  const handleCopyJson = async () => {
    // Multi-point (testCities.json) entries copy as a full point object
    // (with label) ready to paste back into the points array; single-point
    // (cities.json) entries keep the old flat lat/lng fragment.
    const text = city.points.length > 1
      ? `{ "label": "${point.label}", "lat": ${lat}, "lng": ${lng} }`
      : `"lat": ${lat}, "lng": ${lng}`
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

  const showHighZoomNote = liveZoom > START_ZOOM && isSatelliteFamily(styleKey)
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

      {/* Point switcher — only shown for multi-point (testCities.json)
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
            min={SLIDER_MIN}
            max={SLIDER_MAX}
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

        <button onClick={handleCopyJson} style={{ ...btnStyle, marginTop: '0.4rem' }}>
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
    </div>
  )
}

export function DevSandbox() {
  const [dataset, setDataset] = useState<Dataset>('test')
  const [selectedCity, setSelectedCity] = useState<SandboxCity | null>(null)

  if (!selectedCity) {
    return <CityPicker dataset={dataset} onDatasetChange={setDataset} onSelect={setSelectedCity} />
  }

  return (
    <DevMapView
      // dataset is part of the key because both datasets can contain a city
      // with the same `name` (e.g. "new-york") but different points.
      key={`${dataset}-${selectedCity.name}`}
      city={selectedCity}
      onExit={() => setSelectedCity(null)}
    />
  )
}
