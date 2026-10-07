import { describe, expect, it } from 'vitest'
import sample from '../sampleReport.S1.json'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import type { ReportData, ScenarioId } from '@/types'

// 샘플 보고서(손계산 값)가 설계서 5장 공식과 맞는지 검사한다.
// 계산 엔진(Day 2~3)이 생기면 runAll 결과와 이 값이 같은지도 여기서 비교한다.
const data = sample as ReportData
const { expansion, expansionByScenario, finance } = data.analysis

describe('S1 샘플 보고서: 규모', () => {
  it('증축 층수 = 용적률·일조 기준 중 최솟값', () => {
    for (const e of Object.values(expansionByScenario)) {
      const limits = [e.floorsByFar, e.floorsBySun, e.floorsByOther].filter((v): v is number => v !== null)
      expect(e.addFloors).toBe(Math.max(0, Math.min(...limits)))
    }
  })

  it('의도된 결과: 현행은 일조권 제한, 복합 완화는 +4층', () => {
    expect(expansion.before.limitingFactor).toBe('sunlight')
    expect(expansion.after.addFloors).toBe(4)
    expect(expansion.after.addFloorAreaM2).toBe(660)
  })

  it('층별 계획표 면적 합계 = 기존 + 증축 연면적', () => {
    const total = data.plan.floors.reduce((s, f) => s + f.areaM2, 0)
    expect(total).toBeCloseTo(data.building.farFloorAreaM2 + expansion.after.addFloorAreaM2)
  })
})

describe('S1 샘플 보고서: 법규 시나리오 (v3)', () => {
  it('시나리오별 규칙이 lib/rules 와 같다 (용적률 상한 교체, 주택·주차 규칙)', () => {
    for (const [id, e] of Object.entries(expansionByScenario)) {
      const rules = getEffectiveRules(id as ScenarioId)
      expect(e.scenarioId).toBe(id)
      expect(e.rules.sunlight).toEqual(rules.sunlight)
      expect(e.rules.housing).toEqual(rules.housing)
      expect(e.rules.parking).toEqual(rules.parking)
      expect(e.rules.farLimitByZone['제2종일반주거지역']).toBe(rules.farLimitByZone['제2종일반주거지역'])
      expect(e.rules).not.toHaveProperty('farMultiplier')
    }
  })

  it('복합 완화(ALL): 2종 상한 250% → 허용 연면적 550 × 2.5 = 1,375㎡', () => {
    expect(expansion.after.scenarioId).toBe('ALL')
    expect(expansion.after.farLimitPercent).toBe(250)
    expect(expansion.after.maxFloorAreaM2).toBeCloseTo(data.building.siteAreaM2 * 2.5)
  })
})

describe('S1 샘플 보고서: 수익성', () => {
  const f = finance.after

  it('사업비 항목 합계 = 총사업비, 자기자본 + 대출 = 총사업비', () => {
    const sum = f.costBreakdown.reduce((s, c) => s + c.amountWon, 0)
    expect(Math.abs(sum - f.totalCostWon)).toBeLessThanOrEqual(f.costBreakdown.length)
    expect(f.equityWon + f.loanWon).toBe(f.totalCostWon)
  })

  it('ROI = NOI ÷ 총사업비, 회수기간 = 총사업비 ÷ NOI, 자산가치 = NOI ÷ 환원율', () => {
    expect(f.roiRate).toBeCloseTo(f.noiWon / f.totalCostWon, 3)
    expect(f.paybackYears).toBeCloseTo(f.totalCostWon / f.noiWon, 1)
    expect(f.valueIncreaseWon).toBeCloseTo(f.noiWon / f.assumptions.capRate, -1)
  })

  it('요약 KPI 문구가 본문 숫자와 같다', () => {
    const text = data.summary.kpis.map((k) => k.value).join(' ')
    expect(text).toContain(`+${expansion.after.addFloors}층`)
    expect(text).toContain(`${(f.totalCostWon / 1e8).toFixed(1)}억원`)
    expect(text).toContain(`${(f.roiRate * 100).toFixed(1)}%`)
    expect(text).toContain(`${f.paybackYears?.toFixed(1)}년`)
  })
})
