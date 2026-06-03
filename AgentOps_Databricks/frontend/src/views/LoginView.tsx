import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLogin, authRegister } from '@/lib/api'
import { setAuth } from '@/lib/auth'

type Mode = 'login' | 'register'

function PasswordField({
  label,
  value,
  onChange,
  minLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 pr-10 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}

export function LoginView() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session =
        mode === 'login'
          ? await authLogin({ email, password })
          : await authRegister({ email, password, name, workspace_name: workspaceName })
      setAuth(session.access_token, session.user)
      navigate(session.has_connection ? '/' : '/connect')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      if (mode === 'register' && msg.toLowerCase().includes('already registered')) {
        setError(
          'This email is already registered in AgentOps. Sign in with the password you used when you created the workspace, or launch from Zaavero (recommended).'
        )
      } else if (mode === 'login' && msg.toLowerCase().includes('invalid email or password')) {
        setError(
          'Invalid email or password for AgentOps. This is not your Zaavero password unless you set it here. Try launching from Zaavero, or use the password from when you first created this AgentOps workspace.'
        )
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-[var(--text)]">AgentOps</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === 'login' ? 'Sign in to monitor your Databricks agents' : 'Create your workspace'}
        </p>

        <div className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-3 text-sm">
          <p className="font-medium text-[var(--text)]">Recommended: sign in via Zaavero</p>
          <p className="mt-1 text-[var(--muted)] text-xs leading-relaxed">
            AgentOps uses its own login database (separate from your Zaavero password). If you use Zaavero,
            launch AgentOps from <strong>Products → AgentOps</strong> — no second password needed.
          </p>
          <a
            href="https://www.zaavero.com"
            className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Go to Zaavero →
          </a>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <>
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="Workspace name" value={workspaceName} onChange={setWorkspaceName} required />
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <PasswordField label="Password" value={password} onChange={setPassword} minLength={8} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {mode === 'login' ? (
            <>
              New here?{' '}
              <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => setMode('register')}>
                Create workspace
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button type="button" className="text-[var(--accent)] hover:underline" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  minLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      />
    </label>
  )
}
