import CashflowChart from '@/components/charts/CashflowChart'
import TornadoChart from '@/components/charts/TornadoChart'
import type { SiteReport } from '@/types'
import { DataTable, Lead, SubTitle } from '../ReportParts'

/**
 * 6장: 시나리오·민감도 — 보수/기준/낙관 비교, 토네이도 차트, 20년 현금흐름·NPV·IRR.
 * SiteReport만 읽고 계산하지 않는다.
 */
export default function SiteCh06Scenario({ report }: { report: SiteReport }) {
  const sc = report.scenario
  const kindWord = report.analysis.scenarioId === 'REBUILD' ? '재건축' : '증축'
  if (sc.status !== 'ok') return <Lead>{sc.statusText}</Lead>

  return (
    <div>
      <Lead>
        가정값이 달라질 때 결과가 얼마나 흔들리는지 보여 줍니다. 좋은 경우만이 아니라 보수적인 경우에도 사업이 성립하는지 확인하세요.
      </Lead>

      <SubTitle>보수 / 기준 / 낙관</SubTitle>
      <DataTable head={['항목', '보수', '기준', '낙관']} numeric={[1, 2, 3]} rows={sc.compareRows} highlightRow={sc.assumptionRowCount + 2} />

      {sc.tornado.length > 0 && (
        <>
          <SubTitle>민감도 분석 (ROI 기준)</SubTitle>
          <TornadoChart items={sc.tornado} baseRoiRate={sc.baseRoi ?? 0} />
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{sc.dependencyText}</p>
          <div className="mt-4 break-inside-avoid">
            <DataTable head={['변수', '불리한 값', '유리한 값', 'ROI 변동폭', '근거 등급']} numeric={[3]} rows={sc.tornadoRows} />
          </div>
        </>
      )}

      <div className="break-inside-avoid">
        <SubTitle>
          {sc.years}년 {sc.assetAdjusted ? '순자산' : '현금흐름'} — {kindWord} 안 함 vs 함 (기준 시나리오)
        </SubTitle>
        <CashflowChart cashflow={sc.cashflow} label={kindWord} />
        {sc.assetCrossoverText && <p className="mt-2 text-sm font-medium text-ink">{sc.assetCrossoverText}</p>}
      </div>
      <div className="mt-4 break-inside-avoid">
        <DataTable
          head={sc.cashflowHead}
          numeric={sc.cashflowHead.map((_, i) => i).slice(1)}
          rows={sc.cashflowRows}
        />
      </div>

      <div className="break-inside-avoid">
        <SubTitle>시나리오별 NPV · IRR (임대수익 기준)</SubTitle>
        <DataTable
          head={['시나리오', `NPV (${sc.years}년)`, `IRR (${sc.years}년)`, '회수 연차', `${sc.years}년 말 누적 순증`]}
          numeric={[1, 2, 3, 4]}
          rows={sc.cashflowScenarioRows}
          highlightRow={1}
        />
      </div>

      {sc.assetAdjusted && (
        <div className="mt-4 break-inside-avoid">
          <SubTitle>시나리오별 자산가치 반영 지표</SubTitle>
          <DataTable
            head={['시나리오', '회수 연차', `NPV (${sc.years}년 말 자산가치 회수)`, 'IRR', `${sc.years}년 말 순증`]}
            numeric={[1, 2, 3, 4]}
            rows={sc.assetScenarioRows}
            highlightRow={1}
          />
        </div>
      )}

      <ul className="mt-6 space-y-1 text-xs text-ink-faint">
        {sc.notes.map((n) => (
          <li key={n}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
