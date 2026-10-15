'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import Step5Relaxation from '@/components/steps/Step5Relaxation'
import Step6Expansion from '@/components/steps/Step6Expansion'
import Step8Finance from '@/components/steps/Step8Finance'
import { rowsFromRecord } from '@/lib/report/buildingRows'
import { runAll } from '@/lib/calc'
import type { MotionGroup, MotionStat } from '@/components/layout/MotionIntro'
import { PYEONG_M2 } from '@/lib/rules/financeDefaults'
import { HOME_SCENARIO_NAME, viewScenarios } from '@/lib/rules/scenarios'
import type { SiteAnalysis } from '@/types'
import { useAnalysisStore } from '@/store/analysisStore'
import AnalysisLayout from './AnalysisLayout'

/** 실제 주소 분석 화면 (영등포구 건축물대장) */
export default function AnalysisView({ pnu }: { pnu: string }) {
  const { buildings, selectedBuildingId, expandability, status, loadSite, selectBuilding, siteData, analysis, setScenario } =
    useAnalysisStore()

  useEffect(() => {
    loadSite(pnu)
  }, [pnu, loadSite])

  // 첫 화면 모션 숫자: 증축(복합 완화, 기존 주차로 증축)과 재건축(복합 완화 + 전체 재건축)을 선택한 시나리오와 관계없이 둘 다 runAll로 계산해 표시
  const motionGroups = useMemo<MotionGroup[] | undefined>(() => {
    if (!siteData) return undefined
    const stats = (a: SiteAnalysis, name: string): MotionStat[] => {
      let gfaM2 = 0
      let units = 0
      if (a.scenarioId === 'REBUILD') {
        const r = a.rebuild
        if (r.verdict !== 'impossible') {
          // 재건축 건축개요 값: 신축 연면적('세 한도 중 최솟값')과 신축 세대수 (기존 대비 증감이 아님)
          gfaM2 = r.gfaM2
          units = r.households
        }
      } else {
        // 증축 건축개요의 '기존 주차로 증축' 값: 추가 세대(옥탑세대) · 다른 제한 반영 후 최종 연면적
        // (주차 추가 확보 안은 쓰지 않는다)
        const { plan, rooftop } = a.selected
        gfaM2 = plan.addGfaM2
        units = rooftop.units.length
      }
      // 증축·재건축이 안 되면(규모 0) 숫자는 모두 '-' (value null)
      const none = gfaM2 <= 0
      const roi = a.finance.byScenario.BASE.metrics.roi
      return [
        { label: `${name}면적 (평)`, value: none ? null : gfaM2 / PYEONG_M2, digits: 1, unit: '평' },
        { label: `${name} 세대수`, value: none ? null : units, digits: 0, unit: '세대' },
        { label: 'ROI (연간수익률)', value: none || roi === null ? null : roi * 100, digits: 1, unit: '%' },
      ]
    }
    return [
      { title: '증축', color: '#0066cc', stats: stats(runAll(siteData, 'ALL'), '증축') },
      { title: '재건축', color: '#0071e3', stats: stats(runAll(siteData, 'REBUILD'), '재건축') },
    ]
  }, [siteData])

  const building = buildings.find((b) => b.id === selectedBuildingId) ?? buildings[0]

  if (status === 'idle' || status === 'loading') {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink-soft sm:px-6">불러오는 중…</main>
  }

  if (status === 'notFound' || !building || !expandability) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-card border border-line bg-mist p-6">
          <p className="text-ink">해당 필지의 건축물대장 정보를 찾을 수 없습니다.</p>
          <Link href="/#search" className="mt-3 inline-block text-sm font-medium text-link hover:underline">
            다른 주소 검색하기 →
          </Link>
        </div>
      </main>
    )
  }

  // 증축 후 그림: 기존 주차로 가능하면 그 안, 아니면 주차 추가 확보 안, 둘 다 아니면 0층
  const after = (() => {
    if (!analysis) return { addFloors: null, sideAreaM2: undefined, caption: '증축안' }
    const { plan, parkingOption: option } = analysis.selected
    const id = analysis.scenarioId
    // 재건축: 기존 층수 대비 늘어난 층만 강조 (신축 지상 층수는 캡션에)
    if (id === 'REBUILD') {
      const r = analysis.rebuild
      return { addFloors: Math.max(0, r.totalFloors - building.floorsAbove), sideAreaM2: undefined, caption: `재건축 시 지상 ${r.totalFloors}층` }
    }
    if (plan.verdict === 'possible') return { addFloors: plan.addFloors, sideAreaM2: plan.sideGfaM2, caption: `${HOME_SCENARIO_NAME[id]} · +${plan.addFloors}층` }
    if (option?.verdict === 'possible')
      return { addFloors: option.addFloors, sideAreaM2: option.sideGfaM2, caption: `${HOME_SCENARIO_NAME[id]} + 주차 ${option.addSpaces}대 확보 시 +${option.addFloors}층` }
    return { addFloors: 0, sideAreaM2: 0, caption: `${HOME_SCENARIO_NAME[id]} 기준 증축안 없음` }
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
              b.id === building.id ? 'border-action bg-action text-paper' : 'border-line bg-paper text-ink-soft hover:border-ink/30'
            }`}
          >
            {b.dongName ?? b.buildingName ?? `건물 ${i + 1}`}
          </button>
        ))}
      </div>
    ) : null

  return (
    <AnalysisLayout
      motionGroups={motionGroups}
      title={building.address}
      subtitle={`${building.roadAddress ?? '도로명 주소 없음'}${building.buildingName ? ` · ${building.buildingName}` : ''}`}
      notice={null}
      buildingSelector={selector}
      infoRows={rowsFromRecord(building)}
      infoCaption="건축물대장 표제부"
      floorsAbove={building.floorsAbove}
      addFloors={after.addFloors}
      massSideAreaM2={after.sideAreaM2}
      afterCaption={after.caption}
      massPnu={pnu}
      massRebuildFloors={
        analysis?.scenarioId === 'REBUILD' ? (analysis.rebuild.verdict === 'impossible' ? 0 : analysis.rebuild.totalFloors) : null
      }
      expandability={expandability}
      reportHref={`/report?pnu=${pnu}&b=${building.id}${analysis ? `&s=${analysis.scenarioId}` : ''}`}
      workName={analysis?.scenarioId === 'REBUILD' ? '재건축' : '증축'}
      planTitle={analysis?.scenarioId === 'REBUILD' ? '재건축 기본 계획안' : '증축 기본 계획안'}
      scenarioStep={
        siteData && analysis
          ? {
              title: '건축 시나리오 선택',
              caption: '건축법 개정안(26.11.12) 기준',
              content: (
                <Step5Relaxation
                  analysis={analysis}
                  zone={siteData.site.zone ?? '용도지역 정보 없음'}
                  scenarios={viewScenarios}
                  onSelect={setScenario}
                />
              ),
            }
          : undefined
      }
      steps={
        siteData && analysis
          ? [
              {
                title: analysis.scenarioId === 'REBUILD' ? '재건축 건축개요' : '증축 건축개요',
                caption: HOME_SCENARIO_NAME[analysis.scenarioId],
                content: <Step6Expansion analysis={analysis} scenarios={viewScenarios} />,
              },
              {
                title: '수익성 분석',
                caption: `${HOME_SCENARIO_NAME[analysis.scenarioId]} · 건물 자산가치(예시 가정값, 토지가액은 참고)`,
                content: <Step8Finance analysis={analysis} />,
              },
            ]
          : undefined
      }
    />
  )
}
