// 증축 산정 (설계서 5-3, v3) — 순수 함수
// 증축 면적을 "주차 여유로 설치 가능한 최대 연면적"으로 정한 뒤 다른 제한으로 깎는다.
//   1) 주차 기준 연면적  2) 용적률 잔여(완화 상한)  3) 주택 연면적 잔여  → 최솟값
//   4) 층수 = ceil(연면적 ÷ 증축층 바닥면적)  5) 주택 층수(현재 + 증축) 한도에 맞게 층수 축소(한 층도 안 되면 0)
//   6) 일조 허용높이로 층수 축소
// 기존 주차로 0세대면, 주차를 추가 확보한 안(parkingOption)도 같은 순서로 계산한다.

import { formatNumber } from '@/lib/format'
import { getZoneRule } from '@/lib/rules/zoningTable'
import type {
  AddUnitPlan,
  ExcelSite,
  ExcelUnit,
  ExpansionCheck,
  ExpansionPlan,
  LimitingFactor,
  Rules,
  ScenarioId,
  SiteExpansionResult,
  SiteInput,
} from '@/types'
import { calcFar } from './far'
import { calcHousingLimit, summarizeHousing } from './housingLimit'
import { LIMIT_LABEL } from './labels'
import { buildParkingUnits, calcParking } from './parking'
import { maxHeightAtDistance, requiredSetback, sunlightRuleFor } from './sunlight'

export interface ExpansionInput {
  scenarioId: ScenarioId
  site: ExcelSite
  /** 같은 필지의 호 목록 (다른 필지 호가 섞여 있어도 PNU로 거른다) */
  units: ExcelUnit[]
  /** 전용률 (0~1) — 기준 엑셀 '전용률' */
  netRatio: number
  /** 수기 입력값 (없으면 null → 해당 항목 '확인 필요') */
  siteInput: SiteInput | null
}

const EPS = 1e-9
const f = (v: number) => formatNumber(v, 2)

