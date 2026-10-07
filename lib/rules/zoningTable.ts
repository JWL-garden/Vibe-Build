// 용도지역별 용적률·건폐율 상한 (서울특별시 도시계획 조례 기준, 설계서 4-3)
// 일조 사선(건축법 제61조)은 전용주거·일반주거지역에만 적용한다.
// ※ 발표 전 최신 조례 원문으로 재확인할 것

import type { ZoneName, ZoneRule } from '@/types'

export const zoningTable: ZoneRule[] = [
  { zone: '제1종전용주거지역', farLimitPercent: 100, bcrLimitPercent: 50, sunlightApplies: true },
  { zone: '제2종전용주거지역', farLimitPercent: 120, bcrLimitPercent: 40, sunlightApplies: true },
  { zone: '제1종일반주거지역', farLimitPercent: 150, bcrLimitPercent: 60, sunlightApplies: true },
  { zone: '제2종일반주거지역', farLimitPercent: 200, bcrLimitPercent: 60, sunlightApplies: true },
  { zone: '제3종일반주거지역', farLimitPercent: 250, bcrLimitPercent: 50, sunlightApplies: true },
  { zone: '준주거지역', farLimitPercent: 400, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '중심상업지역', farLimitPercent: 1000, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '일반상업지역', farLimitPercent: 800, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '근린상업지역', farLimitPercent: 600, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '유통상업지역', farLimitPercent: 600, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '전용공업지역', farLimitPercent: 200, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '일반공업지역', farLimitPercent: 200, bcrLimitPercent: 60, sunlightApplies: false },
  { zone: '준공업지역', farLimitPercent: 400, bcrLimitPercent: 60, sunlightApplies: false },
]

/** 용도지역 이름으로 기준표 한 줄 찾기 (없으면 undefined) */
export function getZoneRule(zone: ZoneName): ZoneRule | undefined {
  return zoningTable.find((z) => z.zone === zone)
}
