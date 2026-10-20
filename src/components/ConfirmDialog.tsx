import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Dialog, DialogBody, DialogFooter, DialogHeader } from './Dialog'
import { Input } from './Field'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  danger?: boolean
  /** When set, the user must type this word to enable the confirm button. */
  typeToConfirm?: string
  typeToConfirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  typeToConfirm,
  typeToConfirmLabel,
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState('')
  const blocked = typeToConfirm !== undefined && typed.trim().toLowerCase() !== typeToConfirm.toLowerCase()
  const close = () => {
    setTyped('')
    onClose()
  }
  return (
    <Dialog open={open} onClose={close} size="narrow" variant="sheet" label={title}>
      <DialogHeader title={title} />
      <DialogBody>
        <div className={styles.confirmBody}>
          {children}
          {typeToConfirm !== undefined && (
            <label className={styles.confirmType}>
              <span>{typeToConfirmLabel}</span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
            </label>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={close}>
          {t('common.cancel')}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          disabled={blocked}
          loading={loading}
          onClick={() => {
            onConfirm()
            setTyped('')
          }}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
