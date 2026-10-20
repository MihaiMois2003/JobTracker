import { deleteDoc, doc } from 'firebase/firestore'
import { Database, Download, FlaskConical, Trash, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import { db } from '../../lib/firebase'
import { useUser } from '../auth/AuthProvider'
import { useApplications } from '../applications/ApplicationsProvider'
import { useApplicationActions } from '../applications/useApplicationActions'
import { download, ImportError, parseImport, stamp, toCSV, toJSON } from './dataTools'
import { buildDemoApplications } from './demoData'
import { SettingsGroup, SettingsRow } from './SettingsLayout'
import { useSettings } from './SettingsProvider'

export function DataSection() {
  const { t } = useTranslation()
  const user = useUser()
  const { items } = useApplications()
  const { settings } = useSettings()
  const actions = useApplicationActions()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'import' | 'demo' | 'undemo' | 'wipe' | null>(null)
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0)
  const demoCount = items.filter((a) => a.demo).length

  const guard = async (kind: NonNullable<typeof busy>, work: () => Promise<void>) => {
    setBusy(kind)
    try {
      await work()
    } catch {
      toast({ message: t('errors.saveFailed'), tone: 'danger' })
    } finally {
      setBusy(null)
    }
  }

  const onImport = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ message: t('data.importTooLarge'), tone: 'danger' })
      return
    }
    try {
      const docs = parseImport(await file.text())
      if (!docs.length) {
        toast({ message: t('data.importEmpty'), tone: 'danger' })
        return
      }
      await guard('import', async () => {
        await actions.writeMany(docs)
        toast({ message: t('data.imported', { count: docs.length }) })
      })
    } catch (err) {
      toast({ message: err instanceof ImportError ? t(`data.importErrors.${err.message as 'invalid_json' | 'not_ledger'}`) : t('errors.generic'), tone: 'danger' })
    }
  }

  return (
    <>
      <SettingsGroup title={t('data.title')}>
        <SettingsRow label={t('data.export')} hint={t('data.exportHint', { count: items.length })}>
          <Button icon={<Download aria-hidden />} disabled={!items.length} onClick={() => download(`ledger-${stamp()}.csv`, toCSV(items), 'text/csv;charset=utf-8')}>
            CSV
          </Button>
          <Button
            icon={<Download aria-hidden />}
            disabled={!items.length}
            onClick={() => download(`ledger-${stamp()}.json`, toJSON(items, settings), 'application/json')}
          >
            JSON
          </Button>
        </SettingsRow>
        <SettingsRow label={t('data.import')} hint={t('data.importHint')}>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void onImport(file)
            }}
          />
          <Button icon={<Upload aria-hidden />} loading={busy === 'import'} onClick={() => fileRef.current?.click()}>
            {t('data.importButton')}
          </Button>
        </SettingsRow>
        <SettingsRow label={t('data.demo')} hint={demoCount ? t('data.demoLoaded', { count: demoCount }) : t('data.demoHint')}>
          {demoCount > 0 ? (
            <Button
              icon={<Trash aria-hidden />}
              loading={busy === 'undemo'}
              onClick={() =>
                void guard('undemo', async () => {
                  await actions.deleteMany(items.filter((a) => a.demo).map((a) => a.id))
                  toast({ message: t('data.demoRemoved') })
                })
              }
            >
              {t('data.removeDemo')}
            </Button>
          ) : (
            <Button
              icon={<FlaskConical aria-hidden />}
              loading={busy === 'demo'}
              onClick={() =>
                void guard('demo', async () => {
                  await actions.writeMany(buildDemoApplications(settings.currency))
                  toast({ message: t('data.demoAdded') })
                })
              }
            >
              {t('data.loadDemo')}
            </Button>
          )}
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title={t('data.danger')}>
        <SettingsRow label={t('data.wipe')} hint={t('data.wipeHint')}>
          <Button variant="dangerGhost" icon={<Database aria-hidden />} loading={busy === 'wipe'} onClick={() => setWipeStep(1)}>
            {t('data.wipeButton')}
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <ConfirmDialog
        open={wipeStep === 1}
        title={t('data.wipeConfirm1Title')}
        confirmLabel={t('data.wipeContinue')}
        danger
        onClose={() => setWipeStep(0)}
        onConfirm={() => setWipeStep(2)}
      >
        {t('data.wipeConfirm1Text', { count: items.length })}
      </ConfirmDialog>
      <ConfirmDialog
        open={wipeStep === 2}
        title={t('data.wipeConfirm2Title')}
        confirmLabel={t('data.wipeFinal')}
        danger
        typeToConfirm={t('data.wipeWord')}
        typeToConfirmLabel={t('data.wipeTypeLabel', { word: t('data.wipeWord') })}
        onClose={() => setWipeStep(0)}
        onConfirm={() => {
          setWipeStep(0)
          void guard('wipe', async () => {
            await actions.deleteMany(items.map((a) => a.id))
            await deleteDoc(doc(db, 'users', user.uid, 'settings', 'prefs'))
            toast({ message: t('data.wiped') })
          })
        }}
      >
        {t('data.wipeConfirm2Text')}
      </ConfirmDialog>
    </>
  )
}
