import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Field, FieldRow, Input, Select, Textarea } from '../../components/Field'
import { TagInput } from '../../components/TagInput'
import { cx } from '../../lib/cx'
import { CURRENCIES } from '../../lib/money'
import { CvPicker } from '../cvs/CvPicker'
import {
  EMPLOYMENT_TYPES,
  PRIORITIES,
  PRIORITY_KEY,
  SALARY_PERIODS,
  SOURCES,
  STATUSES,
  WORK_MODES,
  type ApplicationDraft,
  type EmploymentType,
  type Priority,
  type SalaryPeriod,
  type SourceName,
  type Status,
  type WorkMode,
} from '../applications/types'
import styles from './JobForm.module.css'
import type { DraftErrors } from './validate'

interface JobFormProps {
  draft: ApplicationDraft
  onChange: (patch: Partial<ApplicationDraft>) => void
  errors: DraftErrors
  /** Fields filled automatically; they get a subtle marker. */
  autoFilled?: ReadonlySet<string>
}

const numOrNull = (v: string): number | null => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}

export function JobForm({ draft, onChange, errors, autoFilled }: JobFormProps) {
  const { t } = useTranslation()
  const auto = (key: string) => autoFilled?.has(key) ?? false
  const label = (text: string, key: string): string => text + (auto(key) ? ` · ${t('add.autoFilled')}` : '')

  return (
    <div className={styles.form}>
      <Group title={t('add.groups.role')}>
        <Field label={label(t('job.fields.title'), 'title')} error={errors.title}>
          {(p) => (
            <Input {...p} className={cx(auto('title') && styles.auto)} value={draft.title} onChange={(e) => onChange({ title: e.target.value })} autoComplete="off" />
          )}
        </Field>
        <FieldRow>
          <Field label={label(t('job.fields.company'), 'company')} error={errors.company}>
            {(p) => (
              <Input {...p} className={cx(auto('company') && styles.auto)} value={draft.company} onChange={(e) => onChange({ company: e.target.value })} autoComplete="organization" />
            )}
          </Field>
          <Field label={label(t('job.fields.location'), 'location')} optional>
            {(p) => (
              <Input {...p} className={cx(auto('location') && styles.auto)} value={draft.location} onChange={(e) => onChange({ location: e.target.value })} />
            )}
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label={label(t('workMode.label'), 'workMode')} optional>
            {(p) => (
              <Select {...p} className={cx(auto('workMode') && styles.auto)} value={draft.workMode ?? ''} onChange={(e) => onChange({ workMode: (e.target.value || null) as WorkMode | null })}>
                <option value="">{t('job.unknown')}</option>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {t(`workMode.${m}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={label(t('employmentType.label'), 'employmentType')} optional>
            {(p) => (
              <Select
                {...p}
                className={cx(auto('employmentType') && styles.auto)}
                value={draft.employmentType ?? ''}
                onChange={(e) => onChange({ employmentType: (e.target.value || null) as EmploymentType | null })}
              >
                <option value="">{t('job.unknown')}</option>
                {EMPLOYMENT_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {t(`employmentType.${m}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FieldRow>
        <Field label={label(t('job.fields.salary'), 'salary')} optional error={errors.salary}>
          {(p) => (
            <div className={styles.salary}>
              <Input
                {...p}
                inputMode="decimal"
                placeholder={t('job.min')}
                className={cx('tabular', auto('salary') && styles.auto)}
                value={draft.salaryMin ?? ''}
                onChange={(e) => onChange({ salaryMin: numOrNull(e.target.value) })}
              />
              <Input
                inputMode="decimal"
                aria-label={t('job.fields.salaryMax')}
                placeholder={t('job.max')}
                className={cx('tabular', auto('salary') && styles.auto)}
                value={draft.salaryMax ?? ''}
                onChange={(e) => onChange({ salaryMax: numOrNull(e.target.value) })}
              />
              <Select aria-label={t('job.fields.currency')} value={draft.currency} onChange={(e) => onChange({ currency: e.target.value })}>
                {(CURRENCIES.includes(draft.currency as (typeof CURRENCIES)[number]) ? CURRENCIES : [draft.currency, ...CURRENCIES]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={t('salaryPeriod.label')}
                value={draft.salaryPeriod ?? ''}
                onChange={(e) => onChange({ salaryPeriod: (e.target.value || null) as SalaryPeriod | null })}
              >
                <option value="">—</option>
                {SALARY_PERIODS.map((s) => (
                  <option key={s} value={s}>
                    {t(`salaryPeriod.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Field>
        <Field label={label(t('job.sections.tags'), 'tags')} optional hint={t('add.tagsHint')}>
          {(p) => <TagInput id={p.id} value={draft.tags} onChange={(tags) => onChange({ tags })} />}
        </Field>
      </Group>

      <Group title={t('add.groups.tracking')}>
        <FieldRow>
          <Field label={t('status.label')}>
            {(p) => (
              <Select {...p} value={draft.status} onChange={(e) => onChange({ status: e.target.value as Status })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('priority.label')}>
            {(p) => (
              <Select {...p} value={draft.priority} onChange={(e) => onChange({ priority: Number(e.target.value) as Priority })}>
                {[...PRIORITIES].reverse().map((pr) => (
                  <option key={pr} value={pr}>
                    {t(`priority.${PRIORITY_KEY[pr]}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FieldRow>
        <FieldRow>
          {draft.status !== 'saved' && (
            <Field label={t('job.fields.appliedAt')}>
              {(p) => <Input {...p} type="date" value={draft.appliedAt ?? ''} onChange={(e) => onChange({ appliedAt: e.target.value || null })} />}
            </Field>
          )}
          <Field label={label(t('job.fields.deadline'), 'deadline')} optional>
            {(p) => (
              <Input {...p} type="date" className={cx(auto('deadline') && styles.auto)} value={draft.deadline ?? ''} onChange={(e) => onChange({ deadline: e.target.value || null })} />
            )}
          </Field>
        </FieldRow>
        <Field label={t('job.fields.cvVersion')} optional>
          {(p) => <CvPicker id={p.id} variant="field" value={draft} onChange={(selection) => onChange(selection)} />}
        </Field>
        <Field label={t('job.sections.notes')} optional>
          {(p) => <Textarea {...p} rows={3} value={draft.notes} placeholder={t('job.notesPlaceholder')} onChange={(e) => onChange({ notes: e.target.value })} />}
        </Field>
      </Group>

      <Group title={t('add.groups.source')}>
        <FieldRow>
          <Field label={t('job.fields.sourceUrl')} optional error={errors.sourceUrl}>
            {(p) => <Input {...p} type="url" inputMode="url" value={draft.sourceUrl} placeholder="https://" onChange={(e) => onChange({ sourceUrl: e.target.value })} />}
          </Field>
          <Field label={t('source.label')}>
            {(p) => (
              <Select {...p} value={draft.sourceName} onChange={(e) => onChange({ sourceName: e.target.value as SourceName })}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t(`source.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </FieldRow>
        <Field label={label(t('job.fields.companyWebsite'), 'companyWebsite')} optional>
          {(p) => (
            <Input
              {...p}
              type="url"
              inputMode="url"
              className={cx(auto('companyWebsite') && styles.auto)}
              value={draft.companyWebsite}
              placeholder="https://"
              onChange={(e) => onChange({ companyWebsite: e.target.value })}
            />
          )}
        </Field>
        <Field label={label(t('job.sections.description'), 'description')} optional>
          {(p) => (
            <Textarea
              {...p}
              rows={6}
              className={cx(auto('description') && styles.auto)}
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          )}
        </Field>
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{title}</legend>
      <div className={styles.fields}>{children}</div>
    </fieldset>
  )
}

export function AutoFilledLegend() {
  const { t } = useTranslation()
  return (
    <p className={styles.autoLegend}>
      <Sparkles aria-hidden />
      {t('add.autoLegend')}
    </p>
  )
}
