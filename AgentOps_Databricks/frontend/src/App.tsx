import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { WorkspaceSelectionProvider } from '@/context/WorkspaceSelectionContext'
import { authMe } from '@/lib/api'
import { clearAuth, isAuthenticated } from '@/lib/auth'
import { ConnectView } from '@/views/ConnectView'
import { LoginView } from '@/views/LoginView'
import { ManageAgentsView } from '@/views/ManageAgentsView'
import { SsoZaaveroView } from '@/views/SsoZaaveroView'
import { TraceDetailPage } from '@/views/TraceDetailPage'

function AppShellGuard() {
  const [ready, setReady] = useState(false)
  const [hasConnection, setHasConnection] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      setReady(true)
      return
    }
    authMe()
      .then((me) => setHasConnection(me.has_connection))
      .catch(() => clearAuth())
      .finally(() => setReady(true))
  }, [])

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">Loading…</div>
  }
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (!hasConnection) {
    return <Navigate to="/connect" replace />
  }
  return <AppShell />
}

function ConnectGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      setReady(true)
      return
    }
    setReady(true)
  }, [location.pathname])

  if (!ready) return null
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <WorkspaceSelectionProvider>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route
            path="/connect"
            element={
              <ConnectGuard>
                <ConnectView />
              </ConnectGuard>
            }
          />
          <Route
            path="/agents/manage"
            element={
              <ConnectGuard>
                <ManageAgentsView />
              </ConnectGuard>
            }
          />
          <Route path="/sso/zaavero" element={<SsoZaaveroView />} />
          <Route path="/trace/:requestId" element={<TraceDetailPage />} />
          <Route path="/*" element={<AppShellGuard />} />
        </Routes>
      </WorkspaceSelectionProvider>
    </BrowserRouter>
  )
}
