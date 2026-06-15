import { useState, type ReactNode } from 'react'
import Editor from '@monaco-editor/react'
import { CheckCircle2, DatabaseZap, Send, UploadCloud } from 'lucide-react'
import { UModelApi } from '../../api/client'
import { Badge, Button, SegmentedControl } from '../../design/components'
import { useI18n, type MessageKey } from '../../i18n'
import { asArray, formatError, parseJson, stringify } from '../../lib/json'
<<<<<<< HEAD
import { parseUModelElementsFromJson } from '../explorer/ExplorerPage'
import { useI18n } from '../../i18n'
=======
import { disableMonacoEditContext } from '../../lib/preloadMonaco'
import { parseUModelElementsFromJson } from '../umodel/UModelPage'
import './imports.css'
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06

disableMonacoEditContext()

type ImportMode = 'umodel' | 'entity' | 'expire'
type EntityStoreKind = 'entity' | 'relation'
type ImportRecord = Record<string, unknown>
type ModeResults = Partial<Record<ImportMode, unknown>>
type ModeErrors = Partial<Record<ImportMode, string>>

const modeItems: Array<{
  value: ImportMode
  labelKey: MessageKey
  icon: ReactNode
}> = [
  { value: 'umodel', labelKey: 'imports.mode.umodel', icon: <UploadCloud size={14} /> },
  { value: 'entity', labelKey: 'imports.mode.entity', icon: <DatabaseZap size={14} /> },
  { value: 'expire', labelKey: 'imports.mode.expire', icon: <CheckCircle2 size={14} /> },
]

const sampleServiceAId = '10000000000000000000000000000101'
const sampleServiceBId = '10000000000000000000000000000102'
const sampleServiceType = 'devops.service'
const sampleDomain = 'devops'
const sampleRelationType = 'calls'
const sampleEntityStableKey = `${sampleDomain}/${sampleServiceType}/${sampleServiceAId}`
const sampleRelationStableKey = `${sampleDomain}/${sampleServiceType}/${sampleServiceAId}/${sampleRelationType}/${sampleDomain}/${sampleServiceType}/${sampleServiceBId}`

const sampleElement = `[
  {
    "kind": "entity_set",
    "domain": "devops",
    "name": "devops.service",
    "spec": {
      "fields": {}
    }
  }
]`

function currentUnixSeconds() {
  return Math.floor(Date.now() / 1000)
}

function sampleEntity(now = currentUnixSeconds()) {
  return stringify([
    {
      __domain__: sampleDomain,
      __entity_type__: sampleServiceType,
      __entity_id__: sampleServiceAId,
      __method__: 'Update',
      __first_observed_time__: now,
      __last_observed_time__: now,
      display_name: 'checkout-service',
    },
    {
      __domain__: sampleDomain,
      __entity_type__: sampleServiceType,
      __entity_id__: sampleServiceBId,
      __method__: 'Update',
      __first_observed_time__: now,
      __last_observed_time__: now,
      display_name: 'catalog-api',
    },
  ])
}

function sampleRelation(now = currentUnixSeconds()) {
  return stringify([
    {
      __src_domain__: sampleDomain,
      __src_entity_type__: sampleServiceType,
      __src_entity_id__: sampleServiceAId,
      __dest_domain__: sampleDomain,
      __dest_entity_type__: sampleServiceType,
      __dest_entity_id__: sampleServiceBId,
      __relation_type__: sampleRelationType,
      __method__: 'Update',
      __first_observed_time__: now,
      __last_observed_time__: now,
    },
  ])
}

