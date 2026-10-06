// 수익성 가정값의 한국어 이름과 표시 방법 (보고서 부록 표, 시나리오 조건 설명에 사용)

import { formatNumber, formatRate, formatWon } from '@/lib/format'
import type { AssumptionSource, FinanceAdjustment, FinanceAssumptions } from '@/types'

type Kind = 'won' | 'wonPerM2' | 'rate' | 'months' | 'years' | 'multiple'

export const ASSUMPTION_LABELS: Record<keyof FinanceAssumptions, { label: string; kind: Kind }> = {
  unitCostWon: { label: '증축 공사비 단가', kind: 'wonPerM2' },
  structuralCostWon: { label: '구조 보강비', kind: 'won' },
  equipmentCostWon: { label: '승강기·설비비', kind: 'won' },
  designRate: { label: '설계·감리비율', kind: 'rate' },
  permitCostWon: { label: '인허가·부담금', kind: 'won' },
  taxRate: { label: '취득세 등 세율', kind: 'rate' },
  constructionLossRate: { label: '공사 중 임대 손실비율', kind: 'rate' },
  contingencyRate: { label: '예비비율', kind: 'rate' },
  loanRate: { label: '대출 비율', kind: 'rate' },
  interestRate: { label: '대출 금리', kind: 'rate' },
  designPermitMonths: { label: '설계·인허가 기간', kind: 'months' },
  constructionMonths: { label: '공사 기간', kind: 'months' },
  leasableRate: { label: '임대가능면적 비율', kind: 'rate' },
  rentPerM2Won: { label: '㎡당 월 임대료', kind: 'wonPerM2' },
  depositMultiple: { label: '보증금 배수 (월 임대료 대비)', kind: 'multiple' },
  depositYieldRate: { label: '보증금 전환이율', kind: 'rate' },
  vacancyRate: { label: '공실률', kind: 'rate' },
  opexRate: { label: '운영비율', kind: 'rate' },
  capRate: { label: '시장 환원율', kind: 'rate' },
  rentGrowthRate: { label: '임대료 상승률 (연)', kind: 'rate' },
  discountRate: { label: '할인율', kind: 'rate' },
  analysisYears: { label: '분석 기간', kind: 'years' },
}

export const SOURCE_LABELS: Record<AssumptionSource, string> = {
  user: '사용자 입력',
  market: '샘플 시세',
  default: '기본 가정',
}

/** 가정값 하나를 단위에 맞게 표시 */
export function formatAssumption(key: keyof FinanceAssumptions, value: number): string {
  switch (ASSUMPTION_LABELS[key].kind) {
    case 'won':
      return formatWon(value)
    case 'wonPerM2':
      return `${formatNumber(value, 0)}원/㎡`
    case 'rate': {
      // 3.16%처럼 소수 둘째 자리가 있으면 2자리, 아니면 1자리
      const tenths = value * 1000
      return formatRate(value, Math.abs(tenths - Math.round(tenths)) > 1e-9 ? 2 : 1)
    }
    case 'months':
      return `${value}개월`
    case 'years':
      return `${value}년`
    case 'multiple':
      return `${value}배`
  }
}

/** 조정 한 건 설명 (예: '㎡당 월 임대료 −10%', '공실률 +5%p') */
export function describeAdjustment(adj: FinanceAdjustment): string {
  const { label, kind } = ASSUMPTION_LABELS[adj.field]
  if (adj.op === 'multiply') {
    const pct = Math.round((adj.value - 1) * 100)
    return `${label} ${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%`
  }
  const amount = kind === 'rate' ? `${Math.abs(Math.round(adj.value * 1000) / 10)}%p` : formatNumber(Math.abs(adj.value))
  return `${label} ${adj.value >= 0 ? '+' : '−'}${amount}`
}
