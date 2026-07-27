import { marked } from 'marked'

// Posts live as Markdown files with a frontmatter header, the same
// content-as-data-file pattern as islands.json/Cities_v2.json — add a new
// .md file under ./content and it shows up here automatically, no code
// changes needed. Parsed once at build time (eager glob), not per-render.
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

// Minimal frontmatter parser: a leading `---`-fenced block of `key: value`
// lines. No YAML library — every value here is a plain string, so hand-rolled
// parsing avoids pulling in a parser (and its Node/Buffer assumptions) for a
// browser bundle.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':')
    if (i === -1) continue
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { data, body: match[2] }
}

export const posts: BlogPost[] = Object.entries(modules)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const slug = data.slug || slugFromPath(path)
    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      excerpt: data.excerpt || '',
      html: marked.parse(body, { async: false }),
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

export function getPost(slug: string): BlogPost | undefined {
  return posts.find(p => p.slug === slug)
}
