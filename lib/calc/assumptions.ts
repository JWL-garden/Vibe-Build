// 수익성 가정값 정리 (2026-10-08 결정 1~6·12) — 순수 함수
// 1) resolveAssumptions: 가정값 입력 엑셀 행 → 수익 시나리오(보수/기준/낙관) 값. 우선순위: 사용자 입력 > 입력 엑셀
// 2) calcConversionRates: 전월세 전환율 — 보수 = 법정 상한, 기준·낙관 = 시장 전환율. 주거 외 용도는 상가법 기준
// 3) summarizeRentComps: 임대 사례(신규 월세 계약) → 전용면적(평) 회귀직선 (세대 고정분 + 평당 증가분), 전용면적 구간 없음

import { ASSUMPTION_SPEC, PYEONG_M2, conversionRule, rentCompRule, type AssumptionKey } from '@/lib/rules/financeDefaults'
import type {
  AssumptionRow,
  ConversionRates,
  FinanceScenarioId,
  RentBandSummary,
  RentComp,
  ResolvedAssumption,
} from '@/types'

export type ResolvedAssumptions = Record<AssumptionKey, ResolvedAssumption>

const PICK: Record<FinanceScenarioId, 'low' | 'base' | 'high'> = { CONSERVATIVE: 'low', BASE: 'base', OPTIMISTIC: 'high' }

export function resolveAssumptions(
  rows: AssumptionRow[],
  scenario: FinanceScenarioId,
  userInput: Partial<Record<AssumptionKey, number>> = {},
): ResolvedAssumptions {
  const out = {} as ResolvedAssumptions
  for (const key of Object.keys(ASSUMPTION_SPEC) as AssumptionKey[]) {
    const row = rows.find((r) => r.key === key)
    const range = { low: row?.low ?? null, base: row?.base ?? null, high: row?.high ?? null }
    const user = userInput[key]
    const sourceParts = [row?.sourceTitle, row?.publisher, row?.baseDate].filter(Boolean)
    out[key] = {
      key,
      label: row?.label ?? key,
      unit: row?.unit ?? ASSUMPTION_SPEC[key].unit,
      value: user ?? range[PICK[scenario]],
      range,
      grade: user !== undefined ? 'C' : (row?.grade ?? null),
      sourceText: user !== undefined ? '사용자 입력' : sourceParts.length ? sourceParts.join(' · ') : null,
      url: row?.url ?? null,
      memo: row?.memo ?? null,
      overridden: user !== undefined,
    }
  }
  return out
}

/** 필수 항목 중 값이 없는 것 (보고서 "입력 대기") */
export function missingAssumptions(a: ResolvedAssumptions): AssumptionKey[] {
  return (Object.keys(ASSUMPTION_SPEC) as AssumptionKey[]).filter((k) => ASSUMPTION_SPEC[k].required && a[k].value === null)
}

/** % 단위 값 → 소수 */
const pct = (v: number | null) => (v === null ? null : v / 100)

export function calcConversionRates(a: ResolvedAssumptions, scenario: FinanceScenarioId): ConversionRates {
  const baseRate = pct(a.baseRate.value)
  const h = conversionRule.housing
  const c = conversionRule.commercial
  const housingCap = baseRate === null ? null : Math.min(h.maxRate, baseRate + h.addToBaseRate)
  const commercialCap = baseRate === null ? null : Math.min(c.maxRate, baseRate * c.baseRateMultiple)
  const housingMarket = pct(a.marketConversionHousing.value)
  const commercialMarket = pct(a.marketConversionCommercial.value)
  const conservative = scenario === 'CONSERVATIVE'
  // 주택: fixedRate면 모든 시나리오에서 가정값(연 6.0%)으로 고정, 아니면 보수 = 법정 상한
  const housingUseCap = conservative && !h.fixedRate
  return {
    housing: {
      legalCap: housingCap,
      market: housingMarket,
      applied: housingUseCap ? housingCap : housingMarket,
      basis: housingUseCap
        ? `법정 상한 (${h.law})`
        : h.fixedRate
          ? '전환율 고정 (보증금 1,000만원당 월 5만원)'
          : '시장 전환율',
    },
    commercial: {
      legalCap: commercialCap,
      market: commercialMarket,
      // 상가는 법정 상한이 시장보다 높을 수 있어, 보수는 둘 중 낮은 값 (시장값이 없으면 입력 대기)
      applied: conservative
        ? commercialMarket === null
          ? null
          : Math.min(commercialMarket, commercialCap ?? Infinity)
        : commercialMarket,
      basis: conservative ? `min(시장, 법정 상한 — ${c.law})` : '시장 전환율',
    },
  }
}

