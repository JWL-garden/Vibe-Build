// 수익성 기본 가정 (설계서 6-2) — 모든 값은 "예시 가정값"
// TODO [3-1]: 사업비·수익 가정값(financeDefaults 본체)과 getFinanceAssumptions()

/** 토지가액 산정 방식 (설계서 5-4 [0]) — 공시지가 기준, 시세 아님 */
export const landValueRule = {
  /** 구성 필지 면적 합과 건축물대장 대지면적의 허용 차이 (㎡). 넘으면 '면적 확인 필요' */
  areaToleranceM2: 1,
  /** 화면·보고서 표기 */
  label: '개별공시지가 기준 (시세 아님)',
} as const

/** 건물가치(원가 기준) 가정 (설계서 5-4 [C']) — 예시 가정값, 감정평가 아님 */
export const buildingValueRule = {
  /** 재조달단가 (원/㎡) — 같은 건물을 지금 새로 짓는 단가 */
  replacementCostPerM2Won: 2_000_000,
  /** 구조별 내용연수 (년). 목록에 없으면 default */
  usefulLifeYears: { 철근콘크리트구조: 50, default: 50 } as Record<string, number>,
  /** 최저 잔가율 (소수) — 오래돼도 이 비율 아래로 내려가지 않음 */
  minResidualRate: 0.1,
  note: '예시 가정값 (재조달단가·내용연수·잔가율) — 감정평가 아님',
} as const

export type LandValueRule = typeof landValueRule
export type BuildingValueRule = typeof buildingValueRule
