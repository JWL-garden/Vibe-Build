import { describe, expect, it } from 'vitest'
import sitesJson from '@/lib/data/sites.json'
import unitsJson from '@/lib/data/units.json'
import { getEffectiveRules } from '@/lib/rules/scenarios'
import type { ExcelSite, ExcelUnit } from '@/types'
import { calcHousingLimit, summarizeHousing } from '../housingLimit'

const sites = sitesJson.items as ExcelSite[]
const units = unitsJson.items as ExcelUnit[]
const BASE = getEffectiveRules('BASE')
const C = getEffectiveRules('C')
const ALL = getEffectiveRules('ALL')
const summary = (pnu: string) => summarizeHousing(sites.find((s) => s.pnu === pnu)!, units)

const T1 = summary('1156011600001040048')
const T2 = summary('1156011600001100019')

describe('주택 현황 (설계서 12-2)', () => {
  it('T1: 다중주택, 3~5층 = 3개층, 주택 면적 213.21㎡', () => {
    expect(T1.housingType).toBe('다중주택')
    expect(T1.housingFloors).toBe(3)
    expect(T1.housingAreaM2).toBeCloseTo(213.21, 2)
  })

  it('T2: 다세대, 2~5층 = 4개층 (1층 필로티 제외), 주택 면적 633.59㎡', () => {
    expect(T2.housingType).toBe('다세대')
    expect(T2.housingFloors).toBe(4)
    expect(T2.housingAreaM2).toBeCloseTo(633.59, 2)
  })
})

describe('주택 층수 한도 (설계서 5-7, 12-3)', () => {
  it('주택 4개층 건물에 새 층 주택 추가 → BASE·완화(4층) 모두 불가', () => {
    const input = { housingType: '다세대' as const, housingFloors: 4, housingAreaM2: 500, source: 'units' as const, addHousingFloor: true }
    expect(calcHousingLimit(input, BASE).floorOK).toBe(false)
    expect(calcHousingLimit(input, C).floorOK).toBe(false)
    expect(calcHousingLimit(input, ALL).housingFloorsAfter).toBe(5)
  })

  it('T1: 새 층 주택 시 4개층 → BASE(3) 불가, C(4) 통과', () => {
    expect(calcHousingLimit({ ...T1, addHousingFloor: true }, BASE).floorOK).toBe(false)
    expect(calcHousingLimit({ ...T1, addHousingFloor: true }, C).floorOK).toBe(true)
  })

  it('T2: 새 층 주택 시 5개층 → BASE·C 모두 불가', () => {
    expect(calcHousingLimit({ ...T2, addHousingFloor: true }, BASE).floorOK).toBe(false)
    expect(calcHousingLimit({ ...T2, addHousingFloor: true }, C).floorOK).toBe(false)
  })

  it('새 층에 주택을 넣지 않으면 층수는 그대로 (T2 4개층 → C 통과)', () => {
    const r = calcHousingLimit({ ...T2, addHousingFloor: false }, C)
    expect(r.housingFloorsAfter).toBe(4)
    expect(r.floorOK).toBe(true)
  })
})

describe('주택 연면적 한도 (설계서 12-3)', () => {
  it('T1: 213.21㎡ → BASE 남은 면적 446.79㎡ (증축 100.9㎡ 통과)', () => {
    expect(calcHousingLimit({ ...T1, addHousingFloor: true }, BASE).areaGfaM2).toBeCloseTo(446.79, 2)
  })

  it('T2: 633.59㎡ → BASE 남은 26.41㎡ (36.25㎡ 증축 불가), C 남은 366.41㎡', () => {
    expect(calcHousingLimit({ ...T2, addHousingFloor: true }, BASE).areaGfaM2).toBeCloseTo(26.41, 2)
    expect(calcHousingLimit({ ...T2, addHousingFloor: true }, C).areaGfaM2).toBeCloseTo(366.41, 2)
  })

  it('주택이 아니면 한도 미적용', () => {
    const r = calcHousingLimit(
      { housingType: null, housingFloors: 0, housingAreaM2: 0, source: 'units', addHousingFloor: true },
      BASE,
    )
    expect(r.applies).toBe(false)
    expect(r.floorOK).toBe(true)
    expect(r.areaGfaM2).toBeNull()
  })

  it('호별 자료 없는 다가구는 대장 값(지상층수·연면적)으로 추정', () => {
    const site = sites.find((s) => s.pnu === '1156011600000030001')!
    const s = summarizeHousing(site, units)
    expect(s.housingType).toBe('다가구')
    expect(s.source).toBe('register')
    expect(s.housingAreaM2).toBeCloseTo(site.totalFloorAreaM2)
  })
})
