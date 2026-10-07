// 분석 화면들이 함께 쓰는 공용 상태 (선택한 필지, 건물 목록, 기준 엑셀 계산 결과)
// TODO [4-2]: 수익 시나리오, 가정값, 3D 캡처 이미지 추가

import { create } from 'zustand'
import { judgeExpandability, judgeSite, runAll } from '@/lib/calc'
import { getBuildingsByPnu, getSiteData } from '@/lib/services/dataService'
import type { BuildingRecord, Expandability, ScenarioId, SiteAnalysis, SiteData } from '@/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'notFound'

interface AnalysisState {
  /** 선택한 필지 PNU */
  pnu: string | null
  /** 그 필지의 건물 목록 (동이 여러 개일 수 있음) */
  buildings: BuildingRecord[]
  /** 지금 보고 있는 건물 id */
  selectedBuildingId: string | null
  /** 선택한 건물의 증축 가능 여부 */
  expandability: Expandability | null
  status: LoadStatus
  /** 기준 엑셀 필지 묶음 (엑셀 검토 대상이 아니면 null) */
  siteData: SiteData | null
  /** 선택한 법규 시나리오 */
  scenarioId: ScenarioId
  /** runAll 결과 — 화면의 계산 숫자는 이것만 쓴다 (siteData 가 없으면 null) */
  analysis: SiteAnalysis | null
  /** PNU로 건물 정보를 불러와 저장. buildingId를 주면 그 건물을 선택 */
  loadSite: (pnu: string, buildingId?: string | null) => Promise<void>
  selectBuilding: (id: string) => void
  /** 법규 시나리오를 바꾸고 runAll 을 다시 실행 */
  setScenario: (id: ScenarioId) => void
}

const judge = (buildings: BuildingRecord[], id: string | null) => {
  const building = buildings.find((b) => b.id === id)
  return building ? judgeExpandability(building) : null
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  pnu: null,
  buildings: [],
  selectedBuildingId: null,
  expandability: null,
  status: 'idle',
  siteData: null,
  scenarioId: 'ALL',
  analysis: null,

  loadSite: async (pnu, buildingId = null) => {
    const state = get()
    if (state.pnu === pnu && state.status === 'ready') {
      if (buildingId && buildingId !== state.selectedBuildingId) get().selectBuilding(buildingId)
      return
    }
    set({ pnu, status: 'loading', buildings: [], selectedBuildingId: null, expandability: null, siteData: null, analysis: null })
    const [buildings, siteData] = await Promise.all([getBuildingsByPnu(pnu), getSiteData(pnu)])
    if (get().pnu !== pnu) return // 그사이 다른 필지를 선택한 경우 무시
    const selectedId = buildings.find((b) => b.id === buildingId)?.id ?? buildings[0]?.id ?? null
    const analysis = siteData ? runAll(siteData, get().scenarioId) : null
    set({
      buildings,
      selectedBuildingId: selectedId,
      expandability: analysis ? judgeSite(analysis) : judge(buildings, selectedId),
      siteData,
      analysis,
      status: buildings.length > 0 ? 'ready' : 'notFound',
    })
  },

  selectBuilding: (id) => {
    const { analysis, buildings } = get()
    set({ selectedBuildingId: id, expandability: analysis ? judgeSite(analysis) : judge(buildings, id) })
  },

  setScenario: (id) => {
    const { siteData } = get()
    if (!siteData) return set({ scenarioId: id })
    const analysis = runAll(siteData, id)
    set({ scenarioId: id, analysis, expandability: judgeSite(analysis) })
  },
}))
