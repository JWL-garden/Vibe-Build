// Mock 데이터 서비스 — lib/mock/*.json 에서 읽는다.
// registry.json: 영등포구 건축물대장 표제부(실제 데이터, scripts/build-buildings.mjs로 생성)

import registryJson from '@/lib/mock/registry.json'
import examplesJson from '@/lib/mock/examples.json'
import sampleReportS1 from '@/lib/mock/sampleReport.S1.json'
import assumptionsJson from '@/lib/data/inputs/assumptions.json'
import floorPlateInputJson from '@/lib/data/inputs/floorPlate.json'
import rentCompsJson from '@/lib/data/inputs/rentComps.json'
import landLotsJson from '@/lib/data/landLots.json'
import landPriceJson from '@/lib/data/landPrice.json'
import parkingReviewJson from '@/lib/data/parkingReview.json'
import siteInputsJson from '@/lib/data/siteInputs.json'
import sitesJson from '@/lib/data/sites.json'
import unitsJson from '@/lib/data/units.json'
import type {
  AssumptionRow,
  BuildingRecord,
  ExampleAddress,
  ExcelSite,
  ExcelUnit,
  LandLotRow,
  LandPriceRow,
  ParkingReviewRow,
  RentComp,
  ReportData,
  SampleId,
  SiteCandidate,
  SiteData,
  SiteInput,
} from '@/types'

const registry = registryJson as BuildingRecord[]
const examples = examplesJson as ExampleAddress[]
/** 샘플 보고서 데이터 (손계산 예시값, 계산 엔진 완성 후 runAll 결과로 교체) */
const sampleReports: Partial<Record<SampleId, ReportData>> = { S1: sampleReportS1 as ReportData }

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

  const exact = registry.filter((r) => fields(r).some((f) => f !== '' && f.endsWith(q)))
  if (exact.length > 0) return toCandidates(exact).slice(0, limit)

  const partial = registry.filter((r) => fields(r).some((f) => f.includes(q)))
  return toCandidates(partial).slice(0, limit)
}

/** 필지(PNU)에 있는 건물 목록. 없으면 빈 배열 */
export async function getBuildingsByPnu(pnu: string): Promise<BuildingRecord[]> {
  return registry.filter((r) => r.pnu === pnu)
}

/** 첫 화면 예시 주소 버튼 목록 */
export async function getExampleAddresses(): Promise<ExampleAddress[]> {
  return examples
}

/** 샘플 보고서 데이터. 없으면 null */
export async function getSampleReport(id: string): Promise<ReportData | null> {
  return sampleReports[id as SampleId] ?? null
}

/**
 * 기준 엑셀(lib/data) 한 필지 묶음. 엑셀 검토 대상이 아니거나 '미산정' 필지면 null.
 * 건축물 숫자는 이 묶음에서만 가져온다 (CLAUDE.md "기준 엑셀이 정답").
 */
export async function getSiteData(pnu: string): Promise<SiteData | null> {
  const site = (sitesJson.items as ExcelSite[]).find((s) => s.pnu === pnu)
  const review = (parkingReviewJson.items as ParkingReviewRow[]).find((r) => r.pnu === pnu)
  if (!site || !review || review.verdict === '미산정' || review.netRatio === null) return null
  const siteInput = (siteInputsJson.items as SiteInput[]).find((s) => s.pnu === pnu) ?? null
  // 토지가액 계산에 쓸 필지: 대표 필지 + 수기 입력한 구성 필지
  const lotPnus = new Set([pnu, ...(siteInput?.lots ?? [])])
  return {
    pnu,
    site,
    units: (unitsJson.items as ExcelUnit[]).filter((u) => u.pnu === pnu),
    review,
    siteInput,
    sourceLabel: `기준 엑셀(${sitesJson.meta.version} · ${sitesJson.meta.sourceDate})`,
    source: { file: sitesJson.meta.file, version: sitesJson.meta.version, date: sitesJson.meta.sourceDate },
    excelNotes: parkingReviewJson.notes,
    landPrices: (landPriceJson.items as LandPriceRow[]).filter((p) => lotPnus.has(p.pnu)),
    landLots: (landLotsJson.items as LandLotRow[]).filter((l) => lotPnus.has(l.pnu)),
    // 가정값 입력 엑셀 (수익성 가정값·임대 사례는 필지 공통)
    assumptionRows: assumptionsJson.items as AssumptionRow[],
    assumptionNotes: (assumptionsJson.notes ?? []).filter((n) => !n.startsWith('[')),
    rentComps: rentCompsJson.items as RentComp[],
    // 가정값 입력 엑셀 '증축층면적_옵션2' (빈칸이면 null → 옵션1)
    floorPlateOption2M2: floorPlateInputJson.items.find((i) => i.pnu === pnu)?.floorPlateM2 ?? null,
  }
}
