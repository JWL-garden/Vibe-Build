// 토지가액(공시지가 기준)·자산가치(원가 기준) — 손계산 값과 일치해야 한다 (설계서 5-4 [0], [C'], 5-7)
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcAssetValue, calcLandInclusiveYield, calcLandValue, fullYearsBetween, residualRateAt } from '@/lib/calc/finance'
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

describe('자산가치 — 원가 기준 (신축단가표 2,055,379원/㎡ · 필로티 포함 · 연 1.1% 지수 감가 · 증축/신축 = 공사비 전액, 기준일 2026-10-07)', () => {
  const UNIT = 2_055_379

  it('경과연수는 기준일까지 만 연수', () => {
    expect(fullYearsBetween('2008-08-12', '2026-10-07')).toBe(18)
    expect(fullYearsBetween('2018-06-07', '2026-10-07')).toBe(8)
    expect(fullYearsBetween('2018-10-08', '2026-10-07')).toBe(7)
  })

  it('잔가율 = exp(−0.011 × 경과연수), 최저 10%, 사용승인일 없으면 최저', () => {
    expect(residualRateAt(18, buildingValueRule)).toBeCloseTo(Math.exp(-0.011 * 18), 12)
    expect(residualRateAt(8, buildingValueRule)).toBeCloseTo(0.9157, 3)
    expect(residualRateAt(300, buildingValueRule)).toBe(0.1)
    expect(residualRateAt(null, buildingValueRule)).toBe(0.1)
  })

  it('T1: 기존 = (378.24 + 필로티 99.27) × 2,055,379 × exp(−0.011×18) ≈ 8.05억, ALL 증축 건물가치 = 증축 공사비 전액 (평당 800만원)', async () => {
    const analysis = runAll(await site(T1), 'ALL')
    const a = analysis.asset
    const b = a.existingBuilding
    expect(b.ageYears).toBe(18)
    expect(b.pilotiAreaM2).toBeCloseTo(99.27, 2)
    expect(b.constructionAreaM2).toBeCloseTo(477.51, 2)
    expect(b.unitCostWon).toBe(UNIT)
    expect(b.replacementCostWon).toBe(Math.round(477.51 * UNIT))
    expect(b.residualRate).toBeCloseTo(Math.exp(-0.011 * 18), 10)
    expect(b.valueWon).toBe(Math.round(Math.round(477.51 * UNIT) * Math.exp(-0.011 * 18)))
    expect(b.valueWon).toBeGreaterThan(8.0e8)
    expect(b.valueWon).toBeLessThan(8.1e8)
    expect(a.beforeWon).toBe(1_062_372_000 + b.valueWon)
    // 증축 연면적 90.349㎡(새 층 53.829 + 측면 보강 36.52) → 증축 공사비 = 90.349 ÷ 3.305785 × 800만원
    expect(a.addBuilding.gfaM2).toBeCloseTo(90.349, 6)
    expect(a.addBuilding.basis).toBe('construction')
    const construction = analysis.finance.byScenario.BASE.costs.find((c) => c.key === 'construction')!.amountWon!
    expect(construction).toBe(Math.round((90.349 / 3.305785) * 8_000_000))
    expect(a.addBuilding.valueWon).toBe(construction)
    expect(a.afterWon).toBe(a.beforeWon! + construction)
  })

  it('T1 REBUILD: 신축 건물가치 = 신축 공사비 전액, 후 = 토지 + 신축 (기존 건물 철거)', async () => {
    const analysis = runAll(await site(T1), 'REBUILD')
    const a = analysis.asset
    const construction = analysis.finance.byScenario.BASE.costs.find((c) => c.key === 'construction')!.amountWon!
    expect(a.demolished).toBe(true)
    expect(a.addBuilding.basis).toBe('construction')
    expect(a.addBuilding.valueWon).toBe(construction)
    expect(a.afterWon).toBe(1_062_372_000 + construction)
  })

  it('T2: 기존 = (722.02 + 필로티 220.09) × 2,055,379 × exp(−0.011×8) ≈ 17.7억, 전 = 토지 1,777,075,300 + 기존', async () => {
    const a = runAll(await site(T2), 'ALL').asset
    expect(a.existingBuilding.ageYears).toBe(8)
    expect(a.existingBuilding.constructionAreaM2).toBeCloseTo(942.11, 2)
    expect(a.existingBuilding.valueWon).toBe(Math.round(Math.round(942.11 * UNIT) * Math.exp(-0.011 * 8)))
    expect(a.beforeWon).toBe(1_777_075_300 + a.existingBuilding.valueWon)
    expect(a.addBuilding.gfaM2).toBeCloseTo(120.2327, 4)
  })

  it('증축안이 없는 시나리오는 자산가치 후 = 전', async () => {
    const a = runAll(await site(T1), 'BASE').asset // T1 BASE: 주택 층수 한도로 '확인 필요'
    expect(a.addBuilding.gfaM2).toBe(0)
    expect(a.addBuilding.basis).toBe('none')
    expect(a.afterWon).toBe(a.beforeWon)
  })

  it('토지가액이 없으면 자산가치를 합산하지 않고, 공사비를 모르면 연면적 × 단가로 본다', () => {
    const land: LandValueResult = {
      basis: 'none', valueWon: null, lots: [], areaUsedM2: 0, siteAreaM2: null, areaDiffM2: null, priceBasis: null, reasons: [],
    }
    const a = calcAssetValue(
      { land, gfaM2: 100, pilotiAreaM2: 0, unitCostWon: UNIT, approvalDate: null, baseDate: '2026-10-07', addGfaM2: 10, addConstructionCostWon: null },
      buildingValueRule,
    )
    expect(a.existingBuilding.residualRate).toBe(0.1) // 사용승인일 없음 → 최저 잔가율
    expect(a.beforeWon).toBeNull()
    expect(a.addBuilding.basis).toBe('unitCost')
    expect(a.addBuilding.valueWon).toBe(10 * UNIT)
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

describe('calcCashflow — 자산가치 반영 (2026-10-12)', async () => {
  const { calcCashflow, calcAssetPathAt } = await import('@/lib/calc/finance')
  const growth = { buildingRate: 0.03, buildingBasis: '테스트', landRate: 0, landBasis: '테스트' }
  // 토지 10억, 기존 건물 공사면적 100㎡(경과 10년), 신축 단가 200만원/㎡, 감가 연 1.1%(지수형), 신축 건물가치 2억(재건축)
  const model = {
    landWon: 1_000_000_000,
    existingConstructionAreaM2: 100,
    existingAgeYears: 10,
    depreciationRatePerYear: 0.011,
    unitCostWon: 2_000_000,
    minResidualRate: 0.1,
    newBuildingValueWon: 200_000_000,
    demolishExisting: true,
    growth,
  }

  it('자산가치 경로: 0년차 = 토지 + 기존 건물(전) / 토지 + 신축 건물(후), 연차별 상승·지수 감가', () => {
    const p0 = calcAssetPathAt(model, 0)
    expect(p0.withoutWon).toBeCloseTo(1_000_000_000 + 100 * 2_000_000 * Math.exp(-0.11), 0)
    expect(p0.withWon).toBeCloseTo(1_000_000_000 + 200_000_000, 0)
    const p10 = calcAssetPathAt(model, 10)
    const idx = Math.pow(1.03, 10)
    expect(p10.withoutWon).toBeCloseTo(1_000_000_000 + 100 * 2_000_000 * idx * Math.exp(-0.011 * 20), 0) // 경과 20년
    expect(p10.withWon).toBeCloseTo(1_000_000_000 + 200_000_000 * idx * Math.exp(-0.011 * 10), 0) // 신축 10년차
  })

  it('자산가치 반영 회수: 총사업비 3억, NOI 증가 연 1천만원이면 임대수익만으로는 20년 안에 회수 불가, 신축 가치 8억이면 착공 직후부터 0 이상', () => {
    const c = calcCashflow({
      totalCostWon: 300_000_000,
      noiIncreaseWon: 10_000_000,
      existingNoiWon: 0,
      growthRate: 0,
      discountRate: 0.02,
      horizonYears: 20,
      assetModel: { ...model, existingAgeYears: 40, newBuildingValueWon: 800_000_000 },
    })
    expect(c.paybackYear).toBeNull() // 20년 누적 2억 < 3억
    const a = c.assetAdjusted!
    expect(a.paybackYear).toBe(0)
    expect(a.paybackYearsExact).toBe(0)
    // 순자산(함) − 순자산(안 함) = 자산가치 반영 순증
    for (const y of c.years) {
      expect(y.netWorthWithWon! - y.netWorthWithoutWon!).toBeCloseTo(y.assetAdjustedNetWon!, -1)
    }
  })

  it('회수 시점은 해 사이를 선형 보간하고, 토지가액이 없으면 자산가치 반영 지표는 null', () => {
    const c = calcCashflow({
      totalCostWon: 300_000_000,
      noiIncreaseWon: 50_000_000,
      existingNoiWon: 0,
      growthRate: 0,
      discountRate: null,
      horizonYears: 10,
      // 자산가치 차이 0 (기존 건물 유지, 증축분 없음, 상승 0, 감가 없음)
      assetModel: { ...model, growth: { ...growth, buildingRate: 0 }, demolishExisting: false, newBuildingValueWon: 0, depreciationRatePerYear: 0 },
    })
    const a = c.assetAdjusted!
    expect(a.paybackYear).toBe(6)
    expect(a.paybackYearsExact).toBeCloseTo(6, 6)
    expect(a.npvWon).toBeNull()
    expect(calcCashflow({ totalCostWon: 1, noiIncreaseWon: 1, existingNoiWon: 0, growthRate: 0, discountRate: 0, assetModel: { ...model, landWon: null } }).assetAdjusted).toBeNull()
  })
})
