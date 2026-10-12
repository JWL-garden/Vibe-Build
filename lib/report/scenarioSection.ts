// 보고서 6장(시나리오·민감도) 조립 — runAll().finance 결과를 표·문장으로 바꾸기만 한다 (새로 계산하지 않음)

import { formatNumber, formatRate, formatWon, formatWonExact } from '@/lib/format'
import { cashflowRule, type AssumptionKey } from '@/lib/rules/financeDefaults'
import type { CashflowYear, FinanceScenarioId, ReportRow, SiteAnalysis, SiteScenarioSection } from '@/types'
import { FINANCE_SCENARIO_LABEL, formatAssumptionValue, gradeText } from './financeSection'

const IDS: FinanceScenarioId[] = ['CONSERVATIVE', 'BASE', 'OPTIMISTIC']
const pctOrDash = (v: number | null, d = 1) => (v === null ? '–' : formatRate(v, d))
const yearsOrDash = (v: number | null) => (v === null ? '–' : `${formatNumber(v, 1)}년`)

/** 비교표에 넣을 가정값 */
const COMPARE_KEYS: AssumptionKey[] = [
  'expansionCostPerPyeong',
  'newBuildCostTable',
  'loanInterestRate',
  'loanRatio',
  'constructionMonths',
  'rebuildConstructionMonths',
  'vacancyRate',
  'opexRate',
  'contingencyRate',
  'capRate',
]

