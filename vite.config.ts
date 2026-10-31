import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The Firebase SDK (auth + firestore + functions) alone is ~640 kB minified; it is cached as its own chunk.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks cache well across deploys.
        codeSplitting: {
          groups: [
            // Storage (CV files only) stays out of every group so it remains a lazy, on-demand chunk.
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/](?!storage[\\/])/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/](?!@?firebase[\\/]storage[\\/])/ },
          ],
        },
      },
    },
  },
})
