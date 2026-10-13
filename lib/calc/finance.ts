// 수익성 계산 모듈 (순수 함수, 설계서 5-4)
// 구현: [0] 토지가액(공시지가 기준), [C'] 증축 전·후 자산가치(원가 기준), [C''] 자산가치(건물) 대비 수익률,
//       [A] 사업비·[B] 임대수익·[C] 지표 (calcSiteFinance, 2026-10-08 결정 1·2·6·12)
//       [D] 현금흐름·NPV·IRR (calcCashflow, 20년 기준 — cashflowRule, 2026-10-12) — 민감도는 sensitivity.ts

import { RELOCATION_MONTHS } from '@/lib/rules/projectSchedule'
import { PYEONG_M2, cashflowRule, costRule, type AssumptionKey, type BuildingValueRule, type LandValueRule } from '@/lib/rules/financeDefaults'
import type {
  AssetGrowthBasis,
  AssetValueResult,
  AssumptionRow,
  FinanceScenarioId,
  LandInclusiveYield,
  RentComp,
  SiteCashflow,
  SiteCashflowYear,
  SiteCostItem,
  SiteFinanceResult,
  SiteRentUnit,
  LandLotRow,
  LandPriceRow,
  LandValueLot,
  LandValueResult,
} from '@/types'
import { calcConversionRates, missingAssumptions, resolveAssumptions, summarizeRentComps } from './assumptions'

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
  /** 필로티 면적 (㎡) — 신축 공사비와 같은 기준(실공사면적)으로 기존 건물 재조달원가에 더한다. 없으면 0 */
  pilotiAreaM2: number
  /** 신축 단가 (원/㎡, 건물신축단가표). 없으면 null → 건물가치 계산 불가 */
  unitCostWon: number | null
  /** 사용승인일 (YYYY-MM-DD). 없으면 null */
  approvalDate: string | null
  /** 경과연수 기준일 (YYYY-MM-DD) */
  baseDate: string
  /** 증축 연면적 또는 신축 연면적 (㎡). 증축안이 없으면 0 */
  addGfaM2: number
  /** 증축·신축 공사비 (원) — 건물가치로 전액 인정. 아직 계산하지 못했으면 null → 연면적 × 신축 단가 */
  addConstructionCostWon: number | null
  /** true면 재건축: 기존 건물을 철거하므로 후 자산가치에 기존 건물가치를 넣지 않는다 */
  demolishExisting?: boolean
}

/** 잔가율 = max(최저 잔가율, exp(−연 감가율 × 경과연수)). 경과연수가 없으면 최저 잔가율 */
export function residualRateAt(
  ageYears: number | null,
  rule: { depreciationRatePerYear: number; minResidualRate: number },
): number {
  return ageYears === null ? rule.minResidualRate : Math.max(rule.minResidualRate, Math.exp(-rule.depreciationRatePerYear * ageYears))
}

/**
 * 증축 전·후 자산가치(원가 기준 참고값, 2026-10-12 개정)
 * 기존건물가치 = (연면적 + 필로티) × 신축 단가 × exp(−1.1% × 경과연수)
 * 증축(신축)건물가치 = 해당 공사의 공사비 전액 (증축은 증축 공사비, 재건축은 신축 공사비)
 * 자산가치(전) = 기존건물가치, 자산가치(후) = 기존건물가치 + 증축건물가치
 * 재건축(demolishExisting)이면 자산가치(후) = 신축건물가치
 * 토지가액은 증축·재건축 전후로 변하지 않아 자산가치 금액에서 제외한다 (2026-10-13 결정, 토지가액은 `land`에 따로 둔다)
 */
