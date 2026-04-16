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
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    // @alesha-nov/db uses Bun's SQL class — externalize so it only
    // runs in Bun Node.js runtime, not bundled into SSR output.
    external: ['bun'],
  },
  build: {
    rollupOptions: {
      external: ['bun'],
    },
  },
})

export default config
