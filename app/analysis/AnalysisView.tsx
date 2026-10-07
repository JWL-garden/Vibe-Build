'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Step5Relaxation from '@/components/steps/Step5Relaxation'
import Step6Expansion from '@/components/steps/Step6Expansion'
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

  // 증축 후 그림: 기존 주차로 가능하면 그 안, 아니면 주차 추가 확보 안, 둘 다 아니면 0층
  const after = (() => {
    if (!analysis) return { addFloors: null, caption: '법규 완화 적용 시 증축안' }
    const { plan, parkingOption: option } = analysis.selected
    const id = analysis.scenarioId
    if (plan.verdict === 'possible') return { addFloors: plan.addFloors, caption: `${id} 적용 시 +${plan.addFloors}층` }
    if (option?.verdict === 'possible')
      return { addFloors: option.addFloors, caption: `${id} + 주차 ${option.addSpaces}대 확보 시 +${option.addFloors}층` }
    return { addFloors: 0, caption: `${id} 기준 증축안 없음` }
  })()

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
      addFloors={after.addFloors}
      afterCaption={after.caption}
      expandability={expandability}
      reportHref={`/report?pnu=${pnu}&b=${building.id}${analysis ? `&s=${analysis.scenarioId}` : ''}`}
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
              {
                title: '⑥ 증축 산정',
                caption: `${analysis.scenarioId} 시나리오 · 주차 기준 최대 연면적`,
                content: <Step6Expansion analysis={analysis} scenarios={scenarios} />,
              },
            ]
          : undefined
      }
    />
  )
}
