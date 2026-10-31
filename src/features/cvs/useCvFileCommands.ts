import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/Toast'
import { CvFileError, downloadCvFile, openCvFile } from './cvFiles'
import type { CvVersion } from './types'

/** Open / download a CV version from any screen, with friendly errors (and a note for demo CVs). */
export function useCvFileCommands() {
  const { t } = useTranslation()
  const toast = useToast()
  return useMemo(() => {
    const fail = (err: unknown) =>
      toast({ message: err instanceof CvFileError ? t(`cvs.errors.${err.code}`) : t('errors.generic'), tone: 'danger' })
    const hasFile = (version: CvVersion | null): version is CvVersion => {
      if (version?.storagePath) return true
      toast({ message: t('cvs.preview.demo') })
      return false
    }
    return {
      open: (version: CvVersion | null) => {
        if (hasFile(version)) openCvFile(version.storagePath).catch(fail)
      },
      download: (version: CvVersion | null) => {
        if (hasFile(version)) downloadCvFile(version.storagePath, version.fileName).catch(fail)
      },
    }
  }, [t, toast])
}
