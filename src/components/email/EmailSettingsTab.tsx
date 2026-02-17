'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Save, Send, Loader2 } from 'lucide-react'

interface Settings {
  ses_region: string
  ses_from_name: string
  ses_from_email: string
  ses_reply_to: string
  ses_config_set: string
  daily_send_limit: number
  delay_between_sends_ms: number
  sending_enabled: boolean
  signature_html: string
  signature_plain: string
  hubspot_owner_id: string
  hubspot_enabled: boolean
  unsubscribe_url: string
  sender_address: string
  aws_access_key_id_encrypted: string | null
  aws_secret_key_encrypted: string | null
  hubspot_token_encrypted: string | null
}

export function EmailSettingsTab() {
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isNew, setIsNew] = useState(false)

  // AWS creds: only sent on save when user provides them
  const [awsKeyId, setAwsKeyId] = useState('')
  const [awsSecretKey, setAwsSecretKey] = useState('')
  const [hubspotToken, setHubspotToken] = useState('')

  useEffect(() => {
    fetch('/api/email-settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings(res.data)
        } else {
          setIsNew(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ses_region: settings.ses_region || 'us-east-2',
        ses_from_name: settings.ses_from_name || null,
        ses_from_email: settings.ses_from_email || null,
        ses_reply_to: settings.ses_reply_to || null,
        ses_config_set: settings.ses_config_set || null,
        daily_send_limit: settings.daily_send_limit || 50,
        delay_between_sends_ms: settings.delay_between_sends_ms || 1500,
        sending_enabled: settings.sending_enabled || false,
        signature_html: settings.signature_html || null,
        signature_plain: settings.signature_plain || null,
        hubspot_owner_id: settings.hubspot_owner_id || null,
        hubspot_enabled: settings.hubspot_enabled || false,
        unsubscribe_url: settings.unsubscribe_url || null,
        sender_address: settings.sender_address || null,
      }

      if (awsKeyId) payload.aws_access_key_id = awsKeyId
      if (awsSecretKey) payload.aws_secret_key = awsSecretKey
      if (hubspotToken) payload.hubspot_token = hubspotToken

      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch('/api/email-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Email settings saved')
        setIsNew(false)
        setAwsKeyId('')
        setAwsSecretKey('')
        setHubspotToken('')
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!testEmail) { toast.error('Enter a test email address'); return }
    setTesting(true)
    try {
      const res = await fetch('/api/email-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`)
      } else {
        toast.error(data.error || 'Failed to send test')
      }
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <div className="animate-pulse h-40 bg-slate-100 rounded" />

  const field = (
    label: string,
    key: keyof Settings,
    type: string = 'text',
    placeholder?: string,
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={(settings[key] as string) || ''}
        onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  )

  return (
    <div className="space-y-8">
      {/* SES Configuration */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">SES Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('AWS Region', 'ses_region', 'text', 'us-east-2')}
          {field('From Name', 'ses_from_name', 'text', 'Mike Stebbins')}
          {field('From Email', 'ses_from_email', 'email', 'mike@example.com')}
          {field('Reply-To', 'ses_reply_to', 'email', 'mike@example.com')}
          {field('Config Set', 'ses_config_set', 'text', 'tracking-config-set')}
        </div>
      </section>

      {/* AWS Credentials */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">AWS Credentials</h3>
        <p className="text-xs text-slate-400 mb-3">
          {settings.aws_access_key_id_encrypted
            ? 'Credentials configured. Enter new values to update.'
            : 'Enter your AWS access key and secret key.'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Access Key ID</label>
            <input
              type="text"
              value={awsKeyId}
              onChange={(e) => setAwsKeyId(e.target.value)}
              placeholder={settings.aws_access_key_id_encrypted ? '***configured***' : 'AKIA...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Secret Access Key</label>
            <input
              type="password"
              value={awsSecretKey}
              onChange={(e) => setAwsSecretKey(e.target.value)}
              placeholder={settings.aws_secret_key_encrypted ? '***configured***' : 'Enter secret key'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Sending Controls */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Sending Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Daily Send Limit</label>
            <input
              type="number"
              value={settings.daily_send_limit || 50}
              onChange={(e) => setSettings({ ...settings, daily_send_limit: parseInt(e.target.value) || 50 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Delay Between Sends (ms)</label>
            <input
              type="number"
              value={settings.delay_between_sends_ms || 1500}
              onChange={(e) => setSettings({ ...settings, delay_between_sends_ms: parseInt(e.target.value) || 1500 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sending_enabled || false}
                onChange={(e) => setSettings({ ...settings, sending_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Sending Enabled</span>
            </label>
          </div>
        </div>
      </section>

      {/* CAN-SPAM */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">CAN-SPAM Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Sender Physical Address', 'sender_address', 'text', '123 Main St, Denver, CO 80110')}
          {field('Custom Unsubscribe URL', 'unsubscribe_url', 'url', 'https://app.example.com')}
        </div>
      </section>

      {/* Signature */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Signature</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">HTML Signature</label>
            <textarea
              value={settings.signature_html || ''}
              onChange={(e) => setSettings({ ...settings, signature_html: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="<div>Your signature HTML...</div>"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plain Text Signature</label>
            <textarea
              value={settings.signature_plain || ''}
              onChange={(e) => setSettings({ ...settings, signature_plain: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="--\nYour Name\nCompany"
            />
          </div>
        </div>
      </section>

      {/* HubSpot */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">HubSpot Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">HubSpot Token</label>
            <input
              type="password"
              value={hubspotToken}
              onChange={(e) => setHubspotToken(e.target.value)}
              placeholder={settings.hubspot_token_encrypted ? '***configured***' : 'pat-na2-...'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {field('HubSpot Owner ID', 'hubspot_owner_id', 'text', '70619571')}
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hubspot_enabled || false}
                onChange={(e) => setSettings({ ...settings, hubspot_enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">HubSpot Logging Enabled</span>
            </label>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </button>

        <div className="flex items-center gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test
          </button>
        </div>
      </div>
    </div>
  )
}
