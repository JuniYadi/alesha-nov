import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    devtools(),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        client: {
          // @alesha-nov/db is Bun-only and should never be imported on client.
          specifiers: ['@alesha-nov/db'],
        },
      },
    }),
    viteReact(),
  ],
  build: {
    rollupOptions: {
      external: ['bun'],
    },
  },
  ssr: {
    // Vite will leave Bun built-ins external, so they fail fast only if
    // actually loaded by Bun runtime code.
    external: ['bun'],
  },
})

export default config
