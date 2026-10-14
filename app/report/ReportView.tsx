'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import Ch00Summary from '@/components/report/Ch00Summary'
import { Lead } from '@/components/report/ReportParts'
import ReportPage from '@/components/report/ReportPage'
import ReportToolbar from '@/components/report/ReportToolbar'
import SiteReportPages from '@/components/report/site/SiteReportPages'
import { buildSiteReport } from '@/lib/report/buildSiteReport'
import Step1Target from '@/components/steps/Step1Target'
import { rowsFromRecord } from '@/lib/report/buildingRows'
import { useAnalysisStore } from '@/store/analysisStore'
import type { ViewScenarioId } from '@/types'

/** 아직 계산 엔진이 없어 채울 수 없는 장 (설계서 11장) */
const UPCOMING = [
  '2장 법규 검토',
  '3장 증축 계획안',
  '4장 사업비 추정',
  '5장 수익 분석',
  '6장 시나리오·민감도',
  '7장 리스크와 대응',
  '8장 추진 절차·일정',
  '9장 전문가 협업 구성',
  '10장 다음 단계 제안',
  '부록 근거·가정값·면책',
]

const SOURCE_LABEL = '실제 건축물대장 데이터(영등포구) · 개략 검토 · 투자 권유 아님'

/** 실제 주소 보고서.
 * 기준 엑셀 필지(T1·T2 등): runAll 결과로 표지 + 1·2·3장 (buildSiteReport)
 * 그 외 주소: 계산 엔진 대상이 아니라 표지와 1장(건축물대장)만 채운다
 * TODO [6-1]: 수익성 엔진 연결 후 4~10장 추가 */
export default function ReportView({
  pnu,
  buildingId,
  scenario,
}: {
  pnu: string
  buildingId: string | null
  /** URL의 법규 시나리오 (없으면 분석 화면에서 고른 값) */
  scenario: ViewScenarioId | null
}) {
  const { buildings, selectedBuildingId, expandability, status, loadSite, siteData, analysis, setScenario } =
    useAnalysisStore()

  useEffect(() => {
    loadSite(pnu, buildingId)
  }, [pnu, buildingId, loadSite])

  useEffect(() => {
    if (scenario && status === 'ready' && analysis && analysis.scenarioId !== scenario) setScenario(scenario)
  }, [scenario, status, analysis, setScenario])

  // 작성일은 화면을 열 때 한 번만 정한다
  const createdAt = useMemo(() => new Date().toLocaleDateString('sv-SE'), []) // YYYY-MM-DD
  const siteReport = useMemo(
    () => (siteData && analysis ? buildSiteReport(siteData, analysis, createdAt) : null),
    [siteData, analysis, createdAt],
  )

  const building = buildings.find((b) => b.id === selectedBuildingId)
  const backHref = `/analysis?pnu=${pnu}`

  if (status === 'idle' || status === 'loading') {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink-soft sm:px-6">불러오는 중…</main>
  }

  if (status === 'notFound' || !building) {
    return <Notice text="보고서를 만들 건축물 정보를 찾을 수 없습니다." href="/#search" linkText="주소 검색으로" />
  }

  if (expandability?.status === 'impossible') {
    return (
      <Notice
        text={`현 조건에서는 증축이 불가하여 보고서를 출력할 수 없습니다. ${expandability.reason}`}
        href={backHref}
        linkText="분석 화면으로"
      />
    )
  }

  if (siteReport) {
    return (
      <main className="bg-mist pb-16 print:bg-paper print:pb-0">
        <ReportToolbar backHref={backHref} backLabel="분석으로 돌아가기" info={`법규 시나리오: ${siteReport.meta.scenarioLabel}`} />
        <div className="mt-6 flex flex-col gap-8 px-4 print:mt-0 print:gap-0 print:px-0">
          <SiteReportPages report={siteReport} />
        </div>
      </main>
    )
  }

  const pageProps = { address: building.address, sourceLabel: SOURCE_LABEL }
  const name = building.buildingName ?? building.address.replace(/^서울특별시\s*/, '')

  return (
    <main className="bg-mist pb-16 print:bg-paper print:pb-0">
      <ReportToolbar backHref={backHref} backLabel="분석으로 돌아가기" />

      {expandability?.status === 'pending' && (
        <p className="mx-auto mt-6 max-w-[210mm] rounded-card border border-line bg-paper px-5 py-3 text-sm text-ink-soft print:hidden">
          증축 가능 여부 <b className="text-ink">판정 대기</b> 상태의 미리보기입니다. 계산 엔진 연결 후 숫자와 결론이
          채워집니다.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-8 px-4 print:mt-0 print:gap-0 print:px-0">
        <ReportPage {...pageProps} chapter={null} page={1}>
          <Ch00Summary
            title={`${name} 증축 사업 타당성 검토 보고서`}
            address={building.roadAddress ?? building.address}
            createdAt={createdAt}
            author="Vibe Build 증축 검토 서비스"
            scenarioName={null}
            floorsAbove={building.floorsAbove}
            addFloors={null}
            kpis={null}
            conclusion={null}
            nextStep={null}
          />
        </ReportPage>

        <ReportPage {...pageProps} chapter={{ no: '1장', title: '대상 건축물 현황' }} page={2}>
          <Lead>건축물대장 표제부 기준 대상 건축물의 현황입니다.</Lead>
          <div className="mt-6">
            <Step1Target items={rowsFromRecord(building)} />
          </div>
        </ReportPage>

        <ReportPage {...pageProps} chapter={{ no: '목차', title: '이어지는 장' }} page={3}>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {UPCOMING.map((title) => (
              <li key={title} className="flex items-center justify-between py-3">
                <span className="text-ink">{title}</span>
                <span className="text-xs text-ink-faint">계산 엔진 연결 후 작성</span>
              </li>
            ))}
          </ul>
        </ReportPage>
      </div>
    </main>
  )
}

function Notice({ text, href, linkText }: { text: string; href: string; linkText: string }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="rounded-card border border-line bg-mist p-6">
        <p className="text-ink">{text}</p>
        <Link href={href} className="mt-3 inline-block text-sm font-medium text-link hover:underline">
          {linkText} →
        </Link>
      </div>
    </main>
  )
}
