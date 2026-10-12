// 수익성 가정값 (2026-10-08 결정 1~6·12)
// 1) 레지스트리 검사 — 가정값 입력 엑셀이 규칙에 맞는지 (data:check처럼 자동 검사)
// 2) 시나리오 값·전환율·임대 사례 요약 손계산
import { describe, expect, it } from 'vitest'
import assumptionsJson from '@/lib/data/inputs/assumptions.json'
import { ASSUMPTION_SPEC, PYEONG_M2, type AssumptionKey } from '@/lib/rules/financeDefaults'
import type { AssumptionRow, RentComp } from '@/types'
import { calcConversionRates, missingAssumptions, resolveAssumptions, summarizeRentComps } from '../assumptions'

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

  it('주택: 보수 = 법정 상한 5.0%, 기준·낙관 = 시장 5.625% (영등포구 연립다세대 4개 분기 평균)', () => {
    expect(calcConversionRates(resolveAssumptions(rows, 'CONSERVATIVE'), 'CONSERVATIVE').housing.applied).toBeCloseTo(0.05, 10)
    expect(calcConversionRates(resolveAssumptions(rows, 'BASE'), 'BASE').housing.applied).toBeCloseTo(0.05625, 10)
    expect(calcConversionRates(resolveAssumptions(rows, 'OPTIMISTIC'), 'OPTIMISTIC').housing.applied).toBeCloseTo(0.05625, 10)
  })

  it('상가: 시장 전환율 미확보 → 입력 대기(null). 값이 있으면 보수 = min(시장, 법정 상한)', () => {
    expect(calcConversionRates(resolveAssumptions(rows, 'BASE'), 'BASE').commercial.applied).toBeNull()
    const a = resolveAssumptions(rows, 'CONSERVATIVE', { marketConversionCommercial: 6.5 })
    expect(calcConversionRates(a, 'CONSERVATIVE').commercial.applied).toBeCloseTo(0.065, 10)
  })
})

describe('임대 사례 요약 (결정 5)', () => {
  const comp = (dong: string, area: number, type: '전세' | '월세', deposit: number, monthly: number, maint: number | null = null): RentComp => ({
    source: '테스트', contractDate: '2026-05-01', district: '영등포구', dong, jibun: null, floor: 3, rentType: type,
    netAreaM2: area, depositManwon: deposit, monthlyManwon: monthly, maintenanceManwon: maint,
    buildingUse: '연립다세대', builtYear: 2010, newOrRenewal: '신규', memo: null,
  })

  it('당산동6가 사례가 10건 이상이면 당산동6가만, 중위 보증금·월세·관리비, ㎡당 월 환산 = (월세 + 보증금 × 5% ÷ 12) ÷ 전용', () => {
    const comps = [
      ...Array.from({ length: 10 }, (_, i) => comp('당산동6가', 25, '월세', 1000 + i * 100, 60 + i, 5)),
      comp('문래동2가', 20, '월세', 9999, 999),
    ]
    const [s, m] = summarizeRentComps(comps, 0.05)
    expect(s.count).toBe(10)
    expect(s.area).toBe('당산동6가')
    expect(s.depositWon).toBe(14_500_000) // (1400 + 1500) / 2 만원
    expect(s.monthlyWon).toBe(645_000)
    expect(s.maintenanceWon).toBe(50_000)
    // 각 사례 (월세 + 보증금 × 0.05 / 12) / 25㎡ 의 중위값 = (64.5만 + 1450만 × 0.05 / 12) / 25
    expect(s.monthlyEquivalentPerM2).toBeCloseTo((645_000 + (14_500_000 * 0.05) / 12) / 25, 6)
    expect(m.count).toBe(0)
    expect(m.area).toBe('사례 없음')
  })

  it('갱신 계약·구분 없는 계약은 빼고 신규 계약만 쓴다 (2026-10-08 결정)', () => {
    const renewal = { ...comp('당산동6가', 25, '월세', 500, 30), newOrRenewal: '갱신' }
    const unknown = { ...comp('당산동6가', 25, '월세', 500, 30), newOrRenewal: null }
    const [s] = summarizeRentComps([comp('당산동6가', 25, '월세', 1000, 60), renewal, unknown], 0.05)
    expect(s.count).toBe(1)
    expect(s.monthlyWon).toBe(600_000)
  })

  it('당산동6가가 10건 미만이면 영등포구 사례 포함, 전세는 보증금만으로 환산', () => {
    const comps = [comp('당산동6가', 45, '전세', 20000, 0), comp('문래동2가', 50, '월세', 3000, 100)]
    const [, m] = summarizeRentComps(comps, 0.06)
    expect(m.count).toBe(2)
    expect(m.area).toBe('당산동6가 + 영등포구')
    expect(m.depositWon).toBe(30_000_000) // 월세 계약만
    const e1 = (200_000_000 * 0.06) / 12 / 45
    const e2 = (1_000_000 + (30_000_000 * 0.06) / 12) / 50
    expect(m.monthlyEquivalentPerM2).toBeCloseTo((e1 + e2) / 2, 6)
  })
})
