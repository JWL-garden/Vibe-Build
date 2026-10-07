// 수익성 계산 모듈 (순수 함수, 설계서 5-4)
// 지금 구현: [0] 토지가액(공시지가 기준), [C'] 증축 전·후 자산가치(원가 기준), [C''] 토지 포함 수익률 수식
// TODO [3-2]~[3-3]: [A] 사업비, [B] 수익, [C] 지표, 10년 현금흐름

import type { BuildingValueRule, LandValueRule } from '@/lib/rules/financeDefaults'
import type {
  AssetValueResult,
  LandInclusiveYield,
  LandLotRow,
  LandPriceRow,
  LandValueLot,
  LandValueResult,
} from '@/types'

export interface LandValueInput {
  /** 대표 필지 PNU */
  pnu: string
  /** 건축물대장 대지면적 (㎡) */
  siteAreaM2: number | null
  /** 건축물대장 외필지수 */
  outsideParcels: number
  /** 수기 입력한 구성 필지 PNU 목록 (대표 포함). 없으면 null */
  lotPnus: string[] | null
  landLots: LandLotRow[]
  landPrices: LandPriceRow[]
}

const won = (v: number) => Math.round(v)
const m2 = (v: number) => Math.round(v * 100) / 100

/**
 * 토지가액 = Σ(구성 필지 면적 × 각 필지 공시지가).
 * 구성 필지를 모르면(외필지 있음 + 수기 입력 없음) 대표 필지 공시지가 × 대장 대지면적으로 '추정'한다.
 */
export function calcLandValue(input: LandValueInput, rule: LandValueRule): LandValueResult {
  const price = (pnu: string) => input.landPrices.find((p) => p.pnu === pnu) ?? null
  const lot = (pnu: string) => input.landLots.find((l) => l.pnu === pnu) ?? null
  const rep = price(input.pnu)
  const priceBasis = rep ? { baseYear: rep.baseYear, baseMonth: rep.baseMonth, announcedDate: rep.announcedDate } : null
  const reasons: string[] = []

  const lotPnus = input.lotPnus ?? (input.outsideParcels === 0 ? [input.pnu] : null)
  const missing = lotPnus?.filter((p) => !price(p) || !lot(p)) ?? []

  if (lotPnus && missing.length === 0) {
    const lots: LandValueLot[] = lotPnus.map((p) => {
      const areaM2 = lot(p)!.lotAreaM2
      const pricePerM2 = price(p)!.pricePerM2
      return { pnu: p, areaM2, pricePerM2, valueWon: won(areaM2 * pricePerM2) }
    })
    const areaUsedM2 = lots.reduce((s, l) => s + l.areaM2, 0)
    const areaDiffM2 = input.siteAreaM2 === null ? null : m2(areaUsedM2 - input.siteAreaM2)
    const mismatch = areaDiffM2 === null || Math.abs(areaDiffM2) > rule.areaToleranceM2
    reasons.push(`구성 필지 ${lots.length}개의 토지대장 면적 × 개별공시지가 합계입니다.`)
    if (mismatch) {
      reasons.push(
        input.siteAreaM2 === null
          ? '건축물대장 대지면적이 없어 면적을 대조하지 못했습니다 — 확인 필요.'
          : `토지대장 면적 합 ${m2(areaUsedM2)}㎡가 건축물대장 대지면적 ${input.siteAreaM2}㎡와 ${Math.abs(areaDiffM2!)}㎡ 다릅니다 — 면적 확인 필요.`,
      )
    }
    return {
      basis: mismatch ? 'mismatch' : 'sum',
      valueWon: lots.reduce((s, l) => s + l.valueWon, 0),
      lots,
      areaUsedM2: m2(areaUsedM2),
      siteAreaM2: input.siteAreaM2,
      areaDiffM2,
      priceBasis,
      reasons,
    }
  }

  if (!rep || input.siteAreaM2 === null) {
    return {
      basis: 'none',
      valueWon: null,
      lots: [],
      areaUsedM2: 0,
      siteAreaM2: input.siteAreaM2,
      areaDiffM2: null,
      priceBasis,
      reasons: [rep ? '건축물대장 대지면적이 없어 토지가액을 계산할 수 없습니다.' : '대표 필지의 개별공시지가가 없어 토지가액을 계산할 수 없습니다.'],
    }
  }

  reasons.push(
    missing.length > 0
      ? `구성 필지 중 ${missing.join(', ')}의 토지대장·공시지가가 없어 대표 필지 공시지가 × 건축물대장 대지면적으로 추정했습니다.`
      : `외필지 ${input.outsideParcels}개의 목록·면적이 없어 대표 필지 공시지가 × 건축물대장 대지면적으로 추정했습니다.`,
  )
  const repLot = lot(input.pnu)
  if (repLot) reasons.push(`참고: 대표 필지 토지대장 면적은 ${repLot.lotAreaM2}㎡입니다.`)
  const valueWon = won(input.siteAreaM2 * rep.pricePerM2)
  return {
    basis: 'estimated',
    valueWon,
    lots: [{ pnu: input.pnu, areaM2: input.siteAreaM2, pricePerM2: rep.pricePerM2, valueWon }],
    areaUsedM2: input.siteAreaM2,
    siteAreaM2: input.siteAreaM2,
    areaDiffM2: 0,
    priceBasis,
    reasons,
  }
}

