import { describe, expect, it } from 'vitest'
import parkingReviewJson from '@/lib/data/parkingReview.json'
import sitesJson from '@/lib/data/sites.json'
import unitsJson from '@/lib/data/units.json'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import type { ExcelSite, ExcelUnit, ParkingReviewRow, ZoneName } from '@/types'
import { calcFar } from '../far'
import { bestAddUnits, buildParkingUnits, calcParking } from '../parking'

const sites = sitesJson.items as ExcelSite[]
const units = unitsJson.items as ExcelUnit[]
const reviewRows = parkingReviewJson.items as ParkingReviewRow[]
const BASE = getEffectiveRules('BASE')
const B = getEffectiveRules('B')

/** 기준 엑셀 한 필지를 B(용적률 완화) 기준으로 계산 */
function runSite(pnu: string) {
  const site = sites.find((s) => s.pnu === pnu)!
  const row = reviewRows.find((r) => r.pnu === pnu)!
  const far = calcFar(
    { siteAreaM2: row.siteAreaM2!, farFloorAreaM2: row.farFloorAreaM2!, zone: row.zone as ZoneName, netRatio: row.netRatio! },
    B,
  )
  const parking = calcParking(
    {
      units: buildParkingUnits(site, units, B),
      actualSpaces: row.actualParking!,
      remainingNetM2: far.remainingNetM2,
      netRatio: row.netRatio!,
    },
    B,
  )
  return { site, row, far, parking }
}

const types = (p: { units: { type: string }[] }) => p.units.map((u) => u.type)

describe('주차 조합 (설계서 5-7, 잔여 전용면적 충분)', () => {
  const ROOM = 500

  it('여유 0.5대 → S 1세대 전용 30㎡', () => {
    const p = bestAddUnits(0.5, ROOM, 1, BASE)
    expect(types(p)).toEqual(['S'])
    expect(p.netM2).toBeCloseTo(30)
  })

  it('여유 0.8대 → M 1세대 전용 60㎡', () => {
    const p = bestAddUnits(0.8, ROOM, 1, BASE)
    expect(types(p)).toEqual(['M'])
    expect(p.netM2).toBeCloseTo(60)
  })

  it('여유 0.1대 → 0세대', () => {
    expect(bestAddUnits(0.1, ROOM, 1, BASE).units).toHaveLength(0)
  })

  it('여유 1.1대 + 잔여 전용 75.04㎡ → L 1세대 75.04㎡ (S 2세대 60㎡보다 큼)', () => {
    const p = bestAddUnits(1.1, 75.04, 1, BASE)
    expect(types(p)).toEqual(['L'])
    expect(p.netM2).toBeCloseTo(75.04)
  })

  it('여유가 음수면 0세대, 소수 오차(0.4999999)는 0.5로 보정', () => {
    expect(bestAddUnits(-2, ROOM, 1, BASE).units).toHaveLength(0)
    expect(types(bestAddUnits(0.49999999, ROOM, 1, BASE))).toEqual(['S'])
  })

  it('세대당 전용 15㎡ 미만이 되는 조합은 제외 (잔여 전용 20㎡, 여유 1.0 → 2세대 아닌 1세대)', () => {
    const p = bestAddUnits(1.0, 20, 1, BASE)
    expect(p.units).toHaveLength(1)
    expect(p.netM2).toBeCloseTo(20)
  })

  it('연면적 = 추가 전용 ÷ 전용률', () => {
    expect(bestAddUnits(0.5, ROOM, 0.8, BASE).gfaM2).toBeCloseTo(37.5)
  })
})

describe('T1 당산동6가 104-48 (설계서 12-2, 12-3)', () => {
  const { parking } = runSite('1156011600001040048')

  it('현재 법정 2.9대 = 단독 1.6 + 근생 1.3 (복합용도 절사), 여유 0.1대', () => {
    expect(parking.required.detached).toBeCloseTo(1.6)
    expect(parking.required.neighborhood).toBeCloseTo(1.3)
    expect(parking.required.total).toBeCloseTo(2.9)
    expect(parking.required.mixedUse).toBe(true)
    expect(parking.spare).toBeCloseTo(0.1)
  })

  it('기존 주차로는 0세대, 0㎡', () => {
    expect(parking.plan.units).toHaveLength(0)
    expect(parking.plan.gfaM2).toBe(0)
  })

  it('주차 1대 추가 확보 → 여유 1.1 → L 1세대 전용 75.04㎡ ≈ 연면적 100.9㎡', () => {
    expect(parking.option).not.toBeNull()
    expect(parking.option!.addSpaces).toBe(1)
    expect(parking.option!.spareAfter).toBeCloseTo(1.1)
    expect(types(parking.option!)).toEqual(['L'])
    expect(parking.option!.netM2).toBeCloseTo(75.04, 2)
    expect(parking.option!.gfaM2).toBeCloseTo(100.905, 2)
  })

  it('엑셀 방식: 1세대에 +0.4대, 면적최대 5세대에 +2.4대', () => {
    expect(parking.excel.needFor1Unit).toBeCloseTo(0.4)
    expect(parking.excel.maxAreaUnits).toBe(5)
    expect(parking.excel.needForMaxArea).toBeCloseTo(2.4)
  })
})

describe('T2 당산동6가 110-19 (설계서 12-2, 12-3)', () => {
  const { parking } = runSite('1156011600001100019')

  it('현재 법정 10.5대 = 세대기준 9.9 + 근생 0.6, 여유 0.5대', () => {
    expect(parking.required.housing).toBeCloseTo(9.9)
    expect(parking.required.neighborhood).toBeCloseTo(0.6)
    expect(parking.required.total).toBeCloseTo(10.5)
    expect(parking.spare).toBeCloseTo(0.5)
  })

  it('S 1세대 전용 30㎡ ≈ 연면적 36.25㎡, 추가 확보 안 없음', () => {
    expect(types(parking.plan)).toEqual(['S'])
    expect(parking.plan.netM2).toBeCloseTo(30)
    expect(parking.plan.gfaM2).toBeCloseTo(36.25, 2)
    expect(parking.option).toBeNull()
  })
})

describe('parking.ts ↔ 기준 엑셀 용적률완화_주차검토 (미산정 제외 전체 행, ±0.01)', () => {
  const rows = reviewRows.filter((r) => r.verdict !== '미산정')
  const close = (calc: number | null, excel: number | null) => {
    if (excel === null) expect(calc).toBeNull()
    else expect(Math.abs(calc! - excel)).toBeLessThanOrEqual(0.01)
  }

  it.each(rows.map((r) => [r.pnu, r.category] as const))('%s %s', (pnu) => {
    const { row, parking } = runSite(pnu)
    close(parking.required.total, row.requiredParking)
    close(parking.spare, row.spareParking)
    // 최대 추가 세대: 엑셀이 null(용적률 여유 없음)이면 0세대
    expect(parking.plan.units.length).toBe(row.maxAddUnits ?? 0)
    expect(parking.excel.maxAddUnits).toBe(row.maxAddUnits)
    close(parking.excel.needFor1Unit, row.needFor1Unit)
    close(parking.excel.maxAreaUnits, row.maxAreaUnits)
    close(parking.excel.needForMaxArea, row.needForMaxArea)
  })
})
