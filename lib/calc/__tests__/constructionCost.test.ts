// 공사비 실적 요약 — 기준 엑셀 '하우빌드 2026환산' 집계표(5번 표)와 같은 값이 나오는지, 신축 단가 가정값 채움 우선순위
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import {
  calcBuildingCostGrowth,
  percentile,
  summarizeConstruction,
  summarizeFloorWorkCost,
  summarizeFloorWorkCostTable,
  withConstructionUnitCost,
} from '@/lib/calc/constructionCost'
import constructionJson from '@/lib/data/construction.json'
import { getSiteData } from '@/lib/services/mockService'
import type { AssumptionRow, ConstructionCostRow } from '@/types'

const rows = constructionJson.items as ConstructionCostRow[]
const T1 = '1156011600001040010'

describe('percentile — 선형 보간', () => {
  it('[1,2,3,4] 중앙값 2.5, 75% 3.25, 25% 1.75, 빈 배열 null', () => {
    expect(percentile([4, 1, 3, 2], 0.5)).toBe(2.5)
    expect(percentile([4, 1, 3, 2], 0.75)).toBeCloseTo(3.25, 10)
    expect(percentile([4, 1, 3, 2], 0.25)).toBeCloseTo(1.75, 10)
    expect(percentile([], 0.5)).toBeNull()
  })
})

describe('summarizeConstruction — 엑셀 집계표 대조', () => {
  const s = summarizeConstruction(rows)
  const by = (label: string) => s.compare.find((c) => c.label === label)!

  it('서울 착공 2023~2025: 6건, ㎡당 연면적 중앙값 3,023,747원 (엑셀 5번 표), 평당(공사면적) 837만원', () => {
    const c = by('서울, 착공 2023~2025')
    expect(c.count).toBe(6)
    expect(c.perM2Median).toBeCloseTo(3_023_747.2, 0)
    expect(c.pyeongWorkMedianManwon).toBeCloseTo(836.79, 1)
    expect(c.pyeongGfaMedianManwon).toBeCloseTo(999.59, 1)
    expect(s.applied).toEqual(c)
  })

  it('서울 전체 기간 49건 2,277,818원 / 서울 외 최근 3년 16건 2,249,329원 / 서울 외 전체 170건 1,887,806원', () => {
    expect(by('서울, 전체 기간').count).toBe(49)
    expect(by('서울, 전체 기간').perM2Median).toBeCloseTo(2_277_818.3, 0)
    expect(by('서울 외 지역, 착공 2023~2025').count).toBe(16)
    expect(by('서울 외 지역, 착공 2023~2025').perM2Median).toBeCloseTo(2_249_328.7, 0)
    expect(by('서울 외 지역, 전체 기간').count).toBe(170)
    expect(by('서울 외 지역, 전체 기간').perM2Median).toBeCloseTo(1_887_806, 0)
  })

  it('보수(상위 사분위) > 중앙값 > 낙관(하위 사분위)', () => {
    const a = s.applied!
    expect(a.perM2Conservative!).toBeGreaterThan(a.perM2Median!)
    expect(a.perM2Median!).toBeGreaterThan(a.perM2Optimistic!)
  })

  it('표본이 최소 건수 미만이면 같은 권역 전체 기간으로 대체', () => {
    const few = rows.filter((r) => !(r.region === '서울' && r.startYear !== null && r.startYear >= 2023))
    const f = summarizeConstruction(few)
    expect(f.applied!.label).toBe('서울, 전체 기간')
    expect(f.basisNote).toContain('미만')
  })
})

describe('withConstructionUnitCost — 가정값 우선순위', () => {
  const summary = summarizeConstruction(rows)
  const blank: AssumptionRow = {
    key: 'newBuildCostExcel',
    label: null,
    unit: null,
    low: null,
    base: null,
    high: null,
    grade: null,
    sourceTitle: null,
    publisher: null,
    baseDate: null,
    url: null,
    memo: null,
  }

  it('입력 엑셀이 비어 있으면 실적으로 채움 (등급 B, 보수 > 기준 > 낙관)', () => {
    const out = withConstructionUnitCost([blank], summary).find((r) => r.key === 'newBuildCostExcel')!
    expect(out.base).toBe(Math.round(summary.applied!.perM2Median!))
    expect(out.low!).toBeGreaterThan(out.base!)
    expect(out.high!).toBeLessThan(out.base!)
    expect(out.grade).toBe('B')
  })

  it('입력 엑셀에 값이 있으면 그대로 둔다', () => {
    const given = { ...blank, low: 3_500_000, base: 3_000_000, high: 2_800_000, grade: 'C' as const }
    expect(withConstructionUnitCost([given], summary)).toEqual([given])
  })
})

