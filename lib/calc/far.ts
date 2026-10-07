// 용적률·건폐율 계산 (설계서 5-1, v3) — 순수 함수
// v3: 완화는 배수(×1.2)가 아니라 rules.farLimitByZone 의 상한값 교체로 반영된다.
//     maxGFA 는 반드시 시나리오 적용 후 rules 의 상한으로 계산한다.

import type { FarResult, Rules, ZoneName } from '@/types'

export interface FarInput {
  /** 대지면적 (㎡) */
  siteAreaM2: number
  /** 용적률산정 연면적 (㎡) */
  farFloorAreaM2: number
  zone: ZoneName
  /** 전용률 (0~1) — 기준 엑셀 '전용률' */
  netRatio: number
}

/** 시나리오 적용 후 규칙에서 용도지역의 용적률 상한 (%) */
export function farLimitOf(zone: ZoneName, rules: Rules): number {
  const limit = rules.farLimitByZone[zone]
  if (limit === undefined) throw new Error(`용적률 상한이 없는 용도지역: ${zone}`)
  return limit
}

export function calcFar(input: FarInput, rules: Rules): FarResult {
  const { siteAreaM2, farFloorAreaM2, zone, netRatio } = input
  if (!(siteAreaM2 > 0)) throw new Error(`대지면적이 올바르지 않음: ${siteAreaM2}`)

  const farLimitPercent = farLimitOf(zone, rules)
  const maxGfaM2 = (siteAreaM2 * farLimitPercent) / 100
  const remainingGfaM2 = Math.max(0, maxGfaM2 - farFloorAreaM2)

  return {
    currentFarPercent: (farFloorAreaM2 / siteAreaM2) * 100,
    farLimitPercent,
    maxGfaM2,
    remainingGfaM2,
    remainingNetM2: remainingGfaM2 * netRatio,
  }
}

/** 건폐율 (%) = 건축면적 ÷ 대지면적 × 100 */
export function calcBcr(buildingAreaM2: number, siteAreaM2: number): number {
  if (!(siteAreaM2 > 0)) throw new Error(`대지면적이 올바르지 않음: ${siteAreaM2}`)
  return (buildingAreaM2 / siteAreaM2) * 100
}
