// 건축물 데이터 조회 서비스 (현재는 Mock: 건축물대장 CSV를 변환한 JSON)
// 화면은 JSON을 직접 읽지 않고 반드시 이 함수들을 통해 가져온다.
// 나중에 실제 API를 붙여도 함수 이름과 반환 형태는 그대로 둔다.

import buildingsJson from '../data/buildings.json'
import examplesJson from '../data/examples.json'
import type { BuildingRecord, ExampleAddress, SiteCandidate } from './types'

const buildings = buildingsJson as BuildingRecord[]
const examples = examplesJson as ExampleAddress[]

/** 검색 비교용으로 주소를 정리: 공백·'번지'·시/구 이름·괄호 부분 제거 */
function normalizeAddress(text: string): string {
  return text
    .replace(/\(.*?\)/g, '')
    .replace(/서울특별시|서울시|영등포구|번지/g, '')
    .replace(/\s+/g, '')
}

/** 같은 필지(PNU)의 건물들을 후보 하나로 묶는다 */
function toCandidates(records: BuildingRecord[]): SiteCandidate[] {
  const byPnu = new Map<string, SiteCandidate>()
  for (const r of records) {
    const found = byPnu.get(r.pnu)
    if (found) {
      found.buildingCount += 1
      if (!found.roadAddress && r.roadAddress) found.roadAddress = r.roadAddress
    } else {
      byPnu.set(r.pnu, { pnu: r.pnu, address: r.address, roadAddress: r.roadAddress, buildingCount: 1 })
    }
  }
  return [...byPnu.values()]
}

/**
 * 주소(지번 또는 도로명)로 필지 후보를 찾는다.
 * 주소 끝까지 정확히 일치하는 필지가 있으면 그것만, 없으면 일부만 일치하는 후보를 돌려준다.
 */
export async function searchSites(query: string, limit = 20): Promise<SiteCandidate[]> {
  const q = normalizeAddress(query)
  if (q === '') return []

  const fields = (r: BuildingRecord) => [normalizeAddress(r.address), normalizeAddress(r.roadAddress ?? '')]

  const exact = buildings.filter((r) => fields(r).some((f) => f !== '' && f.endsWith(q)))
  if (exact.length > 0) return toCandidates(exact).slice(0, limit)

  const partial = buildings.filter((r) => fields(r).some((f) => f.includes(q)))
  return toCandidates(partial).slice(0, limit)
}

/** 필지(PNU)에 있는 건물 목록. 없으면 빈 배열 */
export async function getBuildingsByPnu(pnu: string): Promise<BuildingRecord[]> {
  return buildings.filter((r) => r.pnu === pnu)
}

/** 첫 화면 예시 주소 버튼 목록 */
export async function getExampleAddresses(): Promise<ExampleAddress[]> {
  return examples
}
