import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Vitest 설정: '@/...' 경로를 프로젝트 최상위로 연결
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
})
