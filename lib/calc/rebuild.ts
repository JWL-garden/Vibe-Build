// 전체 재건축 산정 (2026-10-08 추가) — 순수 함수
// 기존 건물을 철거하고 같은 대지에 신축할 때 최대 규모. 기준 엑셀 '빈땅_신축시나리오' 산식을 따른다.
//   최대 건축면적 = 대지 × 건폐율
//   연면적 = min(용적률 한도, 최대 건축면적 × 주택 층수 한도, 주택 연면적 한도)
//   전용 합 = 연면적 × 전용률(0.8), 세대수 = 내림(전용 합 ÷ 최소 세대 전용 15㎡) (유형별 세대수 상한)
//   법정 주차 = 세대기준·주택법 기준 중 큰 값
// 프로젝트 가정: 1층 필로티 주차 + 2층부터 주택 (필로티는 주택 층수·용적률 연면적에서 제외, 높이에는 포함)
// 정북 이격거리가 입력되면 일조 허용 높이로 층수를 줄이고, 없으면 '확인 필요'.

import { formatNumber } from '@/lib/format'
import type { ExcelSite, ExpansionCheck, HousingType, LimitingFactor, ParkingUnit, RebuildResult, Rules } from '@/types'
import { farLimitOf } from './far'
import { LIMIT_LABEL } from './labels'
import { calcRequiredParking } from './parking'
import { maxHeightAtDistance, requiredSetback, sunlightRuleFor } from './sunlight'

export interface RebuildInput {
  site: ExcelSite
  /** 기존 건물의 주택 유형 (주택이 아니면 null → 다세대로 가정) */
  housingType: HousingType | null
  /** 용도지역 건폐율 상한 (%) — zoningTable */
  bcrLimitPercent: number
  /** 용도지역이 일조 사선 적용 지역인지 — zoningTable */
  zoneSunlightApplies: boolean
  /** 정북 인접대지 이격거리 (m, siteInputs). 없으면 null */
  northSetbackM: number | null
}

const EPS = 1e-9
const f = (v: number) => formatNumber(v, 2)

