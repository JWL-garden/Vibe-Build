// 계산 결과 표시 이름 — 화면·보고서는 이 표만 사용한다

import type { LimitingFactor } from '@/types'

/** 제한요인 표시 이름 */
export const LIMIT_LABEL: Record<LimitingFactor, string> = {
  parking: '주차',
  far: '용적률',
  housingArea: '주택 연면적',
  housingFloors: '주택 층수',
  sunlight: '일조권',
  other: '기타 제한',
}
