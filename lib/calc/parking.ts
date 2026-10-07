// 주차 산정 (설계서 5-3a, v3) — 순수 함수
// 1) 현재 법정대수: 기준 엑셀과 같은 방식 (서울시 주차장 조례 별표2, 비고4·비고5)
// 2) 기존 여유대수 안에서 추가 전용면적이 최대가 되는 세대 조합 (S/M/L)
// 3) 0세대면 주차를 추가 확보한 안을 함께 계산
// 엑셀은 추가 세대를 모두 전용 15~30㎡로 가정하므로, 엑셀 대조 칸(excel)은 그 방식으로 따로 재현한다.

import { formatNumber } from '@/lib/format'
import type {
  AddUnit,
  AddUnitPlan,
  AddUnitType,
  ExcelSite,
  ExcelUnit,
  ParkingResult,
  ParkingUnit,
  Rules,
} from '@/types'

type ParkingRule = Rules['parking']

/** 소수 오차 보정 (예: 0.09999999999999964 → 0.1) */
const snap = (v: number) => Math.round(v * 1e6) / 1e6

/** digits 자리까지 남기고 절사 (비고4). 부동소수 오차로 0.7 → 0.6 이 되지 않게 보정 */
const truncate = (v: number, digits: number) => {
  const f = 10 ** digits
  return Math.floor(v * f + 1e-9) / f
}

const USE_BY_BASIS: [prefix: string, use: ParkingUnit['use']][] = [
  ['제5호', 'housing5'],
  ['제4호', 'detached'],
  ['제3호', 'neighborhood'],
  ['제2-1호', 'office'],
]

/**
 * 기준 엑셀 데이터를 주차 산정용 호 목록으로 바꾼다.
 * 호별 주차 자료가 없으면 대장 값으로 만든다: 다가구(가구수 2 이상)는 가구별 전용 = 연면적 × 0.8 ÷ 가구수,
 * 그 외 단독주택은 연면적 전체를 제4호 시설면적으로 본다.
 */
export function buildParkingUnits(site: ExcelSite, units: ExcelUnit[], rules: Rules): ParkingUnit[] {
  const rows = units.filter((u) => u.pnu === site.pnu && u.parking)
  if (rows.length > 0) {
    return rows.map((u) => {
      const p = u.parking!
      const use = USE_BY_BASIS.find(([prefix]) => p.basis.startsWith(prefix))?.[1]
      if (!use) throw new Error(`알 수 없는 주차 적용기준: ${site.pnu} ${u.unitName} ${p.basis}`)
      return { use, netAreaM2: p.netAreaM2 ?? 0, facilityAreaM2: p.facilityAreaM2 ?? 0 }
    })
  }
  if (site.mainUse !== '단독주택') return []
  if (site.families >= 2) {
    const net = (site.totalFloorAreaM2 * rules.parking.multiFamilyNetRatio) / site.families
    return Array.from({ length: site.families }, () => ({ use: 'housing5', netAreaM2: net, facilityAreaM2: net }))
  }
  return [{ use: 'detached', netAreaM2: site.totalFloorAreaM2, facilityAreaM2: site.totalFloorAreaM2 }]
}

/** 세대 전용면적에 해당하는 주차 구간 */
function stepOf(netM2: number, rule: ParkingRule) {
  return rule.perUnit.find((s) => s.maxNetM2 === null || netM2 <= s.maxNetM2) ?? rule.perUnit[rule.perUnit.length - 1]
}

/** 제4호 단독·다중 시설면적 → 대수 */
function detachedSpaces(areaM2: number, rule: ParkingRule): number {
  const d = rule.detached
  if (areaM2 <= d.minM2) return 0
  if (areaM2 <= d.baseM2) return d.baseSpaces
  return d.baseSpaces + (areaM2 - d.baseM2) / d.extraM2PerSpace
}

