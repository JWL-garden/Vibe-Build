// 공사비 실적 요약 (순수 함수) — 기준 엑셀 '하우빌드 공사비' → 권역·기간별 ㎡당·평당 단가, 공사기간
// 엑셀 '하우빌드 2026환산' 집계표와 같은 값이 나와야 한다 (constructionCost.test.ts)

import { PYEONG_M2, constructionCostRule } from '@/lib/rules/financeDefaults'
import type { AssumptionRow, ConstructionCostRow, ConstructionCostSummary, ConstructionStat } from '@/types'

type Rule = typeof constructionCostRule

/** 선형 보간 백분위 (엑셀 PERCENTILE.INC와 같음). 값이 없으면 null */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const pos = (s.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x !== null && Number.isFinite(x) && x > 0)

function statOf(label: string, rows: ConstructionCostRow[], rule: Rule): ConstructionStat {
  const perM2 = nums(rows.map((r) => r.perM2Gfa2026Won))
  const median = percentile(perM2, 0.5)
  return {
    label,
    count: perM2.length,
    perM2Median: median,
    perM2Conservative: percentile(perM2, rule.conservativePercentile),
    perM2Optimistic: percentile(perM2, rule.optimisticPercentile),
    pyeongGfaMedianManwon: median === null ? null : (median * PYEONG_M2) / 10_000,
    pyeongWorkMedianManwon: percentile(nums(rows.map((r) => r.pyeongWork2026Manwon)), 0.5),
    monthsMedian: percentile(nums(rows.map((r) => r.months)), 0.5),
  }
}

export function summarizeConstruction(all: ConstructionCostRow[], rule: Rule = constructionCostRule): ConstructionCostSummary {
  // 통계제외('Y') 현장은 모든 지표에서 뺀다
  const rows = all.filter((r) => r.excluded === null || r.excluded === '')
  const seoul = rows.filter((r) => r.region === rule.region)
  const recent = (r: ConstructionCostRow) => r.startYear !== null && r.startYear >= rule.startYearFrom && r.startYear <= rule.startYearTo
  const period = `착공 ${rule.startYearFrom}~${rule.startYearTo}`
  const outside = rows.filter((r) => r.region !== rule.region)

  const recentStat = statOf(`${rule.region}, ${period}`, seoul.filter(recent), rule)
  const allStat = statOf(`${rule.region}, 전체 기간`, seoul, rule)
  const useFallback = recentStat.count < rule.minSamples
  const applied = useFallback ? allStat : recentStat
  const compare = [
    recentStat,
    allStat,
    statOf(`${rule.region} 외 지역, ${period}`, outside.filter(recent), rule),
    statOf(`${rule.region} 외 지역, 전체 기간`, outside, rule),
  ]
  return {
    applied: applied.count > 0 ? applied : null,
    compare,
    basisNote: useFallback
      ? `${recentStat.label} 표본 ${recentStat.count}건으로 ${rule.minSamples}건 미만이라 ${allStat.label}를 적용했습니다.`
      : `${recentStat.label} ${recentStat.count}건의 ㎡당 공사비(연면적 기준, 건설공사비지수 2026 환산) 중앙값을 적용했습니다.`,
  }
}

/**
 * 신축 단가(엑셀 신축비용 자료, newBuildCostExcel)가 가정값 입력 엑셀에서 비어 있으면 공사비 실적으로 채운다.
 * low = 보수(비싼 쪽, 상위 사분위) / base = 중앙값 / high = 낙관(하위 사분위)
 */
export function withConstructionUnitCost(rows: AssumptionRow[], summary: ConstructionCostSummary, rule: Rule = constructionCostRule): AssumptionRow[] {
  const s = summary.applied
  const existing = rows.find((r) => r.key === 'newBuildCostExcel')
  if (existing && existing.base !== null) return rows
  if (!s || s.perM2Median === null) return rows
  const filled: AssumptionRow = {
    key: 'newBuildCostExcel',
    label: existing?.label ?? '신축 단가 — 건축물 신축비용 자료 (엑셀)',
    unit: existing?.unit ?? '원/㎡',
    low: Math.round(s.perM2Conservative ?? s.perM2Median),
    base: Math.round(s.perM2Median),
    high: Math.round(s.perM2Optimistic ?? s.perM2Median),
    grade: rule.grade,
    sourceTitle: `하우빌드 공사비 실적 ${s.label} ${s.count}건, ㎡당(연면적 기준) 중앙값 · 건설공사비지수 2026 환산`,
    publisher: '하우빌드 준공 현장 · 건설공사비지수(KOSIS, 한국건설기술연구원 주거용건물)',
    baseDate: '2026-08',
    url: null,
    memo: `${rule.note}. 보수 = 상위 사분위, 낙관 = 하위 사분위. ${summary.basisNote}`,
  }
  return existing ? rows.map((r) => (r.key === 'newBuildCostExcel' ? filled : r)) : [...rows, filled]
}
