// 보고서 4장(사업비)·5장(임대수익·지표)·부록(가정값·전환율 표) 조립 — 2026-10-08 결정 1~6·12
// runAll().finance 결과를 표·문장으로 바꾸기만 한다 (새로 계산하지 않음).

import { formatNumber, formatRate, formatWon, formatWonExact } from '@/lib/format'
import { PYEONG_M2 } from '@/lib/rules/financeDefaults'
import type { FinanceScenarioId, Kpi, ReportRow, ResolvedAssumption, SiteAnalysis, SiteFinanceResult, SiteFinanceSection } from '@/types'

export const FINANCE_SCENARIO_LABEL: Record<FinanceScenarioId, string> = {
  CONSERVATIVE: '보수',
  BASE: '기준',
  OPTIMISTIC: '낙관',
}

const GRADE_TEXT = { A: 'A 공식', B: 'B 공개자료', C: 'C 프로젝트 가정', D: 'D 근거 없음' } as const
export const gradeText = (g: ResolvedAssumption['grade']) => (g ? GRADE_TEXT[g] : '입력 대기')

/** 가정값 하나를 단위에 맞게 표시 */
export function formatAssumptionValue(unit: string, v: number | null): string {
  if (v === null) return '입력 대기'
  switch (unit) {
    case '%':
      return `${formatNumber(v, 3)}%`
    case '비율':
      return formatRate(v, 2)
    case '개월':
      return `${formatNumber(v, 0)}개월`
    default:
      return `${formatNumber(v, 0)}${unit}`
  }
}

const man = (v: number | null, d = 1) => (v === null ? '–' : `${formatNumber(v / 10_000, d)}만원`)
const pctOrDash = (v: number | null) => (v === null ? '–' : formatRate(v, 1))
const yearsOrDash = (v: number | null) => (v === null ? '–' : `${formatNumber(v, 1)}년`)

