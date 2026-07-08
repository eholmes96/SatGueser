import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'mapbox-gl/dist/mapbox-gl.css'
import './index.css'
import App from './App.tsx'
import { DevSandbox } from './dev/DevSandbox.tsx'
import { AuthBubble } from './components/AuthBubble.tsx'

// No router — this is the only route besides the game itself, and it's a
// local tuning tool, never linked to from the game UI.
const isDevSandbox = window.location.pathname === '/dev'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevSandbox ? <DevSandbox /> : (
      <>
        <App />
        {/* Fixed bottom-right auth control, shared across every game screen. */}
        <AuthBubble />
      </>
    )}
  </StrictMode>,
)
