import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createMonitoredAgent, deleteMonitoredAgent, listMonitoredAgents } from '@/lib/api'
import type { MonitoredAgent } from '@/lib/api'

export function ManageAgentsView() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<MonitoredAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [routeModel, setRouteModel] = useState('')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [inferenceTableFqn, setInferenceTableFqn] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listMonitoredAgents()
      setAgents(data.agents)
      if (data.agents.length === 0 && !gatewayUrl) {
        const host = 'dbc-xxxx.cloud.databricks.com'
        setGatewayUrl(`https://${host}/ai-gateway/mlflow/v1/chat/completions`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function addAgent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createMonitoredAgent({
        label,
        route_model: routeModel,
        gateway_url: gatewayUrl,
        inference_table_fqn: inferenceTableFqn || undefined,
      })
      setLabel('')
      setRouteModel('')
      setInferenceTableFqn('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add agent')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await deleteMonitoredAgent(id)
    await load()
  }

  return (
    <div className="max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Monitored agents</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Step 2 of 2 — define AI Gateway routes for monitoring, replay, and benchmarks. These replace the old{' '}
          <code className="rounded bg-[var(--card)] px-1">replay_targets.json</code> file: each route needs a model name
          (e.g. <code className="rounded bg-[var(--card)] px-1">gemma-3-model_payload</code>) and chat/completions URL.
        </p>
        <Link to="/connect" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
          Edit Databricks connection
        </Link>
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {agents.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div>
                <p className="font-medium text-[var(--text)]">{a.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  route: {a.route_model}
                  {a.inference_table_fqn ? ` · table: ${a.inference_table_fqn}` : ''}
                  {' · '}
                  {a.enabled ? 'enabled' : 'disabled'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-sm text-red-500 hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
          {agents.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No agents yet. Add your first route below.</p>
          )}
        </ul>
      )}

      <form onSubmit={addAgent} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="font-semibold text-[var(--text)]">Add agent route</h2>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Display label (e.g. Gemma 3 12B)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Route model name (e.g. gemma-3-model_payload)"
          value={routeModel}
          onChange={(e) => setRouteModel(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="AI Gateway URL (…/ai-gateway/mlflow/v1/chat/completions)"
          value={gatewayUrl}
          onChange={(e) => setGatewayUrl(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Inference table FQN (optional — catalog.schema.table for this route)"
          value={inferenceTableFqn}
          onChange={(e) => setInferenceTableFqn(e.target.value)}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add agent
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          >
            Go to dashboard
          </button>
        </div>
      </form>
    </div>
  )
}
