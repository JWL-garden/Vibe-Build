// 화면 표시용 숫자 포맷 (값이 없으면 '정보 없음')

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
