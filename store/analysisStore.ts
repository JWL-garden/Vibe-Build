// 분석 화면들이 함께 쓰는 공용 상태 (선택한 필지와 건물 목록)
// TODO [4-2]: 시나리오, 가정값, runAll 결과, 3D 캡처 이미지 추가

import { create } from 'zustand'
import { judgeExpandability } from '@/lib/calc'
import { getBuildingsByPnu } from '@/lib/services/dataService'
import type { BuildingRecord, Expandability } from '@/types'

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
  /** PNU로 건물 정보를 불러와 저장. buildingId를 주면 그 건물을 선택 */
  loadSite: (pnu: string, buildingId?: string | null) => Promise<void>
  selectBuilding: (id: string) => void
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

  loadSite: async (pnu, buildingId = null) => {
    const state = get()
    if (state.pnu === pnu && state.status === 'ready') {
      if (buildingId && buildingId !== state.selectedBuildingId) get().selectBuilding(buildingId)
      return
    }
    set({ pnu, status: 'loading', buildings: [], selectedBuildingId: null, expandability: null })
    const buildings = await getBuildingsByPnu(pnu)
    if (get().pnu !== pnu) return // 그사이 다른 필지를 선택한 경우 무시
    const selectedId = buildings.find((b) => b.id === buildingId)?.id ?? buildings[0]?.id ?? null
    set({
      buildings,
      selectedBuildingId: selectedId,
      expandability: judge(buildings, selectedId),
      status: buildings.length > 0 ? 'ready' : 'notFound',
    })
  },

  selectBuilding: (id) => set({ selectedBuildingId: id, expandability: judge(get().buildings, id) }),
}))