export function financeSection(analysis: SiteAnalysis): SiteFinanceSection {
  const fin = analysis.finance
  const f = fin.byScenario[fin.selected]
  const scenarioLabel = `${FINANCE_SCENARIO_LABEL[fin.selected]} 시나리오 (보수·낙관은 시나리오 표)`
  const base: SiteFinanceSection = {
    status: f.status,
    statusText: null,
    scenarioLabel,
    costRows: [],
    fundingRows: [],
    unitRows: [],
    revenueRows: [],
    kpis: [],
    scenarioRows: [],
    bandRows: bandRows(f),
    bandNote: bandNote(f),
    yieldText: '',
    notes: f.notes,
    inputNotes: [],
    construction: constructionSection(analysis),
  }
  if (f.status === 'none') return { ...base, statusText: '증축(재건축)안이 없어 사업비·수익성을 계산하지 않았습니다. 3장 대안 검토를 참고하세요.' }
  if (f.status === 'pending') return { ...base, statusText: `가정값 입력 대기로 계산하지 않았습니다: ${f.missing.join(', ')}` }

  const costRows: ReportRow[] = f.costs.map((c) => [
    c.label,
    c.amountWon === null ? '입력 대기' : formatWonExact(c.amountWon),
    c.basis,
    gradeText(c.grade),
  ])
  costRows.push(['총사업비', formatWonExact(f.totalCostWon), '반영된 항목 합 (입력 대기 항목 제외)', ''])

  const r = f.revenue
  const vacancy = f.assumptions.find((a) => a.key === 'vacancyRate')!
  const opex = f.assumptions.find((a) => a.key === 'opexRate')!
  const revenueRows: ReportRow[] = [
    ['연 임대수입 (공실 전)', formatWonExact(r.grossAnnualWon), `${f.project.units.length}세대 월 환산 임대료 합 × 12`],
    ['관리비 수입', formatWonExact(r.maintenanceWon), `임대수입 × ${formatRate(f.assumptions.find((a) => a.key === 'maintenanceFeePerUnit')!.value ?? 0, 1)}`],
    ['공실 손실', `−${formatWonExact(r.vacancyLossWon)}`, `(임대수입 + 관리비) × 공실률 ${formatRate(vacancy.value, 1)}`],
    ['운영비', `−${formatWonExact(r.opexWon)}`, `× 운영비율 ${formatRate(opex.value, 1)}`],
    ['신규 세대 연 NOI', formatWonExact(r.noiWon), '임대수입 − 공실 − 운영비'],
  ]
  if (f.project.kind === 'rebuild') {
    revenueRows.push(['철거되는 기존 세대 NOI (추정)', `−${formatWonExact(r.existingNoiWon)}`, '같은 임대 사례로 추정 — 실제 임대 조건 아님'])
  }
  revenueRows.push(['연 NOI 증가', formatWonExact(r.noiIncreaseWon), f.project.kind === 'rebuild' ? '신축 NOI − 기존 NOI' : '증축 세대 NOI'])

  const m = f.metrics
  const scenarios = (['CONSERVATIVE', 'BASE', 'OPTIMISTIC'] as const).map((id) => fin.byScenario[id])
  const range = (pick: (x: SiteFinanceResult) => number | null, fmt: (v: number | null) => string) =>
    `${FINANCE_SCENARIO_LABEL.CONSERVATIVE} ${fmt(pick(scenarios[0]))} ~ ${FINANCE_SCENARIO_LABEL.OPTIMISTIC} ${fmt(pick(scenarios[2]))}`
  const kpis: Kpi[] = [
    { label: '단순 ROI', value: pctOrDash(m.roi), caption: range((x) => x.metrics.roi, pctOrDash) },
    { label: '투자회수기간', value: yearsOrDash(m.paybackYears), caption: '총사업비 ÷ 연 NOI 증가' },
    { label: '자기자본수익률 (ROE)', value: pctOrDash(m.roe), caption: `자기자본 ${formatWon(f.equityWon)}` },
    { label: '자산가치 증가 (수익 기준)', value: formatWon(m.valueIncreaseWon), caption: `NOI 증가 ÷ 환원율 · 순증 ${formatWon(m.netValueIncreaseWon)}` },
  ]

  const ly = f.landInclusiveYield
  return {
    ...base,
    costRows,
    fundingRows: [
      ['자기자본', formatWonExact(f.equityWon), '총사업비 − 대출'],
      ['대출', formatWonExact(f.loanWon), `금융비용 전 소계 × 대출 비율 ${formatRate(f.assumptions.find((a) => a.key === 'loanRatio')!.value, 0)}`],
      ['참고: 새 세대 보증금 합계', formatWonExact(r.depositTotalWon), '회귀로 추정한 세대별 보증금 합 — 사업비 조달에 쓸 수 있으나 반환 의무가 있는 돈'],
    ],
    unitRows: f.project.units
      .map((u, i) => [
        `${i + 1}`,
        `${formatNumber(u.netAreaM2, 2)}㎡ (${formatNumber(u.netAreaPyeong, 2)}평)${u.extrapolated ? ' · 회귀 범위 초과' : ''}`,
        u.monthlyEquivalentWon === null ? '–' : `${formatWonExact(u.monthlyEquivalentWon)}/월`,
        `${formatWon(u.depositWon)} / ${formatWon(u.monthlyWon)}`,
      ])
      .concat(
        f.project.sideNetM2 > 0
          ? [
              [
                '측면 보강 (기존 세대 확장분, 평당 증가분만)',
                `${formatNumber(f.project.sideNetM2, 2)}㎡ (${formatNumber(f.project.sideNetM2 / PYEONG_M2, 2)}평)`,
                f.project.sideRentMonthlyWon === null ? '–' : `${formatWonExact(f.project.sideRentMonthlyWon)}/월`,
                '–',
              ],
            ]
          : [],
      ),
    revenueRows,
    kpis,
    scenarioRows: scenarios.map((x) => [
      FINANCE_SCENARIO_LABEL[x.scenario],
      `${pctOrDash(x.conversion.housing.applied)} (${x.conversion.housing.basis.startsWith('법정') ? '법정 상한' : '고정'})`,
      formatWon(x.totalCostWon),
      formatWon(x.revenue.noiIncreaseWon),
      pctOrDash(x.metrics.roi),
      yearsOrDash(x.metrics.paybackYears),
    ]),
    yieldText: ly
      ? `토지 포함 수익률(보유 자산 전체 기준, 참고): 전 ${formatRate(ly.beforeRate, 2)} → 후 ${formatRate(ly.afterRate, 2)} — 기존 NOI는 임대 사례로 추정한 값입니다. 증축 판단의 핵심 지표는 단순 ROI입니다.`
      : '토지 포함 수익률: 증축 전 자산가치 또는 기존 NOI 추정이 없어 계산하지 않았습니다.',
  }
}

