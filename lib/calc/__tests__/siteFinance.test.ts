// 수익성 (설계서 5-4 [A][B][C], 2026-10-08 결정 1·2·6·12) — 손계산·합계 검산
// 증축: 공사비 = 연면적 ÷ 3.305785 × 800만원/평, 제반비용 = 공사비 × 5%, 취득세 등 3.16%, 예비비, 금융비용
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

describe('T1 ALL 증축 (증축계획안 엑셀 29.8㎡, 1세대) — 기준 시나리오 손계산', () => {
  it('사업비: 공사비(29.8㎡ ÷ 3.305785 × 800만원/평) + 제반 공사비 5% + 취득세 3.16% + 금융(예비비 미합산)(대출 80%, 금리 6.0%, 2개월)', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(f.status).toBe('ok')
    const by = Object.fromEntries(f.costs.map((c) => [c.key, c.amountWon]))
    const construction = Math.round((29.8 / PYEONG_M2) * 8_000_000)
    expect(by.construction).toBe(construction)
    expect(by.construction).toBe(72_116_003)
    expect(by.permit).toBe(Math.round(construction * 0.05))
    const tax = Math.round(construction * 0.0316)
    expect(by.tax).toBe(tax)
    expect(by.constructionLoss).toBeNull() // 기존 임대 조건 입력 대기
    expect(by.contingency).toBeUndefined() // 예비비는 총사업비에 합산하지 않음 (2026-10-13)
    const beforeFinance = construction + Math.round(construction * 0.05) + tax
    expect(f.loanWon).toBe(Math.round(beforeFinance * 0.8))
    expect(by.finance).toBe(Math.round(Math.round(beforeFinance * 0.8) * 0.06 * (2 / 12) * 0.5))
    expect(f.totalCostWon).toBe(beforeFinance + (by.finance as number))
    expect(f.totalCostWon).toBe(78_312_672)
  })

  it('합계 검산: 항목 합 = 총사업비, 자기자본 + 대출 = 총사업비, 대출 = (금융비용 전 소계) × 대출 비율', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(sumCosts(f)).toBe(f.totalCostWon)
    expect(f.equityWon! + f.loanWon!).toBe(f.totalCostWon)
    const finance = f.costs.find((c) => c.key === 'finance')!.amountWon!
    const loanRatio = f.assumptions.find((a) => a.key === 'loanRatio')!.value!
    expect(f.loanWon).toBe(Math.round((f.totalCostWon! - finance) * loanRatio))
  })

  it('수입: 세대별 월 환산 = 11.4만원 + 15.2만원 × 전용(평) (사례 회귀), 측면 보강은 평당 증가분만, 관리비 +2%, NOI = × 0.95 × 0.90', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    expect(f.project.units).toHaveLength(1) // 증축계획안 29.8㎡ → 전용 25.85㎡ 1세대
    expect(f.rentBands).toHaveLength(1)
    const [b] = f.rentBands
    expect(b.band).toBe('ALL')
    expect(b.count).toBe(113) // 당산동6가 신규 월세 계약 (전세 27건 제외)
    expect(b.fitCount).toBe(100) // 회귀는 전용 10평 이하 사례
    expect(b.minPyeong!).toBeCloseTo(2.172, 3) // 최소 임대면적 7.18㎡
    expect(Math.round(b.equivalentBaseWon!)).toBe(114_012) // 월 환산 고정분 11.4만원
    expect(Math.round(b.equivalentPerPyeongWon!)).toBe(152_047) // 1평 증가당 15.2만원
    expect(b.r2!).toBeCloseTo(0.49, 2)
    for (const u of f.project.units) {
      expect(u.monthlyEquivalentWon).toBeCloseTo(b.equivalentBaseWon! + b.equivalentPerPyeongWon! * (u.netAreaM2 / PYEONG_M2), 4)
      expect(u.extrapolated).toBe(false) // 3.5·7.1평 — 회귀 범위(10평) 안
    }
    // 전환율 6% 고정이면 월 환산 = 월세 회귀 + 보증금 회귀 × 0.005
    expect(b.equivalentBaseWon!).toBeCloseTo(b.monthlyBaseWon! + b.depositBaseWon! * 0.005, 3)
    expect(b.equivalentPerPyeongWon!).toBeCloseTo(b.monthlyPerPyeongWon! + b.depositPerPyeongWon! * 0.005, 3)
    const net = f.project.units.reduce((s, u) => s + u.netAreaM2, 0)
    expect(net).toBeCloseTo(25.8497, 3) // 29.8㎡ × 전용률 0.8674
    expect(f.project.sideNetM2).toBe(0) // T1은 측면 확장분 없음
    // 측면 보강: 세대 고정분 없이 평당 증가분만
    expect(f.project.sideRentMonthlyWon).toBeCloseTo((f.project.sideNetM2 / PYEONG_M2) * b.equivalentPerPyeongWon!, 4)
    const rentMonthly = f.project.units.reduce((s, u) => s + u.monthlyEquivalentWon!, 0) + f.project.sideRentMonthlyWon!
    expect(f.revenue.grossAnnualWon).toBe(Math.round(rentMonthly * 12))
    expect(f.revenue.maintenanceWon).toBe(Math.round(rentMonthly * 12 * 0.02))
    expect(f.revenue.noiWon).toBe(Math.round(rentMonthly * 12 * 1.02 * 0.95 * 0.9))
    expect(f.revenue.noiWon).toBe(13_635_604)
    expect(f.revenue.noiIncreaseWon).toBe(f.revenue.noiWon) // 증축은 새 세대 NOI가 곧 증가분
    expect(f.metrics.roi).toBeCloseTo(f.revenue.noiIncreaseWon! / f.totalCostWon!, 6)
    expect(f.metrics.roi!).toBeCloseTo(0.174, 3)
    expect(f.metrics.paybackYears!).toBeCloseTo(5.74, 1)
    expect(f.metrics.roi! * f.metrics.paybackYears!).toBeCloseTo(1, 10)
  })

  it('회귀직선은 세대마다 고정분이 있어 ㎡당 임대료가 평당 증가분보다 높다 (T1 1세대 25.85㎡)', async () => {
    const f = (await load(T1, 'ALL')).finance.byScenario.BASE
    const [u] = f.project.units
    const perM2Slope = f.rentBands[0].equivalentPerPyeongWon! / PYEONG_M2
    expect(u.monthlyEquivalentWon! / u.netAreaM2).toBeGreaterThan(perM2Slope)
  })

  it('측면 보강부는 일조 완화 시나리오(A·ALL)에서만 포함: C·B에서는 0', async () => {
    const data = (await getSiteData(T2))!
    const a = runAll(data, 'ALL').byScenario
    expect(a.ALL.plan.sideGfaM2).toBeCloseTo(69.3 - 36.2527, 3) // 증축계획안 69.3㎡ − 세대분 36.25㎡ (T1은 전부 세대분이라 0)
    expect(a.A.plan.sideGfaM2).toBe(0) // A는 증축안 자체가 없음 (BASE와 같음)
    for (const id of ['BASE', 'B', 'C'] as const) expect(a[id].plan.sideGfaM2).toBe(0)
  })

  it('수익 시나리오: 전환율은 모든 시나리오 6.0% 고정, 보수(공실 10%, 운영비 15%, 금리 6.5%) < 기준 < 낙관', async () => {
    const fin = (await load(T1, 'ALL')).finance.byScenario
    expect(fin.CONSERVATIVE.conversion.housing.applied).toBeCloseTo(0.06, 10) // 법정 상한 5.0%보다 높지만 사용자 지정으로 고정
    expect(fin.CONSERVATIVE.conversion.housing.legalCap).toBeCloseTo(0.05, 10)
    expect(fin.BASE.conversion.housing.applied).toBeCloseTo(0.06, 10) // 보증금 1,000만원당 월 5만원 (2026-10-12)
    expect(fin.OPTIMISTIC.conversion.housing.applied).toBeCloseTo(0.06, 10)
    expect(fin.CONSERVATIVE.metrics.roi!).toBeLessThan(fin.BASE.metrics.roi!)
    expect(fin.BASE.metrics.roi!).toBeLessThan(fin.OPTIMISTIC.metrics.roi!)
  })
})