export function calcExpansion(input: ExpansionInput, rules: Rules): SiteExpansionResult {
  const { scenarioId, site, units, netRatio, siteInput } = input
  if (site.siteAreaM2 === null) throw new Error(`대지면적 없음: ${site.pnu}`)
  if (site.zone === null) throw new Error(`용도지역 없음: ${site.pnu}`)
  const siteAreaM2 = site.siteAreaM2
  const minUnitNet = rules.parking.minUnitNetM2

  const far = calcFar(
    { siteAreaM2, farFloorAreaM2: site.farFloorAreaM2, zone: site.zone, netRatio },
    rules,
  )
  const parking = calcParking(
    {
      units: buildParkingUnits(site, units, rules),
      actualSpaces: site.parking.total,
      remainingNetM2: far.remainingNetM2,
      netRatio,
    },
    rules,
  )
  const housingSummary = summarizeHousing(site, units)
  // 추가 세대는 주택이므로 새 층은 주택 층으로 본다
  const housingLimit = calcHousingLimit({ ...housingSummary, addHousingFloor: true }, rules)

  const floorPlate =
    siteInput?.floorPlateM2 != null
      ? { areaM2: siteInput.floorPlateM2, source: 'siteInput' as const }
      : { areaM2: site.buildingAreaM2, source: 'buildingArea' as const }
  // 다가구·다세대면 8·13 대책 '수직 건축 허용 높이'를 반영한 일조 규칙
  const sun = sunlightRuleFor(rules.sunlight, housingSummary.housingType)
  const sunlightApplies = sun.applies && (getZoneRule(site.zone)?.sunlightApplies ?? true)
  const setback = siteInput?.northSetbackM ?? null
  const allowedHeightM = sunlightApplies && setback !== null ? maxHeightAtDistance(setback, sun) : null
  const fh = rules.floorHeightM

  /** 연면적에 맞게 세대 수·면적을 줄인다 (세대당 전용이 최소면적 미만이면 세대를 뺀다) */
  function fitUnits(plan: AddUnitPlan, gfa: number) {
    let net = gfa * netRatio
    let n = plan.units.length
    while (n > 0 && net / n < minUnitNet - EPS) n--
    if (n === 0) return { gfa: 0, net: 0, units: [] }
    const kept = plan.units.slice(0, n)
    const raw = kept.reduce((s, u) => s + u.netAreaM2, 0)
    net = Math.min(net, raw)
    return { gfa: net / netRatio, net, units: kept.map((u) => ({ ...u, netAreaM2: (u.netAreaM2 * net) / raw })) }
  }

  function applyLimits(plan: AddUnitPlan, parkingLabel: string): ExpansionPlan {
    const checks: ExpansionCheck[] = []
    const reasons: string[] = []
    const housingGfa = housingLimit.applies ? housingLimit.areaGfaM2! : Infinity

    // 1)~3) 최솟값. 같으면 용적률 → 주택 연면적 → 주차 순으로 제한요인을 정한다
    // 잔여 전용면적이 최소 세대면적(15㎡)보다 작으면 용적률로는 사실상 증축 불가
    const farUsable = far.remainingNetM2 + EPS >= minUnitNet
    const candidates: [LimitingFactor, number][] = [
      ['far', farUsable ? far.remainingGfaM2 : 0],
      ['housingArea', housingGfa],
      ['parking', plan.gfaM2],
    ]
    const minGfa = Math.max(0, Math.min(...candidates.map(([, v]) => v)))
    let limitingFactor = candidates.find(([, v]) => v <= minGfa + EPS)![0]
    let fitted = fitUnits(plan, minGfa)

    checks.push({
      item: 'parking',
      status: plan.units.length > 0 ? 'pass' : 'fail',
      detail:
        plan.units.length > 0
          ? `${parkingLabel} ${plan.units.length}세대(전용 ${f(plan.netM2)}㎡) → 연면적 ${f(plan.gfaM2)}㎡`
          : `${parkingLabel} 추가 가능한 세대 없음`,
    })
    checks.push({
      item: 'far',
      status: farUsable ? 'pass' : 'fail',
      detail:
        `용적률 ${f(far.farLimitPercent)}% → 잔여 연면적 ${f(far.remainingGfaM2)}㎡` +
        (farUsable ? '' : ` (전용 ${f(far.remainingNetM2)}㎡ < 최소 세대 ${f(minUnitNet)}㎡ → 사실상 불가)`),
    })
    checks.push(
      housingLimit.applies
        ? {
            item: 'housingArea',
            status: housingGfa + EPS >= Math.min(plan.gfaM2, far.remainingGfaM2) ? 'pass' : 'fail',
            detail: `주택 연면적 ${f(housingSummary.housingAreaM2)}㎡ / 한도 ${f(housingLimit.areaLimitM2!)}㎡ → 잔여 ${f(housingGfa)}㎡`,
          }
        : { item: 'housingArea', status: 'pass', detail: '주택 연면적 한도 미적용' },
    )
    reasons.push(
      `증축 연면적 = min(주차 ${f(plan.gfaM2)}, 용적률 ${f(far.remainingGfaM2)}, 주택 연면적 ${housingLimit.applies ? f(housingGfa) : '미적용'}) = ${f(fitted.gfa)}㎡`,
    )

    // 4) 층수
    let addFloors = fitted.gfa > EPS ? Math.ceil(fitted.gfa / floorPlate.areaM2 - EPS) : 0
    checks.push({
      item: 'floorPlate',
      status: floorPlate.source === 'siteInput' ? 'pass' : 'check',
      detail:
        floorPlate.source === 'siteInput'
          ? `증축층 바닥면적 ${f(floorPlate.areaM2)}㎡ (수기입력)`
          : `증축층 바닥면적 = 건축면적 ${f(floorPlate.areaM2)}㎡로 가정 — 최상층 면적 확인 필요`,
    })

    // 5) 주택 층수 — 새 층을 모두 주택으로 쓰면 주택 층수가 증축 층수만큼 늘어난다.
    //    한도를 넘으면 한도에 맞는 층수까지 줄이고, 한 층도 못 올리면 0 (부분 증축·용도변경 대안 확인 필요)
    const attemptedFloors = addFloors
    let housingFloorsAfter: number | null = null
    if (housingLimit.applies && fitted.gfa > EPS) {
      const floorLimit = housingLimit.floorLimit!
      const allowedAdd = Math.max(0, floorLimit - housingSummary.housingFloors)
      housingFloorsAfter = housingSummary.housingFloors + addFloors
      if (addFloors <= allowedAdd) {
        checks.push({
          item: 'housingFloors',
          status: 'pass',
          detail: `+${addFloors}개층 주택 시 ${housingFloorsAfter}개층 ≤ 한도 ${floorLimit}개층`,
        })
      } else if (allowedAdd === 0) {
        checks.push({
          item: 'housingFloors',
          status: 'fail',
          detail: `+${addFloors}개층 주택 시 ${housingFloorsAfter}개층 > 한도 ${floorLimit}개층 → 신규 층 주택 불가 (부분 증축·용도변경 대안 확인 필요)`,
        })
        fitted = { gfa: 0, net: 0, units: [] }
        addFloors = 0
        limitingFactor = 'housingFloors'
      } else {
        addFloors = allowedAdd
        fitted = fitUnits(plan, Math.min(fitted.gfa, addFloors * floorPlate.areaM2))
        if (fitted.gfa <= EPS) addFloors = 0
        limitingFactor = 'housingFloors'
        checks.push({
          item: 'housingFloors',
          status: addFloors > 0 ? 'pass' : 'fail',
          detail: `+${attemptedFloors}개층 주택 시 ${housingFloorsAfter}개층 > 한도 ${floorLimit}개층 → +${addFloors}개층(${f(fitted.gfa)}㎡)으로 축소`,
        })
        housingFloorsAfter = housingSummary.housingFloors + addFloors
      }
    } else {
      checks.push({
        item: 'housingFloors',
        status: 'pass',
        detail: housingLimit.applies ? '증축 없음' : '주택 층수 한도 미적용',
      })
    }

    // 6) 일조 — 주택 층수까지 반영한 최종 층수로 높이를 검토한다
    const height = site.heightM
    let sunCheck: ExpansionCheck
    if (!sunlightApplies) {
      sunCheck = { item: 'sunlight', status: 'pass', detail: '일조 사선 미적용 지역' }
    } else if (height === null) {
      sunCheck = { item: 'sunlight', status: 'check', detail: '현재 높이 정보 없음 — 확인 필요' }
    } else if (allowedHeightM === null) {
      // 정북 이격거리 미입력: 증축이 0이어도 1개층 증축에 필요한 이격거리를 안내한다
      const floors = Math.max(addFloors, 1)
      const newH = height + floors * fh
      sunCheck = {
        item: 'sunlight',
        status: 'check',
        detail: `${addFloors > 0 ? '' : '1개층 증축 시 '}높이 ${f(newH)}m → 정북 이격 ${f(requiredSetback(newH, sun))}m 이상 필요 — 이격거리 확인 필요`,
      }
    } else if (addFloors === 0) {
      sunCheck = { item: 'sunlight', status: 'pass', detail: '증축 없음' }
    } else {
      const newH = height + addFloors * fh
      if (newH <= allowedHeightM + EPS) {
        sunCheck = { item: 'sunlight', status: 'pass', detail: `높이 ${f(newH)}m ≤ 허용 ${f(allowedHeightM)}m` }
      } else {
        const floorsBySun = Math.max(0, Math.floor((allowedHeightM - height) / fh + EPS))
        addFloors = Math.min(addFloors, floorsBySun)
        fitted = fitUnits(plan, Math.min(fitted.gfa, addFloors * floorPlate.areaM2))
        if (fitted.gfa <= EPS) addFloors = 0
        limitingFactor = 'sunlight'
        if (housingFloorsAfter !== null) housingFloorsAfter = housingSummary.housingFloors + addFloors
        sunCheck = {
          item: 'sunlight',
          status: addFloors > 0 ? 'pass' : 'fail',
          detail: `높이 ${f(newH)}m > 허용 ${f(allowedHeightM)}m → 증축 ${addFloors}개층으로 축소`,
        }
      }
    }
    checks.push(sunCheck)

    reasons.push(
      fitted.gfa > EPS
        ? `최종 증축 ${fitted.units.length}세대(전용 ${f(fitted.net)}㎡), 연면적 ${f(fitted.gfa)}㎡, +${addFloors}개층 — 제한요인: ${LIMIT_LABEL[limitingFactor]}`
        : `증축 불가 — 제한요인: ${LIMIT_LABEL[limitingFactor]}`,
    )

    return {
      addUnits: fitted.units,
      addNetM2: fitted.net,
      addGfaM2: fitted.gfa,
      addFloors,
      newTotalFloors: site.floorsAbove + addFloors,
      newHeightM: height === null ? null : height + addFloors * fh,
      newFarPercent: ((site.farFloorAreaM2 + fitted.gfa) / siteAreaM2) * 100,
      limitingFactor,
      attemptedFloors,
      housingFloorsAfter,
      // 주택 층수만 막힌 경우는 부분 증축·용도변경 대안이 있어 '확인 필요'
      verdict: fitted.gfa > EPS ? 'possible' : limitingFactor === 'housingFloors' ? 'check' : 'impossible',
      checks,
      reasons: [...parking.reasons.slice(0, 2), ...reasons],
    }
  }

  const plan = applyLimits(parking.plan, '기존 주차 여유로')
  const parkingOption = parking.option
    ? { ...applyLimits(parking.option, `주차 ${parking.option.addSpaces}대 추가 확보 시`), addSpaces: parking.option.addSpaces }
    : null

  return {
    scenarioId,
    rules,
    sunlight: sun,
    netRatio,
    far,
    parking,
    housing: { ...housingSummary, limit: housingLimit },
    allowedHeightM,
    requiredSetbackM:
      sunlightApplies && site.heightM !== null ? requiredSetback(site.heightM + fh, sun) : null,
    floorPlate,
    plan,
    parkingOption,
  }
}
