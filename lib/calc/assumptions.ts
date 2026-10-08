// 수익성 가정값 정리 (2026-10-08 결정 1~6·12) — 순수 함수
// 1) resolveAssumptions: 가정값 입력 엑셀 행 → 수익 시나리오(보수/기준/낙관) 값. 우선순위: 사용자 입력 > 입력 엑셀
// 2) calcConversionRates: 전월세 전환율 — 보수 = 법정 상한, 기준·낙관 = 시장 전환율. 주거 외 용도는 상가법 기준
// 3) summarizeRentComps: 임대 사례 → 전용 구간(0~30 / 30~60㎡)별 중위 보증금·월세·관리비·㎡당 월 환산 임대료

import { ASSUMPTION_SPEC, conversionRule, rentCompRule, type AssumptionKey } from '@/lib/rules/financeDefaults'
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
  return {
    housing: {
      legalCap: housingCap,
      market: housingMarket,
      applied: conservative ? housingCap : housingMarket,
      basis: conservative ? `법정 상한 (${h.law})` : '시장 전환율',
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

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const MANWON = 10_000

/**
 * 임대 사례 구간 요약. conversionRate(소수)로 보증금을 월세로 환산해 ㎡당 월 환산 임대료를 구한다.
 * 당산동6가 사례가 구간별 minSamples 이상이면 당산동6가만, 아니면 영등포구 사례까지 쓴다.
 */
export function summarizeRentComps(comps: RentComp[], conversionRate: number | null): RentBandSummary[] {
  const valid = comps.filter((c) => (c.netAreaM2 ?? 0) > 0 && c.depositManwon !== null && (c.rentType === '전세' || c.rentType === '월세'))
  let lower = 0
  return rentCompRule.bands.map(({ band, label, maxNetM2 }) => {
    const inBand = valid.filter((c) => c.netAreaM2! > lower && c.netAreaM2! <= maxNetM2)
    lower = maxNetM2
    const dong = inBand.filter((c) => c.dong === '당산동6가')
    const used = dong.length >= rentCompRule.minSamples ? dong : inBand
    const area = used === dong ? '당산동6가' : '당산동6가 + 영등포구'
    const monthly = used.filter((c) => c.rentType === '월세')
    const maint = used.map((c) => c.maintenanceManwon).filter((v): v is number => v !== null)
    const equivalents =
      conversionRate === null
        ? []
        : used.map((c) => ((c.monthlyManwon ?? 0) * MANWON + (c.depositManwon! * MANWON * conversionRate) / 12) / c.netAreaM2!)
    const wonOrNull = (v: number | null) => (v === null ? null : v * MANWON)
    return {
      band,
      label,
      count: used.length,
      area: used.length ? area : '사례 없음',
      depositWon: wonOrNull(median(monthly.map((c) => c.depositManwon!))),
      monthlyWon: wonOrNull(median(monthly.map((c) => c.monthlyManwon ?? 0))),
      maintenanceWon: wonOrNull(median(maint)),
      monthlyEquivalentPerM2: median(equivalents),
    }
  })
}