describe('재건축 (REBUILD)', () => {
  it('T1: 공사 연면적 = 498.75 + 필로티 119.7 = 618.45㎡ × max(신축단가표 2,055,379원, 지상 6층 실적 환산 1,706,762원) = 신축단가표, 제반비용 공사비 5%, 철거비는 공사비에 포함', async () => {
    const a = await load(T1, 'REBUILD')
    const f = a.finance.byScenario.BASE
    expect(f.project.kind).toBe('rebuild')
    expect(f.project.constructionAreaM2).toBeCloseTo(618.45, 6)
    const by = Object.fromEntries(f.costs.map((c) => [c.key, c]))
    // 가정값 입력 엑셀의 신축비용 칸이 비어 있어 기준 엑셀 하우빌드 공사비(지상 6층 3건, 공사면적 기준 평당 평균 564.2187만원)로 채워진다
    const excelUnit = Math.round((564.2187008001033 * 10_000) / 3.305785)
    expect(excelUnit).toBe(1_706_762)
    expect(by.construction.amountWon).toBe(Math.round(618.45 * 2_055_379)) // 신축단가표가 더 높아 적용
    expect(by.construction.basis).toContain('건물신축단가표 2,055,379원/㎡ vs 엑셀 신축비용 1,706,762원/㎡ 중 높은 값')
    expect(by.construction.grade).toBe('B')
    expect(by.permit.amountWon).toBe(Math.round(by.construction.amountWon! * 0.05)) // 신축 공사비의 5% (2026-10-13)
    expect(by.demolition).toBeUndefined() // 철거비는 신축 공사비에 포함 (2026-10-12)
    expect(by.construction.basis).toContain('철거비 포함')
    const months = f.assumptions.find((x) => x.key === 'rebuildConstructionMonths')!.value!
    expect(by.finance.basis).toContain(`${months}/12개월`) // 공사 기간 = 층별·면적별 실적
    expect(sumCosts(f)).toBe(f.totalCostWon)
  })

  it('NOI 증가 = 신축 NOI − 철거되는 기존 세대 NOI(추정)', async () => {
    const f = (await load(T2, 'REBUILD')).finance.byScenario.BASE
    expect(f.revenue.existingNoiWon).toBeGreaterThan(0)
    // 원 단위 반올림 차이 ±1원
    expect(Math.abs(f.revenue.noiIncreaseWon! - (f.revenue.noiWon! - f.revenue.existingNoiWon!))).toBeLessThanOrEqual(1)
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
    expect(f.missing).toContain('임대 사례 (전용면적 구분 없음 (회귀))')
  })
})
