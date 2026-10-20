import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useUI } from '../../app/UIProvider'
import { StatusDot } from '../../components/Badge'
import { cx } from '../../lib/cx'
import { boardOrder } from '../applications/selectors'
import { statusVars } from '../applications/status'
import { PIPELINE_STATUSES, type Application, type PipelineStatus, type Status } from '../applications/types'
import { useApplicationActions } from '../applications/useApplicationActions'
import styles from './Board.module.css'
import { JobCard } from './JobCard'

export function Board({ items }: { items: Application[] }) {
  const { t } = useTranslation()
  const actions = useApplicationActions()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const columns = useMemo(() => {
    const map = new Map<PipelineStatus, Application[]>(PIPELINE_STATUSES.map((s) => [s, []]))
    for (const app of items) map.get(app.status as PipelineStatus)?.push(app)
    for (const list of map.values()) list.sort(boardOrder)
    return map
  }, [items])

  const byId = useMemo(() => new Map(items.map((a) => [a.id, a])), [items])
  const active = activeId ? byId.get(activeId) : undefined

  const nameOf = (id: string | number) => {
    const app = byId.get(String(id))
    return app ? `${app.title}, ${app.company}` : ''
  }
  const columnName = (id: string | number | undefined) => (id ? t(`status.${id as Status}`) : '')

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('board.a11y.picked', { job: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? t('board.a11y.over', { job: nameOf(active.id), column: columnName(over.id) }) : '',
    onDragEnd: ({ active, over }) =>
      over
        ? t('board.a11y.dropped', { job: nameOf(active.id), column: columnName(over.id) })
        : t('board.a11y.cancelled', { job: nameOf(active.id) }),
    onDragCancel: ({ active }) => t('board.a11y.cancelled', { job: nameOf(active.id) }),
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const app = byId.get(String(e.active.id))
    const to = e.over?.id as Status | undefined
    if (app && to && to !== app.status) actions.setStatus(app, to)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('board.a11y.instructions') },
      }}
    >
      <div className={styles.board} role="list" aria-label={t('board.label')}>
        {PIPELINE_STATUSES.map((status) => (
          <Column key={status} status={status} apps={columns.get(status) ?? []} activeId={activeId} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }}>
        {active ? <JobCard app={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ status, apps, activeId }: { status: PipelineStatus; apps: Application[]; activeId: string | null }) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const v = statusVars(status)
  return (
    <section
      ref={setNodeRef}
      role="listitem"
      aria-label={`${t(`status.${status}`)}: ${apps.length}`}
      className={cx(styles.column, isOver && styles.over)}
      style={{ '--col-solid': v.solid, '--col-bg': v.bg } as CSSProperties}
    >
      <header className={styles.columnHeader}>
        <StatusDot status={status} />
        <h2 className={styles.columnTitle}>{t(`status.${status}`)}</h2>
        <span className={cx(styles.columnCount, 'tabular')}>{apps.length}</span>
      </header>
      <div className={styles.cards}>
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} hidden={app.id === activeId} />
        ))}
        {apps.length === 0 && <p className={styles.emptyColumn}>{t('board.emptyColumn')}</p>}
      </div>
    </section>
  )
}

function DraggableCard({ app, hidden }: { app: Application; hidden: boolean }) {
  const { openJob } = useUI()
  const { attributes, listeners, setNodeRef } = useDraggable({ id: app.id })
  return (
    <JobCard
      ref={setNodeRef}
      app={app}
      dragging={hidden}
      {...attributes}
      {...listeners}
      onClick={() => openJob(app.id)}
      onKeyDown={(e) => {
        // Enter opens; Space (handled by dnd-kit) picks the card up.
        if (e.key === 'Enter') {
          e.preventDefault()
          openJob(app.id)
          return
        }
        listeners?.onKeyDown?.(e)
      }}
    />
  )
}
