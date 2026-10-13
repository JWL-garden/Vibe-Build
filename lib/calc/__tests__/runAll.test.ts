// runAll — T1(104-10)·T2(110-19) × BASE/A/B/C/ALL 결과가 설계서 12-3과 같은지 (+ 104-48 참고 회귀 테스트)
import { describe, expect, it } from 'vitest'
import { getSiteData } from '@/lib/services/mockService'
import type { ExpansionPlan, SiteAnalysis } from '@/types'
import { judgeSite, runAll } from '../index'

const T1 = '1156011600001040010'
const DANGSAN = '1156011600001040048' // 104-48 당산빌: 2026-10-07 T1에서 제외, 주차 추가 확보 경로 회귀 테스트
const T2 = '1156011600001100019'
const load = async (pnu: string) => runAll((await getSiteData(pnu))!, 'ALL')
const status = (p: ExpansionPlan, item: string) => p.checks.find((c) => c.item === item)?.status
const SCENARIOS = ['BASE', 'A', 'B', 'C', 'ALL'] as const

describe('runAll 기본', () => {
  it('5개 시나리오를 모두 계산하고 selected = 선택 시나리오', async () => {
    const r = await load(DANGSAN)
    expect(Object.keys(r.byScenario)).toEqual([...SCENARIOS])
    expect(r.selected).toBe(r.byScenario.ALL)
  })

  it('엑셀 검토 대상이 아니거나 미산정 필지는 getSiteData = null', async () => {
    expect(await getSiteData('1156011600000010000')).toBeNull()
    expect(await getSiteData('0000000000000000000')).toBeNull()
  })
})

describe('104-48 당산빌(참고): 기존 주차 0㎡, 주차 1대 추가 확보 안은 다중주택 층수 한도로 확인 필요', () => {
  let r: SiteAnalysis
  it('모든 시나리오에서 기존 주차로는 0㎡ — 200%(BASE·A·C)는 용적률, 250%(B·ALL)는 주차가 제한', async () => {
    r = await load(DANGSAN)
    for (const id of SCENARIOS) expect(r.byScenario[id].plan.addGfaM2).toBe(0)
    for (const id of ['BASE', 'A', 'C'] as const) {
      expect(r.byScenario[id].plan.limitingFactor).toBe('far')
      expect(status(r.byScenario[id].plan, 'far')).toBe('fail')
    }
    for (const id of ['B', 'ALL'] as const) expect(r.byScenario[id].plan.limitingFactor).toBe('parking')
  })

  it('ALL + 주차 1대: 주차 기준 L 1세대 75.04㎡지만 다중주택 3개층 한도(8·13 대책 미완화) → 확인 필요', () => {
    const o = r.byScenario.ALL.parkingOption!
    expect(o.addSpaces).toBe(1)
    expect(r.byScenario.ALL.parking.option!.netM2).toBeCloseTo(75.04, 2)
    expect(o.addGfaM2).toBe(0)
    expect(o.limitingFactor).toBe('housingFloors')
    expect(o.verdict).toBe('check')
  })
})

