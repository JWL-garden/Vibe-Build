// 공사비 실적 요약 — 기준 엑셀 '하우빌드 2026환산' 집계표(5번 표)와 같은 값이 나오는지, 신축 단가 가정값 채움 우선순위
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { percentile, summarizeConstruction, withConstructionUnitCost } from '@/lib/calc/constructionCost'
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
  it('T1 REBUILD 공사비 = 공사 연면적 × max(신축단가표, 실적 중앙값), 증축(ALL) 공사비는 변하지 않음', async () => {
    const data = (await getSiteData(T1))!
    const a = runAll(data, 'REBUILD')
    const f = a.finance.byScenario.BASE
    const excel = f.assumptions.find((x) => x.key === 'newBuildCostExcel')!
    const table = f.assumptions.find((x) => x.key === 'newBuildCostTable')!
    expect(excel.value).toBe(Math.round(a.finance.construction.applied!.perM2Median!))
    expect(excel.value!).toBeGreaterThan(table.value!)
    const construction = f.costs.find((c) => c.key === 'construction')!.amountWon!
    expect(construction).toBe(Math.round(f.project.constructionAreaM2 * excel.value!))
    const all = runAll(data, 'ALL').finance.byScenario.BASE.costs.find((c) => c.key === 'construction')!.amountWon
    expect(all).toBe(130_266_185)
  })
})
