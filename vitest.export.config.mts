import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 검토용 정적 HTML 생성 전용 설정 (npm run export:review). 일반 테스트(npm test)에는 포함되지 않는다.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: { include: ['scripts/export-review/export.review.tsx'] },
})