export function calcAssetValue(input: AssetValueInput, rule: BuildingValueRule): AssetValueResult {
  const unitCostWon = input.unitCostWon
  const ageYears = input.approvalDate ? Math.max(0, fullYearsBetween(input.approvalDate, input.baseDate)) : null
  // 사용승인일이 없으면 최저 잔가율로 보수적으로 본다
  const residualRate = residualRateAt(ageYears, rule)
  const constructionAreaM2 = input.gfaM2 + input.pilotiAreaM2
  const replacementCost = unitCostWon === null ? null : won(constructionAreaM2 * unitCostWon)
  const existingValue = replacementCost === null ? 0 : won(replacementCost * residualRate)
  const hasAdd = input.addGfaM2 > 0
  const addBasis: AssetValueResult['addBuilding']['basis'] = !hasAdd ? 'none' : input.addConstructionCostWon !== null ? 'construction' : 'unitCost'
  const addValue = !hasAdd
    ? 0
    : input.addConstructionCostWon !== null
      ? won(input.addConstructionCostWon)
      : unitCostWon === null
        ? 0
        : won(input.addGfaM2 * unitCostWon)
  const reasons = [
    ageYears === null
      ? `사용승인일이 없어 잔가율을 최저 ${rule.minResidualRate * 100}%로 보았습니다.`
      : `경과 ${ageYears}년 · 연 ${(rule.depreciationRatePerYear * 100).toFixed(1)}% 감가(지수형) → 잔가율 ${Math.round(residualRate * 1000) / 10}%`,
    '건물가치는 신축단가표 단가 기준 원가 추정(예시 가정값)이며 감정평가가 아닙니다.',
  ]
  if (unitCostWon === null) reasons.push('신축 단가(건물신축단가표)가 없어 기존 건물가치를 계산하지 못했습니다.')
  if (addBasis === 'unitCost') reasons.push('공사비를 계산하지 못해 증축(신축) 건물가치를 연면적 × 신축 단가로 보았습니다.')
  const demolished = input.demolishExisting ?? false
  if (demolished) reasons.push('재건축: 기존 건물을 철거하므로 후 자산가치 = 신축 건물가치입니다 (철거비는 신축 공사비에 포함).')
  return {
    land: input.land,
    existingBuilding: {
      gfaM2: input.gfaM2,
      pilotiAreaM2: input.pilotiAreaM2,
      constructionAreaM2,
      unitCostWon,
      ageYears,
      depreciationRatePerYear: rule.depreciationRatePerYear,
      residualRate,
      replacementCostWon: replacementCost,
      valueWon: existingValue,
    },
    addBuilding: { gfaM2: input.addGfaM2, valueWon: addValue, basis: addBasis },
    beforeWon: unitCostWon === null ? null : existingValue,
    afterWon: unitCostWon === null ? null : (demolished ? 0 : existingValue) + addValue,
    demolished,
    baseDate: input.baseDate,
    reasons,
  }
}

/**
 * 자산가치(건물가치) 대비 수익률 — 참고 지표 (2026-10-13: 토지가액 제외, 건물가치만 기준).
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

// ── [A] 사업비 · [B] 임대수익 · [C] 지표 ─────────────────────────────────

export interface SiteFinanceInput {
  /** expansion = 기존 건물 위 증축 / rebuild = 철거 후 신축 */
  kind: 'expansion' | 'rebuild'
  /** 증축(신축) 연면적 (㎡, 용적률 기준). 증축안이 없으면 0 */
  gfaM2: number
  /** 공사 연면적 (㎡) — 재건축은 1층 필로티 포함. 증축은 세대로 확보되는 면적만(기존 세대 확장분 제외) */
  constructionAreaM2: number
  /** 새 세대 전용면적 (㎡) */
  newUnitNets: number[]
  /** 기존 주택 세대 전용면적 (㎡) — 기존 NOI 추정용 (임대 사례로 추정) */
  existingUnitNets: number[]
  assumptionRows: AssumptionRow[]
  rentComps: RentComp[]
  scenario: FinanceScenarioId
  /** 증축 전 자산가치 (원, 건물가치만 — 자산가치 대비 수익률용). 없으면 null */
  assetBeforeWon: number | null
  userInput?: Partial<Record<AssumptionKey, number>>
  /** 임대료 배수 (민감도용, 기본 1) — 모든 세대 월 환산 임대료에 곱한다 */
  rentFactor?: number
  /** 측면 보강부 전용면적 (㎡) — 세대 수에는 넣지 않고 임대수입에만 더한다 (같은 평당 임대료). 없으면 0 */
  extraNetM2?: number
  /** 자산가치 연차별 경로 입력 (20년 현금흐름의 자산가치 반영). 신축·증축 건물가치는 이 계산의 공사비로 채운다. 없으면 자산가치 반영 지표 생략 */
  assetModel?: Omit<AssetModelInput, 'newBuildingValueWon'> | null
}

