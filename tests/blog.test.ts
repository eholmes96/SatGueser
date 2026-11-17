import { describe, expect, it } from 'vitest'
import { getPost, postProblems, posts, renderMarkdown } from '../src/blog/posts'

describe('blog posts', () => {
  it('all have a title, an ISO date and a unique slug', () => {
    expect(postProblems).toEqual([])
    expect(posts.length).toBeGreaterThan(0)
    for (const p of posts) expect(getPost(p.slug)).toBe(p)
  })

  it('are listed newest first', () => {
    const dates = posts.map(p => p.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
})

describe('renderMarkdown', () => {
  it('escapes raw HTML instead of passing it through', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">\n\nHi <script>alert(1)</script>')
    expect(html).not.toMatch(/<img|<script/i)
    expect(html).toContain('&lt;img')
  })

  it('drops links and images with unsafe URLs but keeps their text', () => {
    expect(renderMarkdown('[click](javascript:alert(1))')).not.toContain('href')
    expect(renderMarkdown('[click](java\tscript:alert(1))')).not.toContain('href')
    expect(renderMarkdown('![pic](data:image/png;base64,xx)')).not.toContain('<img')
  })

  it('keeps ordinary links and images', () => {
    expect(renderMarkdown('[site](https://satgueser.app)')).toContain('<a href="https://satgueser.app">site</a>')
    expect(renderMarkdown('[tips](/blog)')).toContain('href="/blog"')
    expect(renderMarkdown('[mail](mailto:a@b.c)')).toContain('href="mailto:a@b.c"')
    expect(renderMarkdown('![pic](/og-image.png)')).toContain('<img src="/og-image.png"')
  })
})