describe('runAll — 재건축 단가에 반영', () => {
  it('T1 REBUILD 공사비 = 공사 연면적 × max(신축단가표 205.5만원/㎡, 지상 6층 실적 564.2만원/평 = 170.7만원/㎡) = 신축단가표, 증축(ALL) 공사비는 변하지 않음', async () => {
    const data = (await getSiteData(T1))!
    const a = runAll(data, 'REBUILD')
    const f = a.finance.byScenario.BASE
    const fw = a.finance.floorWorkCost!
    // 엑셀 '하우빌드 2026환산' 4장 층수별 표: 지상 6층 3건, 평당공사비 공사면적 평균 564.2187만원
    expect(fw.floors).toBe(6)
    expect(fw.count).toBe(3)
    expect(fw.meanManwon).toBeCloseTo(564.2187008, 6)
    expect(fw.fewSamples).toBe(true)
    const excel = f.assumptions.find((x) => x.key === 'newBuildCostExcel')!
    expect(excel.value).toBe(Math.round((564.2187008001033 * 10_000) / 3.305785))
    // 보수 = 표본 최대(755만원/평), 낙관 = 표본 최소(387만원/평)
    expect(a.finance.byScenario.CONSERVATIVE.assumptions.find((x) => x.key === 'newBuildCostExcel')!.value).toBe(
      Math.round((755.0273480367 * 10_000) / 3.305785),
    )
    expect(a.finance.byScenario.OPTIMISTIC.assumptions.find((x) => x.key === 'newBuildCostExcel')!.value).toBe(
      Math.round((387.440106450074 * 10_000) / 3.305785),
    )
    const construction = f.costs.find((c) => c.key === 'construction')!
    // 엑셀 실적 환산(170.7만원/㎡)이 신축단가표(205.5만원/㎡)보다 낮아 단가표가 적용된다 (높은 값 선택)
    const table = f.assumptions.find((x) => x.key === 'newBuildCostTable')!.value!
    expect(excel.value!).toBeLessThan(table)
    expect(table).toBe(2_055_379)
    expect(construction.amountWon).toBe(Math.round(f.project.constructionAreaM2 * table))
    expect(construction.basis).toContain('건물신축단가표 2,055,379원/㎡ vs 엑셀 신축비용 1,706,762원/㎡ 중 높은 값')
    // 보수(표본 최대 755만원/평 = 228.4만원/㎡)는 단가표보다 커서 실적이 적용된다
    const cons = a.finance.byScenario.CONSERVATIVE.costs.find((c) => c.key === 'construction')!
    expect(cons.amountWon).toBe(Math.round(f.project.constructionAreaM2 * Math.round((755.0273480367 * 10_000) / 3.305785)))
    const all = runAll(data, 'ALL').finance.byScenario.BASE.costs.find((c) => c.key === 'construction')!.amountWon
    // ALL: 증축계획안 엑셀 증축 가능 연면적 29.8㎡ (2026-10-13) → 평당 800만원
    expect(all).toBe(Math.round((29.8 / 3.305785) * 8_000_000))
  })
})

describe('summarizeFloorWorkCost · calcBuildingCostGrowth', () => {
  it('지상 6층: 3건 평균 564.2187만원 · 최소 387.44 · 최대 755.03, 사례 없으면 null', () => {
    const six = summarizeFloorWorkCost(rows, 6)!
    expect(six.count).toBe(3)
    expect(six.meanManwon).toBeCloseTo(564.2187008, 6)
    expect(six.minManwon).toBeCloseTo(387.44, 2)
    expect(six.maxManwon).toBeCloseTo(755.03, 2)
    expect(summarizeFloorWorkCost(rows, 40)).toBeNull()
  })

  it('건설공사비지수 연평균 상승률: 2011~2025년 약 3.7% (엑셀 연평균 지수 78.24 → 130.07)', () => {
    const g = calcBuildingCostGrowth(rows)!
    expect(g.fromYear).toBe(2011)
    expect(g.toYear).toBe(2025)
    expect(g.rate).toBeCloseTo(Math.pow(130.0658 / 78.2383, 1 / 14) - 1, 4)
    expect(g.rate).toBeCloseTo(0.037, 3)
  })
})

describe('summarizeFloorWorkCostTable — 엑셀 하우빌드 2026환산 4장 층수별 표(F43~F48) 대조', () => {
  // [층수, 현장수, 평당공사비 공사면적 평균(F), 중앙값(G)] — 엑셀 값
  const expected: [number, number, number, number][] = [
    [2, 9, 702.67, 657.27],
    [3, 51, 522.54, 514.83],
    [4, 112, 547.9, 516.43],
    [5, 44, 595.9, 592.38],
    [6, 3, 564.22, 550.19],
  ]
  const table = summarizeFloorWorkCostTable(rows)

  it('지상 2~6층 현장수·공사면적 기준 평당 평균·중앙값이 엑셀과 같다 (±0.01만원)', () => {
    expect(table.map((t) => t.floors)).toEqual([2, 3, 4, 5, 6])
    for (const [floors, count, mean, median] of expected) {
      const t = table.find((x) => x.floors === floors)!
      expect(t.siteCount).toBe(count) // 엑셀 '현장수' (공사면적이 없는 현장도 포함)
      expect(t.meanManwon).toBeCloseTo(mean, 2)
      expect(t.medianManwon).toBeCloseTo(median, 2)
    }
  })

  it('표본 5건 미만(지상 6층 3건)만 fewSamples', () => {
    expect(table.filter((t) => t.fewSamples).map((t) => t.floors)).toEqual([6])
  })
})
