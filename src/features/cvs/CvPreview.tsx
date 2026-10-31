import { Download, ExternalLink, FileText, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { EmptyState, Skeleton } from '../../components/Feedback'
import { useIsPhone } from '../../lib/useMediaQuery'
import { CvFileError, cvFileUrl, type CvFileErrorCode } from './cvFiles'
import styles from './Cvs.module.css'
import type { Cv, CvVersion } from './types'
import { useCvFileCommands } from './useCvFileCommands'

/**
 * Desktop: the PDF embedded in the page. Phones render embedded PDFs poorly,
 * so they get "Open PDF" (new tab) and "Download" instead. No PDF library involved.
 */
export function CvPreview({ cv, version }: { cv: Cv; version: CvVersion | null }) {
  const { t } = useTranslation()
  const isPhone = useIsPhone()
  const files = useCvFileCommands()

  if (!version || !version.storagePath) {
    return (
      <div className={styles.previewBox}>
        <EmptyState icon={<FileText aria-hidden />} title={t('cvs.preview.demo')}>
          {t('cvs.preview.demoText')}
        </EmptyState>
      </div>
    )
  }

  if (isPhone) {
    return (
      <div className={styles.previewBox}>
        <EmptyState
          icon={<FileText aria-hidden />}
          title={version.fileName || cv.name}
          action={
            <div className={styles.previewActions}>
              <Button variant="primary" size="lg" icon={<ExternalLink aria-hidden />} onClick={() => files.open(version)}>
                {t('cvs.actions.openPdf')}
              </Button>
              <Button size="lg" icon={<Download aria-hidden />} onClick={() => files.download(version)}>
                {t('cvs.actions.download')}
              </Button>
            </div>
          }
        >
          {t('cvs.preview.mobileHint')}
        </EmptyState>
      </div>
    )
  }

  return <EmbeddedPdf key={version.id} cv={cv} version={version} />
}

function EmbeddedPdf({ cv, version }: { cv: Cv; version: CvVersion }) {
  const { t } = useTranslation()
  const files = useCvFileCommands()
  const [state, setState] = useState<{ url: string | null; error: CvFileErrorCode | null }>({ url: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    cvFileUrl(version.storagePath).then(
      (url) => live && setState({ url, error: null }),
      (err: unknown) => live && setState({ url: null, error: err instanceof CvFileError ? err.code : 'unknown' }),
    )
    return () => {
      live = false
    }
  }, [version.storagePath, attempt])

  if (state.error) {
    return (
      <div className={styles.previewBox}>
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title={t(`cvs.errors.${state.error}`)}
          action={
            state.error !== 'not_found' && (
              <Button
                onClick={() => {
                  setState({ url: null, error: null })
                  setAttempt((n) => n + 1)
                }}
              >
                {t('common.retry')}
              </Button>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.previewFrameWrap} aria-busy={!state.url}>
      {state.url ? (
        <iframe
          className={styles.previewFrame}
          src={state.url}
          title={t('cvs.preview.frameTitle', { name: cv.name, n: version.versionNumber })}
        />
      ) : (
        <Skeleton height="100%" radius={10} />
      )}
      <div className={styles.previewToolbar}>
        <Button size="sm" variant="ghost" icon={<ExternalLink aria-hidden />} onClick={() => files.open(version)}>
          {t('cvs.actions.openPdf')}
        </Button>
        <Button size="sm" variant="ghost" icon={<Download aria-hidden />} onClick={() => files.download(version)}>
          {t('cvs.actions.download')}
        </Button>
      </div>
    </div>
  )
}