const wonR = (v: number) => Math.round(v)
const fmtWon = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`
const fmtPct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`

/**
 * 임대 모델 수익성 (대표 1인 사업주체)
 * 증축 사업비 = 공사비(세대 연면적 ÷ 3.305785 × 평당 단가, 기존 세대 확장분 제외) + 세대당 제반비용(공사비 × 5%) + 취득세 등 + 금융비용 (예비비 미합산)
 * 재건축 사업비 = 공사비(공사 연면적 × max(신축단가표, 엑셀 신축비용)) + 제반비용(공사비 × 5%) + 취득세 등 + 공사 중 임대 손실 + 금융비용 (예비비 미합산)
 * 임대수입 = Σ 세대 월 환산 임대료 × 12, 월 환산 = 고정분 + 평당 증가분 × 전용(평) (신규 월세 실거래 회귀, 보증금은 전환율로 월세 환산)
 * NOI = 임대수입 × (1 − 공실률) × (1 − 운영비율), 재건축은 기존 세대 NOI(추정)를 뺀 증가분
 */
export function calcSiteFinance(input: SiteFinanceInput): SiteFinanceResult {
  const { kind, gfaM2, constructionAreaM2, newUnitNets, existingUnitNets, scenario } = input
  const a = resolveAssumptions(input.assumptionRows, scenario, input.userInput)
  const conversion = calcConversionRates(a, scenario)
  const rentBands = summarizeRentComps(input.rentComps, conversion.housing.applied)
  const notes: string[] = []
  const v = (k: AssumptionKey) => a[k].value

  // 전용면적 구간 없음 — 사례 회귀직선: 월 환산 임대료 = 고정분(세대당) + 평당 증가분 × 전용(평) (2026-10-12)
  const band = rentBands[0]
  const rentFactor = input.rentFactor ?? 1
  const fitted = band.equivalentBaseWon !== null && band.equivalentPerPyeongWon !== null
  const rentUnit = (net: number): SiteRentUnit => {
    const py = net / PYEONG_M2
    const at = (base: number | null, per: number | null) => (base === null || per === null ? null : Math.max(0, base + per * py))
    return {
      netAreaM2: net,
      netAreaPyeong: py,
      monthlyEquivalentWon: fitted ? Math.max(0, band.equivalentBaseWon! + band.equivalentPerPyeongWon! * py) * rentFactor : null,
      depositWon: at(band.depositBaseWon, band.depositPerPyeongWon),
      monthlyWon: at(band.monthlyBaseWon, band.monthlyPerPyeongWon),
      extrapolated: band.fitMaxPyeong !== null && py > band.fitMaxPyeong,
    }
  }
  const units = newUnitNets.map(rentUnit)
  // 측면 보강부는 새 세대가 아니라 기존 세대 확장분 — 세대 고정분 없이 평당 증가분만 더한다
  const extraNet = input.extraNetM2 ?? 0
  const sideRentMonthly = extraNet > 0 && fitted ? (extraNet / PYEONG_M2) * band.equivalentPerPyeongWon! * rentFactor : null

  const empty = {
    project: { kind, gfaM2, constructionAreaM2, units, sideNetM2: extraNet, sideRentMonthlyWon: sideRentMonthly },
    costs: [],
    totalCostWon: null,
    loanWon: null,
    equityWon: null,
    revenue: {
      grossAnnualWon: null,
      maintenanceWon: null,
      vacancyLossWon: null,
      opexWon: null,
      existingGrossAnnualWon: null,
      existingMaintenanceWon: null,
      existingVacancyLossWon: null,
      noiWon: null,
      existingNoiWon: null,
      noiIncreaseWon: null,
      depositTotalWon: null,
    },
    metrics: { roi: null, paybackYears: null, roe: null, valueIncreaseWon: null, netValueIncreaseWon: null },
    landInclusiveYield: null,
    cashflow: null,
    conversion,
    rentBands,
    assumptions: Object.values(a),
  }
  if (gfaM2 <= 0 || newUnitNets.length === 0) {
    return { ...empty, scenario, status: 'none', missing: [], notes: ['증축(재건축)안이 없어 수익성 계산을 생략했습니다.'] }
  }

  // 필수 가정값 + 이 사업에 필요한 값
  const missing = missingAssumptions(a).map((k) => a[k].label)
  const newBuildCost = Math.max(v('newBuildCostTable') ?? -Infinity, v('newBuildCostExcel') ?? -Infinity)
  if (kind === 'rebuild' && !Number.isFinite(newBuildCost)) missing.push('신축 단가 (건물신축단가표 또는 엑셀 신축비용)')
  if (conversion.housing.applied === null) missing.push('주택 전월세 전환율')
  if (!fitted) missing.push(`임대 사례 (${band.label})`)
  if (missing.length > 0) {
    return { ...empty, scenario, status: 'pending', missing, notes: [`입력 대기: ${missing.join(', ')}`] }
  }

  // [A] 사업비
  // 공사 기간: 층별·면적별 실적(2026-10-12) — 증축 = 증축 층수 × 층당, 재건축 = 지상 층수·연면적대 중앙값
  const months = v(kind === 'rebuild' ? 'rebuildConstructionMonths' : 'constructionMonths')!
  const costs: SiteCostItem[] = []
  if (kind === 'expansion') {
    const perPyeong = v('expansionCostPerPyeong')!
    costs.push({
      key: 'construction',
      label: '증축 공사비',
      amountWon: wonR((constructionAreaM2 / PYEONG_M2) * perPyeong),
      basis: `세대 면적 ${constructionAreaM2.toFixed(2)}㎡ ÷ ${PYEONG_M2}㎡/평 × ${fmtWon(perPyeong)}/평`,
      grade: a.expansionCostPerPyeong.grade,
    })
  } else {
    const fromTable = v('newBuildCostTable')
    const fromExcel = v('newBuildCostExcel')
    const useExcel = fromExcel !== null && (fromTable === null || fromExcel > fromTable)
    const usedRow = useExcel ? a.newBuildCostExcel : a.newBuildCostTable
    const compare =
      fromTable !== null && fromExcel !== null
        ? `건물신축단가표 ${fmtWon(fromTable)}/㎡ vs 엑셀 신축비용 ${fmtWon(fromExcel)}/㎡ 중 높은 값`
        : `${useExcel ? '엑셀 신축비용' : '건물신축단가표'} (비교할 ${useExcel ? '건물신축단가표' : '엑셀 신축비용'} 입력 대기)`
    costs.push({
      key: 'construction',
      label: '신축 공사비',
      amountWon: wonR(constructionAreaM2 * newBuildCost),
      basis: `공사 연면적 ${constructionAreaM2.toFixed(2)}㎡(필로티 포함) × ${fmtWon(newBuildCost)}/㎡ — ${compare}${usedRow.sourceText ? ` · ${usedRow.sourceText}` : ''} · 철거비 포함`,
      grade: usedRow.grade,
    })
  }
  const construction = costs[0].amountWon!
  // 인허가 등 제반비용 = 공사비의 5% (증축·재건축 공통, 2026-10-13 결정)
  const permitRate = costRule.permitRateOfConstruction
  costs.push({
    key: 'permit',
    label: '인허가 등 제반비용',
    amountWon: wonR(construction * permitRate),
    basis: `${kind === 'rebuild' ? '신축' : '증축'} 공사비 × ${fmtPct(permitRate, 1)}`,
    grade: 'C',
  })
  const taxRate = v('acquisitionTaxRate')!
  costs.push({
    key: 'tax',
    label: '취득세 등',
    amountWon: wonR(construction * taxRate),
    basis: `공사비 × ${fmtPct(taxRate)} (원시취득, 과세표준 = 공사비 가정)`,
    grade: a.acquisitionTaxRate.grade,
  })
  if (kind === 'rebuild') {
    // 재건축: 이주·철거 + 공사 기간 동안 기존 세대의 임대수입이 끊긴다 (2026-10-12 결정)
    const existingMonthly = existingUnitNets.map(rentUnit).reduce((s2, u) => s2 + (u.monthlyEquivalentWon ?? 0), 0)
    const maintRate0 = v('maintenanceFeePerUnit') ?? 0
    const vacancy0 = v('vacancyRate')!
    const lossMonths = RELOCATION_MONTHS + months
    const monthlyIncome = existingMonthly * (1 + maintRate0) * (1 - vacancy0)
    costs.push({
      key: 'constructionLoss',
      label: '공사 중 임대 손실',
      amountWon: wonR(monthlyIncome * lossMonths),
      basis: `기존 ${existingUnitNets.length}세대 월 임대수입 ${fmtWon(monthlyIncome)}(관리비 포함, 공실 ${fmtPct(vacancy0, 1)} 반영, 추정) × (이주·철거 ${RELOCATION_MONTHS}개월 + 공사 ${months}개월)`,
      grade: 'C',
    })
  } else {
    costs.push({
      key: 'constructionLoss',
      label: '공사 중 임대 손실',
      amountWon: null,
      basis: '미반영 — 기존 세대 임대 조건(건축주 자료) 입력 대기',
      grade: null,
    })
  }
  const subtotal = costs.reduce((s, c) => s + (c.amountWon ?? 0), 0)
  // 예비비는 총사업비에 합산하지 않는다 (2026-10-13 결정, costRule.contingencyIncluded)
  const beforeFinance = subtotal
  const loan = wonR(beforeFinance * v('loanRatio')!)
  const rate = v('loanInterestRate')!
  const finance = wonR(loan * rate * (months / 12) * 0.5)
  costs.push({
    key: 'finance',
    label: '금융비용 (공사 기간)',
    amountWon: finance,
    basis: `대출 ${fmtWon(loan)} × ${fmtPct(rate)} × ${months}/12개월 × 0.5 (평균 잔액)`,
    grade: a.loanInterestRate.grade,
  })
  const totalCost = beforeFinance + finance
  const equity = totalCost - loan

  // [B] 임대수익
  const vacancy = v('vacancyRate')!
  // 재건축 보고서는 운영비를 반영하지 않는다 (2026-10-12 결정) — 증축은 가정값 그대로
  const opexRate = kind === 'rebuild' ? 0 : v('opexRate')!
  // 관리비 수입 = 월 환산 임대료 × 비율 (2026-10-08 결정, 없으면 0)
  const maintRate = v('maintenanceFeePerUnit') ?? 0
  const withMaint = (rent: number) => rent * (1 + maintRate)
  const noiOf = (rent: number) => withMaint(rent) * (1 - vacancy) * (1 - opexRate)
  const rentAnnual = units.reduce((s, u) => s + u.monthlyEquivalentWon! * 12, 0) + (sideRentMonthly ?? 0) * 12
  const maintenance = rentAnnual * maintRate
  const gross = rentAnnual + maintenance
  const vacancyLoss = gross * vacancy
  const opex = (gross - vacancyLoss) * opexRate
  const noi = noiOf(rentAnnual)
  const existingRent = existingUnitNets.map(rentUnit).reduce((s, u) => s + (u.monthlyEquivalentWon ?? 0) * 12, 0)
  const existingNoi = existingUnitNets.length ? noiOf(existingRent) : null
  const existingMaintenance = existingRent * maintRate
  const existingVacancyLoss = (existingRent + existingMaintenance) * vacancy
  const noiIncrease = kind === 'rebuild' ? noi - (existingNoi ?? 0) : noi
  const deposits = units.reduce((s, u) => s + (u.depositWon ?? 0), 0)
  notes.push(
    `임대수입 = Σ 세대 월 환산 임대료 × 12, 월 환산 = ${(band.equivalentBaseWon! / 1e4).toFixed(1)}만원 + ${(band.equivalentPerPyeongWon! / 1e4).toFixed(1)}만원 × 전용(평) (신규 월세 실거래 ${band.fitCount}건 회귀, 월세 + 보증금 × 전환율 ${fmtPct(conversion.housing.applied!)} ÷ 12, 전용면적 구간 구분 없음) — ${conversion.housing.basis}`,
  )
  notes.push(
    v('maintenanceFeePerUnit') === null
      ? '관리비는 자료가 없어 임대수입에 넣지 않았습니다 (입력 대기).'
      : `관리비 수입 = 월 환산 임대료 × ${fmtPct(maintRate, 1)} (가정값 입력)`,
  )
  if (units.some((u) => u.extrapolated)) {
    notes.push(`전용 ${band.fitMaxPyeong}평을 넘는 세대는 회귀식을 외삽한 값입니다 (표본의 ${band.fitMaxPyeong}평 초과 사례는 평당 단가가 낮아 과대 추정일 수 있음).`)
  }
  if (extraNet > 0) {
    notes.push(`측면 보강부 전용 ${extraNet.toFixed(2)}㎡는 세대 수·세대 고정분 없이 평당 증가분(${(band.equivalentPerPyeongWon! / 1e4).toFixed(1)}만원/평)만 임대수입에 더했습니다 (기존 세대 확장분 가정).`)
  }
  if (existingNoi !== null) notes.push('기존 세대 NOI는 같은 임대 사례로 추정한 값입니다 (실제 임대 조건 아님).')
  if (band.fitMaxPyeong !== null && existingUnitNets.some((n) => n / PYEONG_M2 > band.fitMaxPyeong!)) {
    const n = existingUnitNets.filter((x) => x / PYEONG_M2 > band.fitMaxPyeong!).length
    notes.push(`기존 세대 ${n}호는 전용 ${band.fitMaxPyeong}평을 넘어 회귀식을 외삽해 기존 NOI를 추정했습니다 (큰 평형은 평당 단가가 낮아 과대 추정일 수 있음).`)
  }
  if (kind === 'rebuild') {
    notes.push('재건축 NOI 증가 = 신축 세대 NOI − 철거되는 기존 세대 NOI(추정).')
    notes.push('재건축 보고서는 운영비를 반영하지 않았습니다 (NOI = 임대수입 + 관리비 − 공실 손실).')
  }

  // [C] 지표
  const interest = loan * rate
  const capRate = v('capRate')!
  const valueIncrease = noiIncrease / capRate
  const assetBefore = input.assetBeforeWon
  return {
    scenario,
    status: 'ok',
    missing: [],
    project: { kind, gfaM2, constructionAreaM2, units, sideNetM2: extraNet, sideRentMonthlyWon: sideRentMonthly },
    costs,
    totalCostWon: totalCost,
    loanWon: loan,
    equityWon: equity,
    revenue: {
      grossAnnualWon: wonR(rentAnnual),
      maintenanceWon: wonR(maintenance),
      vacancyLossWon: wonR(vacancyLoss),
      opexWon: wonR(opex),
      existingGrossAnnualWon: existingUnitNets.length ? wonR(existingRent) : null,
      existingMaintenanceWon: existingUnitNets.length ? wonR(existingMaintenance) : null,
      existingVacancyLossWon: existingUnitNets.length ? wonR(existingVacancyLoss) : null,
      noiWon: wonR(noi),
      existingNoiWon: existingNoi === null ? null : wonR(existingNoi),
      noiIncreaseWon: wonR(noiIncrease),
      depositTotalWon: wonR(deposits),
    },
    metrics: {
      roi: noiIncrease / totalCost,
      paybackYears: noiIncrease > 0 ? totalCost / noiIncrease : null,
      roe: equity > 0 ? (noiIncrease - interest) / equity : null,
      valueIncreaseWon: wonR(valueIncrease),
      netValueIncreaseWon: wonR(valueIncrease - totalCost),
    },
    landInclusiveYield:
      assetBefore !== null && existingNoi !== null
        ? calcLandInclusiveYield({
            existingNoiWon: existingNoi,
            noiIncreaseWon: noiIncrease,
            assetBeforeWon: assetBefore,
            totalCostWon: totalCost,
          })
        : null,
    cashflow: calcCashflow({
      totalCostWon: totalCost,
      noiIncreaseWon: noiIncrease,
      existingNoiWon: existingNoi,
      growthRate: v('rentGrowthRate'),
      discountRate: v('discountRate'),
      // 신축·증축 건물가치 = 이 시나리오의 공사비 전액 (재건축은 신축 공사비, 증축은 증축 공사비)
      assetModel: input.assetModel ? { ...input.assetModel, newBuildingValueWon: construction } : null,
    }),
    conversion,
    rentBands,
    assumptions: Object.values(a),
    notes,
  }
}

