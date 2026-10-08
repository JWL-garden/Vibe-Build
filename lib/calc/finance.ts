// 수익성 계산 모듈 (순수 함수, 설계서 5-4)
// 구현: [0] 토지가액(공시지가 기준), [C'] 증축 전·후 자산가치(원가 기준), [C''] 토지 포함 수익률,
//       [A] 사업비·[B] 임대수익·[C] 지표 (calcSiteFinance, 2026-10-08 결정 1·2·6·12)
// TODO (P1): [D] 10년 현금흐름·NPV·IRR, 민감도

import { PYEONG_M2, rentCompRule, type AssumptionKey, type BuildingValueRule, type LandValueRule } from '@/lib/rules/financeDefaults'
import type {
  AssetValueResult,
  AssumptionRow,
  FinanceScenarioId,
  LandInclusiveYield,
  RentComp,
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
  /** 구조 (예: '철근콘크리트구조') */
  structure: string
  /** 사용승인일 (YYYY-MM-DD). 없으면 null */
  approvalDate: string | null
  /** 경과연수 기준일 (YYYY-MM-DD) */
  baseDate: string
  /** 증축 연면적 (㎡). 증축안이 없으면 0. 재건축이면 신축 연면적 */
  addGfaM2: number
  /** true면 재건축: 기존 건물을 철거하므로 후 자산가치에 기존 건물가치를 넣지 않는다 */
  demolishExisting?: boolean
}

/**
 * 증축 전·후 자산가치(원가 기준 참고값)
 * 기존건물가치 = 연면적 × 재조달단가 × 잔가율, 증축건물가치 = 증축 연면적 × 재조달단가
 * 자산가치(전) = 토지가액 + 기존건물가치, 자산가치(후) = 자산가치(전) + 증축건물가치
 * 재건축(demolishExisting)이면 자산가치(후) = 토지가액 + 신축건물가치
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
  const demolished = input.demolishExisting ?? false
  if (demolished) reasons.push('재건축: 기존 건물을 철거하므로 후 자산가치 = 토지가액 + 신축 건물가치입니다 (철거비는 사업비에서 반영 예정).')
  return {
    land: input.land,
    existingBuilding: { gfaM2: input.gfaM2, unitCostWon, ageYears, usefulLifeYears, residualRate, valueWon: existingValue },
    addBuilding: { gfaM2: input.addGfaM2, valueWon: addValue },
    beforeWon: land === null ? null : land + existingValue,
    afterWon: land === null ? null : land + (demolished ? 0 : existingValue) + addValue,
    demolished,
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

// ── [A] 사업비 · [B] 임대수익 · [C] 지표 ─────────────────────────────────

export interface SiteFinanceInput {
  /** expansion = 기존 건물 위 증축 / rebuild = 철거 후 신축 */
  kind: 'expansion' | 'rebuild'
  /** 증축(신축) 연면적 (㎡, 용적률 기준). 증축안이 없으면 0 */
  gfaM2: number
  /** 공사 연면적 (㎡) — 재건축은 1층 필로티 포함 */
  constructionAreaM2: number
  /** 새 세대 전용면적 (㎡) */
  newUnitNets: number[]
  /** 기존 주택 세대 전용면적 (㎡) — 기존 NOI 추정용 (임대 사례로 추정) */
  existingUnitNets: number[]
  assumptionRows: AssumptionRow[]
  rentComps: RentComp[]
  scenario: FinanceScenarioId
  /** 증축 전 자산가치 (원, 토지 포함 수익률용). 없으면 null */
  assetBeforeWon: number | null
  userInput?: Partial<Record<AssumptionKey, number>>
}