/** 기준일까지 만 연수 (YYYY-MM-DD) */
export function fullYearsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return ty - fy - (tm < fm || (tm === fm && td < fd) ? 1 : 0)
}

export interface AssetValueInput {
  land: LandValueResult
  /** 기존 연면적 (㎡) */
  gfaM2: number
  /** 구조 (예: '철근콘크리트구조') */
  structure: string
  /** 사용승인일 (YYYY-MM-DD). 없으면 null */
  approvalDate: string | null
  /** 경과연수 기준일 (YYYY-MM-DD) */
  baseDate: string
  /** 증축 연면적 (㎡). 증축안이 없으면 0 */
  addGfaM2: number
}

/**
 * 증축 전·후 자산가치(원가 기준 참고값)
 * 기존건물가치 = 연면적 × 재조달단가 × 잔가율, 증축건물가치 = 증축 연면적 × 재조달단가
 * 자산가치(전) = 토지가액 + 기존건물가치, 자산가치(후) = 자산가치(전) + 증축건물가치
 */
export function calcAssetValue(input: AssetValueInput, rule: BuildingValueRule): AssetValueResult {
  const unitCostWon = rule.replacementCostPerM2Won
  const usefulLifeYears = rule.usefulLifeYears[input.structure] ?? rule.usefulLifeYears.default
  const ageYears = input.approvalDate ? Math.max(0, fullYearsBetween(input.approvalDate, input.baseDate)) : null
  // 사용승인일이 없으면 최저 잔가율로 보수적으로 본다
  const residualRate =
    ageYears === null ? rule.minResidualRate : Math.max(rule.minResidualRate, 1 - ageYears / usefulLifeYears)
  const existingValue = won(input.gfaM2 * unitCostWon * residualRate)
  const addValue = won(input.addGfaM2 * unitCostWon)
  const land = input.land.valueWon
  const reasons = [
    ageYears === null
      ? `사용승인일이 없어 잔가율을 최저 ${rule.minResidualRate * 100}%로 보았습니다.`
      : `경과 ${ageYears}년 / 내용연수 ${usefulLifeYears}년 → 잔가율 ${Math.round(residualRate * 1000) / 10}%`,
    '건물가치는 재조달단가 기준 원가 추정(예시 가정값)이며 감정평가가 아닙니다.',
  ]
  if (land === null) reasons.push('토지가액이 없어 자산가치를 합산하지 않았습니다.')
  return {
    land: input.land,
    existingBuilding: { gfaM2: input.gfaM2, unitCostWon, ageYears, usefulLifeYears, residualRate, valueWon: existingValue },
    addBuilding: { gfaM2: input.addGfaM2, valueWon: addValue },
    beforeWon: land === null ? null : land + existingValue,
    afterWon: land === null ? null : land + existingValue + addValue,
    baseDate: input.baseDate,
    reasons,
  }
}

/**
 * 토지 포함(보유 자산 전체) 수익률 — 참고 지표.
 * 증축 판단의 핵심 지표는 ROI(= NOI 증가 ÷ 총사업비)이고, 이 값은 보조로만 쓴다.
 * NOI·총사업비는 수익성 엔진([3-2])에서 받는다.
 */
export function calcLandInclusiveYield(input: {
  existingNoiWon: number
  noiIncreaseWon: number
  assetBeforeWon: number
  totalCostWon: number
}): LandInclusiveYield {
  return {
    beforeRate: input.existingNoiWon / input.assetBeforeWon,
    afterRate: (input.existingNoiWon + input.noiIncreaseWon) / (input.assetBeforeWon + input.totalCostWon),
  }
}
