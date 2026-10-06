// 실제 API 데이터 서비스 (P1 — 아직 미구현)
// 반드시 mockService와 같은 함수 이름·반환 형태를 갖는다. 호출은 app/api/* 서버를 거친다.

import type { BuildingRecord, ExampleAddress, SiteCandidate } from '@/types'

const notImplemented = (name: string) => new Error(`apiService.${name}: 실제 API는 아직 연결되지 않았습니다.`)

export async function searchSites(_query: string): Promise<SiteCandidate[]> {
  throw notImplemented('searchSites')
}

export async function getBuildingsByPnu(_pnu: string): Promise<BuildingRecord[]> {
  throw notImplemented('getBuildingsByPnu')
}

export async function getExampleAddresses(): Promise<ExampleAddress[]> {
  throw notImplemented('getExampleAddresses')
}
