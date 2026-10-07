// 토지가액(공시지가 기준)·자산가치(원가 기준) — 손계산 값과 일치해야 한다 (설계서 5-4 [0], [C'], 5-7)
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcAssetValue, calcLandInclusiveYield, calcLandValue, fullYearsBetween } from '@/lib/calc/finance'
import { buildingValueRule, landValueRule } from '@/lib/rules/financeDefaults'
import { getSiteData } from '@/lib/services/mockService'
import type { LandLotRow, LandPriceRow, LandValueResult } from '@/types'

const T1 = '1156011600001040010' // 104-10 렉스빌: 외필지 0, 토지대장 223㎡ ≠ 대장 대지 199.5㎡
const T2 = '1156011600001100019' // 110-19 더 채움 하우스: 외필지 3 (목록 없음)
const DANGSAN = '1156011600001040048' // 104-48 당산빌: 외필지 1 (회귀 테스트)

async function site(pnu: string) {
  const data = await getSiteData(pnu)
  if (!data) throw new Error(`site data 없음: ${pnu}`)
  return data
}

describe('토지가액 — T1·T2 손계산', () => {
  it('T1: 외필지 0 → 토지대장 223㎡ × 4,764,000 = 1,062,372,000원, 대장 199.5㎡와 달라 면적 확인 필요', async () => {
    const land = runAll(await site(T1), 'ALL').land
    expect(land.basis).toBe('mismatch')
    expect(land.valueWon).toBe(1_062_372_000)
    expect(land.areaUsedM2).toBe(223)
    expect(land.areaDiffM2).toBe(23.5)
    expect(land.priceBasis).toEqual({ baseYear: '2026', baseMonth: '01', announcedDate: '2026-04-30' })
  })

  it('T2: 외필지 3, 목록 없음 → 추정 373.1㎡ × 4,763,000 = 1,777,075,300원', async () => {
    const land = runAll(await site(T2), 'ALL').land
    expect(land.basis).toBe('estimated')
    expect(land.valueWon).toBe(1_777_075_300)
    expect(land.lots).toEqual([{ pnu: T2, areaM2: 373.1, pricePerM2: 4_763_000, valueWon: 1_777_075_300 }])
    expect(land.reasons.join(' ')).toContain('255㎡') // 대표 필지 토지대장 면적 참고 표기
  })

  it('104-48: 외필지 1 → 추정 200.07㎡ × 4,764,000 = 953,133,480원', async () => {
    const land = runAll(await site(DANGSAN), 'BASE').land
    expect(land.basis).toBe('estimated')
    expect(land.valueWon).toBe(953_133_480)
  })
})

describe('토지가액 — 산정 방식', () => {
  const prices: LandPriceRow[] = [
    { pnu: 'A', pricePerM2: 1_000_000, baseYear: '2026', baseMonth: '01', announcedDate: '2026-04-30' },
    { pnu: 'B', pricePerM2: 2_000_000, baseYear: '2026', baseMonth: '01', announcedDate: '2026-04-30' },
  ]
  const lots: LandLotRow[] = [
    { pnu: 'A', landCategory: '대', lotAreaM2: 100, ownership: '개인' },
    { pnu: 'B', landCategory: '대', lotAreaM2: 50.5, ownership: '개인' },
  ]
  const base = { pnu: 'A', outsideParcels: 1, landLots: lots, landPrices: prices }

  it('구성 필지를 수기 입력하고 면적 합이 대장과 같으면 sum = Σ(면적 × 공시지가)', () => {
    const r = calcLandValue({ ...base, siteAreaM2: 150, lotPnus: ['A', 'B'] }, landValueRule)
    expect(r.basis).toBe('sum') // 150.5 − 150 = 0.5㎡ ≤ 허용오차 1㎡
    expect(r.valueWon).toBe(100 * 1_000_000 + 50.5 * 2_000_000)
  })

  it('구성 필지 중 자료가 없는 필지가 있으면 추정으로 내린다', () => {
    const r = calcLandValue({ ...base, siteAreaM2: 150, lotPnus: ['A', 'C'] }, landValueRule)
    expect(r.basis).toBe('estimated')
    expect(r.valueWon).toBe(150 * 1_000_000)
  })

  it('대표 필지 공시지가가 없으면 계산하지 않는다 (none)', () => {
    const r = calcLandValue({ ...base, pnu: 'Z', siteAreaM2: 150, lotPnus: null }, landValueRule)
    expect(r.basis).toBe('none')
    expect(r.valueWon).toBeNull()
  })
})

