import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createConnection, testConnection } from '@/lib/api'

export function ConnectView() {
  const navigate = useNavigate()
  const [name, setName] = useState('Production workspace')
  const [host, setHost] = useState('')
  const [httpPath, setHttpPath] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [sqlToken, setSqlToken] = useState('')
  const [gatewayToken, setGatewayToken] = useState('')
  const [inferenceSchema, setInferenceSchema] = useState('agentops.agent_logs')
  const [timeColumn, setTimeColumn] = useState('event_time')
  const [tableSuffix, setTableSuffix] = useState('_payload')
  const [showSqlToken, setShowSqlToken] = useState(false)
  const [showGatewayToken, setShowGatewayToken] = useState(false)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    setError('')
    const cleanHost = host.replace(/^https?:\/\//i, '').trim().replace(/\/$/, '')
    const cleanPath = httpPath.trim().startsWith('/') ? httpPath.trim() : `/${httpPath.trim()}`
    try {
      const r = await testConnection({
        host: cleanHost,
        http_path: cleanPath,
        sql_token: sqlToken.trim(),
      })
      setTestResult(r.ok ? 'Connection successful' : r.message)
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createConnection({
        name,
        host,
        http_path: httpPath,
        workspace_id_dbx: workspaceId,
        sql_token: sqlToken,
        gateway_token: gatewayToken || sqlToken,
        inference_schema: inferenceSchema,
        inference_time_column: timeColumn,
        inference_table_suffix: tableSuffix,
        set_as_active: true,
      })
      navigate('/agents/manage')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save connection')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-[var(--text)]">Connect Databricks</h1>
        <p className="mt-2 text-[var(--muted)]">
          Step 1 of 2 — link your workspace to monitor agents. Credentials are encrypted per workspace (not in{' '}
          <code className="mx-1 rounded bg-[var(--card)] px-1">.env</code> files). After this you&apos;ll add agent routes for replay and monitoring.
        </p>

        <form onSubmit={handleSave} className="mt-8 space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <Section title="Connection">
            <Input label="Connection name" value={name} onChange={setName} placeholder="Production Databricks" />
            <Input
              label="Databricks host"
              value={host}
              onChange={setHost}
              placeholder="dbc-xxxx.cloud.databricks.com"
              hint="Without https://"
            />
            <Input
              label="SQL warehouse HTTP path"
              value={httpPath}
              onChange={setHttpPath}
              placeholder="/sql/1.0/warehouses/..."
            />
            <Input label="Workspace ID" value={workspaceId} onChange={setWorkspaceId} placeholder="7474659683601153" />
          </Section>

          <Section title="Credentials">
            <SecretInput
              label="SQL PAT (DATABRICKS_TOKEN)"
              value={sqlToken}
              onChange={setSqlToken}
              visible={showSqlToken}
              onToggle={() => setShowSqlToken((v) => !v)}
            />
            <SecretInput
              label="AI Gateway PAT (optional)"
              value={gatewayToken}
              onChange={setGatewayToken}
              visible={showGatewayToken}
              onToggle={() => setShowGatewayToken((v) => !v)}
              hint="For replay/benchmark. Falls back to SQL PAT if empty."
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !host || !httpPath || !sqlToken}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--bg)] disabled:opacity-50"
            >
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            {testResult && (
              <p className={`text-sm ${testResult.includes('successful') ? 'text-emerald-500' : 'text-amber-500'}`}>
                {testResult}
              </p>
            )}
          </Section>

          <Section title="Inference logging">
            <Input
              label="Inference schema (catalog.schema)"
              value={inferenceSchema}
              onChange={setInferenceSchema}
              placeholder="agentops.agent_logs"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Time column" value={timeColumn} onChange={setTimeColumn} />
              <Input label="Table suffix" value={tableSuffix} onChange={setTableSuffix} />
            </div>
          </Section>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & continue to add agents'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</h2>
      {children}
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--text)]">{label}</span>
      {hint && <span className="ml-2 text-xs text-[var(--muted)]">{hint}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[var(--text)]"
      />
    </label>
  )
}

function SecretInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  hint?: string
}) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--text)]">{label}</span>
      {hint && <span className="ml-2 text-xs text-[var(--muted)]">{hint}</span>}
      <div className="relative mt-1">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={label.includes('SQL')}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 pr-16 text-[var(--text)]"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}
