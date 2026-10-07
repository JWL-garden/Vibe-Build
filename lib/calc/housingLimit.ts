// 주택 층수·연면적 한도 (설계서 5-3b, v3) — 순수 함수
// 다세대·다가구·다중주택: 주택으로 쓰는 층수 3개층(완화 4), 주택 바닥면적 합계 660㎡(완화 1,000)

import { formatNumber } from '@/lib/format'
import type { ExcelSite, ExcelUnit, HousingLimitResult, HousingSummary, HousingType, Rules } from '@/types'

const TYPE_BY_USE: [keyword: string, type: HousingType][] = [
  ['다세대', '다세대'],
  ['다가구', '다가구'],
  ['다중주택', '다중주택'],
]

const typeOf = (text: string | null): HousingType | null =>
  TYPE_BY_USE.find(([keyword]) => text?.includes(keyword))?.[1] ?? null

/**
 * 주택 유형·층수·면적 현황.
 * 호별 면적이 있으면 주택 호의 전유+공용 면적을 합하고, 주택 전유면적이 있는 지상층만 센다
 * (1층 필로티처럼 주택 전유가 없는 층은 자연히 제외 — rules.housing.excludePilotiFloor).
 * 호별 자료가 없으면 대장 값(지상층수, 연면적)으로 추정한다.
 */
export function summarizeHousing(site: ExcelSite, units: ExcelUnit[]): HousingSummary {
  const housingUnits = units.filter((u) => u.pnu === site.pnu && typeOf(u.mainUse))
  if (housingUnits.length > 0) {
    const counts = new Map<HousingType, number>()
    for (const u of housingUnits) counts.set(typeOf(u.mainUse)!, (counts.get(typeOf(u.mainUse)!) ?? 0) + 1)
    const housingType = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const floors = new Set(
      housingUnits.flatMap((u) =>
        u.areas.filter((a) => a.kind === '전유' && a.floorType === '지상' && a.floor !== null).map((a) => a.floor),
      ),
    )
    const housingAreaM2 = housingUnits.reduce((s, u) => s + u.areas.reduce((t, a) => t + a.areaM2, 0), 0)
    return { housingType, housingFloors: floors.size, housingAreaM2, source: 'units' }
  }

  const hasUnits = units.some((u) => u.pnu === site.pnu)
  // 다가구: 단독주택 중 가구수 2 이상 (기준 엑셀 판별과 동일)
  const housingType =
    typeOf(site.etcUse) ?? (site.mainUse === '단독주택' && site.families >= 2 ? '다가구' : null)
  if (!housingType || hasUnits) return { housingType: null, housingFloors: 0, housingAreaM2: 0, source: 'units' }
  return {
    housingType,
    housingFloors: site.floorsAbove,
    housingAreaM2: site.totalFloorAreaM2,
    source: 'register',
  }
}

/** 면적 한도가 '미만'일 때 한도에서 빼는 최소 단위 (㎡, 표시 단위) */
const AREA_STEP_M2 = 0.01

export interface HousingLimitInput extends HousingSummary {
  /** 증축하는 새 층에 주택을 넣는지 */
  addHousingFloor: boolean
}

export function calcHousingLimit(input: HousingLimitInput, rules: Rules): HousingLimitResult {
  const { housingType, housingFloors, housingAreaM2, addHousingFloor } = input
  const housingFloorsAfter = housingFloors + (addHousingFloor ? 1 : 0)

  if (!housingType) {
    return {
      applies: false,
      floorLimit: null,
      areaLimitM2: null,
      housingFloorsAfter,
      floorOK: true,
      areaGfaM2: null,
      reasons: ['다세대·다가구·다중주택이 아니어서 주택 층수·연면적 한도 미적용'],
    }
  }

  const floorLimit = rules.housing.maxFloors[housingType]
  const areaLimitM2 = rules.housing.maxAreaM2[housingType]
  const exclusive = rules.housing.areaExclusive[housingType]
  const floorOK = housingFloorsAfter <= floorLimit
  // '미만'이면 한도에서 표시 단위(0.01㎡)만큼 뺀 면적까지 허용
  const areaGfaM2 = Math.max(0, areaLimitM2 - (exclusive ? AREA_STEP_M2 : 0) - housingAreaM2)
  const f = (v: number) => formatNumber(v, 2)

  return {
    applies: true,
    floorLimit,
    areaLimitM2,
    housingFloorsAfter,
    floorOK,
    areaGfaM2,
    reasons: [
      `${housingType} 주택 층수: 현재 ${housingFloors}개층` +
        (addHousingFloor ? ` → 새 층 주택 시 ${housingFloorsAfter}개층` : '') +
        ` (한도 ${floorLimit}개층 이하) → ${floorOK ? '통과' : '불가'}`,
      `주택 연면적: 현재 ${f(housingAreaM2)}㎡ / 한도 ${f(areaLimitM2)}㎡ ${exclusive ? '미만' : '이하'} → 남은 면적 ${f(areaGfaM2)}㎡`,
    ],
  }
}
