// 수익성 가정값 (2026-10-08 결정 1~6·12)
// 1) 레지스트리 검사 — 가정값 입력 엑셀이 규칙에 맞는지 (data:check처럼 자동 검사)
// 2) 시나리오 값·전환율·임대 사례 요약 손계산
import { describe, expect, it } from 'vitest'
import assumptionsJson from '@/lib/data/inputs/assumptions.json'
import { ASSUMPTION_SPEC, PYEONG_M2, type AssumptionKey } from '@/lib/rules/financeDefaults'
import type { AssumptionRow, RentComp } from '@/types'
import { calcConversionRates, leastSquares, missingAssumptions, resolveAssumptions, summarizeRentComps } from '../assumptions'

const rows = assumptionsJson.items as AssumptionRow[]

describe('가정값 레지스트리 검사', () => {
  it('엑셀 키 = 규칙 키 (빠지거나 남는 항목 없음), 단위가 규칙과 같다', () => {
    expect(rows.map((r) => r.key).sort()).toEqual(Object.keys(ASSUMPTION_SPEC).sort())
    for (const r of rows) expect(r.unit, r.key).toBe(ASSUMPTION_SPEC[r.key as AssumptionKey].unit)
  })

  it('값이 있으면 보수·기준·낙관이 모두 있고, 보수 → 낙관이 ROI에 불리 → 유리 순서', () => {
    for (const r of rows) {
      const vals = [r.low, r.base, r.high]
      if (vals.every((v) => v === null)) continue
      expect(vals.every((v) => v !== null), `${r.key} 일부만 입력`).toBe(true)
      const dir = ASSUMPTION_SPEC[r.key as AssumptionKey].direction
      if (dir === 'higher') expect(r.low! <= r.base! && r.base! <= r.high!, r.key).toBe(true)
      if (dir === 'lower') expect(r.low! >= r.base! && r.base! >= r.high!, r.key).toBe(true)
    }
  })

  it('비율은 0~1, %는 0~100 범위', () => {
    for (const r of rows) {
      for (const v of [r.low, r.base, r.high].filter((x): x is number => x !== null)) {
        if (r.unit === '비율') expect(v >= 0 && v <= 1, `${r.key} ${v}`).toBe(true)
        if (r.unit === '%') expect(v >= 0 && v <= 100, `${r.key} ${v}`).toBe(true)
      }
    }
  })

  it('값이 있으면 등급이 있고, 등급 A·B는 자료명·기관·기준일이 있다 (근거 등급 D는 없어야 함)', () => {
    for (const r of rows.filter((x) => x.base !== null)) {
      expect(r.grade, r.key).not.toBeNull()
      expect(r.grade, r.key).not.toBe('D')
      if (r.grade === 'A' || r.grade === 'B') {
        expect([r.sourceTitle, r.publisher, r.baseDate].every(Boolean), r.key).toBe(true)
      }
    }
  })
})

describe('시나리오 값', () => {
  it('보수 = low, 기준 = base, 낙관 = high — 공실률 10% / 5% / 3%, 대출금리 6.5% / 6.0% / 6.0% (2026-10-12 사용자 결정)', () => {
    expect(resolveAssumptions(rows, 'CONSERVATIVE').vacancyRate.value).toBe(0.1)
    expect(resolveAssumptions(rows, 'BASE').vacancyRate.value).toBe(0.05)
    expect(resolveAssumptions(rows, 'OPTIMISTIC').loanInterestRate.value).toBe(0.06)
    expect(resolveAssumptions(rows, 'BASE').loanInterestRate.grade).toBe('C')
  })

  it('사용자 입력이 엑셀보다 우선 (등급 C · 사용자 입력 표기)', () => {
    const a = resolveAssumptions(rows, 'BASE', { vacancyRate: 0.08 })
    expect(a.vacancyRate.value).toBe(0.08)
    expect(a.vacancyRate.overridden).toBe(true)
    expect(a.vacancyRate.sourceText).toBe('사용자 입력')
  })

  it('증축 공사비 800만원/평 = 약 2,420,000원/㎡, 필수 항목 중 빈 값 없음', () => {
    const a = resolveAssumptions(rows, 'BASE')
    expect(a.expansionCostPerPyeong.value! / PYEONG_M2).toBeCloseTo(2_420_002, -1)
    expect(missingAssumptions(a)).toEqual([])
  })
})

describe('전월세 전환율 (결정 6)', () => {
  it('기준금리 3.0% → 주택 법정 상한 min(10%, 5.0%) = 5.0%, 상가 min(12%, 13.5%) = 12%', () => {
    const r = calcConversionRates(resolveAssumptions(rows, 'BASE'), 'BASE')
    expect(r.housing.legalCap).toBeCloseTo(0.05, 10)
    expect(r.commercial.legalCap).toBeCloseTo(0.12, 10)
  })

  it('주택: 모든 시나리오 6.0% 고정 (보증금 1,000만원당 월 5만원, 2026-10-12 사용자 지정), 법정 상한 5.0%는 참고', () => {
    const cons = calcConversionRates(resolveAssumptions(rows, 'CONSERVATIVE'), 'CONSERVATIVE').housing
    expect(cons.legalCap).toBeCloseTo(0.05, 10)
    expect(cons.applied).toBeCloseTo(0.06, 10)
    expect(calcConversionRates(resolveAssumptions(rows, 'BASE'), 'BASE').housing.applied).toBeCloseTo(0.06, 10)
    expect(calcConversionRates(resolveAssumptions(rows, 'OPTIMISTIC'), 'OPTIMISTIC').housing.applied).toBeCloseTo(0.06, 10)
  })

  it('상가: 시장 전환율 미확보 → 입력 대기(null). 값이 있으면 보수 = min(시장, 법정 상한)', () => {
    expect(calcConversionRates(resolveAssumptions(rows, 'BASE'), 'BASE').commercial.applied).toBeNull()
    const a = resolveAssumptions(rows, 'CONSERVATIVE', { marketConversionCommercial: 6.5 })
    expect(calcConversionRates(a, 'CONSERVATIVE').commercial.applied).toBeCloseTo(0.065, 10)
  })
})