export function scenarioSection(analysis: SiteAnalysis): SiteScenarioSection {
  const fin = analysis.finance
  const f = fin.byScenario
  const base = f.BASE
  const empty: SiteScenarioSection = {
    status: base.status,
    statusText: null,
    compareRows: [],
    assumptionRowCount: 0,
    tornado: [],
    baseRoi: null,
    tornadoRows: [],
    dependencyText: '',
    cashflow: [],
    cashflowRows: [],
    cashflowScenarioRows: [],
    years: cashflowRule.years,
    notes: [],
  }
  if (base.status === 'none') {
    return { ...empty, statusText: '증축(재건축)안이 없어 시나리오·민감도를 계산하지 않았습니다. 3장 대안 검토를 참고하세요.' }
  }
  if (base.status === 'pending') {
    return { ...empty, statusText: `가정값 입력 대기로 계산하지 않았습니다: ${base.missing.join(', ')}` }
  }

  const kind = base.project.kind
  const rows: ReportRow[] = []
  rows.push([
    '전월세 전환율 (주택)',
    ...IDS.map((id) => `${pctOrDash(f[id].conversion.housing.applied, 2)} (${f[id].conversion.housing.basis.startsWith('법정') ? '법정 상한' : '고정'})`),
  ])
  for (const key of COMPARE_KEYS) {
    const sample = base.assumptions.find((a) => a.key === key)
    if (!sample) continue
    if (kind === 'expansion' && (key === 'newBuildCostTable' || key === 'rebuildConstructionMonths')) continue
    if (kind === 'rebuild' && (key === 'expansionCostPerPyeong' || key === 'constructionMonths')) continue
    rows.push([
      `${sample.label} · ${gradeText(sample.grade)}`,
      ...IDS.map((id) => formatAssumptionValue(sample.unit, f[id].assumptions.find((a) => a.key === key)!.value)),
    ])
  }
  const assumptionRowCount = rows.length
  rows.push(
    ['총사업비', ...IDS.map((id) => formatWon(f[id].totalCostWon))],
    ['연 NOI 증가', ...IDS.map((id) => formatWon(f[id].revenue.noiIncreaseWon))],
    ['단순 ROI', ...IDS.map((id) => pctOrDash(f[id].metrics.roi))],
    ['투자회수기간', ...IDS.map((id) => yearsOrDash(f[id].metrics.paybackYears))],
    ['자기자본수익률 (ROE)', ...IDS.map((id) => pctOrDash(f[id].metrics.roe))],
    ['자산가치 증가 (수익 기준)', ...IDS.map((id) => formatWon(f[id].metrics.valueIncreaseWon))],
  )

  // 민감도
  const s = fin.sensitivity
  const fmtVal = (key: string, unit: string, v: number) => (key === 'rentFactor' ? `×${formatNumber(v, 2)}` : formatAssumptionValue(unit, v))
  const tornado = (s?.items ?? []).map((i) => ({
    label: i.label,
    rangeLabel: `${fmtVal(i.key, i.unit, i.unfavorableValue)} ~ ${fmtVal(i.key, i.unit, i.favorableValue)}`,
    lowRoiRate: i.roiUnfavorable,
    highRoiRate: i.roiFavorable,
  }))
  const tornadoRows: ReportRow[] = (s?.items ?? []).map((i) => [
    i.label,
    `${fmtVal(i.key, i.unit, i.unfavorableValue)} → ROI ${pctOrDash(i.roiUnfavorable)}`,
    `${fmtVal(i.key, i.unit, i.favorableValue)} → ROI ${pctOrDash(i.roiFavorable)}`,
    `${formatNumber(i.swing * 100, 2)}%p`,
    gradeText(i.grade),
  ])
  const top = s?.items[0]
  const dependencyText = !s
    ? ''
    : `기준 ROI ${pctOrDash(s.baseRoi)}에 가장 큰 영향을 주는 변수는 "${top?.label ?? '–'}"입니다. ` +
      (s.gradeCShare === null
        ? ''
        : `ROI 변동폭의 ${formatNumber(s.gradeCShare * 100, 0)}%가 등급 C(프로젝트 가정) 값에서 나오므로 ${
            s.gradeCShare >= 0.5 ? '가정 의존도가 높습니다 — 착공 전 견적·실거래 자료로 먼저 확인해야 합니다.' : '가정 의존도는 보통입니다.'
          }`)

  // 현금흐름 (cashflowRule.years년 기준)
  const cf = base.cashflow
  const years = cashflowRule.years
  /** 표에는 대표 연차만 (1~5년, 이후 5년 단위) — 차트는 전 기간 */
  const shownYear = (y: number) => y <= 5 || y % 5 === 0
  const cashflow: CashflowYear[] = (cf?.years ?? []).map((y) => ({
    year: y.year,
    noiWon: y.noiIncreaseWon,
    interestWon: 0,
    netWon: y.noiIncreaseWon,
    cumulativeWithWon: y.withWon,
    cumulativeWithoutWon: y.withoutWon,
  }))
  const cashflowRows: ReportRow[] = (cf?.years ?? []).filter((y) => shownYear(y.year)).map((y) => [
    `${y.year}년차`,
    formatWonExact(y.noiIncreaseWon),
    formatWonExact(y.cumulativeNetWon),
    formatWonExact(y.withoutWon),
    formatWonExact(y.withWon),
  ])
  const cashflowScenarioRows: ReportRow[] = IDS.map((id) => {
    const c = f[id].cashflow
    return [
      FINANCE_SCENARIO_LABEL[id],
      c?.npvWon == null ? '–' : formatWon(c.npvWon),
      pctOrDash(c?.irr ?? null),
      c ? (c.paybackYear === null ? `${years}년 초과` : `${c.paybackYear}년차`) : '–',
      c ? formatWon(c.cumulativeNetWon) : '–',
    ]
  })

  const g = cf?.growthRate
  const d = cf?.discountRate
  const notes = [
    '수익 시나리오: 가정값 입력 엑셀의 보수·기준·낙관 값을 그대로 적용 (주택 전월세 전환율은 모든 시나리오 6.0% 고정).',
    '토네이도: 기준 시나리오에서 변수 하나만 불리한 값·유리한 값으로 바꾸고 나머지는 기준값 그대로 두었습니다. 임대료는 ±10%(설계서 5-5). 값이 하나뿐인 가정값(예: 취득세율)은 제외했습니다.',
    `${years}년 현금흐름: 총사업비는 0년차에 지출, NOI 증가는 1년차부터 연 ${g == null ? '0%(가정값 없음)' : formatRate(g, 1)} 상승, 할인율 ${d == null ? '없음' : formatRate(d, 1)}. ${years}년 말 잔존가치(자산가치 증가)는 반영하지 않은 보수적 단순화이며, 표는 1~5년과 5년 단위 연차만 보입니다.`,
    kind === 'rebuild'
      ? '재건축은 이주·철거와 공사 기간 동안의 기존 임대수입 중단을 총사업비(공사 중 임대 손실)에 포함했습니다. "함"은 신축 NOI, "안 함"은 기존 NOI(추정)입니다.'
      : '"안 함" 누적은 기존 세대 NOI(같은 임대 사례로 추정)이며 실제 임대 조건이 아닙니다.',
  ]
  if (cf?.existingNoiMissing) notes.push('기존 세대 NOI 추정이 없어 "안 함" 누적을 0으로 두었습니다.')

  return {
    status: 'ok',
    statusText: null,
    compareRows: rows,
    assumptionRowCount,
    tornado,
    baseRoi: s?.baseRoi ?? base.metrics.roi,
    tornadoRows,
    dependencyText,
    cashflow,
    cashflowRows,
    cashflowScenarioRows,
    years,
    notes,
  }
}
