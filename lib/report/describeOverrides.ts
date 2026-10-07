// 시나리오가 바꾸는 규칙값을 한 줄로 설명 (부록 법규·완화 가정 표에서 사용, 계산 없음)

import { withUnit } from '@/lib/format'
import type { DeepPartial, Rules } from '@/types'

/** 예: '일조 사선 비율 0.25', '제2종일반주거 용적률 상한 250%' */
export function describeOverrides(o: DeepPartial<Rules>): string {
  const parts: string[] = []
  if (o.sunlight?.ratio !== undefined) parts.push(`일조 사선 비율 ${o.sunlight.ratio}`)
  if (o.sunlight?.lowHeightM !== undefined) parts.push(`일조 기준높이 ${o.sunlight.lowHeightM}m`)
  for (const [zone, limit] of Object.entries(o.farLimitByZone ?? {})) {
    parts.push(`${zone.replace('지역', '')} 용적률 상한 ${limit}%`)
  }
  const floors = o.housing?.maxFloors?.다세대
  if (floors !== undefined) parts.push(`주택 층수 ${floors}개층 이하`)
  const area = o.housing?.maxAreaM2?.다세대
  if (area !== undefined) parts.push(`주택 연면적 ${withUnit(area, '㎡', 0)} 이하`)
  if (o.maxAddFloors !== undefined && o.maxAddFloors !== null) parts.push(`최대 증축 ${o.maxAddFloors}층`)
  return parts.length > 0 ? parts.join(', ') : '현행 기준 그대로'
}
