import cities from './cities.json'
import { ImageReveal } from './components/ImageReveal'
import './App.css'

function App() {
  const city = cities[0]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1rem' }}>
      <h1>{city.displayName} — zoom reveal (30s)</h1>
      <ImageReveal city={city} duration={30000} />
    </div>
  )
}

export default App