// ── [D] 10년 현금흐름 · NPV · IRR ───────────────────────────────────────

export interface AssetModelInput {
  /** 기존 건물 공사 연면적 = 연면적 + 필로티 (㎡) */
  existingConstructionAreaM2: number
  /** 사용승인 후 경과연수 (년, 현재). 없으면 최저 잔가율 */
  existingAgeYears: number | null
  /** 연 감가율 (소수) — 잔가율 = exp(−감가율 × 경과연수) */
  depreciationRatePerYear: number
  /** 신축 단가 (원/㎡, 현재) */
  unitCostWon: number
  minResidualRate: number
  /** 증축·신축 건물가치 (원, 현재) = 그 공사의 공사비 전액. 증축(신축)안이 없으면 0 */
  newBuildingValueWon: number
  /** true면 재건축 — 기존 건물을 철거 */
  demolishExisting: boolean
  growth: AssetGrowthBasis
}

/**
 * t년 뒤 자산가치 (원, 건물만 — 토지가액은 전후 동일해 제외). 건물 = 현재 가치 × (1+건물 상승률)^t × 잔가율(경과연수 + t)
 * 기존 건물은 재조달원가(현재)에서, 증축·신축분은 준공 직후 공사비에서 출발해 같은 지수·감가를 적용한다.
 */