/** 현재 법정대수 */
export function calcRequiredParking(units: ParkingUnit[], rules: Rules): ParkingResult['required'] {
  const rule = rules.parking
  const sum = (use: ParkingUnit['use'], f: (u: ParkingUnit) => number) =>
    units.filter((u) => u.use === use).reduce((s, u) => s + f(u), 0)

  const perUnit = sum('housing5', (u) => stepOf(u.netAreaM2, rule).spaces)
  const ha = rule.housingAct
  const housingAct = sum('housing5', (u) =>
    u.netAreaM2 / (u.netAreaM2 <= ha.smallMaxNetM2 ? ha.smallM2PerSpace : ha.largeM2PerSpace),
  )
  // 비주택은 용도별 시설면적을 합산한 뒤 대수로 바꾼다
  let detached = detachedSpaces(sum('detached', (u) => u.facilityAreaM2), rule)
  let neighborhood = sum('neighborhood', (u) => u.facilityAreaM2) / rule.neighborhoodM2PerSpace
  let office = sum('office', (u) => u.facilityAreaM2) / rule.officeM2PerSpace

  const mixedUse = new Set(units.map((u) => u.use)).size > 1
  if (mixedUse) {
    detached = truncate(detached, rule.nonHousingDecimals)
    neighborhood = truncate(neighborhood, rule.nonHousingDecimals)
    office = truncate(office, rule.nonHousingDecimals)
  }
  const housing = Math.max(perUnit, housingAct)
  return {
    perUnit,
    housingAct,
    housing,
    detached,
    neighborhood,
    office,
    total: housing + detached + neighborhood + office,
    mixedUse,
  }
}

const EMPTY_PLAN: AddUnitPlan = { units: [], netM2: 0, spaces: 0, gfaM2: 0 }

/**
 * 주차 여유(spare) 안에서 추가 전용면적이 최대가 되는 세대 조합.
 * S(≤30㎡) / M(≤60㎡) / L(>60㎡, 면적 상한 = 잔여 전용면적). 추가 전용 합은 잔여 전용면적을 넘지 못한다.
 * 세대당 전용이 최소면적(15㎡) 미만이 되는 조합은 제외. 동점이면 세대 수가 많은 쪽, 그다음 주차를 덜 쓰는 쪽.
 */
export function bestAddUnits(spare: number, remainingNetM2: number, netRatio: number, rules: Rules): AddUnitPlan {
  const rule = rules.parking
  const [S, M, L] = rule.perUnit
  const budget = snap(Math.max(0, spare))
  const capOf = (step: typeof S) => step.maxNetM2 ?? remainingNetM2
  const types: [AddUnitType, number, number][] = [
    ['S', capOf(S), S.spaces],
    ['M', capOf(M), M.spaces],
    ['L', capOf(L), L.spaces],
  ]

  let best: { counts: number[]; net: number; n: number; spaces: number } | null = null
  const max = types.map(([, , sp]) => Math.floor(budget / sp + 1e-9))
  for (let s = 0; s <= max[0]; s++) {
    for (let m = 0; m <= max[1]; m++) {
      for (let l = 0; l <= max[2]; l++) {
        const counts = [s, m, l]
        const n = s + m + l
        const spaces = snap(counts.reduce((sum, c, i) => sum + c * types[i][2], 0))
        if (n === 0 || spaces > budget) continue
        const raw = counts.reduce((sum, c, i) => sum + c * types[i][1], 0)
        const net = Math.min(raw, remainingNetM2)
        if (net / n < rule.minUnitNetM2) continue
        const better =
          !best ||
          net > best.net + 1e-9 ||
          (Math.abs(net - best.net) <= 1e-9 && (n > best.n || (n === best.n && spaces < best.spaces)))
        if (better) best = { counts, net, n, spaces }
      }
    }
  }
  if (!best) return EMPTY_PLAN

  // 잔여 전용면적에 걸리면 세대별 면적을 같은 비율로 줄인다
  const raw = best.counts.reduce((sum, c, i) => sum + c * types[i][1], 0)
  const scale = best.net / raw
  const units: AddUnit[] = best.counts.flatMap((c, i) =>
    Array.from({ length: c }, () => ({ type: types[i][0], netAreaM2: types[i][1] * scale, spaces: types[i][2] })),
  )
  return { units, netM2: best.net, spaces: best.spaces, gfaM2: best.net / netRatio }
}

