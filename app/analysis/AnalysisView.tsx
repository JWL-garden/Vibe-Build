'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Step5Relaxation from '@/components/steps/Step5Relaxation'
import { rowsFromRecord } from '@/lib/report/buildingRows'
import { scenarios } from '@/lib/rules/scenarios'
import { useAnalysisStore } from '@/store/analysisStore'
import AnalysisLayout from './AnalysisLayout'

/** 실제 주소 분석 화면 (영등포구 건축물대장) */
export default function AnalysisView({ pnu }: { pnu: string }) {
  const { buildings, selectedBuildingId, expandability, status, loadSite, selectBuilding, siteData, analysis, setScenario } =
    useAnalysisStore()

  useEffect(() => {
    loadSite(pnu)
  }, [pnu, loadSite])

  const building = buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0]

  if (status === 'idle' || status === 'loading') {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink-soft sm:px-6">불러오는 중…</main>
  }

  if (status === 'notFound' || !building || !expandability) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-card border border-line bg-mist p-6">
          <p className="text-ink">해당 필지의 건축물대장 정보를 찾을 수 없습니다.</p>
          <Link href="/#search" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            다른 주소 검색하기 →
          </Link>
        </div>
      </main>
    )
  }

  const selector =
    buildings.length > 1 ? (
      <div className="flex flex-wrap gap-2">
        {buildings.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => selectBuilding(b.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              b.id === building.id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink-soft hover:border-ink/30'
            }`}
          >
            {b.dongName ?? b.buildingName ?? `건물 ${i + 1}`}
          </button>
        ))}
      </div>
    ) : null

  return (
    <AnalysisLayout
      eyebrow="대상 건축물 분석"
      title={building.address}
      subtitle={`${building.roadAddress ?? '도로명 주소 없음'}${building.buildingName ? ` · ${building.buildingName}` : ''}`}
      notice={null}
      buildingSelector={selector}
      infoRows={rowsFromRecord(building)}
      infoCaption="건축물대장 표제부"
      floorsAbove={building.floorsAbove}
      addFloors={null}
      afterCaption="법규 완화 적용 시 증축안"
      expandability={expandability}
      reportHref={`/report?pnu=${pnu}&b=${building.id}`}
      steps={
        siteData && analysis
          ? [
              {
                title: '⑤ 법규 완화',
                caption: `${siteData.sourceLabel} · 프로젝트 가정`,
                content: (
                  <Step5Relaxation
                    analysis={analysis}
                    zone={siteData.site.zone ?? '용도지역 정보 없음'}
                    scenarios={scenarios}
                    onSelect={setScenario}
                  />
                ),
              },
            ]
          : undefined
      }
    />
  )
}
