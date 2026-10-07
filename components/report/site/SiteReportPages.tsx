import type { SiteReport } from '@/types'
import Ch00Summary from '../Ch00Summary'
import ReportPage from '../ReportPage'
import SiteAppendix from './SiteAppendix'
import SiteCh01Status from './SiteCh01Status'
import SiteCh02Regulation from './SiteCh02Regulation'
import SiteCh03Plan from './SiteCh03Plan'
import SiteCh05Return from './SiteCh05Return'
import SiteVerification from './SiteVerification'

/** 아직 엔진·조립이 없는 장 (설계서 11장) */
const UPCOMING = [
  { title: '4장 사업비 추정', note: '수익성 계산 엔진 연결 후 작성' },
  { title: '6장 시나리오·민감도', note: '수익성 계산 엔진 연결 후 작성' },
  { title: '7장 리스크와 대응', note: '추후 작성' },
  { title: '8장 추진 절차·일정', note: '추후 작성' },
  { title: '9장 전문가 협업 구성', note: '추후 작성' },
  { title: '10장 다음 단계 제안', note: '추후 작성' },
]

/** 기준 엑셀 필지 보고서: 표지 + 1·2·3·5장 + 이어지는 장 목록 + 부록 1(근거) + 부록 2(데이터 검증) (SiteReport만 읽고 계산하지 않음) */
export default function SiteReportPages({ report }: { report: SiteReport }) {
  const { meta, summary } = report
  const pageProps = { address: meta.address, sourceLabel: meta.sourceLabel }
  const chapters = [
    { no: '1장', title: '대상 건축물 현황', body: <SiteCh01Status report={report} /> },
    { no: '2장', title: '법규 검토', body: <SiteCh02Regulation report={report} /> },
    { no: '3장', title: '증축 계획안', body: <SiteCh03Plan report={report} /> },
    // 4장 사업비는 수익성 엔진 연결 후 — 5장은 지금 토지가액·자산가치만
    { no: '5장', title: '수익 분석 (토지·자산가치)', body: <SiteCh05Return report={report} /> },
  ]

  return (
    <>
      <ReportPage {...pageProps} chapter={null} page={1}>
        <Ch00Summary
          title={meta.title}
          address={meta.address}
          createdAt={meta.createdAt}
          author="Vibe Build 증축 검토 서비스"
          scenarioName={meta.scenarioLabel}
          floorsAbove={summary.floorsAbove}
          addFloors={summary.addFloors}
          kpis={summary.kpis}
          conclusion={summary.conclusion}
          nextStep={null}
        />
      </ReportPage>

      {chapters.map((c, i) => (
        <ReportPage key={c.no} {...pageProps} chapter={{ no: c.no, title: c.title }} page={i + 2}>
          {c.body}
        </ReportPage>
      ))}

      <ReportPage {...pageProps} chapter={{ no: '목차', title: '이어지는 장' }} page={chapters.length + 2}>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {UPCOMING.map((u) => (
            <li key={u.title} className="flex items-center justify-between py-3">
              <span className="text-ink">{u.title}</span>
              <span className="text-xs text-ink-faint">{u.note}</span>
            </li>
          ))}
        </ul>
      </ReportPage>

      <ReportPage {...pageProps} chapter={{ no: '부록 1', title: '근거·가정·데이터 출처' }} page={chapters.length + 3}>
        <SiteAppendix report={report} />
      </ReportPage>

      <ReportPage {...pageProps} chapter={{ no: '부록 2', title: '데이터 검증' }} page={chapters.length + 4}>
        <SiteVerification report={report} />
      </ReportPage>
    </>
  )
}