describe('T1 당산동6가 104-10 렉스빌 (2026-10-07 변경)', () => {
  it('주차: 법정 6.1대(세대기준), 실제 8대, 여유 1.9대', async () => {
    const r = await load(T1)
    expect(r.selected.parking.required.total).toBeCloseTo(6.1)
    expect(r.selected.parking.actual).toBe(8)
    expect(r.selected.parking.spare).toBeCloseTo(1.9)
  })

  it('용적률 250%(B·ALL): 기존 주차로 3세대, 전용 104.54㎡ = 연면적 120.51㎡ (용적률 잔여와 같음)', async () => {
    const r = await load(T1)
    for (const id of ['B', 'ALL'] as const) {
      const e = r.byScenario[id]
      expect(e.parking.plan.units).toHaveLength(3)
      expect(e.parking.plan.netM2).toBeCloseTo(104.54, 2)
      expect(e.parking.plan.gfaM2).toBeCloseTo(120.51, 2)
      expect(e.far.remainingGfaM2).toBeCloseTo(120.51, 2)
    }
  })

  it('용적률 200%(BASE·A·C): 잔여 20.76㎡ → 1세대(전용 18.01㎡)', async () => {
    const r = await load(T1)
    for (const id of ['BASE', 'A', 'C'] as const) {
      expect(r.byScenario[id].parking.plan.units).toHaveLength(1)
      expect(r.byScenario[id].parking.plan.gfaM2).toBeCloseTo(20.76, 2)
    }
  })

  it('주택: 다세대 2~5층 4개층·378.24㎡ → 현행 한도 4개층인 BASE·A·B는 확인 필요 (B는 +3개층 → 7개층)', async () => {
    const r = await load(T1)
    expect(r.selected.housing.housingFloors).toBe(4)
    expect(r.selected.housing.housingAreaM2).toBeCloseTo(378.24, 2)
    for (const id of ['BASE', 'A', 'B'] as const) {
      const p = r.byScenario[id].plan
      expect(status(p, 'housingFloors')).toBe('fail')
      expect(p.verdict).toBe('check')
      expect(p.limitingFactor).toBe('housingFloors')
    }
    // 증축층 바닥면적 옵션1 = 5층 전유 59.81 × 0.9 = 53.829㎡ → 120.51 ÷ 53.829 = 3개층
    expect(r.byScenario.B.plan.attemptedFloors).toBe(3)
    expect(r.byScenario.B.plan.housingFloorsAfter).toBe(7)
    expect(r.byScenario.B.plan.checks.find((c) => c.item === 'housingFloors')!.detail).toContain('+3개층 주택 시 7개층 > 한도 4개층')
  })

  it('C(다세대 5개층): 용적률 잔여 20.76㎡ → +1개층, 5개층 ≤ 5 → 증축 가능', async () => {
    const p = (await load(T1)).byScenario.C.plan
    expect(p.verdict).toBe('possible')
    expect(p.addFloors).toBe(1)
    expect(p.addGfaM2).toBeCloseTo(20.76, 2)
    expect(p.housingFloorsAfter).toBe(5)
  })

  it('ALL: +3개층 필요 → 주택 7개층 > 5 → 한도에 맞춰 +1개층(증축층 바닥면적 옵션1 53.83㎡)으로 축소. 연면적은 증축계획안 엑셀 29.8㎡ ÷ 최소 14㎡ = 2세대(옥탑세대, 측면 확장 0)', async () => {
    const p = (await load(T1)).byScenario.ALL.plan
    expect(p.attemptedFloors).toBe(3)
    expect(p.addFloors).toBe(1)
    expect(p.addGfaM2).toBeCloseTo(29.8, 6) // 증축계획안 엑셀(261013-a) 증축 가능 연면적 — 일조 완화 시나리오에서만
    expect(p.sideGfaM2).toBeCloseTo(0, 6) // 29.8㎡ 전부 새 세대(전용 25.85㎡, 최소 15㎡ 이상 1세대)
    expect(p.addUnits).toHaveLength(2) // 14.9㎡ × 2 (연면적 = 전용, 주차 0.5대씩)
    expect(p.housingFloorsAfter).toBe(5)
    expect(p.limitingFactor).toBe('housingFloors')
    expect(p.verdict).toBe('possible')
    expect(p.checks.find((c) => c.item === 'housingFloors')!.detail).toContain('+1개층(53.83㎡)으로 축소')
  })

  it('배지 문장은 실제 증축 층수를 쓴다: BASE = "주택 1개층 증축 시 5개층", ALL = 증축 가능 +1개층', async () => {
    const data = (await getSiteData(T1))!
    const b = judgeSite(runAll(data, 'BASE'))
    expect(b.status).toBe('check')
    expect(b.reason).toContain('주택 1개층 증축 시 주택 층수가 5개층으로 한도(4개층)')
    const all = judgeSite(runAll(data, 'ALL'))
    expect(all.status).toBe('possible')
    expect(all.reason).toContain('+1개층(+29.8㎡, 2세대)')
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
    expect(r.byScenario.C.housing.limit.areaGfaM2).toBeCloseTo(366.4, 2)
  })
})

describe('3) T2: 주택 5개층 — 현행 4개층 한도는 확인 필요, C·ALL(다세대 5개층)은 증축 가능', () => {
  it('BASE·A·B: 주택 층수 항목 불가, 종합 판정 확인 필요', async () => {
    const r = await load(T2)
    for (const id of ['BASE', 'A', 'B'] as const) {
      const p = r.byScenario[id].plan
      expect(p.housingFloorsAfter).toBe(5)
      expect(r.byScenario[id].housing.limit.floorLimit).toBe(4)
      expect(status(p, 'housingFloors')).toBe('fail')
      expect(p.verdict).toBe('check')
    }
  })

  it('C·ALL: 5개층 ≤ 한도 5 → 증축 가능', async () => {
    const r = await load(T2)
    for (const id of ['C', 'ALL'] as const) {
      expect(r.byScenario[id].housing.limit.floorLimit).toBe(5)
      expect(r.byScenario[id].plan.verdict).toBe('possible')
    }
  })
})

describe('4) 정북 이격거리가 비어 있으면 일조 검토 확인 필요', () => {
  it('T1·T2 모든 시나리오(증축 0이어도) 일조 = check, 필요 이격거리 안내', async () => {
    for (const pnu of [T1, T2, DANGSAN]) {
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

describe('judgeSite 증축 가능 여부 배지', () => {
  it('104-48 당산빌(참고): ALL = 확인 필요(주차 +1대 해도 다중주택 층수 초과), BASE = 불가(용적률)', async () => {
    const data = (await getSiteData(DANGSAN))!
    const all = judgeSite(runAll(data, 'ALL'))
    expect(all.status).toBe('check')
    expect(all.reason).toContain('주차 1대를 추가 확보해도')
    const base = judgeSite(runAll(data, 'BASE'))
    expect(base.status).toBe('impossible')
    expect(base.reason).toContain('용적률')
  })

  it('T2: ALL = 증축 가능 +1개층(+69.3㎡, 1세대: 증축계획안 엑셀 값), BASE = 확인 필요 (주택 1개층 증축 시 5개층 > 4)', async () => {
    const data = (await getSiteData(T2))!
    const all = judgeSite(runAll(data, 'ALL'))
    expect(all.status).toBe('possible')
    expect(all.reason).toContain('+1개층(+69.3㎡, 1세대)')
    const base = judgeSite(runAll(data, 'BASE'))
    expect(base.status).toBe('check')
    expect(base.reason).toContain('주택 1개층 증축 시 주택 층수가 5개층으로 한도(4개층)')
  })
})
