// 공사비 실적 요약 (순수 함수) — 기준 엑셀 '하우빌드 공사비' → 권역·기간별 ㎡당·평당 단가, 공사기간
// 엑셀 '하우빌드 2026환산' 집계표와 같은 값이 나와야 한다 (constructionCost.test.ts)

import { PYEONG_M2, constructionCostRule } from '@/lib/rules/financeDefaults'
import type {
  AssumptionRow,
  ConstructionCostRow,
  ConstructionCostSummary,
  ConstructionDurationSummary,
  ConstructionStat,
  DurationEstimate,
  DurationStat,
} from '@/types'

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

// ── 공사 기간: 층별·면적별 실적 (2026-10-12) ─────────────────────────────

/** 층수별·연면적대별 공사 기간 집계 기준 */
export const durationRule = {
  /** 연면적 구간 (㎡) — 이 경계로 사례를 나눈다 */
  areaBinsM2: [0, 300, 450, 600, Infinity] as readonly number[],
  /** 같은 층수 사례가 이 값 미만이면 인접 층(±1)까지 넓힌다 */
  minSamples: 5,
} as const

const floorsOf = (r: ConstructionCostRow) => {
  const m = /지상\s*(\d+)\s*층/.exec(r.floorsText ?? '')
  return m ? Number(m[1]) : null
}

const usable = (rows: ConstructionCostRow[]) =>
  rows.filter((r) => (r.excluded === null || r.excluded === '') && (r.months ?? 0) > 0 && (r.gfaM2 ?? 0) > 0 && floorsOf(r) !== null)

function durationStat(label: string, rows: ConstructionCostRow[], value: (r: ConstructionCostRow) => number): DurationStat {
  const v = rows.map(value)
  return { label, count: v.length, median: percentile(v, 0.5), p25: percentile(v, 0.25), p75: percentile(v, 0.75) }
}

/** 층수별·연면적대별 공사 기간 집계 (표는 권역 구분 없이 전체 사례) */
export function summarizeDuration(all: ConstructionCostRow[], rule = durationRule): ConstructionDurationSummary {
  const rows = usable(all)
  const months = (r: ConstructionCostRow) => r.months!
  const floorNos = [...new Set(rows.map((r) => floorsOf(r)!))].sort((a, b) => a - b)
  const bins = rule.areaBinsM2
  return {
    byFloors: floorNos.map((n) => durationStat(`지상 ${n}층`, rows.filter((r) => floorsOf(r) === n), months)),
    byArea: bins.slice(0, -1).map((lo, i) => {
      const hi = bins[i + 1]
      const label = hi === Infinity ? `연면적 ${lo}㎡ 이상` : lo === 0 ? `연면적 ${hi}㎡ 미만` : `연면적 ${lo}~${hi}㎡`
      return durationStat(label, rows.filter((r) => r.gfaM2! >= lo && r.gfaM2! < hi), months)
    }),
    perFloor: durationStat('층당 공사 기간', rows, (r) => r.months! / floorsOf(r)!),
  }
}

/**
 * 신축(재건축) 공사 기간 추정 — 지상 N층 사례(5건 미만이면 ±1층까지) 중 연면적이 같은 구간 사례(5건 이상일 때)의 중앙값.
 * 사례가 전혀 없으면 null.
 */
export function estimateNewBuildMonths(all: ConstructionCostRow[], totalFloors: number, gfaM2: number, rule = durationRule): DurationEstimate | null {
  const rows = usable(all)
  let span = 0
  let set = rows.filter((r) => floorsOf(r) === totalFloors)
  while (set.length < rule.minSamples && span < 3) {
    span++
    set = rows.filter((r) => Math.abs(floorsOf(r)! - totalFloors) <= span)
  }
  if (set.length === 0) return null
  const inBin = set.filter((r) => {
    const bins = rule.areaBinsM2
    const idx = bins.findIndex((lo, i) => i < bins.length - 1 && gfaM2 >= lo && gfaM2 < bins[i + 1])
    return idx >= 0 && r.gfaM2! >= bins[idx] && r.gfaM2! < bins[idx + 1]
  })
  const used = inBin.length >= rule.minSamples ? inBin : set
  const v = used.map((r) => r.months!)
  const floorText = span === 0 ? `지상 ${totalFloors}층` : `지상 ${totalFloors - span}~${totalFloors + span}층`
  return {
    base: percentile(v, 0.5)!,
    conservative: percentile(v, 0.75)!,
    optimistic: percentile(v, 0.25)!,
    count: used.length,
    basis: `하우빌드 실적 ${floorText}${used === inBin ? ' · 같은 연면적대' : ''} ${used.length}건 중앙값`,
  }
}

/** 증축 공사 기간 추정 — 층당 공사 기간(실적 중앙값) × 증축 층수, 최소 1개월 */
export function estimateAddFloorsMonths(all: ConstructionCostRow[], addFloors: number, rule = durationRule): DurationEstimate | null {
  if (addFloors <= 0) return null
  const s = summarizeDuration(all, rule).perFloor
  if (s.median === null || s.p25 === null || s.p75 === null) return null
  const at = (v: number) => Math.max(1, Math.round(v * addFloors * 2) / 2)
  return {
    base: at(s.median),
    conservative: at(s.p75),
    optimistic: at(s.p25),
    count: s.count,
    basis: `하우빌드 실적 ${s.count}건의 층당 공사 기간 중앙값 ${s.median.toFixed(2)}개월 × 증축 ${addFloors}개층`,
  }
}

/** 공사 기간 가정값(key)을 실적 추정으로 바꾼다 (보수 = 상위 사분위, 낙관 = 하위 사분위, 등급 B) */
export function withConstructionMonths(
  rows: AssumptionRow[],
  key: 'constructionMonths' | 'rebuildConstructionMonths',
  est: DurationEstimate | null,
): AssumptionRow[] {
  if (!est) return rows
  const existing = rows.find((r) => r.key === key)
  const row: AssumptionRow = {
    key,
    label: existing?.label ?? (key === 'rebuildConstructionMonths' ? '공사 기간 (재건축)' : '공사 기간 (증축)'),
    unit: existing?.unit ?? '개월',
    low: est.conservative,
    base: est.base,
    high: est.optimistic,
    grade: 'B',
    sourceTitle: est.basis,
    publisher: '하우빌드 준공 현장 (층별·면적별 공사 기간)',
    baseDate: '2026-08',
    url: null,
    memo: '공사 기간은 층별·면적별 실적으로 갈음 (2026-10-12 결정). 보수 = 상위 사분위, 낙관 = 하위 사분위',
  }
  return existing ? rows.map((r) => (r.key === key ? row : r)) : [...rows, row]
}