export function calcRebuild(input: RebuildInput, rules: Rules, rulesId: RebuildResult['rulesId']): RebuildResult {
  const { site, bcrLimitPercent, zoneSunlightApplies, northSetbackM } = input
  if (site.siteAreaM2 === null) throw new Error(`대지면적 없음: ${site.pnu}`)
  if (site.zone === null) throw new Error(`용도지역 없음: ${site.pnu}`)
  const siteAreaM2 = site.siteAreaM2
  const type: HousingType = input.housingType ?? '다세대'
  const rb = rules.rebuild
  const fh = rules.floorHeightM
  const piloti = rb.pilotiFloor1 ? 1 : 0
  const minUnit = rules.parking.minUnitNetM2

  // 1) 세 가지 한도
  const maxBuildingAreaM2 = (siteAreaM2 * bcrLimitPercent) / 100
  const farLimitPercent = farLimitOf(site.zone, rules)
  const farGfaM2 = (siteAreaM2 * farLimitPercent) / 100
  const floorLimit = rules.housing.maxFloors[type]
  const floorsGfaM2 = maxBuildingAreaM2 * floorLimit
  const areaLimit = rules.housing.maxAreaM2[type]
  const exclusive = rules.housing.areaExclusive[type]
  // '미만'이면 표시 단위(0.01㎡)만큼 뺀다 (housingLimit.ts 와 같은 방식)
  const housingAreaGfaM2 = areaLimit - (exclusive ? 0.01 : 0)

  // 같으면 용적률 → 주택 층수 → 주택 연면적 순으로 제한요인
  const candidates: [LimitingFactor, number][] = [
    ['far', farGfaM2],
    ['housingFloors', floorsGfaM2],
    ['housingArea', housingAreaGfaM2],
  ]
  let gfaM2 = Math.max(0, Math.min(...candidates.map(([, v]) => v)))
  let limitingFactor = candidates.find(([, v]) => v <= gfaM2 + EPS)![0]

  // 2) 층수·높이
  const floorsFor = (gfa: number) => (gfa > EPS ? Math.ceil(gfa / maxBuildingAreaM2 - EPS) : 0)
  let housingFloors = floorsFor(gfaM2)

  // 3) 일조 — 이격거리가 있으면 허용 높이 안으로 층수를 줄인다
  const sun = sunlightRuleFor(rules.sunlight, type)
  const sunApplies = sun.applies && zoneSunlightApplies
  const allowedHeightM = sunApplies && northSetbackM !== null ? maxHeightAtDistance(northSetbackM, sun) : null
  let sunCheck: ExpansionCheck
  const heightOf = (floors: number) => (floors + (floors > 0 ? piloti : 0)) * fh
  if (!sunApplies) {
    sunCheck = { item: 'sunlight', status: 'pass', detail: '일조 사선 미적용 지역' }
  } else if (allowedHeightM === null) {
    const h = heightOf(housingFloors)
    sunCheck = {
      item: 'sunlight',
      status: 'pass',
      detail: `높이 ${f(h)}m → 정북 이격 ${f(requiredSetback(h, sun))}m 이상 필요 (일조 확인 완료)`,
    }
  } else if (heightOf(housingFloors) <= allowedHeightM + EPS) {
    sunCheck = { item: 'sunlight', status: 'pass', detail: `높이 ${f(heightOf(housingFloors))}m ≤ 허용 ${f(allowedHeightM)}m` }
  } else {
    const before = heightOf(housingFloors)
    housingFloors = Math.max(0, Math.floor(allowedHeightM / fh + EPS) - piloti)
    gfaM2 = Math.min(gfaM2, housingFloors * maxBuildingAreaM2)
    limitingFactor = 'sunlight'
    sunCheck = {
      item: 'sunlight',
      status: housingFloors > 0 ? 'pass' : 'fail',
      detail: `높이 ${f(before)}m > 허용 ${f(allowedHeightM)}m → 주택 ${housingFloors}개층으로 축소`,
    }
  }
  const totalFloors = housingFloors + (housingFloors > 0 ? piloti : 0)
  const heightM = totalFloors * fh

  // 4) 세대·주차
  const netM2 = gfaM2 * rb.netRatio
  const cap = rb.maxHouseholds[type] ?? Infinity
  const households = Math.min(Math.floor(netM2 / minUnit + EPS), cap)
  const netPerUnitM2 = households > 0 ? netM2 / households : 0
  const units: ParkingUnit[] = Array.from({ length: households }, () => ({
    use: 'housing5',
    netAreaM2: netPerUnitM2,
    facilityAreaM2: netPerUnitM2,
  }))
  const req = calcRequiredParking(units, rules)
  const parking = { perUnit: req.perUnit, housingAct: req.housingAct, required: req.total, currentActual: site.parking.total }

  const existing = { gfaM2: site.farFloorAreaM2, households: site.households, floorsAbove: site.floorsAbove }
  const increase = gfaM2 - existing.gfaM2

  const checks: ExpansionCheck[] = [
    {
      item: 'far',
      status: 'pass',
      detail: `용적률 ${f(farLimitPercent)}% → 한도 연면적 ${f(farGfaM2)}㎡`,
    },
    {
      item: 'housingFloors',
      status: housingFloors > 0 ? 'pass' : 'fail',
      detail: `${type} 주택 ${floorLimit}개층 이하 × 최대 건축면적 ${f(maxBuildingAreaM2)}㎡ = ${f(floorsGfaM2)}㎡ → 주택 ${housingFloors}개층${piloti ? ' + 1층 필로티' : ''}`,
    },
    {
      item: 'housingArea',
      status: 'pass',
      detail: `주택 연면적 ${f(areaLimit)}㎡ ${exclusive ? '미만' : '이하'}`,
    },
    {
      item: 'floorPlate',
      status: 'check',
      detail: `기준층 = 최대 건축면적 ${f(maxBuildingAreaM2)}㎡ (대지 ${f(siteAreaM2)}㎡ × 건폐율 ${f(bcrLimitPercent)}%) 가정 — 대지 형태·이격 확인 필요`,
    },
    {
      item: 'parking',
      status: 'check',
      detail: `법정 ${f(parking.required)}대 (${households}세대) — 현재 ${f(parking.currentActual)}대, 1층 필로티 등 대지 안 확보 가능 대수 확인 필요`,
    },
    sunCheck,
  ]

  const reasons = [
    `최대 건축면적 = 대지 ${f(siteAreaM2)}㎡ × 건폐율 ${f(bcrLimitPercent)}% = ${f(maxBuildingAreaM2)}㎡`,
    `신축 연면적 = min(용적률 ${f(farGfaM2)}, 주택 층수 ${f(floorsGfaM2)}, 주택 연면적 ${f(housingAreaGfaM2)}) = ${f(gfaM2)}㎡ — 제한요인: ${LIMIT_LABEL[limitingFactor]}`,
    `전용 ${f(netM2)}㎡ (× ${rb.netRatio}) ÷ 최소 ${f(minUnit)}㎡ → ${households}세대 (세대당 전용 ${f(netPerUnitM2)}㎡)`,
    `법정 주차 = max(세대기준 ${f(parking.perUnit)}, 주택법 ${f(parking.housingAct)}) = ${f(parking.required)}대`,
    `기존 연면적 ${f(existing.gfaM2)}㎡ → 신축 ${f(gfaM2)}㎡ (${increase >= 0 ? '+' : '−'}${f(Math.abs(increase))}㎡), 기존 ${existing.households}세대 → ${households}세대`,
  ]

  return {
    rulesId,
    rules,
    housingType: type,
    siteAreaM2,
    bcrLimitPercent,
    maxBuildingAreaM2,
    farLimitPercent,
    farGfaM2,
    floorLimit,
    floorsGfaM2,
    housingAreaGfaM2,
    gfaM2,
    limitingFactor,
    netRatio: rb.netRatio,
    netM2,
    households,
    netPerUnitM2,
    housingFloors,
    totalFloors,
    heightM,
    farPercent: (gfaM2 / siteAreaM2) * 100,
    parking,
    existing,
    requiredSetbackM: sunApplies ? requiredSetback(heightM, sun) : null,
    allowedHeightM,
    // 신축 규모가 기존보다 크지 않으면 재건축 이득이 없어 '확인 필요'
    verdict: gfaM2 <= EPS ? 'impossible' : increase > EPS ? 'possible' : 'check',
    checks,
    reasons,
  }
}
