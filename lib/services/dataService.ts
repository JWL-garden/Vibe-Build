// 데이터 조회 창구 — 화면은 반드시 이 파일의 함수만 사용한다.
// NEXT_PUBLIC_USE_MOCK=false 이면 실제 API(apiService), 그 외에는 Mock(mockService)을 쓴다.
// 실제 API가 실패하면 Mock으로 대체한다.

import type { BuildingRecord, ExampleAddress, ReportData, SiteCandidate, SiteData } from '@/types'
import * as apiService from './apiService'
import * as mockService from './mockService'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'

/** 실제 API를 먼저 시도하고, 실패하면 Mock 결과를 돌려준다 */
async function withFallback<T>(name: string, fromApi: () => Promise<T>, fromMock: () => Promise<T>): Promise<T> {
  if (USE_MOCK) return fromMock()
  try {
    return await fromApi()
  } catch (error) {
    console.warn(`[dataService] ${name} 실패 → Mock 사용`, error)
    return fromMock()
  }
}

export function searchSites(query: string): Promise<SiteCandidate[]> {
  return withFallback('searchSites', () => apiService.searchSites(query), () => mockService.searchSites(query))
}

export function getBuildingsByPnu(pnu: string): Promise<BuildingRecord[]> {
  return withFallback('getBuildingsByPnu', () => apiService.getBuildingsByPnu(pnu), () => mockService.getBuildingsByPnu(pnu))
}

export function getExampleAddresses(): Promise<ExampleAddress[]> {
  return withFallback('getExampleAddresses', apiService.getExampleAddresses, mockService.getExampleAddresses)
}

/** 샘플 보고서는 항상 Mock에서 읽는다 (가상 데이터) */
export function getSampleReport(id: string): Promise<ReportData | null> {
  return mockService.getSampleReport(id)
}

/** 기준 엑셀 한 필지 묶음 — 엑셀 데이터는 저장소에 있으므로 항상 로컬에서 읽는다 */
export function getSiteData(pnu: string): Promise<SiteData | null> {
  return mockService.getSiteData(pnu)
}
