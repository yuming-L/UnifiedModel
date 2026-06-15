import { useEffect, useState, type ReactNode } from 'react'
import Editor from '@monaco-editor/react'
import { AlertCircle, Save, Trash2 } from 'lucide-react'
import type { WorkspaceMetadata } from '../../api/types'
import { UModelApi } from '../../api/client'
<<<<<<< HEAD
import { Badge, Button, Field, JsonEditor, Panel, TextInput } from '../../design/components'
import { formatError, parseJson, stringify } from '../../lib/json'
import { useI18n } from '../../i18n'
=======
import { Badge, Button, Modal, TextInput } from '../../design/components'
import { LanguageSelect, useI18n } from '../../i18n'
import { formatError, stringify } from '../../lib/json'
import { disableMonacoEditContext } from '../../lib/preloadMonaco'
import './settings.css'

disableMonacoEditContext()

type SettingsStatus = { type: 'saved' } | { type: 'error'; message: string }
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06

export function SettingsPage({
  api,
  workspaceId,
  workspace,
  onWorkspaceChange,
  onBack,
}: {
  api: UModelApi
  workspaceId: string
  workspace: WorkspaceMetadata | null
  onWorkspaceChange: (workspace: WorkspaceMetadata | null) => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(workspace?.name || workspaceId)
  const [description, setDescription] = useState(workspace?.description || '')
  const [labels, setLabels] = useState(stringify(workspace?.labels || {}))
  const [config, setConfig] = useState(stringify(workspace?.config || {}))
  const [replaceLabels, setReplaceLabels] = useState(false)
  const [replaceConfig, setReplaceConfig] = useState(false)
  const [status, setStatus] = useState<SettingsStatus | null>(null)
  const [busy, setBusy] = useState(false)
<<<<<<< HEAD
  const { t } = useI18n()
=======
  const [deleteOpen, setDeleteOpen] = useState(false)
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06

  useEffect(() => {
    setName(workspace?.name || workspaceId)
    setDescription(workspace?.description || '')
    setLabels(stringify(workspace?.labels || {}))
    setConfig(stringify(workspace?.config || {}))
  }, [workspace, workspaceId])

  async function save() {
    setBusy(true)
    setStatus(null)
    try {
      const next = await api.updateWorkspace(workspaceId, {
        name,
        description,
        labels: parseWorkspaceLabels(labels, t('settings.labelsJson.invalidJson'), t('settings.labelsJson.invalidShape')),
        config: parseWorkspaceConfig(
          config,
          t('settings.configJson.invalidJson'),
          t('settings.configJson.invalidShape'),
        ),
        if_match_version: workspace?.resource_version,
        replace_labels: replaceLabels,
        replace_config: replaceConfig,
      })
      onWorkspaceChange(next)
<<<<<<< HEAD
      setStatus(t('settings.saved'))
=======
      setStatus({ type: 'saved' })
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06
    } catch (error) {
      setStatus({ type: 'error', message: formatError(error) })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setStatus(null)
    try {
      await api.deleteWorkspace(workspaceId)
      onWorkspaceChange(null)
      setDeleteOpen(false)
      onBack()
    } catch (error) {
      setStatus({ type: 'error', message: formatError(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
<<<<<<< HEAD
    <div className="two-column">
      <Panel
        title={<strong>{t('settings.title')}</strong>}
        action={workspace && <Badge tone={workspace.status === 'active' ? 'success' : 'warning'}>v{workspace.resource_version}</Badge>}
      >
        <div className="stack">
          <Field label={t('settings.name')}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label={t('settings.description')}>
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label={t('settings.labelsJson')}>
            <JsonEditor value={labels} onChange={setLabels} minHeight={150} />
          </Field>
          <label className="row small muted">
            <input type="checkbox" checked={replaceLabels} onChange={(event) => setReplaceLabels(event.target.checked)} />
            {t('settings.replaceLabels')}
          </label>
          <Field label={t('settings.configJson')}>
            <JsonEditor value={config} onChange={setConfig} minHeight={190} />
          </Field>
          <label className="row small muted">
            <input type="checkbox" checked={replaceConfig} onChange={(event) => setReplaceConfig(event.target.checked)} />
            {t('settings.replaceConfig')}
          </label>
          {status && <Badge tone={status === t('settings.saved') ? 'success' : 'danger'}>{status}</Badge>}
          <div className="toolbar">
            <Button variant="danger" onClick={() => void remove()} disabled={busy}>
              <Trash2 size={15} />
              {t('settings.deleteWorkspace')}
            </Button>
            <Button variant="primary" onClick={() => void save()} disabled={busy}>
              <Save size={15} />
              {t('settings.save')}
=======
    <div className="settings-workbench">
      <header className="settings-head">
        <div className="settings-title">
          <strong>{t('settings.title')}</strong>
          {workspace && <Badge tone={workspace.status === 'active' ? 'success' : 'warning'}>v{workspace.resource_version}</Badge>}
        </div>
        <div className="settings-head-actions">
          {status?.type === 'saved' && <Badge tone="success">{t('settings.saved')}</Badge>}
          <Button className="settings-primary-button" variant="primary" onClick={() => void save()} disabled={busy}>
            <Save size={15} />
            {t('common.save')}
          </Button>
        </div>
      </header>

      {status?.type === 'error' && <SettingsError message={status.message} />}

      <div className="settings-layout">
        <section className="settings-main">
          <div className="settings-field-grid">
            <label className="settings-field">
              <span>{t('settings.name')}</span>
              <TextInput value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="settings-field">
              <span>{t('settings.description')}</span>
              <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>

          <SettingsEditor
            label={t('settings.labelsJson')}
            description={t('settings.labelsJson.description')}
            value={labels}
            onChange={setLabels}
            height={190}
            action={
              <ToggleRow
                checked={replaceLabels}
                label={t('settings.replaceLabels')}
                onChange={setReplaceLabels}
              />
            }
          />

          <SettingsEditor
            label={t('settings.configJson')}
            description={t('settings.configJson.description')}
            value={config}
            onChange={setConfig}
            height={250}
            action={
              <ToggleRow
                checked={replaceConfig}
                label={t('settings.replaceConfig')}
                onChange={setReplaceConfig}
              />
            }
          />

          <div className="settings-main-spacer" />

          <div className="settings-danger-zone">
            <Button variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy}>
              <Trash2 size={15} />
              {t('settings.deleteWorkspace')}
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06
            </Button>
          </div>
        </section>

<<<<<<< HEAD
      <Panel title={<strong>{t('settings.metadata')}</strong>}>
        <pre className="result-box small">{workspace ? stringify(workspace) : t('settings.noMetadata')}</pre>
      </Panel>
=======
        <aside className="settings-side">
          <section className="settings-side-panel settings-preferences-panel">
            <div className="settings-panel-header">
              <strong>{t('settings.preferences')}</strong>
            </div>
            <div className="settings-preferences">
              <LanguageSelect />
              <p>{t('settings.language.description')}</p>
            </div>
          </section>

          <section className="settings-side-panel settings-metadata-panel">
            <div className="settings-panel-header">
              <strong>{t('settings.metadata')}</strong>
            </div>
            <MonacoBlock
              value={workspace ? stringify(workspace) : t('settings.metadata.notLoaded')}
              language={workspace ? 'json' : 'text'}
              height="100%"
              readOnly
            />
          </section>
        </aside>
      </div>

      {deleteOpen && (
        <Modal
          title={t('settings.deleteConfirm.title')}
          onClose={() => {
            if (!busy) setDeleteOpen(false)
          }}
          footer={
            <div className="settings-confirm-actions">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={() => void remove()} disabled={busy}>
                <Trash2 size={15} />
                {t('settings.deleteConfirm.confirm')}
              </Button>
            </div>
          }
        >
          <div className="settings-confirm-body">
            <p>{t('settings.deleteConfirm.detail', { workspace: workspace?.name || workspaceId })}</p>
            <code>{workspaceId}</code>
            <p>{t('settings.deleteConfirm.tombstone')}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SettingsEditor({
  label,
  description,
  value,
  height,
  action,
  onChange,
}: {
  label: string
  description?: ReactNode
  value: string
  height: number
  action: ReactNode
  onChange: (value: string) => void
}) {
  return (
    <div className="settings-editor-panel">
      <div className="settings-editor-title">
        <span>{label}</span>
        {action}
      </div>
      {description && <p className="settings-editor-description">{description}</p>}
      <MonacoBlock value={value} language="json" height={height} onChange={onChange} />
    </div>
  )
}

function parseJsonField<T>(value: string, invalidMessage: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error(invalidMessage)
  }
}

function parseWorkspaceLabels(value: string, invalidJsonMessage: string, invalidShapeMessage: string) {
  const parsed = parseJsonField<unknown>(value, invalidJsonMessage)
  if (!isPlainObject(parsed)) {
    throw new Error(invalidShapeMessage)
  }
  for (const labelValue of Object.values(parsed)) {
    if (typeof labelValue !== 'string') {
      throw new Error(invalidShapeMessage)
    }
  }
  return parsed as Record<string, string>
}

function parseWorkspaceConfig(
  value: string,
  invalidJsonMessage: string,
  invalidShapeMessage: string,
) {
  const parsed = parseJsonField<unknown>(value, invalidJsonMessage)
  if (!isPlainObject(parsed)) {
    throw new Error(invalidShapeMessage)
  }
  for (const namespaceValue of Object.values(parsed)) {
    if (!isPlainObject(namespaceValue)) {
      throw new Error(invalidShapeMessage)
    }
  }
  return parsed as Record<string, Record<string, unknown>>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function SettingsError({ message }: { message: string }) {
  return (
    <div className="settings-error">
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  )
}

function ToggleRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function MonacoBlock({
  value,
  language,
  height,
  readOnly = false,
  onChange,
}: {
  value: string
  language: string
  height: number | string
  readOnly?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="settings-monaco" style={{ height }}>
      <Editor
        value={value}
        language={language}
        theme="vs"
        onChange={(nextValue) => {
          if (!readOnly) onChange?.(nextValue || '')
        }}
        options={{
          accessibilitySupport: 'off',
          automaticLayout: true,
          domReadOnly: readOnly,
          fontFamily: 'var(--om-mono)',
          fontSize: 12,
          lineHeight: 19,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          padding: { top: 10, bottom: 10 },
          readOnly,
          renderLineHighlight: readOnly ? 'none' : 'line',
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06
    </div>
  )
}
