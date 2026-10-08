// 계산 결과 표시 이름 — 화면·보고서는 이 표만 사용한다

import type { ExpansionCheck, LimitingFactor } from '@/types'

/** 증축 검토 항목 표시 이름 (ExpansionCheck.item) */
export const CHECK_LABEL: Record<ExpansionCheck['item'], string> = {
  parking: '주차',
  far: '용적률',
  housingArea: '주택 연면적',
  housingFloors: '주택 층수',
  sunlight: '일조(정북)',
  floorPlate: '증축층 면적',
}

/** 검토 판정 표시 이름 */
export const CHECK_STATUS_LABEL: Record<ExpansionCheck['status'], string> = {
  pass: '통과',
  fail: '불가',
  check: '확인 필요',
}

/** 제한요인 표시 이름 */
export const LIMIT_LABEL: Record<LimitingFactor, string> = {
  parking: '주차',
  far: '용적률',
  housingArea: '주택 연면적',
  housingFloors: '주택 층수',
  sunlight: '일조권',
  roof: '지붕 형태(평슬라브 아님)',
  other: '기타 제한',
}
