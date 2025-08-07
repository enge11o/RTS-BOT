import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@engine': '/src/engine',
      '@game': '/src/game',
    },
  },
})