export function calcAssetPathAt(m: AssetModelInput, t: number): { withoutWon: number; withWon: number } {
  const index = Math.pow(1 + m.growth.buildingRate, t)
  const residual = (age: number | null) =>
    residualRateAt(age, { depreciationRatePerYear: m.depreciationRatePerYear, minResidualRate: m.minResidualRate })
  const existing =
    m.existingConstructionAreaM2 * m.unitCostWon * index * residual(m.existingAgeYears === null ? null : m.existingAgeYears + t)
  const added = m.newBuildingValueWon * index * residual(t)
  return { withoutWon: existing, withWon: (m.demolishExisting ? 0 : existing) + added }
}

export interface CashflowInput {
  totalCostWon: number
  /** 1년차 NOI 증가 (원) */
  noiIncreaseWon: number
  /** 기존 세대 NOI 추정 (원). 없으면 null → "안 함" 0 */
  existingNoiWon: number | null
  /** 임대료 상승률 (소수). null이면 0 */
  growthRate: number | null
  /** 할인율 (소수). null이면 NPV 계산 안 함 */
  discountRate: number | null
  /** 기간 (년, 기본 cashflowRule.years = 20) */
  horizonYears?: number
  /** 자산가치 경로 입력. 없으면 자산가치 반영 지표는 null */
  assetModel?: AssetModelInput | null
}

