// 정북방향 일조 사선 (설계서 5-2, 건축법 시행령 제86조) — 순수 함수
// 높이 lowHeightM 이하 부분: 정북 경계에서 lowSetbackM 이상 / 초과 부분: 높이 × ratio 이상 이격
// 현행(ratio 0.5): d < 1.5m → 0, 1.5m ≤ d < 5m → 10m, d ≥ 5m → 2d

import type { HousingType, SunlightRule } from '@/types'

/** 건물 유형에 맞는 일조 규칙: 다가구·다세대면 수직 건축 허용 높이(multiFamilyLowHeightM)를 기준높이로 쓴다 */
export function sunlightRuleFor(rule: SunlightRule, housingType: HousingType | null): SunlightRule {
  const multiFamily = housingType === '다가구' || housingType === '다세대'
  if (!multiFamily || rule.multiFamilyLowHeightM === null) return rule
  return { ...rule, lowHeightM: Math.max(rule.lowHeightM, rule.multiFamilyLowHeightM) }
}

/** 정북 이격거리 d(m)에서 허용되는 최고 높이 (m) */
export function maxHeightAtDistance(d: number, rule: SunlightRule): number {
  if (d < rule.lowSetbackM) return 0
  return Math.max(rule.lowHeightM, d / rule.ratio)
}

/** 건물 높이 h(m)에 필요한 정북 이격거리 (m) */
export function requiredSetback(h: number, rule: SunlightRule): number {
  return h <= rule.lowHeightM ? rule.lowSetbackM : h * rule.ratio
}

/**
 * 일조 사선 기준 허용 최고높이 (m).
 * 일조 미적용(상업·공업 등)이면 null = 제한 없음.
 * @param zoneApplies 용도지역이 전용·일반주거지역인지 (zoningTable.sunlightApplies)
 */
export function maxBuildingHeight(northSetbackM: number, rule: SunlightRule, zoneApplies: boolean): number | null {
  if (!rule.applies || !zoneApplies) return null
  return maxHeightAtDistance(northSetbackM, rule)
}
