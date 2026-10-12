import type { SiteReport } from '@/types'
import Ch00Summary from '../Ch00Summary'
import ReportPage from '../ReportPage'
import SiteAppendix from './SiteAppendix'
import SiteCh01Status from './SiteCh01Status'
import SiteCh02Regulation from './SiteCh02Regulation'
import SiteCh03Plan from './SiteCh03Plan'
import SiteCh04Cost from './SiteCh04Cost'
import SiteCh05Return from './SiteCh05Return'
import SiteCh06Scenario from './SiteCh06Scenario'
import SiteToc, { type TocEntry } from './SiteToc'
import SiteVerification from './SiteVerification'

/** 아직 엔진·조립이 없는 장 (설계서 11장) — 목차에 "추후 작성"으로 표시 */
const UPCOMING = [
  { no: '7장', title: '리스크와 대응', note: '구조안전·제도 미시행·금리·임차인 리스크와 대응 방안' },
  { no: '8장', title: '추진 절차·일정', note: '단계별 기간·결정 시점·비용 지출 시점' },
  { no: '9장', title: '전문가 협업 구성', note: '설계·구조·시공·세무·감정평가·금융 역할' },
  { no: '10장', title: '다음 단계 제안', note: '상담 → 정밀 타당성 검토 → 설계 계약' },
]

/** 기준 엑셀 필지 보고서: 목차(1쪽) + 표지·요약 + 1·2·3·4·5장 + 부록 1(근거) + 부록 2(데이터 검증) (SiteReport만 읽고 계산하지 않음) */
export default function SiteReportPages({ report }: { report: SiteReport }) {
  const { meta, summary } = report
  const pageProps = { address: meta.address, sourceLabel: meta.sourceLabel }
  const chapters = [
    { no: '1장', title: '대상 건축물 현황', note: '건축물대장 요약·층별 용도·호별 면적·토지가액', body: <SiteCh01Status report={report} /> },
    { no: '2장', title: '법규 검토', note: '현행 → 완화 비교, 주차·일조·주택 층수·용적률 검토', body: <SiteCh02Regulation report={report} /> },
    { no: '3장', title: '증축 계획안', note: '증축 규모·세대·3D 매스, 대안 검토', body: <SiteCh03Plan report={report} /> },
    { no: '4장', title: '사업비 추정', note: '항목별 사업비, 자기자본·대출 구성', body: <SiteCh04Cost report={report} /> },
    { no: '5장', title: '수익 분석', note: '임대수익·ROI·회수기간, 보수·기준·낙관, 자산가치', body: <SiteCh05Return report={report} /> },
    { no: '6장', title: '시나리오·민감도', note: '보수·기준·낙관 비교, 토네이도 차트, 10년 현금흐름·NPV·IRR', body: <SiteCh06Scenario report={report} /> },
  ]

  // 쪽 번호: 목차 1 · 표지·요약 2 · 1~6장 3~8 · 부록 1 · 부록 2
  const firstChapterPage = 3
  const appendix1Page = firstChapterPage + chapters.length
  const appendix2Page = appendix1Page + 1
  const tocEntries: TocEntry[] = [
    { no: '표지', title: '표지·한 장 요약', note: '핵심 숫자·결론·3D 전후', page: 2 },
    ...chapters.map((c, i) => ({ no: c.no, title: c.title, note: c.note, page: firstChapterPage + i })),
    ...UPCOMING.map((u) => ({ ...u, page: null })),
    { no: '부록 1', title: '근거·가정·데이터 출처', note: '적용 법규·가정값 표, 계산식, 출처, 면책', page: appendix1Page },
    { no: '부록 2', title: '데이터 검증', note: '기준 엑셀 대조, 수정할 데이터 목록', page: appendix2Page },
  ]

  return (
    <>
      <ReportPage {...pageProps} chapter={{ no: '목차', title: '목차' }} page={1}>
        <SiteToc entries={tocEntries} />
      </ReportPage>

      <ReportPage {...pageProps} chapter={null} page={2}>
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
          massPnu={report.analysis.pnu}
          massUseModel={report.analysis.scenarioId !== 'REBUILD'}
        />
      </ReportPage>

      {chapters.map((c, i) => (
        <ReportPage key={c.no} {...pageProps} chapter={{ no: c.no, title: c.title }} page={firstChapterPage + i}>
          {c.body}
        </ReportPage>
      ))}

      <ReportPage {...pageProps} chapter={{ no: '부록 1', title: '근거·가정·데이터 출처' }} page={appendix1Page}>
        <SiteAppendix report={report} />
      </ReportPage>

      <ReportPage {...pageProps} chapter={{ no: '부록 2', title: '데이터 검증' }} page={appendix2Page}>
        <SiteVerification report={report} />
      </ReportPage>
    </>
  )
}
