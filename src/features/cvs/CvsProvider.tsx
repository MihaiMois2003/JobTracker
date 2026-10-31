import { collection, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../../lib/firebase'
import { useUser } from '../auth/AuthProvider'
import { normalizeCv, normalizeVersion } from './normalize'
import type { Cv, CvDoc, CvVersion } from './types'

interface CvsState {
  /** Default first, then most recently updated. */
  cvs: Cv[]
  /** True until the CV list and every CV's versions have arrived (cache or server). */
  loading: boolean
  error: Error | null
  byId: Map<string, Cv>
}

const CvsContext = createContext<CvsState | null>(null)

/** Live CV metadata from Firestore (served from the offline cache first). PDFs are never loaded here. */
export function CvsProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const [docs, setDocs] = useState<{ items: Array<CvDoc & { id: string }>; loading: boolean; error: Error | null }>({
    items: [],
    loading: true,
    error: null,
  })
  const [versions, setVersions] = useState<Record<string, CvVersion[]>>({})

  useEffect(() => {
    return onSnapshot(
      collection(db, 'users', user.uid, 'cvs'),
      (snap) => setDocs({ items: snap.docs.map((d) => ({ id: d.id, ...normalizeCv(d.data()) })), loading: false, error: null }),
      (error) => setDocs((s) => ({ ...s, loading: false, error })),
    )
  }, [user.uid])

  // One listener per CV for its versions: people keep a handful of CVs, and this avoids
  // a collection-group query (which would need its own security rule).
  const idsKey = docs.items
    .map((c) => c.id)
    .sort()
    .join(',')
  useEffect(() => {
    if (!idsKey) return
    const unsubscribers = idsKey.split(',').map((id) =>
      onSnapshot(
        collection(db, 'users', user.uid, 'cvs', id, 'versions'),
        (snap) => {
          const list = snap.docs.map((d) => normalizeVersion(d.id, d.data()))
          list.sort((a, b) => b.versionNumber - a.versionNumber)
          setVersions((v) => ({ ...v, [id]: list }))
        },
        (error) => {
          setVersions((v) => ({ ...v, [id]: v[id] ?? [] }))
          setDocs((s) => ({ ...s, error }))
        },
      ),
    )
    return () => unsubscribers.forEach((u) => u())
  }, [user.uid, idsKey])

  const value = useMemo<CvsState>(() => {
    const cvs: Cv[] = docs.items.map((c) => ({ ...c, versions: versions[c.id] ?? [] }))
    cvs.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt))
    return {
      cvs,
      loading: docs.loading || docs.items.some((c) => !(c.id in versions)),
      error: docs.error,
      byId: new Map(cvs.map((c) => [c.id, c])),
    }
  }, [docs, versions])

  return <CvsContext.Provider value={value}>{children}</CvsContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useCvs(): CvsState {
  const ctx = useContext(CvsContext)
  if (!ctx) throw new Error('useCvs() must be used inside <CvsProvider>')
  return ctx
}