/**
 * 10년 현금흐름 — 총사업비는 0년차(착공 전)에 한 번 지출, NOI 증가는 1년차부터 매년 상승률만큼 증가.
 * 단순 지표(누적 순증·NPV·IRR)는 기간 말 잔존가치와 공사 중 임대 손실을 반영하지 않는다 (보수적 단순화).
 * 안 함 = 기존 NOI 누적(추정), 함 = 기존 NOI 누적 + (−총사업비 + NOI 증가 누적).
 * assetModel이 있으면 자산가치 증가분(원가 기준, 상승률·감가 반영)을 더한 순자산·회수 연차·NPV·IRR을 assetAdjusted로 함께 계산한다.
 */
export function calcCashflow(input: CashflowInput): SiteCashflow {
  const horizon = input.horizonYears ?? cashflowRule.years
  const g = input.growthRate ?? 0
  const years: SiteCashflowYear[] = []
  let incCum = 0
  let existCum = 0
  let paybackYear: number | null = null
  const flows: number[] = [-input.totalCostWon]
  const am = input.assetModel ?? null
  // 자산가치 반영 순증 = (함 자산 − 안 함 자산) + NOI 증가 누적 − 총사업비. 0년차 = 착공 직후 자산가치 차이 − 총사업비
  const adj: number[] = []
  if (am) {
    const p0 = calcAssetPathAt(am, 0)
    adj.push(p0.withWon - p0.withoutWon - input.totalCostWon)
  }
  for (let t = 1; t <= horizon; t++) {
    const growth = Math.pow(1 + g, t - 1)
    const inc = input.noiIncreaseWon * growth
    incCum += inc
    existCum += (input.existingNoiWon ?? 0) * growth
    const net = incCum - input.totalCostWon
    if (paybackYear === null && net >= -1e-6) paybackYear = t
    flows.push(inc)
    let asset: Pick<SiteCashflowYear, 'assetWithoutWon' | 'assetWithWon' | 'netWorthWithoutWon' | 'netWorthWithWon' | 'assetAdjustedNetWon'> = {
      assetWithoutWon: null,
      assetWithWon: null,
      netWorthWithoutWon: null,
      netWorthWithWon: null,
      assetAdjustedNetWon: null,
    }
    if (am) {
      const p = calcAssetPathAt(am, t)
      const assetWithout = wonR(p.withoutWon)
      const assetWith = wonR(p.withWon)
      const adjusted = p.withWon - p.withoutWon + incCum - input.totalCostWon
      adj.push(adjusted)
      asset = {
        assetWithoutWon: assetWithout,
        assetWithWon: assetWith,
        netWorthWithoutWon: assetWithout + wonR(existCum),
        // 순자산(함) = 함 자산 + 기존 NOI 누적 + 순증 누적(총사업비 차감) — 안 함과의 차이가 자산가치 반영 순증이 된다
        netWorthWithWon: assetWith + wonR(existCum) + wonR(net),
        assetAdjustedNetWon: wonR(adjusted),
      }
    }
    years.push({
      year: t,
      noiIncreaseWon: wonR(inc),
      cumulativeNetWon: wonR(net),
      withoutWon: wonR(existCum),
      // 표에서 안 함 + 순증 = 함이 1원 단위까지 맞도록 반올림한 값끼리 더한다
      withWon: wonR(existCum) + wonR(net),
      ...asset,
    })
  }
  const npvAt = (r: number) => flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0)

  let assetAdjusted: SiteCashflow['assetAdjusted'] = null
  if (am) {
    // 회수 시점: 0년차(착공 직후)부터 0 이상이면 0, 아니면 처음 0 이상이 되는 해 (해 사이는 선형 보간)
    const idx = adj.findIndex((x) => x >= -1e-6)
    let exact: number | null = null
    if (idx === 0) exact = 0
    else if (idx > 0) {
      const lo = adj[idx - 1]
      const hi = adj[idx]
      exact = idx - 1 + (hi === lo ? 1 : -lo / (hi - lo))
    }
    const end = calcAssetPathAt(am, horizon)
    const terminalDiff = end.withWon - end.withoutWon
    // NPV·IRR: 기간 말에 자산가치 차이를 회수한다고 보고 마지막 해 현금흐름에 더한다 (원가 기준 참고값)
    const flowsAsset = flows.map((x, t) => (t === horizon ? x + terminalDiff : x))
    const npvAssetAt = (r: number) => flowsAsset.reduce((s, x, t) => s + x / Math.pow(1 + r, t), 0)
    assetAdjusted = {
      paybackYear: idx < 0 ? null : idx,
      paybackYearsExact: exact,
      cumulativeNetWon: wonR(adj[adj.length - 1]),
      npvWon: input.discountRate === null ? null : wonR(npvAssetAt(input.discountRate)),
      irr: solveIrr(npvAssetAt),
      terminalAssetDiffWon: wonR(terminalDiff),
      growth: am.growth,
    }
  }
  return {
    years,
    growthRate: input.growthRate,
    discountRate: input.discountRate,
    npvWon: input.discountRate === null ? null : wonR(npvAt(input.discountRate)),
    irr: solveIrr(npvAt),
    paybackYear,
    cumulativeNetWon: years[years.length - 1].cumulativeNetWon,
    existingNoiMissing: input.existingNoiWon === null,
    assetAdjusted,
  }
}

/** NPV(r)가 r에 대해 감소하는 구간 [−90%, 1000%]에서 이분법. 해가 없으면 null */
function solveIrr(npvAt: (r: number) => number): number | null {
  let lo = -0.9
  let hi = 10
  if (npvAt(lo) < 0 || npvAt(hi) > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (npvAt(mid) > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
