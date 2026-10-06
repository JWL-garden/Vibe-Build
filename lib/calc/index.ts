// 계산 통합 함수 (설계서 5-6)
// TODO [3-4]: analyze, analyzeFinance, runAll 구현

import type { BuildingRecord, Expandability } from '@/types'

/**
 * 증축 가능 여부 판정.
 * 지금은 계산 엔진(far·sunlight·expansion)이 없어 항상 '판정 대기'를 돌려준다.
 * TODO [2-4]: expansion 결과의 addFloors > 0 이면 possible, 0 이면 impossible 로 바꾼다.
 */
export function judgeExpandability(_building: BuildingRecord): Expandability {
  return {
    status: 'pending',
    reason: '증축 가능 여부는 계산 엔진(용적률·일조권) 연결 후 자동으로 판정됩니다.',
  }
}
