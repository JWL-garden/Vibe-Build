// 시나리오가 바꾸는 규칙값을 한 줄로 설명 (부록 법규·완화 가정 표에서 사용, 계산 없음)

import { withUnit } from '@/lib/format'
import type { DeepPartial, HousingType, Rules } from '@/types'

/** 같은 값을 가진 주택 유형끼리 묶어 '다세대·다가구 1,000㎡' 처럼 표시 */
function byType<T>(values: Partial<Record<HousingType, T>> | undefined, show: (v: T, types: string) => string): string[] {
  const groups = new Map<T, HousingType[]>()
  for (const [type, v] of Object.entries(values ?? {}) as [HousingType, T][]) {
    if (v === undefined) continue
    groups.set(v, [...(groups.get(v) ?? []), type])
  }
  return [...groups.entries()].map(([v, types]) => show(v, types.join('·')))
}

/** 예: '일조 사선 비율 0.25', '제2종일반주거 용적률 상한 250%', '다가구 주택 층수 4개층 이하' */
export function describeOverrides(o: DeepPartial<Rules>): string {
  const parts: string[] = []
  if (o.sunlight?.ratio !== undefined) parts.push(`일조 사선 비율 ${o.sunlight.ratio}`)
  if (o.sunlight?.lowHeightM !== undefined) parts.push(`일조 기준높이 ${o.sunlight.lowHeightM}m`)
  if (o.sunlight?.multiFamilyLowHeightM != null) {
    parts.push(`다가구·다세대 일조 수직 허용 높이 ${o.sunlight.multiFamilyLowHeightM}m`)
  }
  for (const [zone, limit] of Object.entries(o.farLimitByZone ?? {})) {
    parts.push(`${zone.replace('지역', '')} 용적률 상한 ${limit}%`)
  }
  if (o.massSide?.includeInGfa) parts.push('일조 완화 시 증축계획안 증축 가능 연면적 적용 (세대로 확보되는 면적만 사용)')
  parts.push(...byType(o.housing?.maxFloors, (v, types) => `${types} 주택 층수 ${v}개층 이하`))
  const exclusive = o.housing?.areaExclusive ?? {}
  parts.push(
    ...byType(o.housing?.maxAreaM2, (v, types) => {
      const first = types.split('·')[0] as HousingType
      return `${types} 주택 연면적 ${withUnit(v, '㎡', 0)} ${exclusive[first] ? '미만' : '이하'}`
    }),
  )
  if (o.maxAddFloors !== undefined && o.maxAddFloors !== null) parts.push(`최대 증축 ${o.maxAddFloors}층`)
  return parts.length > 0 ? parts.join(', ') : '현행 기준 그대로'
}
