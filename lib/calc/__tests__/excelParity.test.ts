// 엑셀 대조 테스트 (설계서 5-7, 12-1)
// 기준 엑셀 '용적률완화_주차검토' 시트에서 판정이 '미산정'이 아닌 모든 행을 계산 엔진(calcExpansion)으로 다시 계산해
// 허용오차 ±0.01 안에서 같은지 비교한다. 다른 칸이 있으면 PNU·항목·엑셀값·계산값 표를 출력하고 실패한다.
// 엑셀은 완화 용적률(2종 250 / 3종 300) 기준이므로 시나리오 B 규칙으로 계산한다.

import { describe, expect, it } from 'vitest'
import parkingReviewJson from '@/lib/data/parkingReview.json'
import sitesJson from '@/lib/data/sites.json'
import unitsJson from '@/lib/data/units.json'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import type { ExcelSite, ExcelUnit, ParkingReviewRow, SiteExpansionResult } from '@/types'
import { calcExpansion } from '../expansion'

const sites = sitesJson.items as ExcelSite[]
const units = unitsJson.items as ExcelUnit[]
const rows = (parkingReviewJson.items as ParkingReviewRow[]).filter((r) => r.verdict !== '미산정')
const B = getEffectiveRules('B')
const TOLERANCE = 0.01

/** [엑셀 열 이름, 엑셀 값, 계산 값] */
type Item = [string, (r: ParkingReviewRow) => number | null, (e: SiteExpansionResult) => number | null]

const ITEMS: Item[] = [
  ['완화후허용연면적', (r) => r.relaxedMaxGfaM2, (e) => e.far.maxGfaM2],
  ['추가가능연면적', (r) => r.addableGfaM2, (e) => e.far.remainingGfaM2],
  ['추가가능전용면적', (r) => r.addableNetM2, (e) => e.far.remainingNetM2],
  ['실제주차대수', (r) => r.actualParking, (e) => e.parking.actual],
  ['현재법정대수', (r) => r.requiredParking, (e) => e.parking.required.total],
  ['기존여유대수', (r) => r.spareParking, (e) => e.parking.spare],
  // 엑셀이 빈칸(용적률 여유 없음)이면 엔진은 0세대
  ['주차여유내_최대추가세대', (r) => r.maxAddUnits ?? 0, (e) => e.parking.plan.units.length],
  ['필요추가주차_1세대', (r) => r.needFor1Unit, (e) => e.parking.excel.needFor1Unit],
  ['면적최대세대수', (r) => r.maxAreaUnits, (e) => e.parking.excel.maxAreaUnits],
  ['필요추가주차_면적최대', (r) => r.needForMaxArea, (e) => e.parking.excel.needForMaxArea],
]

interface Mismatch {
  PNU: string
  항목: string
  엑셀값: number | string | null
  계산값: number | string | null
}

function compareAll(): { mismatches: Mismatch[]; checked: number } {
  const mismatches: Mismatch[] = []
  for (const row of rows) {
    const site = sites.find((s) => s.pnu === row.pnu)
    if (!site) {
      mismatches.push({ PNU: row.pnu, 항목: '건축물대장', 엑셀값: '있음', 계산값: 'sites.json에 없음' })
      continue
    }
    let result: SiteExpansionResult
    try {
      result = calcExpansion({ scenarioId: 'B', site, units, netRatio: row.netRatio!, siteInput: null }, B)
    } catch (error) {
      mismatches.push({ PNU: row.pnu, 항목: '계산 오류', 엑셀값: null, 계산값: String(error) })
      continue
    }
    for (const [name, excelOf, calcOf] of ITEMS) {
      const excel = excelOf(row)
      const calc = calcOf(result)
      const same = excel === null || calc === null ? excel === calc : Math.abs(excel - calc) <= TOLERANCE
      if (!same) mismatches.push({ PNU: row.pnu, 항목: name, 엑셀값: excel, 계산값: calc })
    }
  }
  return { mismatches, checked: rows.length }
}

describe('기준 엑셀 대조 (용적률완화_주차검토, ±0.01)', () => {
  it('미산정 제외 32행 × 10항목이 계산 엔진과 같다', () => {
    const { mismatches, checked } = compareAll()
    if (mismatches.length > 0) {
      console.log(`\n엑셀 불일치 ${mismatches.length}건`)
      console.table(mismatches)
    }
    expect(checked).toBe(32)
    expect(mismatches).toEqual([])
  })
})
