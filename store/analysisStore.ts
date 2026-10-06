// 분석 화면들이 함께 쓰는 공용 상태 (선택한 필지와 건물 목록)
// TODO [4-2]: 시나리오, 가정값, runAll 결과, 3D 캡처 이미지 추가

import { create } from 'zustand'
import { getBuildingsByPnu } from '@/lib/services/dataService'
import type { BuildingRecord } from '@/types'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'notFound'

interface AnalysisState {
  /** 선택한 필지 PNU */
  pnu: string | null
  /** 그 필지의 건물 목록 (동이 여러 개일 수 있음) */
  buildings: BuildingRecord[]
  /** 지금 보고 있는 건물 id */
  selectedBuildingId: string | null
  status: LoadStatus
  /** PNU로 건물 정보를 불러와 저장 */
  loadSite: (pnu: string) => Promise<void>
  selectBuilding: (id: string) => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  pnu: null,
  buildings: [],
  selectedBuildingId: null,
  status: 'idle',

  loadSite: async (pnu) => {
    if (get().pnu === pnu && get().status === 'ready') return
    set({ pnu, status: 'loading', buildings: [], selectedBuildingId: null })
    const buildings = await getBuildingsByPnu(pnu)
    if (get().pnu !== pnu) return // 그사이 다른 필지를 선택한 경우 무시
    set({
      buildings,
      selectedBuildingId: buildings[0]?.id ?? null,
      status: buildings.length > 0 ? 'ready' : 'notFound',
    })
  },

  selectBuilding: (id) => set({ selectedBuildingId: id }),
}))
