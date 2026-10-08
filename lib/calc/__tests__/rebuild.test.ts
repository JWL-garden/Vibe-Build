// 전체 재건축 (2026-10-08) — 복합 완화(ALL) 규칙, 1층 필로티 + 2층부터 주택, 기준 엑셀 '빈땅_신축시나리오' 산식
// 손계산: 최대 건축면적 = 대지 × 건폐율 60%(2종) / 연면적 = min(대지 × 250%, 건축면적 × 5개층, 1,000㎡ 미만)
//         세대 = 내림(연면적 × 0.8 ÷ 15㎡), 법정 주차 = max(세대 × 0.5, 전용 ÷ 75)
import { describe, expect, it } from 'vitest'
import { judgeSite, runAll } from '@/lib/calc'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import { getSiteData } from '@/lib/services/mockService'
import { buildSiteReport } from '@/lib/report/buildSiteReport'
import { calcRebuild } from '../rebuild'

const T1 = '1156011600001040010'
const T2 = '1156011600001100019'
const ALL = getEffectiveRules('ALL')
const load = async (pnu: string) => runAll((await getSiteData(pnu))!, 'REBUILD')

describe('T1 104-10 렉스빌 전체 재건축', () => {
  it('건축면적 199.5 × 60% = 119.7㎡ → 연면적 min(498.75, 598.5, 999.99) = 498.75㎡ (용적률 제한)', async () => {
    const r = (await load(T1)).rebuild
    expect(r.maxBuildingAreaM2).toBeCloseTo(119.7, 6)
    expect(r.farGfaM2).toBeCloseTo(498.75, 6)
    expect(r.floorsGfaM2).toBeCloseTo(598.5, 6)
    expect(r.housingAreaGfaM2).toBeCloseTo(999.99, 6)
    expect(r.gfaM2).toBeCloseTo(498.75, 6)
    expect(r.limitingFactor).toBe('far')
  })

  it('전용 399㎡ → 26세대(세대당 15.35㎡), 법정 주차 13대 (세대기준 13 > 주택법 5.32)', async () => {
    const r = (await load(T1)).rebuild
    expect(r.netM2).toBeCloseTo(399, 6)
    expect(r.households).toBe(26)
    expect(r.netPerUnitM2).toBeCloseTo(15.346, 3)
    expect(r.parking.perUnit).toBeCloseTo(13, 6)
    expect(r.parking.housingAct).toBeCloseTo(5.32, 6)
    expect(r.parking.required).toBeCloseTo(13, 6)
    expect(r.parking.currentActual).toBe(8)
  })

  it('주택 5개층 + 필로티 = 지상 6층, 높이 19.8m, 필요 정북 이격 19.8 × 1/4 = 4.95m, 기존 대비 +120.51㎡', async () => {
    const r = (await load(T1)).rebuild
    expect(r.housingFloors).toBe(5)
    expect(r.totalFloors).toBe(6)
    expect(r.heightM).toBeCloseTo(19.8, 6)
    expect(r.requiredSetbackM).toBeCloseTo(4.95, 6)
    expect(r.gfaM2 - r.existing.gfaM2).toBeCloseTo(120.51, 2)
    expect(r.verdict).toBe('possible')
    expect(r.checks.find((c) => c.item === 'sunlight')!.status).toBe('check') // 이격 미입력
    expect(r.checks.find((c) => c.item === 'parking')!.status).toBe('check')
  })

  it('자산가치: 후 = 토지 1,062,372,000 + 신축 498.75㎡ × 200만 = 2,059,872,000 (기존 건물 철거)', async () => {
    const a = (await load(T1)).asset
    expect(a.demolished).toBe(true)
    expect(a.beforeWon).toBe(1_546_519_200)
    expect(a.addBuilding.valueWon).toBe(997_500_000)
    expect(a.afterWon).toBe(2_059_872_000)
  })
})

