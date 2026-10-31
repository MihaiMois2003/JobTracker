import type { FirebaseStorage } from 'firebase/storage'
import { app } from './firebase'

type StorageSdk = typeof import('firebase/storage')

let loading: Promise<{ sdk: StorageSdk; storage: FirebaseStorage }> | null = null

/**
 * Firebase Storage is only needed for CV files, so its SDK is loaded on first use
 * and never weighs on app start-up.
 */
export function loadStorage(): Promise<{ sdk: StorageSdk; storage: FirebaseStorage }> {
  loading ??= import('firebase/storage')
    .then((sdk) => {
      const storage = sdk.getStorage(app)
      if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === '1') {
        sdk.connectStorageEmulator(storage, '127.0.0.1', 9199)
      }
      return { sdk, storage }
    })
    .catch((err: unknown) => {
      // A failed chunk load (e.g. offline) must not poison later attempts.
      loading = null
      throw err
    })
  return loading
}
