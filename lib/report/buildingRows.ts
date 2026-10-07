// 건축물 정보 카드(14항목)에 보여줄 "항목명 · 표시값" 목록 만들기
// 실제 건축물대장 레코드와 샘플 데이터가 같은 카드 모양으로 보이도록 맞춘다 (계산 없음, 표시 변환만)

import { textOrEmpty, withUnit } from '@/lib/format'
import type { BuildingRecord, ReportData } from '@/types'

export interface InfoRow {
  label: string
  value: string
}

/** 실제 건축물대장 레코드 → 카드 항목 */
export function rowsFromRecord(b: BuildingRecord): InfoRow[] {
  return [
    { label: '대지위치', value: b.address },
    { label: '대지면적', value: withUnit(b.siteAreaM2, '㎡') },
    { label: '건축면적', value: withUnit(b.buildingAreaM2, '㎡') },
    { label: '건폐율', value: withUnit(b.bcrPercent, '%') },
    { label: '연면적', value: withUnit(b.totalFloorAreaM2, '㎡') },
    { label: '용적률산정연면적', value: withUnit(b.farFloorAreaM2, '㎡') },
    { label: '용적률', value: withUnit(b.farPercent, '%') },
    { label: '주용도', value: b.mainUse },
    { label: '기타용도', value: textOrEmpty(b.etcUse) },
    { label: '세대수', value: withUnit(b.households, '세대', 0) },
    { label: '높이', value: withUnit(b.heightM, 'm') },
    { label: '지상층수', value: withUnit(b.floorsAbove, '층', 0) },
    { label: '지하층수', value: withUnit(b.floorsBelow, '층', 0) },
    { label: '사용승인일', value: textOrEmpty(b.approvalDate) },
  ]
}

/** 샘플 보고서 데이터 → 카드 항목 (건폐율·용적률은 계산 결과의 현재값 사용) */
export function rowsFromSample(data: ReportData): InfoRow[] {
  const b = data.building
  const current = data.analysis.expansion.before
  return [
    { label: '대지위치', value: b.address.jibunAddress },
    { label: '대지면적', value: withUnit(b.siteAreaM2, '㎡') },
    { label: '건축면적', value: withUnit(b.buildingAreaM2, '㎡') },
    { label: '건폐율', value: withUnit(current.currentBcrPercent, '%') },
    { label: '연면적', value: withUnit(b.totalFloorAreaM2, '㎡') },
    { label: '용적률산정연면적', value: withUnit(b.farFloorAreaM2, '㎡') },
    { label: '용적률', value: withUnit(current.currentFarPercent, '%') },
    { label: '주용도', value: b.mainUse },
    { label: '기타용도', value: textOrEmpty(b.etcUse) },
    { label: '세대수', value: withUnit(b.households, '세대', 0) },
    { label: '높이', value: withUnit(b.heightM, 'm') },
    { label: '지상층수', value: withUnit(b.floorsAbove, '층', 0) },
    { label: '지하층수', value: withUnit(b.floorsBelow, '층', 0) },
    { label: '사용승인일', value: b.approvalDate },
  ]
}
