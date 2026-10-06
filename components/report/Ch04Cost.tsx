import { formatRate, formatWon } from '@/lib/format'
import type { ReportData } from '@/types'
import { DataTable, Lead, StatCard, SubTitle } from './ReportParts'

// 구성 막대 색 (항목 순서대로)
const COLORS = ['#e0621b', '#f08a4b', '#f6b083', '#8d9494', '#b3b8b8', '#d0d4d4', '#e6e8e8']

/** 4장: 사업비 추정 — 항목별 표, 구성 비율 막대, 자기자본/대출 */
export default function Ch04Cost({ data }: { data: ReportData }) {
  const f = data.analysis.finance.after
  const a = f.assumptions

  return (
    <div>
      <Lead>
        증축에 드는 비용을 항목별로 추정했습니다. 단가·비율은 모두 예시 가정값이며 시공사 견적과 전문가 검토로
        확정해야 합니다.
      </Lead>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="총사업비" value={formatWon(f.totalCostWon)} />
        <StatCard label="자기자본" value={formatWon(f.equityWon)} caption={`총사업비의 ${formatRate(f.equityWon / f.totalCostWon, 0)}`} />
        <StatCard label="대출" value={formatWon(f.loanWon)} caption={`대출비율 ${formatRate(a.loanRate, 0)} · 금리 ${formatRate(a.interestRate)}`} />
      </div>

      <SubTitle>사업비 구성</SubTitle>
      <div className="flex h-5 overflow-hidden rounded-full break-inside-avoid">
        {f.costBreakdown.map((c, i) => (
          <div
            key={c.key}
            title={`${c.label} ${formatWon(c.amountWon, 2)}`}
            style={{ width: `${(c.amountWon / f.totalCostWon) * 100}%`, background: COLORS[i % COLORS.length] }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {f.costBreakdown.map((c, i) => (
          <span key={c.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {c.label}
          </span>
        ))}
      </div>

      <SubTitle>항목별 사업비</SubTitle>
      <DataTable
        head={['항목', '산출 근거', '금액']}
        numeric={[2]}
        rows={[
          ...f.costBreakdown.map((c) => [c.label, <span key="f" className="text-xs text-ink-soft">{c.formula}</span>, formatWon(c.amountWon, 2)]),
          [<b key="t">합계</b>, '', <b key="v">{formatWon(f.totalCostWon, 2)}</b>],
        ]}
      />
    </div>
  )
}
