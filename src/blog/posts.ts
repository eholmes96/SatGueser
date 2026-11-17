import { Marked } from 'marked'

// Shared by the blog index and post pages.
export const ACCENT = '#4ade80'

export function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

// Posts live as Markdown files with a frontmatter header, the same
// content-as-data-file pattern as islands.json/Cities_v2.json — add a new
// .md file under ./content and it shows up here automatically, no code
// changes needed. The files are bundled eagerly (import.meta.glob) but the
// Markdown is parsed in the browser, once, when this module first loads —
// not per-render.
const modules = import.meta.glob('./content/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export interface BlogPost {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  excerpt: string
  html: string
}

function slugFromPath(path: string): string {
  return path.split('/').pop()!.replace(/\.md$/, '')
}

// Hardened marked instance. The rendered HTML goes into the page via
// dangerouslySetInnerHTML, and marked passes raw HTML through untouched, so:
//  - raw HTML tokens (block and inline) are escaped and shown as literal text;
//  - links/images whose URL isn't http(s), mailto (links only) or relative
//    (e.g. `javascript:`, `data:`) are not emitted — only their text is kept.
// Posts are authored in-repo so this is defence in depth, not a live hole.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeUrl(href: string, allowMailto: boolean): boolean {
  // Browsers ignore whitespace/control chars inside a scheme (`java\tscript:`),
  // so strip them before looking for one.
  const url = href.replace(/[\p{Cc}\s]/gu, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)
  if (!scheme) return true // relative URL
  const name = scheme[1].toLowerCase()
  return name === 'http' || name === 'https' || (allowMailto && name === 'mailto')
}

const markdown = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text)
    },
    link(token) {
      if (isSafeUrl(token.href, true)) return false // use the default renderer
      return this.parser.parseInline(token.tokens)
    },
    image(token) {
      if (isSafeUrl(token.href, false)) return false
      return escapeHtml(token.text)
    },
  },
})

export function renderMarkdown(source: string): string {
  return markdown.parse(source, { async: false })
}

// Minimal frontmatter parser: a leading `---`-fenced block of `key: value`
// lines. No YAML library — every value here is a plain string, so hand-rolled
// parsing avoids pulling in a parser (and its Node/Buffer assumptions) for a
// browser bundle. Tolerates a leading BOM and CRLF line endings, and strips
// one pair of matching surrounding quotes from values.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i === -1) continue
    let value = line.slice(i + 1).trim()
    if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0])) {
      value = value.slice(1, -1)
    }
    data[line.slice(0, i).trim()] = value
  }
  return { data, body: match[2] }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  // Round-trip catches impossible dates like 2026-02-31.
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}

// Content mistakes that would otherwise render as a blank title, "Invalid
// Date" or a post silently shadowed by another with the same slug. Collected
// rather than thrown: this module loads with the game (Root imports the blog
// pages), so a throw here would blank the whole site for players. The unit
// tests (tests/blog.test.ts) fail on any entry instead.
export const postProblems: string[] = []

function buildPosts(): BlogPost[] {
  const seen = new Map<string, string>()
  return Object.entries(modules)
    .map(([path, raw]) => {
      const { data, body } = parseFrontmatter(raw)
      const slug = data.slug || slugFromPath(path)
      if (!data.title) postProblems.push(`${path}: missing "title" in frontmatter`)
      if (!isIsoDate(data.date ?? '')) postProblems.push(`${path}: "date" must be an ISO yyyy-mm-dd date, got "${data.date ?? ''}"`)
      const prior = seen.get(slug)
      if (prior) postProblems.push(`${path}: duplicate slug "${slug}" (also used by ${prior})`)
      seen.set(slug, path)
      return {
        slug,
        title: data.title || slug,
        date: data.date || '',
        excerpt: data.excerpt || '',
        html: renderMarkdown(body),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const posts: BlogPost[] = buildPosts()

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug)
}
