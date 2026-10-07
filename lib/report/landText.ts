// 토지가액 표시 문구 — 화면 ⑧ 수익성과 보고서(1장·5장·부록)가 같이 쓴다.
// 숫자는 계산하지 않고 runAll 결과(analysis.land)를 문구로만 바꾼다.

import { landValueRule } from '@/lib/rules/financeDefaults'
import type { LandValueBasis, LandValueResult } from '@/types'

/** 산정 상태 배지 */
export const LAND_BADGE: Record<LandValueBasis, { badge: string; tone: 'accent' | 'danger' | 'neutral' }> = {
  sum: { badge: '공시지가 기준', tone: 'accent' },
  mismatch: { badge: '면적 확인 필요', tone: 'danger' },
  estimated: { badge: '추정', tone: 'neutral' },
  none: { badge: '계산 불가', tone: 'danger' },
}

/** 기준연월 (예: '2026년 1월 1일') */
export function landBaseMonthText(land: LandValueResult): string | null {
  const pb = land.priceBasis
  if (!pb) return null
  return pb.baseMonth ? `${pb.baseYear}년 ${Number(pb.baseMonth)}월 1일` : `${pb.baseYear}년`
}

/** 공시 기준 문구 — 토지가액을 보여주는 모든 곳에 붙인다 (예: '개별공시지가 기준 (시세 아님) · 2026년 1월 1일 기준 · 2026-04-30 공시') */
export function landBasisNote(land: LandValueResult): string {
  const month = landBaseMonthText(land)
  if (!month) return landValueRule.label
  return `${landValueRule.label} · ${month} 기준 · ${land.priceBasis!.announcedDate} 공시`
}

/** 계산에 쓴 면적의 출처 */
export const landAreaSource = (land: LandValueResult) => (land.basis === 'estimated' ? '대장 대지면적' : '토지대장')
