// 증축 산정 v3 — 설계서 12-3 "의도된 검토 결과" 대조
import { describe, expect, it } from 'vitest'
import parkingReviewJson from '@/lib/data/parkingReview.json'
import siteInputsJson from '@/lib/data/siteInputs.json'
import sitesJson from '@/lib/data/sites.json'
import unitsJson from '@/lib/data/units.json'
import { deepMerge, getEffectiveRules } from '@/lib/rules/scenarios'
import type { ExcelSite, ExcelUnit, ParkingReviewRow, Rules, ScenarioId, SiteInput } from '@/types'
import { calcExpansion } from '../expansion'

const sites = sitesJson.items as ExcelSite[]
const units = unitsJson.items as ExcelUnit[]
const reviews = parkingReviewJson.items as ParkingReviewRow[]
const siteInputs = siteInputsJson.items as SiteInput[]
const DANGSAN = '1156011600001040048'
const T2 = '1156011600001100019'

/** 테스트 전용: ALL에 다중주택 4개층을 더한 규칙 (주차 추가 확보 → 증축 가능 경로 검증용, 실제 시나리오 아님) */
const ALL_WITH_MULTI4: Rules = deepMerge(getEffectiveRules('ALL'), { housing: { maxFloors: { 다중주택: 4 } } })

function run(pnu: string, scenarioId: ScenarioId, siteInput?: Partial<SiteInput>, rules?: Rules) {
  const site = sites.find((s) => s.pnu === pnu)!
  const base = siteInputs.find((s) => s.pnu === pnu) ?? null
  return calcExpansion(
    {
      scenarioId,
      site,
      units,
      netRatio: reviews.find((r) => r.pnu === pnu)!.netRatio!,
      siteInput: base && { ...base, ...siteInput },
    },
    rules ?? getEffectiveRules(scenarioId),
  )
}
const status = (checks: { item: string; status: string }[], item: string) => checks.find((c) => c.item === item)?.status

describe('당산동6가 104-48 당산빌 (참고 — 2026-10-07 T1에서 제외, 주차 추가 확보 경로 회귀 테스트)', () => {
  it('BASE: 용적률 잔여 0.87㎡(사실상 불가), 기존 주차 0세대 → 증축 불가 (제한: 용적률), 추가 확보 안 없음', () => {
    const r = run(DANGSAN, 'BASE')
    expect(r.far.remainingGfaM2).toBeCloseTo(0.87, 2)
    expect(r.plan.addGfaM2).toBe(0)
    expect(r.plan.limitingFactor).toBe('far')
    expect(r.parkingOption).toBeNull()
  })

  it('B: 기존 주차 0세대. 주차 +1대 → L 75.04㎡지만 주택 4개층 > 3 → 확인 필요', () => {
    const r = run(DANGSAN, 'B')
    expect(r.plan.addGfaM2).toBe(0)
    expect(r.parkingOption!.addSpaces).toBe(1)
    expect(r.parkingOption!.addGfaM2).toBe(0)
    expect(r.parkingOption!.limitingFactor).toBe('housingFloors')
  })

  it('ALL(실제 규칙): 주차 +1대 → 75.04㎡지만 다중주택은 8·13 대책에서 완화 안 됨 → 4개층 > 3 → 확인 필요', () => {
    const o = run(DANGSAN, 'ALL').parkingOption!
    expect(o.addGfaM2).toBe(0)
    expect(o.limitingFactor).toBe('housingFloors')
    expect(o.verdict).toBe('check')
  })

  it('[테스트 규칙: 다중주택 4개층] ALL + 주차 1대 추가: 주차 기준 100.9㎡지만 증축층 바닥면적(옵션1 32.81 × 0.9 = 29.53㎡)·주택 층수로 1개층 29.53㎡', () => {
    const o = run(DANGSAN, 'ALL', undefined, ALL_WITH_MULTI4).parkingOption!
    expect(o.addUnits).toHaveLength(1)
    expect(o.addGfaM2).toBeCloseTo(29.529, 3)
    expect(o.addFloors).toBe(1)
    expect(o.newHeightM).toBeCloseTo(18.95)
    expect(status(o.checks, 'housingFloors')).toBe('pass')
    expect(status(o.checks, 'housingArea')).toBe('pass')
    expect(status(o.checks, 'sunlight')).toBe('check')
    expect(status(o.checks, 'floorPlate')).toBe('pass')
  })

  it('1개층 증축 시 필요 정북 이격: BASE 9.475m / A·ALL 4.7375m', () => {
    expect(run(DANGSAN, 'BASE').requiredSetbackM).toBeCloseTo(9.475)
    expect(run(DANGSAN, 'ALL').requiredSetbackM).toBeCloseTo(4.7375)
  })

  it('[테스트 규칙] 이격거리를 입력하면 일조로 층수를 줄인다 (이격 4m, ALL → 허용 16m < 18.95m → 불가)', () => {
    const o = run(DANGSAN, 'ALL', { northSetbackM: 4 }, ALL_WITH_MULTI4).parkingOption!
    expect(o.addGfaM2).toBe(0)
    expect(o.limitingFactor).toBe('sunlight')
    expect(status(o.checks, 'sunlight')).toBe('fail')
  })

  it('[테스트 규칙] 이격 5m, ALL → 허용 20m ≥ 18.95m → 통과', () => {
    const o = run(DANGSAN, 'ALL', { northSetbackM: 5 }, ALL_WITH_MULTI4).parkingOption!
    expect(o.addFloors).toBe(1)
    expect(status(o.checks, 'sunlight')).toBe('pass')
  })
})

