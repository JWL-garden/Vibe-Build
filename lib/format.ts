// 화면·보고서 표시용 숫자 포맷 (값이 없으면 '정보 없음')

const EMPTY = '정보 없음'

/** 1234.5 → "1,234.5" (소수 둘째 자리까지) */
export function formatNumber(value: number | null, maxDigits = 2): string {
  if (value === null) return EMPTY
  return value.toLocaleString('ko-KR', { maximumFractionDigits: maxDigits })
}

/** 숫자 뒤에 단위를 붙인다. 값이 없으면 단위 없이 '정보 없음' */
export function withUnit(value: number | null, unit: string, maxDigits = 2): string {
  return value === null ? EMPTY : `${formatNumber(value, maxDigits)} ${unit}`
}

export function textOrEmpty(value: string | null): string {
  return value && value.trim() !== '' ? value : EMPTY
}

/** 금액(원) → 1억 이상은 "20.9억원", 그 미만은 "1,500만원" */
export function formatWon(won: number | null, eokDigits = 1): string {
  if (won === null) return EMPTY
  const sign = won < 0 ? '−' : ''
  const abs = Math.abs(won)
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: eokDigits })}억원`
  return `${sign}${Math.round(abs / 1e4).toLocaleString('ko-KR')}만원`
}

/** 소수 비율 → 퍼센트 (0.066 → "6.6%") */
export function formatRate(rate: number | null, digits = 1): string {
  if (rate === null) return EMPTY
  return `${(rate * 100).toFixed(digits)}%`
}

/** 면적 ㎡ + 평 병기 (660 → "660㎡ (199.7평)") */
export function formatArea(m2: number | null): string {
  if (m2 === null) return EMPTY
  return `${formatNumber(m2, 1)}㎡ (${formatNumber(m2 / 3.3058, 1)}평)`
}

/** 연수 (15.1 → "15.1년"). 값이 없으면 '회수 불가' */
export function formatYears(years: number | null): string {
  return years === null ? '회수 불가' : `${years.toFixed(1)}년`
}