describe('T2 110-19 전체 재건축', () => {
  it('건축면적 373.1 × 60% = 223.86㎡ → 연면적 932.75㎡(용적률), 49세대, 법정 주차 24.5대, 지상 6층', async () => {
    const r = (await load(T2)).rebuild
    expect(r.maxBuildingAreaM2).toBeCloseTo(223.86, 6)
    expect(r.gfaM2).toBeCloseTo(932.75, 6)
    expect(r.limitingFactor).toBe('far')
    expect(r.households).toBe(49)
    expect(r.parking.required).toBeCloseTo(24.5, 6)
    expect(r.totalFloors).toBe(6)
    expect(r.gfaM2 - r.existing.gfaM2).toBeCloseTo(210.73, 2)
  })
})

describe('재건축 계산 규칙', () => {
  it('정북 이격 4m 입력 → 허용 max(15, 4 ÷ 1/4) = 16m → 지상 4층(주택 3개층) 359.1㎡로 축소, 제한요인 일조', async () => {
    const data = (await getSiteData(T1))!
    const r = calcRebuild(
      { site: data.site, housingType: '다세대', bcrLimitPercent: 60, zoneSunlightApplies: true, northSetbackM: 4 },
      ALL,
      'ALL',
    )
    expect(r.allowedHeightM).toBe(16)
    expect(r.housingFloors).toBe(3)
    expect(r.totalFloors).toBe(4)
    expect(r.gfaM2).toBeCloseTo(359.1, 6)
    expect(r.limitingFactor).toBe('sunlight')
  })

  it('다가구는 세대수 상한 19세대 (T2 대지, 주택 4개층 한도 → 연면적 895.44㎡)', async () => {
    const data = (await getSiteData(T2))!
    const r = calcRebuild(
      { site: data.site, housingType: '다가구', bcrLimitPercent: 60, zoneSunlightApplies: true, northSetbackM: null },
      ALL,
      'ALL',
    )
    expect(r.gfaM2).toBeCloseTo(895.44, 6)
    expect(r.limitingFactor).toBe('housingFloors')
    expect(r.households).toBe(19)
  })

  it('REBUILD 선택 시 selected는 ALL 규칙의 증축 결과, 재건축은 시나리오와 무관하게 항상 계산', async () => {
    const data = (await getSiteData(T1))!
    const rebuild = runAll(data, 'REBUILD')
    const base = runAll(data, 'BASE')
    expect(rebuild.selected).toBe(rebuild.byScenario.ALL)
    expect(base.rebuild.gfaM2).toBeCloseTo(rebuild.rebuild.gfaM2, 9)
    expect(base.asset.demolished).toBe(false)
  })
})

describe('REBUILD 판정·보고서', () => {
  it('판정: 재건축 가능 — 지상 6층, 498.8㎡(+120.5㎡), 26세대, 법정 주차 13대 확인 필요', async () => {
    const j = judgeSite(await load(T1))
    expect(j.status).toBe('possible')
    expect(j.reason).toContain('지상 6층(1층 필로티 + 주택 5개층), 연면적 498.8㎡(기존 대비 +120.5㎡), 26세대')
    expect(j.reason).toContain('법정 주차 13대')
  })

  it('보고서: 표지 KPI·3장 재건축안·2장 시나리오 표 3행(REBUILD 선택)', async () => {
    const data = (await getSiteData(T2))!
    const r = buildSiteReport(data, runAll(data, 'REBUILD'), '2026-10-08')
    expect(r.summary.kpis[0].value).toBe('지상 6층 · 932.8㎡')
    expect(r.summary.kpis.map((k) => k.label)).toEqual(['재건축 규모', '총사업비', 'ROI (기준)', '투자회수기간'])
    expect(r.summary.kpis[1].value).toBe('28.7억원')
    expect(r.summary.addFloors).toBe(0) // 기존도 지상 6층
    expect(r.plan.kind).toBe('rebuild')
    expect(r.plan.rebuild).toBe(r.analysis.rebuild)
    expect(r.regulation.scenarioRows.map((row) => row[0].split(' ')[0])).toEqual(['BASE', 'ALL', 'REBUILD'])
    expect(r.regulation.selectedRow).toBe(2)
    expect(r.asset.rows[1][2]).toBe('– (철거)')
  })
})
