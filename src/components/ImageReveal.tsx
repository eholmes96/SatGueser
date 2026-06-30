import { useEffect, useRef, useState } from 'react'
import { buildMapboxStaticUrl, type City } from '../utils/mapboxUtils'
import { easeOutQuad } from '../utils/easing'

const ZOOM_LEVELS = [15, 14, 13, 12, 11, 10]
const IMAGE_SIZE = 640

export function getFrameIndexForElapsedTime(
  elapsed: number,
  duration: number,
  numFrames = ZOOM_LEVELS.length,
): number {
  const t = Math.min(elapsed / duration, 1)
  const easedT = easeOutQuad(t)
  return Math.min(Math.floor(easedT * numFrames), numFrames - 1)
}

interface ImageRevealProps {
  city: City
  duration?: number
}

export function ImageReveal({ city, duration = 30000 }: ImageRevealProps) {
  const [loaded, setLoaded] = useState(false)
  const frameRefs = useRef<(HTMLImageElement | null)[]>([])
  const rafRef = useRef<number>(0)

  const urls = ZOOM_LEVELS.map((z) =>
    buildMapboxStaticUrl(city, z, IMAGE_SIZE, IMAGE_SIZE, true),
  )

  useEffect(() => {
    setLoaded(false)
    let count = 0
    const imgs = urls.map((url) => {
      const img = new Image()
      img.onload = () => {
        count++
        if (count === urls.length) setLoaded(true)
      }
      img.src = url
      return img
    })
    return () => { imgs.forEach((img) => { img.onload = null }) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.name])

  useEffect(() => {
    if (!loaded) return

    const numFrames = ZOOM_LEVELS.length

    frameRefs.current.forEach((img, i) => {
      if (!img) return
      img.style.opacity = i === 0 ? '1' : '0'
      img.style.transform = 'scale(1)'
    })

    let startTime: number | null = null
    let lastFloorP = 0

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const elapsed = timestamp - startTime
      const t = Math.min(elapsed / duration, 1)

      const progress = easeOutQuad(t) * (numFrames - 1)
      const floorP = Math.min(Math.floor(progress), numFrames - 1)
      const fp = progress - floorP

      // Hide the outgoing primary frame only once we've moved past it.
      // This avoids any overlap period where both frames are semi-transparent.
      if (floorP !== lastFloorP) {
        const old = frameRefs.current[lastFloorP]
        if (old) old.style.opacity = '0'
        lastFloorP = floorP
      }

      // Primary frame: fully visible, natural scale
      const cur = frameRefs.current[floorP]
      if (cur) {
        cur.style.opacity = '1'
        cur.style.transform = 'scale(1)'
      }

      // Incoming frame: fully opaque and zooms from 2× to 1×.
      // At scale(2) it covers exactly the same geographic area as the primary
      // frame at scale(1), so it appears seamlessly on top with no ghosting.
      const nextIdx = floorP + 1
      if (nextIdx < numFrames) {
        const next = frameRefs.current[nextIdx]
        if (next) {
          next.style.opacity = '1'
          next.style.transform = `scale(${2 - fp})`
        }
      }

      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loaded, duration])

  if (!loaded) {
    return (
      <div style={{
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: '#888',
      }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: IMAGE_SIZE, height: IMAGE_SIZE, overflow: 'hidden' }}>
      {urls.map((url, i) => (
        <img
          key={url}
          ref={(el) => { frameRefs.current[i] = el }}
          src={url}
          alt=""
          width={IMAGE_SIZE}
          height={IMAGE_SIZE}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}
