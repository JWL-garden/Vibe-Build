import { describe, expect, it } from 'vitest'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import { maxBuildingHeight, maxHeightAtDistance, requiredSetback } from '../sunlight'

const BASE = getEffectiveRules('BASE').sunlight
const A = getEffectiveRules('A').sunlight

describe('sunlight.ts 정북 일조 사선 (설계서 5-2, 5-7)', () => {
  it('정북 이격 4m → 허용 10m, 8m → 16m', () => {
    expect(maxHeightAtDistance(4, BASE)).toBe(10)
    expect(maxHeightAtDistance(8, BASE)).toBe(16)
  })

  it('이격 1.5m 미만 → 0, 1.5m → 10m, 5m → 10m', () => {
    expect(maxHeightAtDistance(1.4, BASE)).toBe(0)
    expect(maxHeightAtDistance(1.5, BASE)).toBe(10)
    expect(maxHeightAtDistance(5, BASE)).toBe(10)
  })

  it('완화 A(비율 1/4): 이격 4m → 16m', () => {
    expect(maxHeightAtDistance(4, A)).toBe(16)
  })

  it('상업지역 등 일조 미적용 → null (제한 없음)', () => {
    expect(maxBuildingHeight(4, BASE, false)).toBeNull()
    expect(maxBuildingHeight(4, BASE, true)).toBe(10)
  })

  it('필요 이격거리: T1 15.65 + 3.3 = 18.95m → BASE 9.475m / A 4.7375m (설계서 12-3)', () => {
    expect(requiredSetback(18.95, BASE)).toBeCloseTo(9.475)
    expect(requiredSetback(18.95, A)).toBeCloseTo(4.7375)
    expect(requiredSetback(20.3, BASE)).toBeCloseTo(10.15)
    expect(requiredSetback(8, BASE)).toBe(1.5)
  })
})
