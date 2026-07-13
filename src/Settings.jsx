import { useState, useEffect } from 'react'
import { api } from './apiClient.js'
import styles from './Settings.module.css'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [aiEndpointUrl, setAiEndpointUrl] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // StrictMode double-invokes this effect in dev, firing two independent
    // /api/settings requests — without this guard, whichever response arrives
    // last can overwrite fields the user has already started editing.
    let ignore = false
    api('/api/settings')
      .then(data => {
        if (ignore) return
        setAiEndpointUrl(data.aiEndpointUrl)
        setAiModel(data.aiModel)
        setHasApiKey(data.hasApiKey)
      })
      .catch(() => { if (!ignore) setError('Failed to load settings.') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const body = { aiEndpointUrl, aiModel }
      if (aiApiKey) body.aiApiKey = aiApiKey
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify(body) })
      if (aiApiKey) {
        setHasApiKey(true)
        setAiApiKey('')
      }
      setMessage('Settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveKey() {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ aiApiKey: '' }) })
      setHasApiKey(false)
      setAiApiKey('')
      setMessage('API key removed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className={styles.loading}>Loading…</p>

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>AI provider</h2>
      <p className={styles.hint}>
        Used by the "AI Ideas" tab to suggest recipes. Works with any OpenAI-compatible chat completions
        endpoint — OpenAI itself, a local Ollama/LM Studio server, OpenRouter, Groq, etc.
      </p>

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.label}>
          Endpoint URL
          <input
            type="text"
            value={aiEndpointUrl}
            onChange={e => setAiEndpointUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Model
          <input
            type="text"
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          API key {hasApiKey && <span className={styles.configured}>(configured)</span>}
          <input
            type="password"
            value={aiApiKey}
            onChange={e => setAiApiKey(e.target.value)}
            placeholder={hasApiKey ? 'Leave blank to keep current key' : 'sk-...'}
            className={styles.input}
            autoComplete="off"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.success}>{message}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {hasApiKey && (
            <button type="button" onClick={handleRemoveKey} className={styles.removeBtn} disabled={saving}>
              Remove key
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