describe('자산가치 — 원가 기준 (재조달단가 200만원/㎡, 내용연수 50년, 최저잔가율 10%, 기준일 2026-10-07)', () => {
  it('경과연수는 기준일까지 만 연수', () => {
    expect(fullYearsBetween('2008-08-12', '2026-10-07')).toBe(18)
    expect(fullYearsBetween('2018-06-07', '2026-10-07')).toBe(8)
    expect(fullYearsBetween('2018-10-08', '2026-10-07')).toBe(7)
  })

  it('T1: 기존 378.24㎡ × 200만 × 0.64 = 484,147,200 / 전 1,546,519,200 / ALL +99.27㎡ → 후 1,745,059,200', async () => {
    const a = runAll(await site(T1), 'ALL').asset
    expect(a.existingBuilding.ageYears).toBe(18)
    expect(a.existingBuilding.residualRate).toBeCloseTo(0.64, 10)
    expect(a.existingBuilding.valueWon).toBe(484_147_200)
    expect(a.beforeWon).toBe(1_546_519_200)
    expect(a.addBuilding.gfaM2).toBe(99.27)
    expect(a.addBuilding.valueWon).toBe(198_540_000)
    expect(a.afterWon).toBe(1_745_059_200)
  })

  it('T2: 기존 722.02㎡ × 200만 × 0.84 = 1,212,993,600 / 전 2,990,068,900 / ALL +36.2527㎡ → 후 3,062,574,214', async () => {
    const a = runAll(await site(T2), 'ALL').asset
    expect(a.existingBuilding.ageYears).toBe(8)
    expect(a.existingBuilding.valueWon).toBe(1_212_993_600)
    expect(a.beforeWon).toBe(2_990_068_900)
    // 증축 연면적 = 전용 30㎡ ÷ 전용률 0.8275… = 36.2527㎡ (손계산 36.25㎡로 하면 3,062,568,900)
    expect(a.addBuilding.gfaM2).toBeCloseTo(36.2527, 4)
    expect(a.addBuilding.valueWon).toBe(72_505_314)
    expect(a.afterWon).toBe(3_062_574_214)
  })

  it('증축안이 없는 시나리오는 자산가치 후 = 전', async () => {
    const a = runAll(await site(T1), 'BASE').asset // T1 BASE: 주택 층수 한도로 '확인 필요'
    expect(a.addBuilding.gfaM2).toBe(0)
    expect(a.afterWon).toBe(a.beforeWon)
  })

  it('토지가액이 없으면 자산가치를 합산하지 않는다', () => {
    const land: LandValueResult = {
      basis: 'none', valueWon: null, lots: [], areaUsedM2: 0, siteAreaM2: null, areaDiffM2: null, priceBasis: null, reasons: [],
    }
    const a = calcAssetValue(
      { land, gfaM2: 100, structure: '철근콘크리트구조', approvalDate: null, baseDate: '2026-10-07', addGfaM2: 0 },
      buildingValueRule,
    )
    expect(a.existingBuilding.residualRate).toBe(0.1) // 사용승인일 없음 → 최저 잔가율
    expect(a.beforeWon).toBeNull()
  })
})

describe('토지 포함 수익률 (수식만 — NOI는 수익성 엔진 연결 후)', () => {
  it('전 = 기존 NOI ÷ 자산가치(전), 후 = (기존 NOI + NOI 증가) ÷ (자산가치(전) + 총사업비)', () => {
    const y = calcLandInclusiveYield({
      existingNoiWon: 60_000_000,
      noiIncreaseWon: 10_000_000,
      assetBeforeWon: 1_500_000_000,
      totalCostWon: 500_000_000,
    })
    expect(y.beforeRate).toBeCloseTo(0.04, 10)
    expect(y.afterRate).toBeCloseTo(0.035, 10)
  })
})