export interface ParkingInput {
  units: ParkingUnit[]
  /** 실제 주차대수 (대) */
  actualSpaces: number
  /** 용적률 기준 잔여 전용면적 (㎡) — far.ts remainingNetM2 */
  remainingNetM2: number
  /** 전용률 (0~1) */
  netRatio: number
}

export function calcParking(input: ParkingInput, rules: Rules): ParkingResult {
  const { units, actualSpaces, remainingNetM2, netRatio } = input
  const rule = rules.parking
  const unitSpaces = rule.perUnit[0].spaces // 소형 세대(≤30㎡) 1세대 = 0.5대
  const required = calcRequiredParking(units, rules)
  const spare = snap(actualSpaces - required.total)
  const usable = Math.max(0, spare) // 기존 부족분은 따지지 않고 증가분만 산정 (비고5)

  const plan = bestAddUnits(spare, remainingNetM2, netRatio, rules)

  // 엑셀 방식: 추가 세대는 모두 전용 15~30㎡ (0.5대)
  const hasRoom = remainingNetM2 > 0
  const excelMax = hasRoom
    ? Math.min(Math.floor(usable / unitSpaces + 1e-9), Math.floor(remainingNetM2 / rule.minUnitNetM2 + 1e-9))
    : null
  const needsParking = hasRoom && excelMax === 0
  const maxAreaUnits = needsParking ? Math.floor(remainingNetM2 / rule.minUnitNetM2 + 1e-9) : null
  const excel = {
    maxAddUnits: excelMax,
    needFor1Unit: needsParking ? snap(unitSpaces - usable) : null,
    maxAreaUnits,
    needForMaxArea: maxAreaUnits === null ? null : snap(maxAreaUnits * unitSpaces - usable),
  }

  // 0세대면: 1세대에 필요한 만큼 주차를 정수 대수로 추가 확보한 안
  let option: ParkingResult['option'] = null
  if (plan.units.length === 0 && remainingNetM2 >= rule.minUnitNetM2) {
    const addSpaces = Math.ceil(snap(unitSpaces - usable) - 1e-9)
    const spareAfter = snap(usable + addSpaces)
    const optionPlan = bestAddUnits(spareAfter, remainingNetM2, netRatio, rules)
    if (optionPlan.units.length > 0) option = { ...optionPlan, addSpaces, spareAfter }
  }

  const f = (v: number) => formatNumber(v, 2)
  const describe = (p: AddUnitPlan) =>
    p.units.map((u) => `${u.type}(전용 ${f(u.netAreaM2)}㎡)`).join(' + ')
  const reasons = [
    `현재 법정 주차 ${f(required.total)}대 = 주택 ${f(required.housing)} + 단독 ${f(required.detached)} + 근생 ${f(required.neighborhood)} + 업무 ${f(required.office)}` +
      (required.mixedUse ? ' (복합용도: 비주택 용도별 소수 첫째자리 절사)' : ''),
    `실제 ${f(actualSpaces)}대 − 법정 ${f(required.total)}대 = 여유 ${f(spare)}대` + (spare < 0 ? ' (기존 부족분은 증축 산정에서 제외)' : ''),
    plan.units.length > 0
      ? `여유 주차로 ${plan.units.length}세대 추가: ${describe(plan)} → 전용 ${f(plan.netM2)}㎡ ÷ 전용률 ${f(netRatio)} = 연면적 ${f(plan.gfaM2)}㎡`
      : `여유 주차로 추가할 수 있는 세대 없음 (전용 30㎡ 이하 1세대에 ${unitSpaces}대 필요)`,
  ]
  if (option) {
    reasons.push(
      `주차 ${option.addSpaces}대 추가 확보 시 여유 ${f(option.spareAfter)}대 → ${describe(option)} → 연면적 ${f(option.gfaM2)}㎡`,
    )
  }

  return { required, actual: actualSpaces, spare, plan, excel, option, reasons }
}
