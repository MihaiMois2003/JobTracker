import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from '../../lib/firebase'

interface AuthState {
  /** `undefined` while Firebase restores the session. */
  user: User | null | undefined
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({ user: undefined, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(() => auth.currentUser ?? undefined)

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  const value = useMemo<AuthState>(() => ({ user, signOut: () => fbSignOut(auth) }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

/** For components rendered only inside the protected area. */
// eslint-disable-next-line react/only-export-components
export function useUser(): User {
  const { user } = useContext(AuthContext)
  if (!user) throw new Error('useUser() called outside of an authenticated route')
  return user
}
