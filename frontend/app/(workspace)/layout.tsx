import { WorkspaceChrome } from '@/components/layout/WorkspaceChrome'

/**
 * The route group's layout — and the entire reason Panels 1 and 3 survive a session
 * switch.
 *
 * Next re-renders only the changed segment (`c/[sessionId]`) and leaves ancestor
 * layouts mounted, so the side panels keep their scroll position, their SWR cache and
 * their collapse state. Rendering them from the page instead would remount both on
 * every click.
 *
 * Deliberately **not** a `template.tsx`: a template is keyed per segment and remounts
 * whenever the dynamic param changes, which is exactly the behaviour this file exists
 * to prevent.
 *
 * Stays a Server Component. The grid and the drawer state live in `WorkspaceChrome`,
 * which is the client boundary; `children` is passed through it, not imported by it.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceChrome>{children}</WorkspaceChrome>
}
