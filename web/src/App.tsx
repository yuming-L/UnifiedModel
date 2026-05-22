import { useMemo, useState } from 'react'
import { Database, GitBranch, Layers, Network, PanelLeft, Settings2, Sparkles, TerminalSquare, UploadCloud } from 'lucide-react'
import { UModelApi } from './api/client'
import type { HealthResponse, WorkspaceMetadata } from './api/types'
import { Button, Badge, StatusDot, Field, TextInput } from './design/components'
import { useLocalStorageState } from './lib/storage'
import { WorkspaceLanding } from './features/workspaces/WorkspaceLanding'
import { WorkspaceShell, type WorkspaceView } from './features/workspace/WorkspaceShell'
import { useI18n } from './i18n'

const storageKeys = {
  apiBase: 'openumodel.apiBase',
  workspace: 'openumodel.workspace',
}

export function App() {
  const [apiBase, setApiBase] = useLocalStorageState(storageKeys.apiBase, '')
  const [selectedWorkspace, setSelectedWorkspace] = useLocalStorageState<string | null>(storageKeys.workspace, null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceMetadata | null>(null)
  const [view, setView] = useState<WorkspaceView>('explorer')
  const { t } = useI18n()

  const api = useMemo(() => new UModelApi(apiBase), [apiBase])

  if (!selectedWorkspace) {
    return (
      <WorkspaceLanding
        api={api}
        apiBase={apiBase}
        onApiBaseChange={setApiBase}
        health={health}
        onHealthChange={setHealth}
        onOpenWorkspace={(nextWorkspace) => {
          setSelectedWorkspace(nextWorkspace.id)
          setWorkspace(nextWorkspace)
          setView('explorer')
        }}
      />
    )
  }

  return (
    <WorkspaceShell
      api={api}
      workspaceId={selectedWorkspace}
      workspace={workspace}
      health={health}
      view={view}
      navItems={navItems}
      onViewChange={setView}
      onWorkspaceChange={setWorkspace}
      onHealthChange={setHealth}
      onBack={() => {
        setSelectedWorkspace(null)
        setWorkspace(null)
      }}
    />
  )
}

export function HealthBadge({ health }: { health: HealthResponse | null }) {
  if (!health) {
    return (
      <Badge>
        <StatusDot />
        {t('app.unknown')}
      </Badge>
    )
  }
  const ok = health.status === 'ok' && health.graphstore.status === 'ok'
  return (
    <Badge tone={ok ? 'success' : 'warning'}>
      <StatusDot status={ok ? 'ok' : 'warn'} />
      {health.graphstore.provider}
    </Badge>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand'} aria-label="UModel">
      <div className="brand-mark">
        <img
          className="brand-logo-image"
          src={compact ? '/openumodel-mark.svg' : '/openumodel-logo.svg'}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  )
}

export function ApiBaseField({
  apiBase,
  onApiBaseChange,
}: {
  apiBase: string
  onApiBaseChange: (value: string) => void
}) {
  const { t } = useI18n()
  return (
    <Field label={t('app.apiEndpoint')}>
      <TextInput
        value={apiBase}
        onChange={(event) => onApiBaseChange(event.target.value)}
        placeholder={t('app.sameOrigin')}
      />
    </Field>
  )
}

export function SmallReloadButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <Button variant="ghost" onClick={onClick}>
      <PanelLeft size={15} />
      {t('app.refresh')}
    </Button>
  )
}

const navItems = [
  { value: 'explorer' as const, label: 'nav.explorer', icon: <GitBranch size={16} /> },
  { value: 'entityTopo' as const, label: 'nav.entityTopo', icon: <Network size={16} /> },
  { value: 'query' as const, label: 'nav.query', icon: <TerminalSquare size={16} /> },
  { value: 'imports' as const, label: 'nav.imports', icon: <UploadCloud size={16} /> },
  { value: 'agent' as const, label: 'nav.agent', icon: <Sparkles size={16} /> },
  { value: 'settings' as const, label: 'nav.settings', icon: <Settings2 size={16} /> },
  { value: 'docs' as const, label: 'nav.apiMap', icon: <Layers size={16} /> },
  { value: 'data' as const, label: 'nav.dataStore', icon: <Database size={16} /> },
]
