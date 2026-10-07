// 기준 엑셀 대조 항목 (설계서 5-7) — excelParity 테스트와 보고서 '데이터 검증' 페이지가 함께 쓴다
// 엑셀 '용적률완화_주차검토'는 완화 용적률(2종 250 / 3종 300) 기준이므로 시나리오 B 결과와 비교한다.

import type { ParkingReviewRow, SiteExpansionResult } from '@/types'

/** 허용오차 (설계서 5-7: ±0.01) */
export const PARITY_TOLERANCE = 0.01

export interface ParityItem {
  /** 엑셀 열 이름 */
  name: string
  excel: (r: ParkingReviewRow) => number | null
  calc: (e: SiteExpansionResult) => number | null
}

export const PARITY_ITEMS: ParityItem[] = [
  { name: '완화후허용연면적', excel: (r) => r.relaxedMaxGfaM2, calc: (e) => e.far.maxGfaM2 },
  { name: '추가가능연면적', excel: (r) => r.addableGfaM2, calc: (e) => e.far.remainingGfaM2 },
  { name: '추가가능전용면적', excel: (r) => r.addableNetM2, calc: (e) => e.far.remainingNetM2 },
  { name: '실제주차대수', excel: (r) => r.actualParking, calc: (e) => e.parking.actual },
  { name: '현재법정대수', excel: (r) => r.requiredParking, calc: (e) => e.parking.required.total },
  { name: '기존여유대수', excel: (r) => r.spareParking, calc: (e) => e.parking.spare },
  // 엑셀이 빈칸(용적률 여유 없음)이면 엔진은 0세대
  { name: '주차여유내_최대추가세대', excel: (r) => r.maxAddUnits ?? 0, calc: (e) => e.parking.plan.units.length },
  { name: '필요추가주차_1세대', excel: (r) => r.needFor1Unit, calc: (e) => e.parking.excel.needFor1Unit },
  { name: '면적최대세대수', excel: (r) => r.maxAreaUnits, calc: (e) => e.parking.excel.maxAreaUnits },
  { name: '필요추가주차_면적최대', excel: (r) => r.needForMaxArea, calc: (e) => e.parking.excel.needForMaxArea },
]

export interface ParityResult {
  name: string
  excel: number | null
  calc: number | null
  match: boolean
}

/** 엑셀 한 행과 계산 결과(시나리오 B)를 항목별로 비교 */
export function compareWithExcel(row: ParkingReviewRow, result: SiteExpansionResult): ParityResult[] {
  return PARITY_ITEMS.map(({ name, excel: excelOf, calc: calcOf }) => {
    const excel = excelOf(row)
    const calc = calcOf(result)
    const match = excel === null || calc === null ? excel === calc : Math.abs(excel - calc) <= PARITY_TOLERANCE
    return { name, excel, calc, match }
  })
}