const wonR = (v: number) => Math.round(v)
const fmtWon = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`
const fmtPct = (v: number, d = 2) => `${(v * 100).toFixed(d)}%`

/**
 * 임대 모델 수익성 (대표 1인 사업주체)
 * 증축 사업비 = 공사비(연면적 ÷ 3.305785 × 평당 단가) + 세대당 제반비용 + 취득세 등 + 예비비 + 금융비용
 * 재건축 사업비 = 공사비(공사 연면적 × max(신축단가표, 엑셀 신축비용)) + 세대당 제반비용(증축 기준 준용) + 취득세 등 + 예비비 + 금융비용
 * 임대수입 = Σ 세대 전용 × ㎡당 월 환산 임대료(신규 실거래 중위, 보증금은 전환율로 월세 환산) × 12
 * NOI = 임대수입 × (1 − 공실률) × (1 − 운영비율), 재건축은 기존 세대 NOI(추정)를 뺀 증가분
 */
export function calcSiteFinance(input: SiteFinanceInput): SiteFinanceResult {
  const { kind, gfaM2, constructionAreaM2, newUnitNets, existingUnitNets, scenario } = input
  const a = resolveAssumptions(input.assumptionRows, scenario, input.userInput)
  const conversion = calcConversionRates(a, scenario)
  const rentBands = summarizeRentComps(input.rentComps, conversion.housing.applied)
  const notes: string[] = []
  const v = (k: AssumptionKey) => a[k].value

  const bandOf = (net: number): 'S' | 'M' => (net <= rentCompRule.bands[0].maxNetM2 ? 'S' : 'M')
  const rentUnit = (net: number): SiteRentUnit => {
    const b = rentBands.find((x) => x.band === bandOf(net))!
    return {
      netAreaM2: net,
      band: b.band,
      monthlyEquivalentWon: b.monthlyEquivalentPerM2 === null ? null : b.monthlyEquivalentPerM2 * net,
      depositWon: b.depositWon,
      monthlyWon: b.monthlyWon,
    }
  }
  const units = newUnitNets.map(rentUnit)
  if (newUnitNets.some((n) => n > rentCompRule.bands[1].maxNetM2)) notes.push('전용 60㎡ 초과 세대는 30~60㎡ 사례로 추정했습니다.')

  const empty = {
    project: { kind, gfaM2, constructionAreaM2, units },
    costs: [],
    totalCostWon: null,
    loanWon: null,
    equityWon: null,
    revenue: {
      grossAnnualWon: null,
      vacancyLossWon: null,
      opexWon: null,
      noiWon: null,
      existingNoiWon: null,
      noiIncreaseWon: null,
      depositTotalWon: null,
    },
    metrics: { roi: null, paybackYears: null, roe: null, valueIncreaseWon: null, netValueIncreaseWon: null },
    landInclusiveYield: null,
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
  for (const b of rentBands.filter((x) => units.some((u) => u.band === x.band) && x.monthlyEquivalentPerM2 === null)) {
    missing.push(`임대 사례 (${b.label})`)
  }
  if (missing.length > 0) {
    return { ...empty, scenario, status: 'pending', missing, notes: [`입력 대기: ${missing.join(', ')}`] }
  }

  // [A] 사업비
  const n = newUnitNets.length
  const costs: SiteCostItem[] = []
  if (kind === 'expansion') {
    const perPyeong = v('expansionCostPerPyeong')!
    costs.push({
      key: 'construction',
      label: '증축 공사비',
      amountWon: wonR((constructionAreaM2 / PYEONG_M2) * perPyeong),
      basis: `${constructionAreaM2.toFixed(2)}㎡ ÷ ${PYEONG_M2}㎡/평 × ${fmtWon(perPyeong)}/평`,
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
      basis: `공사 연면적 ${constructionAreaM2.toFixed(2)}㎡(필로티 포함) × ${fmtWon(newBuildCost)}/㎡ — ${compare}${usedRow.sourceText ? ` · ${usedRow.sourceText}` : ''}`,
      grade: usedRow.grade,
    })
    costs.push({ key: 'demolition', label: '철거비', amountWon: null, basis: '미반영 — 철거비 가정값 입력 대기', grade: null })
  }
  const perUnit = v('expansionCostPerUnit')!
  costs.push({
    key: 'permit',
    label: '인허가 등 제반비용',
    amountWon: wonR(n * perUnit),
    basis: `${n}세대 × ${fmtWon(perUnit)}${kind === 'rebuild' ? ' (증축 기준 준용)' : ''}`,
    grade: a.expansionCostPerUnit.grade,
  })
  const construction = costs[0].amountWon!
  const taxRate = v('acquisitionTaxRate')!
  costs.push({
    key: 'tax',
    label: '취득세 등',
    amountWon: wonR(construction * taxRate),
    basis: `공사비 × ${fmtPct(taxRate)} (원시취득, 과세표준 = 공사비 가정)`,
    grade: a.acquisitionTaxRate.grade,
  })
  costs.push({
    key: 'constructionLoss',
    label: '공사 중 임대 손실',
    amountWon: null,
    basis: '미반영 — 기존 세대 임대 조건(건축주 자료) 입력 대기',
    grade: null,
  })
  const subtotal = costs.reduce((s, c) => s + (c.amountWon ?? 0), 0)
  const contingencyRate = v('contingencyRate')!
  const contingency = wonR(subtotal * contingencyRate)
  costs.push({
    key: 'contingency',
    label: '예비비',
    amountWon: contingency,
    basis: `소계 × ${fmtPct(contingencyRate, 1)}`,
    grade: a.contingencyRate.grade,
  })
  const beforeFinance = subtotal + contingency
  const loan = wonR(beforeFinance * v('loanRatio')!)
  const rate = v('loanInterestRate')!
  // 공사 기간: 증축(상부 건식 조립식) / 재건축(철거 후 신축) — 2026-10-08 결정
  const months = v(kind === 'rebuild' ? 'rebuildConstructionMonths' : 'constructionMonths')!
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
  const opexRate = v('opexRate')!
  const noiOf = (gross: number) => gross * (1 - vacancy) * (1 - opexRate)
  const gross = units.reduce((s, u) => s + u.monthlyEquivalentWon! * 12, 0)
  const vacancyLoss = gross * vacancy
  const opex = (gross - vacancyLoss) * opexRate
  const noi = noiOf(gross)
  const existingGross = existingUnitNets.map(rentUnit).reduce((s, u) => s + (u.monthlyEquivalentWon ?? 0) * 12, 0)
  const existingNoi = existingUnitNets.length ? noiOf(existingGross) : null
  const noiIncrease = kind === 'rebuild' ? noi - (existingNoi ?? 0) : noi
  const deposits = units.reduce((s, u) => s + (u.depositWon ?? 0), 0)
  notes.push(
    `임대수입 = 세대 전용 × ㎡당 월 환산 임대료 (신규 실거래 중위, 보증금 × 전환율 ${fmtPct(conversion.housing.applied!)} ÷ 12 + 월세) × 12 — ${conversion.housing.basis}`,
  )
  if (v('maintenanceFeePerUnit') === null) notes.push('관리비는 자료가 없어 임대수입에 넣지 않았습니다 (입력 대기).')
  if (existingNoi !== null) notes.push('기존 세대 NOI는 같은 임대 사례로 추정한 값입니다 (실제 임대 조건 아님).')
  if (kind === 'rebuild') notes.push('재건축 NOI 증가 = 신축 세대 NOI − 철거되는 기존 세대 NOI(추정).')

  // [C] 지표
  const interest = loan * rate
  const capRate = v('capRate')!
  const valueIncrease = noiIncrease / capRate
  const assetBefore = input.assetBeforeWon
  return {
    scenario,
    status: 'ok',
    missing: [],
    project: { kind, gfaM2, constructionAreaM2, units },
    costs,
    totalCostWon: totalCost,
    loanWon: loan,
    equityWon: equity,
    revenue: {
      grossAnnualWon: wonR(gross),
      vacancyLossWon: wonR(vacancyLoss),
      opexWon: wonR(opex),
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
    conversion,
    rentBands,
    assumptions: Object.values(a),
    notes,
  }
}
