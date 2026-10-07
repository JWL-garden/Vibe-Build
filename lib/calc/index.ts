// 계산 통합 함수 (설계서 5-6)
// TODO [3-4]: analyze, analyzeFinance, runAll 구현

import type { BuildingRecord, Expandability, ExpansionResult, LimitingFactor } from '@/types'

/** 제한요인 표시 이름 — 화면·보고서는 이 표만 사용한다 */
export const LIMIT_LABEL: Record<LimitingFactor, string> = {
  parking: '주차',
  far: '용적률',
  housingArea: '주택 연면적',
  housingFloors: '주택 층수',
  sunlight: '일조권',
  other: '기타 제한',
}

/**
 * 실제 건축물대장 레코드의 증축 가능 여부.
 * 지금은 계산 엔진(far·sunlight·expansion)이 없어 항상 '판정 대기'를 돌려준다.
 * TODO [2-4]: expansion 결과를 만든 뒤 judgeFromExpansion 으로 판정한다.
 */
export function judgeExpandability(_building: BuildingRecord): Expandability {
  return {
    status: 'pending',
    reason: '증축 가능 여부는 계산 엔진(용적률·일조권) 연결 후 자동으로 판정됩니다.',
  }
}

/** 증축 산정 결과로 증축 가능 여부 판정: 증축 층수가 1층 이상이면 가능 */
export function judgeFromExpansion(e: ExpansionResult, scenarioName: string): Expandability {
  if (e.addFloors > 0) {
    return {
      status: 'possible',
      reason: `${scenarioName} 적용 시 최대 +${e.addFloors}개층(+${e.addFloorAreaM2.toLocaleString('ko-KR')}㎡) 증축이 가능합니다. 제한요인: ${LIMIT_LABEL[e.limitingFactor]}`,
    }
  }
  return {
    status: 'impossible',
    reason: `${scenarioName} 기준으로 ${LIMIT_LABEL[e.limitingFactor]} 때문에 증축할 수 있는 층이 없습니다.`,
  }
}
