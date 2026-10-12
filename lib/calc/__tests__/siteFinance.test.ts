// 수익성 (설계서 5-4 [A][B][C], 2026-10-08 결정 1·2·6·12) — 손계산·합계 검산
// 증축: 공사비 = 연면적 ÷ 3.305785 × 800만원/평, 제반비용 = 세대 × 500만원, 취득세 등 3.16%, 예비비, 금융비용
// 수입: 세대 전용 × ㎡당 월 환산 임대료(신규 실거래 중위) × 12 × (1 + 관리비 비율) × (1 − 공실) × (1 − 운영비)
// 가정값: 261008-b 사용자 입력 (대출 비율 기준 80%, 공사 기간 증축 2·재건축 10개월, 관리비 기준 2%)
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcSiteFinance } from '@/lib/calc/finance'
import { PYEONG_M2 } from '@/lib/rules/financeDefaults'
import { getSiteData } from '@/lib/services/mockService'
import type { SiteFinanceResult } from '@/types'

const T1 = '1156011600001040010'
const T2 = '1156011600001100019'
const load = async (pnu: string, view: 'BASE' | 'ALL' | 'REBUILD') => runAll((await getSiteData(pnu))!, view)
const sumCosts = (f: SiteFinanceResult) => f.costs.reduce((s, c) => s + (c.amountWon ?? 0), 0)

describe('T1 ALL 증축 (+1층 53.829㎡, 3세대) — 기준 시나리오 손계산', () => {
  it('사업비: 공사비 130,266,185 + 제반 15,000,000 + 취득세 4,116,411 + 예비비 7,469,130 + 금융 627,407(대출 80%, 금리 6.0%, 2개월) = 157,479,133원', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(f.status).toBe('ok')
    const by = Object.fromEntries(f.costs.map((c) => [c.key, c.amountWon]))
    expect(by.construction).toBe(Math.round((53.829 / PYEONG_M2) * 8_000_000))
    expect(by.construction).toBe(130_266_185)
    expect(by.permit).toBe(15_000_000)
    expect(by.tax).toBe(Math.round(130_266_185 * 0.0316))
    expect(by.contingency).toBe(Math.round((130_266_185 + 15_000_000 + 4_116_411) * 0.05))
    expect(by.constructionLoss).toBeNull() // 기존 임대 조건 입력 대기
    expect(f.loanWon).toBe(Math.round(156_851_726 * 0.8))
    expect(by.finance).toBe(Math.round(125_481_381 * 0.06 * (2 / 12) * 0.5))
    expect(by.finance).toBe(627_407)
    expect(f.totalCostWon).toBe(157_479_133)
  })

  it('합계 검산: 항목 합 = 총사업비, 자기자본 + 대출 = 총사업비, 대출 = (금융비용 전 소계) × 대출 비율', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(sumCosts(f)).toBe(f.totalCostWon)
    expect(f.equityWon! + f.loanWon!).toBe(f.totalCostWon)
    const finance = f.costs.find((c) => c.key === 'finance')!.amountWon!
    const loanRatio = f.assumptions.find((a) => a.key === 'loanRatio')!.value!
    expect(f.loanWon).toBe(Math.round((f.totalCostWon! - finance) * loanRatio))
  })

  it('수입: 3세대 × 전용 15.56㎡ (0~30㎡ 구간) × ㎡당 48,847원 × 12 → 관리비 +2% → NOI = × 0.95 × 0.90, ROI 15.2% · 회수 6.6년', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(f.project.units).toHaveLength(3)
    expect(f.project.units.every((u) => u.band === 'S')).toBe(true)
    const perM2 = f.rentBands.find((b) => b.band === 'S')!.monthlyEquivalentPerM2!
    expect(Math.round(perM2)).toBe(48_847)
    const net = f.project.units.reduce((s, u) => s + u.netAreaM2, 0)
    expect(f.revenue.grossAnnualWon).toBe(Math.round(net * perM2 * 12))
    expect(f.revenue.maintenanceWon).toBe(Math.round(net * perM2 * 12 * 0.02))
    expect(f.revenue.noiWon).toBe(Math.round(net * perM2 * 12 * 1.02 * 0.95 * 0.9))
    expect(f.revenue.noiWon).toBe(23_869_268)
    expect(f.revenue.noiIncreaseWon).toBe(f.revenue.noiWon) // 증축은 새 세대 NOI가 곧 증가분
    expect(f.metrics.roi).toBeCloseTo(f.revenue.noiIncreaseWon! / f.totalCostWon!, 8)
    expect(f.metrics.roi!).toBeCloseTo(0.1517, 3)
    expect(f.metrics.paybackYears!).toBeCloseTo(6.59, 1)
    expect(f.metrics.roi! * f.metrics.paybackYears!).toBeCloseTo(1, 10)
  })

  it('수익 시나리오: 보수(전환율 법정 상한 5.0%, 공실 10%, 운영비 15%) < 기준 < 낙관', async () => {
    const fin = (await load(T1, 'ALL')).finance.byScenario
    expect(fin.CONSERVATIVE.conversion.housing.applied).toBeCloseTo(0.05, 10)
    expect(fin.BASE.conversion.housing.applied).toBeCloseTo(0.05625, 10)
    expect(fin.CONSERVATIVE.metrics.roi!).toBeLessThan(fin.BASE.metrics.roi!)
    expect(fin.BASE.metrics.roi!).toBeLessThan(fin.OPTIMISTIC.metrics.roi!)
  })
})

