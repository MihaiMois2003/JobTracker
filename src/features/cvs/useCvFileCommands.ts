import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../components/Toast'
import { CvFileError, downloadCvFile, openCvFile } from './cvFiles'
import type { Cv, CvVersion } from './types'

/** Open / download a CV version from any screen, with friendly errors (and a note when there is no file). */
export function useCvFileCommands() {
  const { t } = useTranslation()
  const toast = useToast()
  return useMemo(() => {
    const fail = (err: unknown) =>
      toast({ message: err instanceof CvFileError ? t(`cvs.errors.${err.code}`) : t('errors.generic'), tone: 'danger' })
    // Demo CVs never have a file; imported ones lose theirs (exports don't include PDFs).
    const hasFile = (cv: Pick<Cv, 'demo'>, version: CvVersion | null): version is CvVersion => {
      if (version?.storagePath) return true
      toast({ message: t(cv.demo ? 'cvs.preview.demo' : 'cvs.preview.noFile') })
      return false
    }
    return {
      open: (cv: Pick<Cv, 'demo'>, version: CvVersion | null) => {
        if (hasFile(cv, version)) openCvFile(version.storagePath).catch(fail)
      },
      download: (cv: Pick<Cv, 'demo'>, version: CvVersion | null) => {
        if (hasFile(cv, version)) downloadCvFile(version.storagePath, version.fileName).catch(fail)
      },
    }
  }, [t, toast])
}
