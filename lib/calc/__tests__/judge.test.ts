import { describe, expect, it } from 'vitest'
import sample from '@/lib/mock/sampleReport.S1.json'
import type { ExpansionResult, ReportData } from '@/types'
import { judgeFromExpansion } from '../index'

const after = (sample as ReportData).analysis.expansion.after

describe('judgeFromExpansion', () => {
  it('증축 층수가 1층 이상이면 증축 가능', () => {
    const r = judgeFromExpansion(after, '복합 완화')
    expect(r.status).toBe('possible')
    expect(r.reason).toContain('+4개층')
  })

  it('증축 층수가 0이면 증축 불가', () => {
    const none: ExpansionResult = { ...after, addFloors: 0, addFloorAreaM2: 0, limitingFactor: 'sunlight' }
    const r = judgeFromExpansion(none, '현행 법규')
    expect(r.status).toBe('impossible')
    expect(r.reason).toContain('일조권')
  })
})
