// 증축층 바닥면적 (2026-10-08 결정 8) — 옵션1: 최상층 전유 × 0.9 / 옵션2: 입력 엑셀 값 / 지붕이 평슬라브가 아니면 보류
import { describe, expect, it } from 'vitest'
import { getEffectiveRules, deepMerge } from '@/lib/rules/scenarios'
import { getSiteData } from '@/lib/services/mockService'
import type { ExcelSite, ExcelUnit } from '@/types'
import { calcFloorPlate } from '../floorPlate'

const T1 = '1156011600001040010'
const T2 = '1156011600001100019'
const rules = getEffectiveRules('ALL')

const area = (floor: number | null, kind: '전유' | '공용', areaM2: number, floorType = '지상') => ({
  kind,
  floorType,
  floor,
  floorLabel: floor === null ? '각층' : `${floor}층`,
  use: '다세대주택',
  etcUse: null,
  areaM2,
})

/** 테스트용 건물: 3층 전유 40㎡, 지붕은 인자로 */
function fakeSite(roof: { type: string | null; etc: string | null }, areas: ReturnType<typeof area>[]) {
  const site = { pnu: 'TEST', buildingAreaM2: 80, roof } as unknown as ExcelSite
  const units = [{ pnu: 'TEST', unitName: '301', mainUse: '다세대주택', etcUse: null, areas, parking: null }] as unknown as ExcelUnit[]
  return { site, units }
}

describe('옵션1 — 기준 엑셀 T1·T2', () => {
  it('T1: 5층 전유 59.81㎡ × 0.9 = 53.829㎡, 5층에 층 지정 공용 없음 → 지붕 평스라브 → 계산', async () => {
    const d = (await getSiteData(T1))!
    const r = calcFloorPlate({ site: d.site, units: d.units, option2M2: null }, rules)
    expect(r.topFloor).toBe(5)
    expect(r.netFloorNetM2).toBeCloseTo(59.81, 6)
    expect(r.topFloorHasCommon).toBe(false) // '각층' 공용은 최상층 공용으로 보지 않음
    expect(r.roofFlat).toBe(true)
    expect(r.areaM2).toBeCloseTo(53.829, 6)
    expect(r.method).toBe('option1')
  })

  it('T2: 6층 전유 73.17㎡ × 0.9 = 65.853㎡, 지붕 (철근)콘크리트 → 평슬라브로 봄', async () => {
    const d = (await getSiteData(T2))!
    const r = calcFloorPlate({ site: d.site, units: d.units, option2M2: null }, rules)
    expect(r.topFloor).toBe(6)
    expect(r.roofText).toBe('(철근)콘크리트 / (철근)콘크리트')
    expect(r.roofFlat).toBe(true)
    expect(r.areaM2).toBeCloseTo(65.853, 6)
  })
})

describe('옵션1 — 규칙', () => {
  it('최상층에 공용만 있고 전유가 없으면(옥탑 계단실) 그 아래 전유층의 전유 × 0.9, 지붕 검사 안 함', () => {
    const { site, units } = fakeSite({ type: '기와', etc: '경사지붕' }, [area(3, '전유', 40), area(4, '공용', 12)])
    const r = calcFloorPlate({ site, units, option2M2: null }, rules)
    expect(r.topFloor).toBe(4)
    expect(r.netFloor).toBe(3)
    expect(r.topFloorHasCommon).toBe(true)
    expect(r.roofFlat).toBeNull()
    expect(r.areaM2).toBeCloseTo(36, 6)
  })

  it('최상층에 층 지정 공용이 없고 지붕이 경사·기와·판넬이면 증축 불가 → 계산 보류(null)', () => {
    for (const roof of [
      { type: '기와', etc: '와즙' },
      { type: '(철근)콘크리트', etc: '경사슬라브' },
      { type: '(철근)콘크리트', etc: '평스라브, 샌드위치판넬' },
    ]) {
      const { site, units } = fakeSite(roof, [area(3, '전유', 40), area(null, '공용', 30, '각층')])
      const r = calcFloorPlate({ site, units, option2M2: null }, rules)
      expect(r.status).toBe('blocked')
      expect(r.areaM2).toBeNull()
    }
  })

  it('호별 면적 자료가 없으면 건축면적으로 대체 (확인 필요)', () => {
    const { site } = fakeSite({ type: null, etc: null }, [])
    const r = calcFloorPlate({ site, units: [], option2M2: null }, rules)
    expect(r.status).toBe('fallback')
    expect(r.areaM2).toBe(80)
  })
})

describe('옵션2', () => {
  it('method = option2이고 입력 엑셀 값이 있으면 그 값을 쓴다', async () => {
    const d = (await getSiteData(T1))!
    const r2 = deepMerge(rules, { floorPlate: { method: 'option2' } })
    const r = calcFloorPlate({ site: d.site, units: d.units, option2M2: 70 }, r2)
    expect(r.method).toBe('option2')
    expect(r.areaM2).toBe(70)
  })

  it('option2인데 값이 없으면 옵션1로 계산, 기본(option1)이면 입력 값이 있어도 무시', async () => {
    const d = (await getSiteData(T1))!
    const r2 = deepMerge(rules, { floorPlate: { method: 'option2' } })
    expect(calcFloorPlate({ site: d.site, units: d.units, option2M2: null }, r2).areaM2).toBeCloseTo(53.829, 6)
    expect(calcFloorPlate({ site: d.site, units: d.units, option2M2: 70 }, rules).areaM2).toBeCloseTo(53.829, 6)
  })
})
