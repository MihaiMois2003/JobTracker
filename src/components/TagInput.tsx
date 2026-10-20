import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tag } from './Badge'
import styles from './TagInput.module.css'

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  max?: number
}

export function TagInput({ id, value, onChange, placeholder, max = 12 }: TagInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((p) => p.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
    if (!parts.length) return
    const lower = new Set(value.map((v) => v.toLowerCase()))
    const next = [...value]
    for (const p of parts) {
      if (!lower.has(p.toLowerCase()) && next.length < max) {
        next.push(p.slice(0, 32))
        lower.add(p.toLowerCase())
      }
    }
    onChange(next)
    setDraft('')
  }

  return (
    <div className={styles.wrap}>
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => onChange(value.filter((v) => v !== tag))} removeLabel={t('tags.remove', { tag })}>
          {tag}
        </Tag>
      ))}
      {value.length < max && (
        <input
          id={id}
          className={styles.input}
          value={draft}
          placeholder={value.length ? t('tags.addMore') : (placeholder ?? t('tags.placeholder'))}
          aria-label={t('tags.label')}
          onChange={(e) => {
            if (/[,;]/.test(e.target.value)) add(e.target.value)
            else setDraft(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => add(draft)}
        />
      )}
    </div>
  )
}
