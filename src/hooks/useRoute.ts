import { useCallback, useEffect, useState } from 'react'

// The game itself has no URL (see main.tsx) — this only ever needs to tell
// "/blog"-ish paths apart from everything else, so a routing library would be
// a lot of machinery for two routes. pushState + a popstate listener gives
// back/forward and shareable post links without one.

export type Route =
  | { view: 'game' }
  | { view: 'blog-index' }
  | { view: 'blog-post'; slug: string }

function parse(pathname: string): Route {
  const [first, second] = pathname.split('/').filter(Boolean)
  if (first !== 'blog') return { view: 'game' }
  return second ? { view: 'blog-post', slug: second } : { view: 'blog-index' }
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname))

  useEffect(() => {
    const onPopState = () => setRoute(parse(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path)
    setRoute(parse(path))
    window.scrollTo(0, 0)
  }, [])

  return { route, navigate }
}
