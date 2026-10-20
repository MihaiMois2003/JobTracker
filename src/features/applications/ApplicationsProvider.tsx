import { collection, onSnapshot } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../../lib/firebase'
import { useUser } from '../auth/AuthProvider'
import { normalizeApplication } from './normalize'
import type { Application } from './types'

interface ApplicationsState {
  items: Application[]
  /** True until the first snapshot (cache or server) arrives. */
  loading: boolean
  error: Error | null
  byId: Map<string, Application>
}

const ApplicationsContext = createContext<ApplicationsState | null>(null)

export function ApplicationsProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  const [state, setState] = useState<Omit<ApplicationsState, 'byId'>>({ items: [], loading: true, error: null })

  useEffect(() => {
    const ref = collection(db, 'users', user.uid, 'applications')
    return onSnapshot(
      ref,
      (snap) => {
        const items = snap.docs.map((d) => normalizeApplication(d.id, d.data()))
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        setState({ items, loading: false, error: null })
      },
      (error) => setState((s) => ({ ...s, loading: false, error })),
    )
  }, [user.uid])

  const value = useMemo<ApplicationsState>(
    () => ({ ...state, byId: new Map(state.items.map((a) => [a.id, a])) }),
    [state],
  )
  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useApplications(): ApplicationsState {
  const ctx = useContext(ApplicationsContext)
  if (!ctx) throw new Error('useApplications() must be used inside <ApplicationsProvider>')
  return ctx
}