describe('T2 당산동6가 110-19 (설계서 12-3)', () => {
  it('BASE: 용적률 잔여 24.18㎡', () => {
    expect(run(T2, 'BASE').far.remainingGfaM2).toBeCloseTo(24.18, 2)
  })

  it('B: 주차 S 1세대 36.25㎡ → 주택 연면적 잔여 26.41㎡로 축소 → 주택 5개층 > 3 → 불가', () => {
    const r = run(T2, 'B')
    expect(r.parking.plan.gfaM2).toBeCloseTo(36.25, 2)
    expect(status(r.plan.checks, 'housingArea')).toBe('fail')
    expect(r.plan.addGfaM2).toBe(0)
    expect(r.plan.limitingFactor).toBe('housingFloors')
  })

  it('BASE·B: 다세대 4개층 + 1 = 5개층 > 4 → 불가 (대안 확인 필요 안내)', () => {
    for (const id of ['BASE', 'B'] as const) {
      const r = run(T2, id)
      expect(status(r.plan.checks, 'housingFloors')).toBe('fail')
      expect(r.plan.limitingFactor).toBe('housingFloors')
      expect(r.plan.checks.find((c) => c.item === 'housingFloors')!.detail).toContain('대안 확인 필요')
    }
  })

  it('C·ALL(다세대 5개층): 5개층 ≤ 5 → 증축 가능 — C는 용적률 24.18㎡, ALL은 주차 36.25㎡', () => {
    const c = run(T2, 'C').plan
    const all = run(T2, 'ALL').plan
    for (const p of [c, all]) {
      expect(status(p.checks, 'housingArea')).toBe('pass')
      expect(status(p.checks, 'housingFloors')).toBe('pass')
      expect(p.verdict).toBe('possible')
      expect(p.addFloors).toBe(1)
    }
    expect(c.addGfaM2).toBeCloseTo(24.18, 2)
    expect(c.limitingFactor).toBe('far')
    expect(all.addGfaM2).toBeCloseTo(36.25, 2)
    expect(all.limitingFactor).toBe('parking')
  })

  it('1개층 증축 시 필요 정북 이격: 17 + 3.3 = 20.3m → BASE 10.15m / A 5.075m', () => {
    expect(run(T2, 'BASE').requiredSetbackM).toBeCloseTo(10.15)
    expect(run(T2, 'A').requiredSetbackM).toBeCloseTo(5.075)
  })
})
