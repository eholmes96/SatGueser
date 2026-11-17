import { beforeEach } from 'vitest'

// Minimal in-memory localStorage so the storage helpers (daily record, high
// scores) run under Node exactly as they do in the browser. Cleared before
// every test so tests can't leak state into each other.
class MemoryStorage {
  private items = new Map<string, string>()
  getItem(key: string) { return this.items.get(key) ?? null }
  setItem(key: string, value: string) { this.items.set(key, String(value)) }
  removeItem(key: string) { this.items.delete(key) }
  clear() { this.items.clear() }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

beforeEach(() => storage.clear())
