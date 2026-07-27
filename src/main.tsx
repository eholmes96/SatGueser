import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import { DevSandbox } from './dev/DevSandbox.tsx'
import { Root } from './Root.tsx'

// /dev is a local tuning tool, never linked to from the game UI, so it's
// kept as its own pathname check outside the Root/useRoute dispatch.
const isDevSandbox = window.location.pathname === '/dev'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevSandbox ? <DevSandbox /> : <Root />}
  </StrictMode>,
)
