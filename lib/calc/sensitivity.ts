// 민감도 (설계서 5-5) — 가정값 하나만 불리한 값 / 유리한 값으로 바꿨을 때 ROI 변화 (토네이도 차트용, 순수 함수)
// 변수 = 가정값 입력 엑셀 행 중 보수 ≠ 낙관인 항목 + 임대료 ±10%. 나머지는 기준 시나리오 값을 쓴다.

import { calcSiteFinance, type SiteFinanceInput } from './finance'
import type { AssumptionKey } from '@/lib/rules/financeDefaults'
import type { SiteSensitivityItem, SiteSensitivityResult } from '@/types'

/** ROI에 영향을 주는 가정값 (환원율은 ROI에 영향이 없어 제외, 전환율은 시나리오 단위라 제외) */
const SENSITIVITY_KEYS: AssumptionKey[] = [
  'expansionCostPerPyeong',
  'expansionCostPerUnit',
  'newBuildCostTable',
  'newBuildCostExcel',
  'acquisitionTaxRate',
  'loanInterestRate',
  'loanRatio',
  'constructionMonths',
  'rebuildConstructionMonths',
  'vacancyRate',
  'opexRate',
  'maintenanceFeePerUnit',
]

/** 임대료 변동폭 (설계서 5-5: ±10%) */
export const RENT_SENSITIVITY = 0.1

export type SensitivityInput = Omit<SiteFinanceInput, 'scenario' | 'userInput' | 'rentFactor'>

/** 기준 시나리오를 중심으로 변수별 ROI 변동을 계산. 수익성을 계산하지 못하면 null */
export function runSensitivity(input: SensitivityInput): SiteSensitivityResult | null {
  const base = calcSiteFinance({ ...input, scenario: 'BASE' })
  if (base.status !== 'ok' || base.metrics.roi === null) return null
  const baseRoi = base.metrics.roi
  const roiOf = (extra: Pick<SiteFinanceInput, 'userInput' | 'rentFactor'>) =>
    calcSiteFinance({ ...input, scenario: 'BASE', ...extra }).metrics.roi

  const items: SiteSensitivityItem[] = []
  const push = (
    key: string,
    label: string,
    unit: string,
    grade: SiteSensitivityItem['grade'],
    a: { value: number; roi: number | null },
    b: { value: number; roi: number | null },
  ) => {
    if (a.roi === null || b.roi === null) return
    const [lo, hi] = a.roi <= b.roi ? [a, b] : [b, a]
    const swing = hi.roi! - lo.roi!
    if (swing < 1e-9) return
    items.push({
      key,
      label,
      unit,
      grade,
      unfavorableValue: lo.value,
      favorableValue: hi.value,
      roiUnfavorable: lo.roi!,
      roiFavorable: hi.roi!,
      swing,
    })
  }

  for (const key of SENSITIVITY_KEYS) {
    const row = base.assumptions.find((x) => x.key === key)
    if (!row) continue
    const { low, high } = row.range
    if (low === null || high === null || low === high) continue
    push(
      key,
      row.label,
      row.unit,
      row.grade,
      { value: low, roi: roiOf({ userInput: { [key]: low } }) },
      { value: high, roi: roiOf({ userInput: { [key]: high } }) },
    )
  }

  push(
    'rentFactor',
    `임대료 ±${Math.round(RENT_SENSITIVITY * 100)}%`,
    '배',
    'B',
    { value: 1 - RENT_SENSITIVITY, roi: roiOf({ rentFactor: 1 - RENT_SENSITIVITY }) },
    { value: 1 + RENT_SENSITIVITY, roi: roiOf({ rentFactor: 1 + RENT_SENSITIVITY }) },
  )

  items.sort((x, y) => y.swing - x.swing)
  const total = items.reduce((s, i) => s + i.swing, 0)
  const cd = items.filter((i) => i.grade === 'C' || i.grade === 'D').reduce((s, i) => s + i.swing, 0)
  return { baseRoi, items, gradeCShare: total > 0 ? cd / total : null }
}
