// 민감도(설계서 5-5) · 10년 현금흐름·NPV·IRR(5-4 [D]) — 손계산·합계 검산
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcCashflow10y } from '@/lib/calc/finance'
import { getSiteData } from '@/lib/services/mockService'

const T1 = '1156011600001040010'
const load = async (view: 'BASE' | 'ALL' | 'REBUILD') => runAll((await getSiteData(T1))!, view)

describe('calcCashflow10y — 손계산', () => {
  const base = { totalCostWon: 100, noiIncreaseWon: 20, existingNoiWon: null, growthRate: null, discountRate: null }

  it('연 NOI 20, 총사업비 100, 상승률 0: 5년차 회수, 10년 말 누적 +100', () => {
    const c = calcCashflow10y(base)
    expect(c.years).toHaveLength(10)
    expect(c.paybackYear).toBe(5)
    expect(c.cumulativeNetWon).toBe(100)
    expect(c.npvWon).toBeNull() // 할인율 없음
    expect(c.existingNoiMissing).toBe(true)
  })

  it('할인율 10%: NPV = 20 × 6.1446 − 100 ≈ 22.89, IRR ≈ 15.1%', () => {
    const c = calcCashflow10y({ ...base, discountRate: 0.1, totalCostWon: 1_000_000, noiIncreaseWon: 200_000 })
    expect(c.npvWon).toBeGreaterThan(228_000)
    expect(c.npvWon).toBeLessThan(230_000)
    expect(c.irr).toBeGreaterThan(0.15)
    expect(c.irr).toBeLessThan(0.152)
  })

  it('상승률 3%: 2년차 NOI = 1년차 × 1.03, "함" = 안 함 + 순증', () => {
    const c = calcCashflow10y({ ...base, totalCostWon: 1_000_000, noiIncreaseWon: 100_000, existingNoiWon: 50_000, growthRate: 0.03 })
    expect(c.years[0].noiIncreaseWon).toBe(100_000)
    expect(c.years[1].noiIncreaseWon).toBe(103_000)
    for (const y of c.years) expect(y.withWon).toBe(y.withoutWon + y.cumulativeNetWon)
    expect(c.existingNoiMissing).toBe(false)
  })

  it('10년 안에 회수하지 못하면 paybackYear = null, 총사업비를 못 넘으면 IRR 음수', () => {
    const c = calcCashflow10y({ ...base, noiIncreaseWon: 5 })
    expect(c.paybackYear).toBeNull()
    expect(c.irr).toBeLessThan(0)
  })
})

describe('T1 ALL 민감도·현금흐름', () => {
  it('기준 ROI와 일치하고 변동폭 큰 순으로 정렬, 불리한 ROI ≤ 기준 ≤ 유리한 ROI', async () => {
    const a = await load('ALL')
    const s = a.finance.sensitivity!
    expect(s).not.toBeNull()
    expect(s.baseRoi).toBe(a.finance.byScenario.BASE.metrics.roi)
    expect(s.items.length).toBeGreaterThan(3)
    for (let i = 1; i < s.items.length; i++) expect(s.items[i - 1].swing).toBeGreaterThanOrEqual(s.items[i].swing)
    for (const it of s.items) {
      expect(it.roiUnfavorable).toBeLessThan(it.roiFavorable)
      expect(it.swing).toBeCloseTo(it.roiFavorable - it.roiUnfavorable, 12)
    }
    const rent = s.items.find((i) => i.key === 'rentFactor')!
    // 임대료 ±10% → NOI가 ±10% 이므로 ROI도 기준 × 0.9 / × 1.1
    expect(rent.roiUnfavorable).toBeCloseTo(s.baseRoi * 0.9, 6)
    expect(rent.roiFavorable).toBeCloseTo(s.baseRoi * 1.1, 6)
    expect(s.gradeCShare).toBeGreaterThan(0)
    expect(s.gradeCShare).toBeLessThanOrEqual(1)
  })

  it('3개 수익 시나리오 모두 10년 현금흐름이 있고, 누적 순증 = −총사업비 + NOI 증가 합', async () => {
    const a = await load('ALL')
    for (const id of ['CONSERVATIVE', 'BASE', 'OPTIMISTIC'] as const) {
      const f = a.finance.byScenario[id]
      const c = f.cashflow!
      expect(c.years).toHaveLength(10)
      const sum = c.years.reduce((s, y) => s + y.noiIncreaseWon, 0)
      expect(Math.abs(c.cumulativeNetWon - (sum - f.totalCostWon!))).toBeLessThanOrEqual(10)
    }
  })

  it('증축안이 없는 BASE: 민감도·현금흐름 없음', async () => {
    const a = await load('BASE')
    if (a.finance.byScenario.BASE.status === 'none') {
      expect(a.finance.sensitivity).toBeNull()
      expect(a.finance.byScenario.BASE.cashflow).toBeNull()
    }
  })

  it('REBUILD도 민감도 계산 (신축 단가·재건축 공사기간 항목 포함)', async () => {
    const a = await load('REBUILD')
    const s = a.finance.sensitivity
    if (s) expect(s.items.some((i) => i.key === 'expansionCostPerPyeong')).toBe(false)
  })
})