const MANWON = 10_000

/** 최소제곱 직선 y = a + b·x. 점이 2개 미만이거나 x가 모두 같으면 null */
export function leastSquares(xs: number[], ys: number[]): { a: number; b: number; r2: number } | null {
  const n = xs.length
  if (n < 2) return null
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0) return null
  const b = sxy / sxx
  return { a: my - b * mx, b, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) }
}

const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null)

/**
 * 임대 사례 요약 (2026-10-12 변경: 전용면적 구간 없음, 평 기준 회귀직선).
 * 신규 월세 계약의 전용면적(평)에 대해 보증금·월세를 최소제곱 직선으로 맞춘다 (평균 기준).
 *   월 환산 임대료 = 월세 + 보증금 × conversionRate(연, 소수) ÷ 12  → 고정분(원/월) + 평당 증가분(원/평·월) × 전용(평)
 * 당산동6가 사례가 minSamples 이상이면 당산동6가만, 아니면 영등포구 사례까지 쓴다.
 * 회귀는 regressionMaxPyeong 이하 사례로 맞춘다. 점이 부족하면 평당 평균(원점 통과)으로 대체한다.
 */
export function summarizeRentComps(comps: RentComp[], conversionRate: number | null): RentBandSummary[] {
  const valid = comps.filter(
    (c) =>
      (c.netAreaM2 ?? 0) > 0 &&
      c.depositManwon !== null &&
      rentCompRule.rentTypes.includes(c.rentType ?? '') &&
      rentCompRule.contractTypes.includes(c.newOrRenewal ?? ''),
  )
  const dong = valid.filter((c) => c.dong === '당산동6가')
  const used = dong.length >= rentCompRule.minSamples ? dong : valid
  const area = used === dong ? '당산동6가' : '당산동6가 + 영등포구'
  const pyeong = (c: RentComp) => c.netAreaM2! / PYEONG_M2
  const maxPy = rentCompRule.regressionMaxPyeong
  const fit = used.filter((c) => maxPy === null || pyeong(c) <= maxPy)
  const xs = fit.map(pyeong)
  const deposit = fit.map((c) => c.depositManwon! * MANWON)
  const monthly = fit.map((c) => (c.monthlyManwon ?? 0) * MANWON)

  // 점이 부족하면 평당 평균을 원점을 지나는 직선으로
  const proportional = (ys: number[]) => {
    const m = mean(ys.map((y, i) => y / xs[i]))
    return m === null ? null : { a: 0, b: m, r2: 0 }
  }
  const depositLine = leastSquares(xs, deposit) ?? proportional(deposit)
  const monthlyLine = leastSquares(xs, monthly) ?? proportional(monthly)
  const rate = conversionRate
  const equiv =
    depositLine && monthlyLine && rate !== null
      ? {
          a: monthlyLine.a + (depositLine.a * rate) / 12,
          b: monthlyLine.b + (depositLine.b * rate) / 12,
          r2: leastSquares(xs, monthly.map((m, i) => m + (deposit[i] * rate) / 12))?.r2 ?? null,
        }
      : null
  const allPy = used.map(pyeong)
  return [
    {
      band: 'ALL',
      label: rentCompRule.label,
      count: used.length,
      fitCount: fit.length,
      area: used.length ? area : '사례 없음',
      minPyeong: allPy.length ? Math.min(...allPy) : null,
      maxPyeong: allPy.length ? Math.max(...allPy) : null,
      meanPyeong: mean(allPy),
      fitMaxPyeong: maxPy,
      meanDepositWon: mean(used.map((c) => c.depositManwon! * MANWON)),
      meanMonthlyWon: mean(used.map((c) => (c.monthlyManwon ?? 0) * MANWON)),
      depositBaseWon: depositLine?.a ?? null,
      depositPerPyeongWon: depositLine?.b ?? null,
      monthlyBaseWon: monthlyLine?.a ?? null,
      monthlyPerPyeongWon: monthlyLine?.b ?? null,
      equivalentBaseWon: equiv?.a ?? null,
      equivalentPerPyeongWon: equiv?.b ?? null,
      r2: equiv?.r2 ?? null,
    },
  ]
}