/** 4장 공사비 실적 근거 — 기준 엑셀 '하우빌드 공사비'(저층 주택 신축 도급 공사비, 건설공사비지수 2026 환산) */
function constructionSection(analysis: SiteAnalysis): SiteFinanceSection['construction'] {
  const c = analysis.finance.construction
  const base = analysis.finance.byScenario.BASE
  const rows: ReportRow[] = c.compare.map((s) => [
    s.label,
    `${s.count}건`,
    s.perM2Median === null ? '–' : `${formatNumber(s.perM2Median, 0)}원`,
    s.pyeongGfaMedianManwon === null ? '–' : `${formatNumber(s.pyeongGfaMedianManwon, 0)}만원`,
    s.pyeongWorkMedianManwon === null ? '–' : `${formatNumber(s.pyeongWorkMedianManwon, 0)}만원`,
    s.monthsMedian === null ? '–' : `${formatNumber(s.monthsMedian, 1)}개월`,
  ])
  const notes: string[] = [c.basisNote]
  const a = c.applied
  const perPyeong = base.assumptions.find((x) => x.key === 'expansionCostPerPyeong')?.value ?? null
  if (a && a.pyeongWorkMedianManwon !== null && perPyeong !== null) {
    const ratio = perPyeong / 10_000 / a.pyeongWorkMedianManwon
    notes.push(
      `증축 공사비 가정값 평당 ${formatNumber(perPyeong / 10_000, 0)}만원은 같은 집단 신축 실적(공사면적 기준 평당 중앙값 ${formatNumber(a.pyeongWorkMedianManwon, 0)}만원)의 ${formatRate(ratio, 0)} 수준입니다. 실적은 신축 도급 공사비이며 증축 실적이 아닙니다.`,
    )
  }
  const months = base.assumptions.find((x) => x.key === 'rebuildConstructionMonths')?.value ?? null
  if (a && a.monthsMedian !== null && months !== null) {
    notes.push(`재건축 공사 기간 가정 ${formatNumber(months, 0)}개월 — 같은 집단 실적 중앙값 ${formatNumber(a.monthsMedian, 1)}개월.`)
  }
  notes.push('하우빌드 공사비는 시공사 도급 공사비(VAT 포함)로 감리비·부담금 등 간접비가 빠져 있습니다. 건설공사비지수는 직접공사비 물가 기준이라 시공사 이윤·인력 수급 변동은 반영하지 못합니다.')
  return { rows, appliedRow: a ? c.compare.findIndex((s) => s.label === a.label) : -1, notes }
}

