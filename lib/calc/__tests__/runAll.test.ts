// runAll — T1·T2 × BASE/A/B/C/ALL 결과가 설계서 12-3과 같은지
import { describe, expect, it } from 'vitest'
import { getSiteData } from '@/lib/services/mockService'
import type { ExpansionPlan, SiteAnalysis } from '@/types'
import { runAll } from '../index'

const T1 = '1156011600001040048'
const T2 = '1156011600001100019'
const load = async (pnu: string) => runAll((await getSiteData(pnu))!, 'ALL')
const status = (p: ExpansionPlan, item: string) => p.checks.find((c) => c.item === item)?.status
const SCENARIOS = ['BASE', 'A', 'B', 'C', 'ALL'] as const

describe('runAll 기본', () => {
  it('5개 시나리오를 모두 계산하고 selected = 선택 시나리오', async () => {
    const r = await load(T1)
    expect(Object.keys(r.byScenario)).toEqual([...SCENARIOS])
    expect(r.selected).toBe(r.byScenario.ALL)
  })

  it('엑셀 검토 대상이 아니거나 미산정 필지는 getSiteData = null', async () => {
    expect(await getSiteData('1156011600000010000')).toBeNull()
    expect(await getSiteData('0000000000000000000')).toBeNull()
  })
})

describe('1) T1: 기존 주차 0㎡, 주차 1대 추가 확보 안 약 100.9㎡', () => {
  let r: SiteAnalysis
  it('모든 시나리오에서 기존 주차로는 0㎡ — 200%(BASE·A·C)는 용적률, 250%(B·ALL)는 주차가 제한', async () => {
    r = await load(T1)
    for (const id of SCENARIOS) expect(r.byScenario[id].plan.addGfaM2).toBe(0)
    for (const id of ['BASE', 'A', 'C'] as const) {
      expect(r.byScenario[id].plan.limitingFactor).toBe('far')
      expect(status(r.byScenario[id].plan, 'far')).toBe('fail')
    }
    for (const id of ['B', 'ALL'] as const) expect(r.byScenario[id].plan.limitingFactor).toBe('parking')
  })

  it('ALL + 주차 1대: L 1세대 전용 75.04㎡, 연면적 100.905㎡, 1개층, 판정 가능', () => {
    const o = r.byScenario.ALL.parkingOption!
    expect(o.addSpaces).toBe(1)
    expect(o.addNetM2).toBeCloseTo(75.04, 2)
    expect(o.addGfaM2).toBeCloseTo(100.905, 2)
    expect(o.addFloors).toBe(1)
    expect(o.verdict).toBe('possible')
  })
})

describe('2) T2: 주차 1세대 약 36.25㎡, 주택 연면적 BASE 불가 / C 통과', () => {
  it('용적률 완화(B·ALL, 250%): 주차 기준 S 1세대(전용 30㎡) ≈ 연면적 36.25㎡', async () => {
    const r = await load(T2)
    for (const id of ['B', 'ALL'] as const) {
      const p = r.byScenario[id].parking.plan
      expect(p.units.map((u) => u.type)).toEqual(['S'])
      expect(p.netM2).toBeCloseTo(30)
      expect(p.gfaM2).toBeCloseTo(36.25, 2)
    }
  })

  it('용적률 200%(BASE·A·C): 잔여 24.18㎡가 먼저 걸려 1세대 전용 20.01㎡', async () => {
    const r = await load(T2)
    for (const id of ['BASE', 'A', 'C'] as const) {
      expect(r.byScenario[id].parking.plan.units).toHaveLength(1)
      expect(r.byScenario[id].parking.plan.gfaM2).toBeCloseTo(24.18, 2)
    }
  })

  it('주택 연면적: 36.25㎡ 증축 시 현행 660㎡(B) 불가 — 잔여 26.41㎡, 완화 1,000㎡(ALL) 통과', async () => {
    const r = await load(T2)
    expect(status(r.byScenario.B.plan, 'housingArea')).toBe('fail')
    expect(r.byScenario.B.housing.limit.areaGfaM2).toBeCloseTo(26.41, 2)
    expect(status(r.byScenario.ALL.plan, 'housingArea')).toBe('pass')
    expect(status(r.byScenario.C.plan, 'housingArea')).toBe('pass')
    expect(r.byScenario.C.housing.limit.areaGfaM2).toBeCloseTo(366.41, 2)
  })
})

describe('3) T2: 주택 5개층 > 4층 한도 → 확인 필요', () => {
  it('C·ALL: 주택 층수 항목 불가, 종합 판정 확인 필요', async () => {
    const r = await load(T2)
    for (const id of ['C', 'ALL'] as const) {
      const p = r.byScenario[id].plan
      expect(r.byScenario[id].housing.limit.housingFloorsAfter).toBe(5)
      expect(r.byScenario[id].housing.limit.floorLimit).toBe(4)
      expect(status(p, 'housingFloors')).toBe('fail')
      expect(p.verdict).toBe('check')
    }
  })
})

describe('4) 정북 이격거리가 비어 있으면 일조 검토 확인 필요', () => {
  it('T1·T2 모든 시나리오(증축 0이어도) 일조 = check, 필요 이격거리 안내', async () => {
    for (const pnu of [T1, T2]) {
      const r = await load(pnu)
      expect(r.byScenario.BASE.allowedHeightM).toBeNull()
      for (const id of SCENARIOS) {
        const sun = r.byScenario[id].plan.checks.find((c) => c.item === 'sunlight')!
        expect(sun.status).toBe('check')
        expect(sun.detail).toContain('이격거리 확인 필요')
      }
    }
  })
})
