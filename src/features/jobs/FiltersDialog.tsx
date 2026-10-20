import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '../../components/Dialog'
import { Field, FieldRow, Input } from '../../components/Field'
import { EMPTY_FILTERS, type Filters } from '../applications/selectors'
import {
  PRIORITIES,
  PRIORITY_KEY,
  SOURCES,
  STATUSES,
  WORK_MODES,
  type Priority,
  type SourceName,
  type Status,
  type WorkMode,
} from '../applications/types'
import styles from './FiltersDialog.module.css'

interface FiltersDialogProps {
  open: boolean
  onClose: () => void
  filters: Filters
  onChange: (f: Filters) => void
  tags: string[]
  /** Hide status chips when the scope already constrains statuses. */
  statuses: readonly Status[]
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FiltersDialog({ open, onClose, filters, onChange, tags, statuses }: FiltersDialogProps) {
  const { t } = useTranslation()
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <Dialog open={open} onClose={onClose} variant="sheet" label={t('filters.title')}>
      <DialogHeader title={t('filters.title')} onClose={onClose} />
      <DialogBody>
        <div className={styles.groups}>
          <ChipGroup<Status>
            legend={t('status.label')}
            options={statuses.filter((s) => STATUSES.includes(s)).map((s) => ({ value: s, label: t(`status.${s}`) }))}
            selected={filters.statuses}
            onToggle={(v) => set({ statuses: toggle(filters.statuses, v) })}
          />
          <ChipGroup<SourceName>
            legend={t('source.label')}
            options={SOURCES.map((s) => ({ value: s, label: t(`source.${s}`) }))}
            selected={filters.sources}
            onToggle={(v) => set({ sources: toggle(filters.sources, v) })}
          />
          <ChipGroup<WorkMode>
            legend={t('workMode.label')}
            options={WORK_MODES.map((m) => ({ value: m, label: t(`workMode.${m}`) }))}
            selected={filters.workModes}
            onToggle={(v) => set({ workModes: toggle(filters.workModes, v) })}
          />
          <ChipGroup<Priority>
            legend={t('priority.label')}
            options={[...PRIORITIES].reverse().map((p) => ({ value: p, label: t(`priority.${PRIORITY_KEY[p]}`) }))}
            selected={filters.priorities}
            onToggle={(v) => set({ priorities: toggle(filters.priorities, v) })}
          />
          {tags.length > 0 && (
            <ChipGroup<string>
              legend={t('filters.tag')}
              options={tags.slice(0, 24).map((tag) => ({ value: tag, label: tag }))}
              selected={filters.tag ? [filters.tag] : []}
              onToggle={(v) => set({ tag: filters.tag === v ? null : v })}
            />
          )}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>{t('filters.appliedBetween')}</legend>
            <FieldRow>
              <Field label={t('filters.from')}>
                {(p) => (
                  <Input type="date" {...p} value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || null })} />
                )}
              </Field>
              <Field label={t('filters.to')}>
                {(p) => (
                  <Input type="date" {...p} value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || null })} />
                )}
              </Field>
            </FieldRow>
          </fieldset>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })}>
          {t('filters.reset')}
        </Button>
        <Button variant="primary" onClick={onClose}>
          {t('filters.apply')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function ChipGroup<T extends string | number>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string
  options: Array<{ value: T; label: string }>
  selected: T[]
  onToggle: (v: T) => void
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={styles.chip}
            aria-pressed={selected.includes(o.value)}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