/** 임대 사례 회귀 표 — [항목, 사례 평균, 회귀식(전용 평 기준), 1평 증가당, 최소 임대면적 값] */
function bandRows(f: SiteFinanceResult): ReportRow[] {
  return f.rentBands.flatMap((b) => {
    const at = (base: number | null, per: number | null) =>
      base === null || per === null || b.minPyeong === null ? null : Math.max(0, base + per * b.minPyeong)
    const line = (base: number | null, per: number | null, d: number) =>
      base === null || per === null ? '–' : `${man(base, d)} + ${man(per, d)} × 평`
    return [
      ['보증금', man(b.meanDepositWon, 0), line(b.depositBaseWon, b.depositPerPyeongWon, 0), `+${man(b.depositPerPyeongWon, 0)}`, man(at(b.depositBaseWon, b.depositPerPyeongWon), 0)],
      ['월세', man(b.meanMonthlyWon, 1), line(b.monthlyBaseWon, b.monthlyPerPyeongWon, 1), `+${man(b.monthlyPerPyeongWon, 1)}`, man(at(b.monthlyBaseWon, b.monthlyPerPyeongWon), 1)],
      [
        '월 환산 임대료 (보증금 1,000만원당 월 5만원)',
        man(b.meanMonthlyWon === null || b.meanDepositWon === null ? null : b.meanMonthlyWon + (b.meanDepositWon * 0.06) / 12, 1),
        line(b.equivalentBaseWon, b.equivalentPerPyeongWon, 1),
        `+${man(b.equivalentPerPyeongWon, 1)}`,
        man(at(b.equivalentBaseWon, b.equivalentPerPyeongWon), 1),
      ],
    ]
  })
}

/** 임대 사례 표 아래 설명 한 줄 */
function bandNote(f: SiteFinanceResult): string {
  const b = f.rentBands[0]
  if (!b || b.minPyeong === null || b.maxPyeong === null) return '임대 사례가 없습니다.'
  const fr = (v: number | null) => (v === null ? '–' : formatNumber(v, 2))
  return (
    `${b.area} 신규 월세 ${b.count}건(전용 ${fr(b.minPyeong)}~${fr(b.maxPyeong)}평, 평균 ${fr(b.meanPyeong)}평). ` +
    `회귀는 전용 ${b.fitMaxPyeong ?? '전체'}평 이하 ${b.fitCount}건 기준, 설명력 R² ${b.r2 === null ? '–' : formatNumber(b.r2, 2)}. ` +
    `최소 임대면적 ${fr(b.minPyeong)}평(${fr(b.minPyeong * PYEONG_M2)}㎡) 기준으로 1평 늘 때마다 월 환산 임대료가 약 ${man(b.equivalentPerPyeongWon)} 늘어납니다.`
  )
}

/** 부록: 수익성 가정값 표 (결정 4 — 등급 C도 범위와 함께 출력) */
export function assumptionRows(f: SiteFinanceResult): ReportRow[] {
  return f.assumptions.map((a) => {
    const { low, high } = a.range
    const ranged = low !== null && high !== null && (low !== a.range.base || high !== a.range.base)
    return [
      a.label,
      formatAssumptionValue(a.unit, a.range.base),
      ranged ? `${formatAssumptionValue(a.unit, low)} ~ ${formatAssumptionValue(a.unit, high)}` : '단일 값',
      gradeText(a.grade),
      [a.sourceText, a.memo].filter(Boolean).join(' — ') || '–',
    ]
  })
}

/** 부록: 전월세 전환율 표 (결정 6) */
export function conversionRows(analysis: SiteAnalysis): ReportRow[] {
  const c = analysis.finance.byScenario.CONSERVATIVE.conversion
  const b = analysis.finance.byScenario.BASE.conversion
  return [
    ['주택 (연립·다세대)', pctOrDash(c.housing.legalCap), pctOrDash(b.housing.market), pctOrDash(c.housing.applied), pctOrDash(b.housing.applied), 'min(연 10%, 기준금리 + 2%p) — 주택임대차보호법 시행령 제9조'],
    ['상가·사무실 (주거 외)', pctOrDash(c.commercial.legalCap), pctOrDash(b.commercial.market), pctOrDash(c.commercial.applied), pctOrDash(b.commercial.applied), 'min(연 12%, 기준금리 × 4.5) — 상가건물 임대차보호법 시행령 제5조'],
  ]
}
