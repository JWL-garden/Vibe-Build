import { describe, expect, it } from 'vitest'
import { baseRules } from '../baseRules'
import { getEffectiveRules, scenarios } from '../scenarios'

describe('법규 시나리오 (설계서 6-1 v3)', () => {
  it('시나리오는 BASE, A, B, C, ALL 5개', () => {
    expect(scenarios.map((s) => s.id)).toEqual(['BASE', 'A', 'B', 'C', 'ALL'])
  })

  it('BASE: 2종 200 / 3종 250, 주택 층수 다세대 4·다가구 3·다중 3 (건축법 시행령 별표1), 660㎡ 이하', () => {
    const r = getEffectiveRules('BASE')
    expect(r.farLimitByZone['제2종일반주거지역']).toBe(200)
    expect(r.farLimitByZone['제3종일반주거지역']).toBe(250)
    expect(r.housing.maxFloors).toEqual({ 다세대: 4, 다가구: 3, 다중주택: 3 })
    expect(r.housing.maxAreaM2.다가구).toBe(660)
    expect(r.housing.areaExclusive.다세대).toBe(false)
    expect(r.sunlight.multiFamilyLowHeightM).toBeNull()
  })

  it('B: 용적률 상한 교체 2종 250 / 3종 300, 다른 지역은 그대로', () => {
    const r = getEffectiveRules('B')
    expect(r.farLimitByZone['제2종일반주거지역']).toBe(250)
    expect(r.farLimitByZone['제3종일반주거지역']).toBe(300)
    expect(r.farLimitByZone['일반상업지역']).toBe(800)
    expect(r).not.toHaveProperty('farMultiplier')
  })

  it('C (8·13 대책): 다가구 4·다세대 5개층(프로젝트 해석), 다가구·다세대 1,000㎡ 미만, 일조 수직 15m — 다중주택은 그대로', () => {
    const r = getEffectiveRules('C')
    expect(r.housing.maxFloors).toEqual({ 다세대: 5, 다가구: 4, 다중주택: 3 })
    expect(r.housing.maxAreaM2).toEqual({ 다세대: 1000, 다가구: 1000, 다중주택: 660 })
    expect(r.housing.areaExclusive).toEqual({ 다세대: true, 다가구: true, 다중주택: false })
    expect(r.sunlight.multiFamilyLowHeightM).toBe(15)
    expect(r.housing.excludePilotiFloor).toBe(true)
  })

  it('ALL = A + B + C', () => {
    const r = getEffectiveRules('ALL')
    expect(r.sunlight).toEqual({ ...baseRules.sunlight, ratio: 0.25, multiFamilyLowHeightM: 15 })
    expect(r.farLimitByZone['제2종일반주거지역']).toBe(250)
    expect(r.housing.maxFloors.다가구).toBe(4)
    expect(r.housing.maxFloors.다중주택).toBe(3)
    expect(r.parking).toEqual(baseRules.parking)
  })

  it('시나리오를 적용해도 baseRules 원본은 바뀌지 않는다', () => {
    getEffectiveRules('ALL')
    expect(baseRules.sunlight.ratio).toBe(0.5)
    expect(baseRules.farLimitByZone['제2종일반주거지역']).toBe(200)
    expect(baseRules.housing.maxFloors.다가구).toBe(3)
    expect(baseRules.housing.maxAreaM2.다세대).toBe(660)
  })
})