describe('임대 사례 요약 — 전용면적(평) 회귀직선 (2026-10-12)', () => {
  const comp = (dong: string, area: number, type: '전세' | '월세', deposit: number, monthly: number, maint: number | null = null): RentComp => ({
    source: '테스트', contractDate: '2026-05-01', district: '영등포구', dong, jibun: null, floor: 3, rentType: type,
    netAreaM2: area, depositManwon: deposit, monthlyManwon: monthly, maintenanceManwon: maint,
    buildingUse: '연립다세대', builtYear: 2010, newOrRenewal: '신규', memo: null,
  })
  /** 전용 평 → ㎡ */
  const m2 = (py: number) => py * PYEONG_M2

  it('최소제곱 직선: y = 2 + 3x 점들은 그대로 복원, 점이 1개면 null', () => {
    const r = leastSquares([1, 2, 3, 4], [5, 8, 11, 14])!
    expect(r.a).toBeCloseTo(2, 10)
    expect(r.b).toBeCloseTo(3, 10)
    expect(r.r2).toBeCloseTo(1, 10)
    expect(leastSquares([1], [1])).toBeNull()
    expect(leastSquares([2, 2, 2], [1, 2, 3])).toBeNull()
  })

  it('보증금 = 1,000 + 500×평, 월세 = 30 + 2×평(만원)인 사례 12건 → 회귀가 그대로 복원, 월 환산 = 월세 + 보증금 × 6% ÷ 12', () => {
    const comps = [2, 3, 4, 5, 6, 7, 8, 9, 3.5, 4.5, 5.5, 6.5].map((py) => comp('당산동6가', m2(py), '월세', 1000 + 500 * py, 30 + 2 * py))
    const [s] = summarizeRentComps(comps, 0.06)
    expect(s.band).toBe('ALL')
    expect(s.count).toBe(12)
    expect(s.depositBaseWon).toBeCloseTo(10_000_000, 0)
    expect(s.depositPerPyeongWon).toBeCloseTo(5_000_000, 0)
    expect(s.monthlyBaseWon).toBeCloseTo(300_000, 0)
    expect(s.monthlyPerPyeongWon).toBeCloseTo(20_000, 0)
    // 월 환산 = 월세 + 보증금 × 0.06 / 12 = 월세 + 보증금 × 0.005
    expect(s.equivalentBaseWon).toBeCloseTo(300_000 + 10_000_000 * 0.005, 0)
    expect(s.equivalentPerPyeongWon).toBeCloseTo(20_000 + 5_000_000 * 0.005, 0)
    expect(s.r2).toBeCloseTo(1, 8)
    expect(s.minPyeong).toBeCloseTo(2, 8) // 최소 임대면적
  })

  it('회귀는 전용 10평 이하 사례로만 맞춘다 (10평 초과 사례는 건수에만 포함, 면적 범위 maxPyeong에는 반영)', () => {
    const small = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((py) => comp('당산동6가', m2(py), '월세', 1000 + 500 * py, 30 + 2 * py))
    const big = [comp('당산동6가', m2(15), '월세', 100, 10), comp('당산동6가', m2(20), '월세', 100, 10)]
    const [s] = summarizeRentComps([...small, ...big], 0.06)
    expect(s.count).toBe(11)
    expect(s.fitCount).toBe(9)
    expect(s.fitMaxPyeong).toBe(10)
    expect(s.maxPyeong).toBeCloseTo(20, 8)
    expect(s.depositPerPyeongWon).toBeCloseTo(5_000_000, 0) // 큰 평형의 낮은 보증금이 섞이지 않음
  })

  it('갱신·구분 없음·전세 계약은 빼고 신규 월세만, 당산동6가가 10건 미만이면 영등포구 포함', () => {
    const renewal = { ...comp('당산동6가', m2(5), '월세', 500, 30), newOrRenewal: '갱신' }
    const unknown = { ...comp('당산동6가', m2(5), '월세', 500, 30), newOrRenewal: null }
    const jeonse = comp('당산동6가', m2(5), '전세', 20000, 0)
    const [s] = summarizeRentComps([comp('당산동6가', m2(5), '월세', 1000, 60), comp('문래동2가', m2(8), '월세', 2000, 70), renewal, unknown, jeonse], 0.06)
    expect(s.count).toBe(2)
    expect(s.area).toBe('당산동6가 + 영등포구')
  })

  it('사례가 점 하나뿐이면 평당 평균(원점 통과)으로 대체, 전환율이 없으면 월 환산은 null', () => {
    const [s] = summarizeRentComps([comp('당산동6가', m2(5), '월세', 1000, 60)], 0.06)
    expect(s.depositBaseWon).toBe(0)
    expect(s.monthlyPerPyeongWon).toBeCloseTo(600_000 / 5, 3)
    const [n] = summarizeRentComps([comp('당산동6가', m2(5), '월세', 1000, 60)], null)
    expect(n.equivalentBaseWon).toBeNull()
    expect(n.depositPerPyeongWon).not.toBeNull()
  })
})