describe('재건축 (REBUILD)', () => {
  it('T1: 공사 연면적 = 498.75 + 필로티 119.7 = 618.45㎡ × max(신축단가표 2,055,379원, 하우빌드 실적 중앙값 3,023,747원), 26세대 × 500만원, 철거비 입력 대기', async () => {
    const a = await load(T1, 'REBUILD')
    const f = a.finance.byScenario.BASE
    expect(f.project.kind).toBe('rebuild')
    expect(f.project.constructionAreaM2).toBeCloseTo(618.45, 6)
    const by = Object.fromEntries(f.costs.map((c) => [c.key, c]))
    // 가정값 입력 엑셀의 신축비용 칸이 비어 있어 기준 엑셀 하우빌드 공사비(서울 2023~2025, 6건)로 채워진다
    const excelUnit = Math.round(a.finance.construction.applied!.perM2Median!)
    expect(excelUnit).toBe(3_023_747)
    expect(by.construction.amountWon).toBe(Math.round(618.45 * excelUnit))
    expect(by.construction.basis).toContain('건물신축단가표 2,055,379원/㎡ vs 엑셀 신축비용 3,023,747원/㎡ 중 높은 값')
    expect(by.construction.grade).toBe('B')
    expect(by.permit.amountWon).toBe(130_000_000)
    expect(by.demolition.amountWon).toBeNull()
    expect(by.finance.basis).toContain('10/12개월') // 재건축 공사 기간 기준 10개월 (증축은 2개월)
    expect(sumCosts(f)).toBe(f.totalCostWon)
  })

  it('NOI 증가 = 신축 NOI − 철거되는 기존 세대 NOI(추정)', async () => {
    const f = (await load(T2, 'REBUILD')).finance.byScenario.BASE
    expect(f.revenue.existingNoiWon).toBeGreaterThan(0)
    expect(f.revenue.noiIncreaseWon).toBe(f.revenue.noiWon! - f.revenue.existingNoiWon!)
  })

  it('신축 단가 = max(건물신축단가표, 엑셀 신축비용) — 엑셀 값이 더 크면 엑셀 값과 근거를 쓴다', async () => {
    const d = (await getSiteData(T1))!
    const r = runAll(d, 'REBUILD')
    const f = calcSiteFinance({
      kind: 'rebuild',
      gfaM2: r.rebuild.gfaM2,
      constructionAreaM2: 618.45,
      newUnitNets: Array.from({ length: r.rebuild.households }, () => r.rebuild.netPerUnitM2),
      existingUnitNets: [],
      assumptionRows: d.assumptionRows,
      rentComps: d.rentComps,
      scenario: 'BASE',
      assetBeforeWon: null,
      userInput: { newBuildCostExcel: 2_500_000 },
    })
    const c = f.costs.find((x) => x.key === 'construction')!
    expect(c.amountWon).toBe(Math.round(618.45 * 2_500_000))
    expect(c.basis).toContain('건물신축단가표 2,055,379원/㎡ vs 엑셀 신축비용 2,500,000원/㎡ 중 높은 값')
  })
})

describe('계산 생략·입력 대기', () => {
  it('증축안이 없으면(T1 BASE — 주택 층수 한도) 수익성 계산 생략', async () => {
    const f = (await load(T1, 'BASE')).finance.byScenario.BASE
    expect(f.status).toBe('none')
    expect(f.totalCostWon).toBeNull()
  })

  it('필수 가정값이 비면 입력 대기 (계산하지 않음)', async () => {
    const d = (await getSiteData(T1))!
    const f = calcSiteFinance({
      kind: 'expansion',
      gfaM2: 50,
      constructionAreaM2: 50,
      newUnitNets: [20],
      existingUnitNets: [],
      assumptionRows: d.assumptionRows.filter((r) => r.key !== 'vacancyRate'),
      rentComps: d.rentComps,
      scenario: 'BASE',
      assetBeforeWon: null,
    })
    expect(f.status).toBe('pending')
    expect(f.missing).toContain('vacancyRate')
  })

  it('임대 사례가 없으면 입력 대기', async () => {
    const d = (await getSiteData(T1))!
    const f = calcSiteFinance({
      kind: 'expansion',
      gfaM2: 50,
      constructionAreaM2: 50,
      newUnitNets: [20],
      existingUnitNets: [],
      assumptionRows: d.assumptionRows,
      rentComps: [],
      scenario: 'BASE',
      assetBeforeWon: null,
    })
    expect(f.status).toBe('pending')
    expect(f.missing).toContain('임대 사례 (전용 0~30㎡)')
  })
})
