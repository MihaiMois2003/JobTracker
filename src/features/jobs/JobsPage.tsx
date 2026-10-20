import { Archive, Briefcase, Kanban, List, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { Button } from '../../components/Button'
import { EmptyState, Skeleton } from '../../components/Feedback'
import { Segmented } from '../../components/Menu'
import { Page, PageHeader } from '../../components/Page'
import { useIsPhone } from '../../lib/useMediaQuery'
import { useApplications } from '../applications/ApplicationsProvider'
import { activeFilterCount, allTags, applyFilters, EMPTY_FILTERS, isActive, type Filters } from '../applications/selectors'
import { CLOSED_STATUSES, PIPELINE_STATUSES, STATUSES } from '../applications/types'
import { useSettings } from '../settings/SettingsProvider'
import { Board } from './Board'
import { FiltersDialog } from './FiltersDialog'
import { GroupedList } from './GroupedList'
import styles from './JobsPage.module.css'
import { ListTable } from './ListTable'

type Scope = 'active' | 'archive' | 'all'

export function JobsPage() {
  const { t } = useTranslation()
  const { items, loading } = useApplications()
  const { settings, update } = useSettings()
  const { openAdd } = useUI()
  const isPhone = useIsPhone()
  const [scope, setScope] = useState<Scope>('active')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const scoped = useMemo(
    () => items.filter((a) => (scope === 'active' ? isActive(a) : scope === 'archive' ? !isActive(a) : true)),
    [items, scope],
  )
  const visible = useMemo(() => applyFilters(scoped, filters), [scoped, filters])
  const tags = useMemo(() => allTags(items), [items])
  const filterCount = activeFilterCount(filters)
  const view = scope === 'active' && !isPhone ? settings.jobsView : 'list'
  const scopeStatuses = scope === 'active' ? PIPELINE_STATUSES : scope === 'archive' ? CLOSED_STATUSES : STATUSES

  return (
    <Page width={view === 'board' ? 'wide' : 'default'}>
      <PageHeader
        title={t('jobs.title')}
        subtitle={loading ? undefined : t('jobs.count', { count: scoped.length })}
        actions={
          !isPhone && (
            <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => openAdd()}>
              {t('nav.addJob')}
            </Button>
          )
        }
      />

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search aria-hidden />
          <span className="visually-hidden">{t('jobs.searchLabel')}</span>
          <input
            id="jobs-search"
            type="search"
            placeholder={t('jobs.searchPlaceholder')}
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFilters({ ...filters, q: '' })
                e.currentTarget.blur()
              }
            }}
          />
          {filters.q && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label={t('common.clear')}
              onClick={() => setFilters({ ...filters, q: '' })}
            >
              <X aria-hidden />
            </button>
          )}
        </label>

        <div className={styles.toolbarRight}>
          <Segmented<Scope>
            label={t('jobs.scopeLabel')}
            value={scope}
            onChange={(s) => {
              setScope(s)
              setFilters({ ...filters, statuses: [] })
            }}
            options={[
              { value: 'active', label: t('jobs.scope.active') },
              { value: 'archive', label: t('jobs.scope.archive'), icon: <Archive aria-hidden /> },
              { value: 'all', label: t('jobs.scope.all') },
            ]}
          />
          <Button
            variant={filterCount ? 'primary' : 'secondary'}
            icon={<SlidersHorizontal aria-hidden />}
            onClick={() => setFiltersOpen(true)}
            aria-label={filterCount ? t('filters.withCount', { count: filterCount }) : t('filters.title')}
          >
            <span className={styles.filterLabel}>{t('filters.title')}</span>
            {filterCount > 0 && <span className="tabular">{filterCount}</span>}
          </Button>
          {scope === 'active' && !isPhone && (
            <Segmented<'board' | 'list'>
              label={t('jobs.viewLabel')}
              value={settings.jobsView}
              onChange={(jobsView) => update({ jobsView })}
              options={[
                { value: 'board', label: t('jobs.view.board'), icon: <Kanban aria-hidden />, hideLabel: true },
                { value: 'list', label: t('jobs.view.list'), icon: <List aria-hidden />, hideLabel: true },
              ]}
            />
          )}
        </div>
      </div>

      {filterCount > 0 && (
        <div className={styles.activeFilters}>
          <span>{t('jobs.filteredCount', { shown: visible.length, total: scoped.length })}</span>
          <Button size="sm" variant="ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}>
            {t('filters.reset')}
          </Button>
        </div>
      )}

      {loading ? (
        <JobsSkeleton board={view === 'board'} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Briefcase aria-hidden />}
          title={t('jobs.emptyTitle')}
          action={
            <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => openAdd()}>
              {t('nav.addJob')}
            </Button>
          }
        >
          {t('jobs.emptyText')}
        </EmptyState>
      ) : visible.length === 0 && (filters.q || filterCount) ? (
        <EmptyState icon={<Search aria-hidden />} title={t('jobs.noMatchesTitle')}>
          {t('jobs.noMatchesText')}
        </EmptyState>
      ) : view === 'board' ? (
        <Board items={visible} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<Archive aria-hidden />} title={t(scope === 'archive' ? 'jobs.archiveEmpty' : 'jobs.activeEmpty')} />
      ) : isPhone ? (
        <GroupedList items={visible} />
      ) : (
        <ListTable items={visible} />
      )}

      <FiltersDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onChange={setFilters}
        tags={tags}
        statuses={scopeStatuses}
      />
    </Page>
  )
}

function JobsSkeleton({ board }: { board: boolean }) {
  if (board) {
    return (
      <div className={styles.skeletonBoard} aria-busy="true">
        {[0, 1, 2, 3].map((c) => (
          <div key={c} className={styles.skeletonColumn}>
            <Skeleton width={90} height={14} />
            {[0, 1, 2].slice(0, 3 - (c % 2)).map((i) => (
              <Skeleton key={i} height={84} radius={10} />
            ))}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={styles.skeletonList} aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={56} radius={8} />
      ))}
    </div>
  )
}
