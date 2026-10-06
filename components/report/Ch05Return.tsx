import CashflowChart from '@/components/charts/CashflowChart'
import { formatRate, formatWon, formatYears } from '@/lib/format'
import type { ReportData } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from './ReportParts'

/** 5장: 수익 분석 — NOI, 지표, 10년 누적 비교, 완화 전/후 비교 */
export default function Ch05Return({ data }: { data: ReportData }) {
  const { finance, expansion } = data.analysis
  const f = finance.after
  const fb = finance.before
  const lastYear = f.cashflow[f.cashflow.length - 1]

  return (
    <div>
      <Lead>
        증축으로 늘어나는 연 순영업소득(NOI)과 투자 지표입니다. 임대료·공실률·환원율은 샘플 시장데이터(예시값)를
        적용했습니다.
      </Lead>

      <SubTitle>연간 수익 증가</SubTitle>
      <DataTable
        head={['항목', '금액 (연)']}
        numeric={[1]}
        rows={[
          ['임대수입 (공실 반영)', formatWon(f.annualRentWon, 2)],
          ['보증금 운용수익', formatWon(f.depositIncomeWon, 2)],
          ['운영비', `− ${formatWon(f.opexWon, 2)}`],
          [<b key="n">순영업소득 NOI 증가</b>, <b key="v">{formatWon(f.noiWon, 2)}</b>],
          ['대출 이자', `− ${formatWon(f.annualInterestWon, 2)}`],
        ]}
      />

      <div className="mt-6 grid grid-cols-5 gap-2">
        <StatCard label="ROI" value={formatRate(f.roiRate)} />
        <StatCard label="ROE" value={formatRate(f.roeRate)} />
        <StatCard label="회수기간" value={formatYears(f.paybackYears)} />
        <StatCard label="자산가치 증가" value={formatWon(f.valueIncreaseWon)} />
        <StatCard label="순자산가치 증가" value={formatWon(f.netValueIncreaseWon)} />
      </div>

      <SubTitle>10년 누적 순수익: 증축 안 함 vs 증축함</SubTitle>
      <CashflowChart cashflow={f.cashflow} />
      {lastYear && (
        <p className="mt-2 text-sm text-ink-soft">
          10년 뒤 누적 순수익은 증축 시 {formatWon(lastYear.cumulativeWithWon)}, 증축하지 않을 때{' '}
          {formatWon(lastYear.cumulativeWithoutWon)}입니다 (자기자본 투입 반영, 매각 차익 제외). 운영 수익으로 투입한
          자기자본을 회수하고, 증축의 추가 이익은 주로 순자산가치 증가({formatWon(f.netValueIncreaseWon)})로 나타납니다.
        </p>
      )}

      <SubTitle>완화 전 / 후 수익 비교</SubTitle>
      <DataTable
        head={['구분', '증축', '총사업비', '연 NOI', 'ROI', '회수기간']}
        numeric={[1, 2, 3, 4, 5]}
        highlightRow={1}
        rows={[
          ['현행 법규 (BASE)', `+${expansion.before.addFloors}층`, formatWon(fb.totalCostWon), formatWon(fb.noiWon, 2), formatRate(fb.roiRate), formatYears(fb.paybackYears)],
          [`완화 (${data.analysis.scenarioId})`, `+${expansion.after.addFloors}층`, formatWon(f.totalCostWon), formatWon(f.noiWon, 2), formatRate(f.roiRate), formatYears(f.paybackYears)],
        ]}
      />
    </div>
  )
}
