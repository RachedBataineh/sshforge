import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

// Custom plugin to copy preload.cjs directly
const copyPreloadPlugin = () => ({
  name: 'copy-preload',
  writeBundle() {
    const src = path.resolve(__dirname, 'electron/preload.cjs')
    const dest = path.resolve(__dirname, 'dist-electron/preload.cjs')
    fs.copyFileSync(src, dest)
    console.log('Copied preload.cjs to dist-electron/')
  },
})

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: ['electron'],
            },
          },
          plugins: [copyPreloadPlugin()],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
})
