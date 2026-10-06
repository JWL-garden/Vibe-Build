import TornadoChart from '@/components/charts/TornadoChart'
import { formatRate, formatWon, formatYears } from '@/lib/format'
import { describeAdjustment } from '@/lib/report/assumptionLabels'
import type { ReportData } from '@/types'
import { DataTable, Lead, SubTitle } from './ReportParts'

/** 6장: 시나리오·민감도 — 보수/기준/낙관 비교, 토네이도 차트 */
export default function Ch06Scenario({ data }: { data: ReportData }) {
  const { financeByScenario, sensitivity, finance } = data.analysis

  return (
    <div>
      <Lead>
        가정값이 달라질 때 결과가 얼마나 흔들리는지 보여 줍니다. 좋은 경우만이 아니라 보수적인 경우에도 사업이
        성립하는지 확인하세요.
      </Lead>

      <SubTitle>보수 / 기준 / 낙관</SubTitle>
      <DataTable
        head={['시나리오', '조건', '총사업비', 'ROI', '회수기간', 'NPV', 'IRR']}
        numeric={[2, 3, 4, 5, 6]}
        highlightRow={data.appendix.financeScenarios.findIndex((s) => s.id === data.analysis.financeScenarioId)}
        rows={data.appendix.financeScenarios.map((s) => {
          const f = financeByScenario[s.id]
          const note = s.adjustments.length > 0 ? s.adjustments.map(describeAdjustment).join(', ') : '예시 가정값 그대로'
          return [
            s.name,
            <span key="n" className="text-xs text-ink-soft">{note}</span>,
            formatWon(f.totalCostWon),
            formatRate(f.roiRate),
            formatYears(f.paybackYears),
            formatWon(f.npvWon),
            formatRate(f.irrRate),
          ]
        })}
      />
      <p className="mt-2 text-xs text-ink-faint">
        NPV·IRR은 할인율 {formatRate(finance.after.assumptions.discountRate, 0)}, 10년 운영 후 매각(자산가치 − 대출 상환) 가정을 포함합니다.
      </p>

      <SubTitle>민감도 분석 (ROI 기준)</SubTitle>
      <TornadoChart items={sensitivity} baseRoiRate={finance.after.roiRate} />
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        ROI에 가장 큰 영향을 주는 변수는 <b className="text-ink">{sensitivity[0]?.label}</b>입니다. 착공 전에 이 값을
        실제 자료로 먼저 확인하는 것이 좋습니다.
      </p>
    </div>
  )
}
