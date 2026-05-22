import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, RefreshCcw } from 'lucide-react'
import type { HealthResponse, WorkspaceMetadata } from '../../api/types'
import { UModelApi } from '../../api/client'
import { Brand, HealthBadge } from '../../App'
import { Button, Badge, IconButton } from '../../design/components'
import { formatError } from '../../lib/json'
import { useI18n } from '../../i18n'

const ExplorerPage = lazy(() => import('../explorer/ExplorerPage').then(({ ExplorerPage }) => ({ default: ExplorerPage })))
const EntityTopoPage = lazy(() => import('../entityTopo/EntityTopoPage').then(({ EntityTopoPage }) => ({ default: EntityTopoPage })))
const QueryPage = lazy(() => import('../query/QueryPage').then(({ QueryPage }) => ({ default: QueryPage })))
const ImportsPage = lazy(() => import('../imports/ImportsPage').then(({ ImportsPage }) => ({ default: ImportsPage })))
const AgentPage = lazy(() => import('../agent/AgentPage').then(({ AgentPage }) => ({ default: AgentPage })))
const SettingsPage = lazy(() => import('../settings/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })))
const ApiMapPage = lazy(() => import('../settings/ApiMapPage').then(({ ApiMapPage }) => ({ default: ApiMapPage })))
const DataStorePage = lazy(() => import('../query/DataStorePage').then(({ DataStorePage }) => ({ default: DataStorePage })))

export type WorkspaceView = 'explorer' | 'entityTopo' | 'query' | 'imports' | 'agent' | 'settings' | 'docs' | 'data'

interface NavItem {
  value: WorkspaceView
  label: string
  icon: ReactNode
}

export function WorkspaceShell({
  api,
  workspaceId,
  workspace,
  health,
  view,
  navItems,
  onViewChange,
  onWorkspaceChange,
  onHealthChange,
  onBack,
}: {
  api: UModelApi
  workspaceId: string
  workspace: WorkspaceMetadata | null
  health: HealthResponse | null
  view: WorkspaceView
  navItems: NavItem[]
  onViewChange: (view: WorkspaceView) => void
  onWorkspaceChange: (workspace: WorkspaceMetadata | null) => void
  onHealthChange: (health: HealthResponse | null) => void
  onBack: () => void
}) {
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { t, locale, setLocale } = useI18n()

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [nextHealth, nextWorkspace] = await Promise.all([
        api.health().catch(() => null),
        api.getWorkspace(workspaceId),
      ])
      onHealthChange(nextHealth)
      onWorkspaceChange(nextWorkspace)
      setRefreshToken((value) => value + 1)
    } catch (nextError) {
      setError(formatError(nextError))
    }
  }, [api, onHealthChange, onWorkspaceChange, workspaceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const page = useMemo(() => {
    switch (view) {
      case 'explorer':
        return <ExplorerPage api={api} workspaceId={workspaceId} refreshToken={refreshToken} />
      case 'entityTopo':
        return <EntityTopoPage api={api} workspaceId={workspaceId} refreshToken={refreshToken} />
      case 'query':
        return <QueryPage api={api} workspaceId={workspaceId} />
      case 'imports':
        return <ImportsPage api={api} workspaceId={workspaceId} onChanged={() => setRefreshToken((value) => value + 1)} />
      case 'agent':
        return <AgentPage api={api} workspaceId={workspaceId} />
      case 'settings':
        return (
          <SettingsPage
            api={api}
            workspaceId={workspaceId}
            workspace={workspace}
            onWorkspaceChange={onWorkspaceChange}
            onBack={onBack}
          />
        )
      case 'docs':
        return <ApiMapPage />
      case 'data':
        return <DataStorePage api={api} workspaceId={workspaceId} />
      default:
        return null
    }
  }, [api, onBack, onWorkspaceChange, refreshToken, view, workspace, workspaceId])

  const explorerHost = view === 'explorer' || view === 'entityTopo'

  return (
    <div className={`workspace-shell app-shell ${sidebarCollapsed ? 'collapsed' : ''} ${explorerHost ? 'explorer-host' : ''}`}>
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar-header">
          <Brand compact />
          <div className="workspace-sidebar-title" style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace?.name || workspaceId}
            </strong>
            <span className="workspace-id">{workspaceId}</span>
          </div>
          <IconButton
            className="workspace-collapse-button"
            label={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            onClick={() => setSidebarCollapsed((value) => !value)}
            type="button"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </IconButton>
        </div>
        <nav className="workspace-nav">
          {navItems.map((item) => (
            <button
              key={item.value}
              className={view === item.value ? 'active' : ''}
              onClick={() => onViewChange(item.value)}
              type="button"
              title={t(item.label)}
            >
              {item.icon}
              <span className="workspace-nav-label">{t(item.label)}</span>
            </button>
          ))}
        </nav>
        <div className="workspace-sidebar-footer">
          <Button className="workspace-back-button" variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            <span className="workspace-back-label">{t('shell.workspaces')}</span>
          </Button>
          <button
            className="workspace-lang-toggle"
            onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}
            type="button"
            title={locale === 'zh-CN' ? 'Switch to English' : '切换为中文'}
          >
            {locale === 'zh-CN' ? 'EN' : '中'}
          </button>
        </div>
      </aside>

      <section className={`workspace-main ${explorerHost ? 'explorer-main-host' : ''}`}>
        {!explorerHost && (
        <header className="workspace-topbar">
          <div className="row" style={{ minWidth: 0 }}>
            <Badge tone="indigo">{viewLabel(view, t)}</Badge>
            <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error || workspace?.paths.root || t('shell.loadingMetadata')}
            </span>
          </div>
          <div className="row">
            <HealthBadge health={health} />
            <Button variant="ghost" onClick={() => void refresh()}>
              <RefreshCcw size={15} />
              {t('app.refresh')}
            </Button>
          </div>
        </header>
        )}
        <main className={`workspace-content ${explorerHost ? 'workspace-content-explorer' : ''}`}>
          <Suspense fallback={<div className="workspace-page-loading">{t('app.loading')}</div>}>{page}</Suspense>
        </main>
      </section>
    </div>
  )
}

function viewLabel(view: WorkspaceView, t: (key: string, fallback?: string) => string): string {
  switch (view) {
    case 'explorer':
      return t('nav.explorer')
    case 'entityTopo':
      return t('nav.entityTopo')
    case 'query':
      return t('nav.query')
    case 'imports':
      return t('nav.imports')
    case 'agent':
      return t('nav.agent')
    case 'settings':
      return t('nav.settings')
    case 'docs':
      return t('nav.apiMap')
    case 'data':
      return t('nav.dataStore')
  }
}
