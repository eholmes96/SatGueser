// Pre-bundles the Vercel Functions in functions-src/ into self-contained files
// in api/, so Vercel deploys a single file with nothing to resolve at runtime.
//
// Why this exists: the handler imports shared logic from src/ (buildDaily-
// ChallengeCities, scoreRound, the Cities dataset) so the server re-derives
// scores with the exact same code the client runs — zero drift. But those
// src/ modules use extensionless imports written for Vite's bundler, which
// Vercel's per-file Node build does NOT rewrite, so at runtime Node's ESM
// loader can't resolve them (ERR_MODULE_NOT_FOUND). Bundling here inlines the
// whole src/ graph + the JSON into one file, sidestepping runtime resolution.
//
// @supabase/supabase-js is left external: it's a normal node_modules dep, and
// bare-specifier imports resolve fine at runtime (only relative/extensionless
// ones are the problem). Keeping it external also keeps the bundle small.

import { build } from 'esbuild'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'functions-src')
const outDir = join(root, 'api')

const entryPoints = readdirSync(srcDir)
  .filter(f => f.endsWith('.ts'))
  .map(f => join(srcDir, f))

await build({
  entryPoints,
  outdir: outDir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Resolve the runtime dep from node_modules at runtime rather than inlining it.
  external: ['@supabase/supabase-js'],
  logLevel: 'info',
})

console.log(`Bundled ${entryPoints.length} function(s) -> api/`)
