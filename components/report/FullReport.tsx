import type { ReportData } from '@/types'
import Appendix from './Appendix'
import Ch00Summary from './Ch00Summary'
import ReportCover from './ReportCover'
import Ch01Status from './Ch01Status'
import Ch02Regulation from './Ch02Regulation'
import Ch03Plan from './Ch03Plan'
import Ch04Cost from './Ch04Cost'
import Ch05Return from './Ch05Return'
import Ch06Scenario from './Ch06Scenario'
import Ch07Risk from './Ch07Risk'
import Ch08Schedule from './Ch08Schedule'
import Ch09Partners from './Ch09Partners'
import Ch10NextStep from './Ch10NextStep'
import ReportPage from './ReportPage'

/** 설계서 11장 순서대로 0~10장 + 부록 (ReportData만 읽고 계산하지 않음) */
const CHAPTERS: { no: string; title: string; Body: React.ComponentType<{ data: ReportData }> }[] = [
  { no: '1장', title: '대상 건축물 현황', Body: Ch01Status },
  { no: '2장', title: '법규 검토', Body: Ch02Regulation },
  { no: '3장', title: '증축 계획안', Body: Ch03Plan },
  { no: '4장', title: '사업비 추정', Body: Ch04Cost },
  { no: '5장', title: '수익 분석', Body: Ch05Return },
  { no: '6장', title: '시나리오·민감도', Body: Ch06Scenario },
  { no: '7장', title: '리스크와 대응', Body: Ch07Risk },
  { no: '8장', title: '추진 절차·일정', Body: Ch08Schedule },
  { no: '9장', title: '전문가 협업 구성', Body: Ch09Partners },
  { no: '10장', title: '다음 단계 제안', Body: Ch10NextStep },
  { no: '부록', title: '근거와 가정', Body: Appendix },
]

export default function FullReport({ data, sourceLabel }: { data: ReportData; sourceLabel: string }) {
  const { meta, summary, building, analysis } = data
  const pageProps = { address: meta.address, sourceLabel }

  return (
    <>
      <ReportPage {...pageProps} chapter={null} page={null} bare fixedHeight>
        <ReportCover title={meta.title} floorsAbove={building.floorsAbove} sample />
      </ReportPage>
      <ReportPage {...pageProps} chapter={null} page={1}>
        <Ch00Summary
          title={meta.title}
          address={meta.address}
          createdAt={meta.createdAt}
          author={meta.author}
          scenarioName={`${meta.scenarioName} · 수익 ${meta.financeScenarioName}`}
          floorsAbove={building.floorsAbove}
          addFloors={analysis.expansion.after.addFloors}
          kpis={summary.kpis}
          conclusion={summary.conclusion}
          nextStep={summary.nextStep}
        />
      </ReportPage>
      {CHAPTERS.map(({ no, title, Body }, i) => (
        <ReportPage key={no} {...pageProps} chapter={{ no, title }} page={i + 2}>
          <Body data={data} />
        </ReportPage>
      ))}
    </>
  )
}
