import { describe, expect, it } from 'vitest'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import type { ZoneName } from '@/types'
import { calcBcr, calcFar } from '../far'

const ZONE2: ZoneName = '제2종일반주거지역'
const BASE = getEffectiveRules('BASE')
const B = getEffectiveRules('B')
const ALL = getEffectiveRules('ALL')

// 기준 엑셀 당산동6가 104-48 당산빌 (참고 — 2026-10-07 T1에서 제외, 엔진 회귀 테스트)
const DANGSAN = { siteAreaM2: 200.07, farFloorAreaM2: 399.27, zone: ZONE2, netRatio: 0.743682220051594 }

describe('far.ts 용적률 (설계서 5-1, 5-7)', () => {
  it('대지 300㎡, 연면적 450㎡, 상한 200% → 허용 600㎡, 잔여 150㎡', () => {
    const r = calcFar({ siteAreaM2: 300, farFloorAreaM2: 450, zone: ZONE2, netRatio: 1 }, BASE)
    expect(r.currentFarPercent).toBeCloseTo(150)
    expect(r.maxGfaM2).toBeCloseTo(600)
    expect(r.remainingGfaM2).toBeCloseTo(150)
  })

  it('104-48 BASE(200%): 200.07㎡ → 허용 400.14㎡, 잔여 0.87㎡', () => {
    const r = calcFar(DANGSAN, BASE)
    expect(r.farLimitPercent).toBe(200)
    expect(r.maxGfaM2).toBeCloseTo(400.14, 2)
    expect(r.remainingGfaM2).toBeCloseTo(0.87, 2)
  })

  it('104-48 완화 B·ALL(250%): 200.07㎡ → 허용 500.175㎡ (×1.2 = 480.17이 나오면 실패)', () => {
    for (const rules of [B, ALL]) {
      const r = calcFar(DANGSAN, rules)
      expect(r.farLimitPercent).toBe(250)
      expect(r.maxGfaM2).toBeCloseTo(500.175, 3)
      expect(Math.abs(r.maxGfaM2 - 200.07 * 2 * 1.2)).toBeGreaterThan(1) // 480.168 금지
      expect(r.remainingGfaM2).toBeCloseTo(100.905, 3)
      expect(r.remainingNetM2).toBeCloseTo(75.04, 2)
    }
  })

  it('T2 완화(250%): 373.1㎡ → 허용 932.75㎡, 잔여 210.73㎡', () => {
    const r = calcFar({ siteAreaM2: 373.1, farFloorAreaM2: 722.02, zone: ZONE2, netRatio: 0.8275255533087726 }, B)
    expect(r.maxGfaM2).toBeCloseTo(932.75, 2)
    expect(r.remainingGfaM2).toBeCloseTo(210.73, 2)
    expect(r.remainingNetM2).toBeCloseTo(174.38, 2)
  })

  it('제3종일반주거 완화 상한은 300%', () => {
    const r = calcFar({ siteAreaM2: 100, farFloorAreaM2: 0, zone: '제3종일반주거지역', netRatio: 1 }, B)
    expect(r.farLimitPercent).toBe(300)
    expect(r.maxGfaM2).toBeCloseTo(300)
  })

  it('용적률을 이미 넘은 건물은 잔여 0 (음수 아님)', () => {
    const r = calcFar({ siteAreaM2: 100, farFloorAreaM2: 260, zone: ZONE2, netRatio: 0.8 }, BASE)
    expect(r.remainingGfaM2).toBe(0)
    expect(r.remainingNetM2).toBe(0)
  })

  it('대지면적이 0이거나 상한 없는 용도지역이면 오류', () => {
    expect(() => calcFar({ ...DANGSAN, siteAreaM2: 0 }, BASE)).toThrow()
    expect(() => calcFar({ ...DANGSAN, zone: '없는지역' as ZoneName }, BASE)).toThrow()
  })

  it('건폐율: 104-48 113.99 ÷ 200.07 = 56.98% (기준 엑셀 건폐율)', () => {
    expect(Math.abs(calcBcr(113.99, 200.07) - 56.98)).toBeLessThanOrEqual(0.01)
  })
})
