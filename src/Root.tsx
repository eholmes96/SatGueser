import { useRoute } from './hooks/useRoute'
import App from './App'
import { AuthBubble } from './components/AuthBubble'
import { BlogIndexPage } from './blog/BlogIndexPage'
import { BlogPostPage } from './blog/BlogPostPage'

// Dispatches on the tiny hand-rolled router: the game itself is the
// unrouted default (see useRoute), with /blog and /blog/:slug as the only
// other addressable views.
export function Root() {
  const { route, navigate } = useRoute()

  if (route.view === 'blog-index') return <BlogIndexPage onNavigate={navigate} />
  if (route.view === 'blog-post') return <BlogPostPage slug={route.slug} onNavigate={navigate} />

  return (
    <>
      <App />
      <AuthBubble onNavigate={navigate} />
    </>
  )
}