export function ImportsPage({
  api,
  workspaceId,
  onChanged,
}: {
  api: UModelApi
  workspaceId: string
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [mode, setMode] = useState<ImportMode>('umodel')
  const [elementsJson, setElementsJson] = useState(sampleElement)
  const [entityJson, setEntityJson] = useState(() => sampleEntity())
  const [relationJson, setRelationJson] = useState(() => sampleRelation())
  const [expireKind, setExpireKind] = useState<EntityStoreKind>('entity')
  const [expireEntityIds, setExpireEntityIds] = useState(() => stringify([sampleEntityStableKey]))
  const [expireRelationIds, setExpireRelationIds] = useState(() => stringify([sampleRelationStableKey]))
  const [results, setResults] = useState<ModeResults>({})
  const [errors, setErrors] = useState<ModeErrors>({})
  const [busy, setBusy] = useState(false)
<<<<<<< HEAD
  const { t } = useI18n()
=======
  const activeExpireIds = expireKind === 'entity' ? expireEntityIds : expireRelationIds
  const activeResult = results[mode] ?? null
  const activeError = errors[mode] ?? ''
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06

  async function run(action: 'validate' | 'write' | 'expire') {
    const targetMode = mode
    setBusy(true)
    setErrors((next) => ({ ...next, [targetMode]: '' }))
    setResults((next) => ({ ...next, [targetMode]: null }))
    try {
      if (targetMode === 'umodel') {
        const elements = parseUModelElementsFromJson(elementsJson)
        const next = action === 'validate'
          ? await api.validateUModel(workspaceId, elements)
          : await api.putUModel(workspaceId, elements)
        setResults((resultsByMode) => ({ ...resultsByMode, [targetMode]: next }))
        if (action === 'write') onChanged()
      } else if (targetMode === 'entity') {
        const entities = parseOptionalRows(entityJson, 'Entity JSON')
        const relations = parseOptionalRows(relationJson, 'Relation JSON')
        const entityResult = entities.length > 0 ? await api.writeEntities(workspaceId, { entities }) : null
        const relationResult = relations.length > 0 ? await api.writeRelations(workspaceId, { relations }) : null
        setResults((resultsByMode) => ({ ...resultsByMode, [targetMode]: { entities: entityResult, relations: relationResult } }))
      } else {
        const ids = parseJson<string[]>(activeExpireIds, 'IDs JSON')
        const next = expireKind === 'entity'
          ? await api.expireEntities(workspaceId, { ids })
          : await api.expireRelations(workspaceId, { ids })
        setResults((resultsByMode) => ({ ...resultsByMode, [targetMode]: next }))
      }
    } catch (nextError) {
      setErrors((errorsByMode) => ({ ...errorsByMode, [targetMode]: formatError(nextError) }))
    } finally {
      setBusy(false)
    }
  }

  return (
<<<<<<< HEAD
    <div className="two-column">
      <Panel
        title={<strong>{t('imports.title')}</strong>}
        action={
          <Tabs
            value={mode}
            onChange={setMode}
            items={[
              { value: 'path', label: t('imports.path'), icon: <FileInput size={14} /> },
              { value: 'umodel', label: t('imports.umodel'), icon: <UploadCloud size={14} /> },
              { value: 'entity', label: t('imports.entityStore'), icon: <DatabaseZap size={14} /> },
              { value: 'expire', label: t('imports.expire'), icon: <CheckCircle2 size={14} /> },
            ]}
          />
        }
      >
        <div className="stack">
          {mode === 'path' && (
            <>
              <Field label={t('imports.serverSidePath')}>
                <TextInput value={path} onChange={(event) => setPath(event.target.value)} />
              </Field>
              <Field label={t('imports.commonSchemaPacks')}>
                <JsonEditor value={commonPacks} onChange={setCommonPacks} minHeight={90} />
              </Field>
              <div className="toolbar">
                <Button variant="primary" disabled={busy || !path.trim()} onClick={() => void run('import')}>
                  <FileInput size={15} />
                  {t('imports.importFromPath')}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => void run('sample')}>
                  <Sparkles size={15} />
                  {t('imports.importSampleData')}
                </Button>
              </div>
            </>
          )}

          {mode === 'umodel' && (
            <>
              <Field label={t('imports.umodelElementsJson')}>
                <JsonEditor value={elementsJson} onChange={setElementsJson} minHeight={420} />
              </Field>
              <div className="toolbar">
                <Button variant="secondary" disabled={busy} onClick={() => void run('validate')}>
                  <CheckCircle2 size={15} />
                  {t('imports.validate')}
                </Button>
                <Button variant="primary" disabled={busy} onClick={() => void run('write')}>
                  <Send size={15} />
                  {t('imports.putElements')}
                </Button>
              </div>
            </>
          )}

          {mode === 'entity' && (
            <>
              <Field label={t('imports.entitiesJson')}>
                <JsonEditor value={entityJson} onChange={setEntityJson} minHeight={230} />
              </Field>
              <Field label={t('imports.relationsJson')}>
                <JsonEditor value={relationJson} onChange={setRelationJson} minHeight={230} />
              </Field>
              <Button variant="primary" disabled={busy} onClick={() => void run('write')}>
                <DatabaseZap size={15} />
                {t('imports.writeEntityRelation')}
              </Button>
            </>
          )}

          {mode === 'expire' && (
            <>
              <Field label={t('imports.kind')}>
                <select className="om-select" value={expireKind} onChange={(event) => setExpireKind(event.target.value as 'entity' | 'relation')}>
                  <option value="entity">entity</option>
                  <option value="relation">relation</option>
                </select>
              </Field>
              <Field label={t('imports.idsJson')}>
                <JsonEditor value={expireIds} onChange={setExpireIds} minHeight={160} />
              </Field>
              <Button variant="primary" disabled={busy} onClick={() => void run('expire')}>
                <CheckCircle2 size={15} />
                {t('imports.expireAction')}
=======
    <div className="imports-workbench">
      <header className="imports-head">
        <ModePicker value={mode} onChange={setMode} />
        <div className="imports-head-actions">
          {mode === 'umodel' && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void run('validate')}>
                <CheckCircle2 size={15} />
                {t('imports.action.validate')}
              </Button>
              <Button className="imports-primary-button" variant="primary" disabled={busy} onClick={() => void run('write')}>
                <Send size={15} />
                {t('imports.action.put')}
>>>>>>> 53f07dd41ab361d024d98d03098adaf86c2b4f06
              </Button>
            </>
          )}
          {mode === 'entity' && (
            <Button className="imports-primary-button" variant="primary" disabled={busy} onClick={() => void run('write')}>
              <DatabaseZap size={15} />
              {t('imports.action.write')}
            </Button>
          )}
          {mode === 'expire' && (
            <Button className="imports-primary-button" variant="primary" disabled={busy} onClick={() => void run('expire')}>
              <CheckCircle2 size={15} />
              {t('imports.action.expire')}
            </Button>
          )}
        </div>
      </header>

<<<<<<< HEAD
      <Panel title={<strong>{t('imports.result')}</strong>}>
        {error && <Badge tone="danger">{error}</Badge>}
        {result !== null ? <pre className="result-box small">{stringify(result)}</pre> : <div className="muted">{t('imports.noResult')}</div>}
      </Panel>
=======
      {activeError && <div className="imports-error">{activeError}</div>}

      <div className="imports-layout">
        <section className="imports-compose">
          <div className="imports-compose-body">
            {mode === 'umodel' && (
              <WorkbenchEditor
                label={t('imports.field.umodelElements')}
                value={elementsJson}
                onChange={setElementsJson}
                minHeight={420}
              />
            )}

            {mode === 'entity' && (
              <div className="imports-editor-grid">
                <WorkbenchEditor
                  label={t('imports.field.entities')}
                  value={entityJson}
                  onChange={setEntityJson}
                  minHeight={330}
                />
                <WorkbenchEditor
                  label={t('imports.field.relations')}
                  value={relationJson}
                  onChange={setRelationJson}
                  minHeight={330}
                />
              </div>
            )}

            {mode === 'expire' && (
              <div className="imports-expire-form">
                <div className="imports-kind-field">
                  <span className="imports-editor-title">{t('imports.field.kind')}</span>
                  <SegmentedControl<EntityStoreKind>
                    className="imports-kind-control"
                    size="sm"
                    value={expireKind}
                    onChange={setExpireKind}
                    items={[
                      { value: 'entity', label: t('imports.kind.entity') },
                      { value: 'relation', label: t('imports.kind.relation') },
                    ]}
                  />
                </div>
                <WorkbenchEditor
                  label={t('imports.field.ids')}
                  value={activeExpireIds}
                  onChange={(value) => {
                    if (expireKind === 'entity') setExpireEntityIds(value)
                    else setExpireRelationIds(value)
                  }}
                  minHeight={240}
                />
              </div>
            )}
          </div>
        </section>

        <section className="imports-results">
          <div className="imports-result-header">
            <div>
              <strong>{t('imports.result.title')}</strong>
              <span>{activeResult ? t('imports.result.latest') : t('imports.result.empty.detail')}</span>
            </div>
            {Boolean(activeResult) && <Badge tone="success">{t('imports.status.received')}</Badge>}
          </div>
          <div className="imports-result-body">
            <MonacoBlock
              value={activeResult ? stringify(activeResult) : t('imports.result.empty.title')}
              language="json"
              height="100%"
              readOnly
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function parseOptionalRows(value: string, label: string): ImportRecord[] {
  const trimmed = value.trim()
  if (!trimmed) return []
  return asArray(parseJson<ImportRecord | ImportRecord[]>(trimmed, label))
}

function ModePicker({ value, onChange }: { value: ImportMode; onChange: (value: ImportMode) => void }) {
  const { t } = useI18n()

  return (
    <div className="imports-modes">
      <div className="imports-mode-title">{t('imports.operation')}</div>
      <div className="imports-mode-grid">
        {modeItems.map((item) => (
          <button
            key={item.value}
            className={item.value === value ? 'active' : ''}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function WorkbenchEditor({
  label,
  value,
  onChange,
  minHeight,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  minHeight: number
}) {
  return (
    <div className="imports-editor-panel">
      <div className="imports-editor-title">{label}</div>
      <MonacoBlock value={value} language="json" height={minHeight} onChange={onChange} />
    </div>
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
    <div className="imports-monaco" style={{ height }}>
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
