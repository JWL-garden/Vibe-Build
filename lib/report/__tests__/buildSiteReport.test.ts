// 보고서 1·2·3장 조립 — 숫자가 runAll·기준 엑셀(설계서 12-2)과 같은지
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { getSiteData } from '@/lib/services/mockService'
import type { ScenarioId } from '@/types'
import { buildSiteReport } from '../buildSiteReport'

const T1 = '1156011600001040010'
const DANGSAN = '1156011600001040048' // 104-48 당산빌: 2026-10-07 T1에서 제외, 주차 추가 확보 경로 회귀 테스트
const T2 = '1156011600001100019'
const build = async (pnu: string, id: ScenarioId = 'ALL') => {
  const data = (await getSiteData(pnu))!
  return buildSiteReport(data, runAll(data, id), '2026-10-07')
}

describe('104-48 보고서', () => {
  it('표지: 조건부 가능, +1층 · +100.9㎡ (주차 +1대 조건)', async () => {
    const r = await build(DANGSAN)
    expect(r.summary.kpis[0].value).toBe('+1층 · +100.9㎡')
    expect(r.summary.kpis[0].caption).toBe('주차 +1대 조건')
    expect(r.summary.kpis[3].value).toBe('조건부 가능')
    expect(r.summary.addFloors).toBe(1)
  })

  it('1장: 층별 용도 1~2층 사무소, 3~5층 다중주택, 주택 3개층·213.21㎡', async () => {
    const r = await build(DANGSAN)
    const uses = r.status.floorUses.map((f) => `${f.floorLabel}:${f.uses}`)
    expect(uses).toEqual(['1층:사무소', '2층:사무소', '3층:다중주택', '4층:다중주택', '5층:다중주택'])
    expect(r.status.stats[2].value).toBe('3개층 · 213.21㎡')
  })

  it('2장: 현행→완화 3줄, 주차 산정 단독 1.6 + 근생 1.3 = 2.9, 여유 0.1', async () => {
    const r = await build(DANGSAN)
    expect(r.regulation.relaxRows).toHaveLength(3)
    expect(r.regulation.relaxRows[0].slice(1)).toEqual(['200%', '250%', 'B, ALL'])
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['단독·다중주택(제4호)']).toBe('1.6대')
    expect(byLabel['근린생활시설(제3호)']).toBe('1.3대')
    expect(byLabel['현재 법정 대수']).toBe('2.9대')
    expect(byLabel['기존 여유']).toBe('0.1대')
    expect(r.regulation.scenarioRows).toHaveLength(5)
    expect(r.regulation.selectedRow).toBe(4)
  })

  it('3장: 주차 1대 추가 조건 증축안, 증축 면적 = expansion.addGfaM2', async () => {
    const r = await build(DANGSAN)
    expect(r.plan.kind).toBe('parkingOption')
    expect(r.plan.plan).toBe(r.analysis.selected.parkingOption)
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(100.905, 2)
    expect(r.regulation.checkItems).toContain('주차 1대 추가 확보 시 대지 내 배치 가능 여부')
  })
})

describe('T1 104-10 렉스빌 보고서', () => {
  it('1장: 1층 필로티(가정), 2~5층 다세대, 주택 4개층·378.24㎡', async () => {
    const r = await build(T1)
    const uses = r.status.floorUses.map((f) => `${f.floorLabel}:${f.uses}`)
    expect(uses).toEqual(['1층:필로티(가정)·공용', '2층:다세대주택', '3층:다세대주택', '4층:다세대주택', '5층:다세대주택'])
    expect(r.status.stats[2].value).toBe('4개층 · 378.24㎡')
    expect(r.status.notes.join(' ')).toContain('필로티(주차 전용)로 가정')
  })

  it('2장: 주차 세대기준 6.1, 실제 8, 여유 1.9', async () => {
    const r = await build(T1)
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['주택(제5호) 세대기준']).toBe('6.1대')
    expect(byLabel['실제 주차 (대장)']).toBe('8대')
    expect(byLabel['기존 여유']).toBe('1.9대')
  })

  it('3장: 증축안 없음(주택 층수) → 대안 검토, 표지 3세대 여유·확인 필요', async () => {
    const r = await build(T1)
    expect(r.plan.kind).toBe('none')
    expect(r.summary.kpis[1].value).toBe('3세대 여유')
    expect(r.summary.kpis[3].value).toBe('확인 필요')
  })
})

describe('T2 보고서', () => {
  it('1장: 1층 필로티(가정), 2~5층 다세대, 6층 사무소, 주택 4개층·633.59㎡, 외필지 안내', async () => {
    const r = await build(T2)
    const uses = r.status.floorUses.map((f) => `${f.floorLabel}:${f.uses}`)
    expect(uses.slice(-5)).toEqual(['2층:다세대주택', '3층:다세대주택', '4층:다세대주택', '5층:다세대주택', '6층:사무소'])
    expect(r.status.stats[2].value).toBe('4개층 · 633.59㎡')
    expect(r.status.notes.join(' ')).toContain('외필지 3개')
    expect(r.status.notes.join(' ')).toContain('1층은 필로티')
  })

  it('2장: 주차 세대기준 9.9 + 근생 0.6 = 10.5, 여유 0.5', async () => {
    const r = await build(T2)
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['주택(제5호) 세대기준']).toBe('9.9대')
    expect(byLabel['근린생활시설(제3호)']).toBe('0.6대')
    expect(byLabel['현재 법정 대수']).toBe('10.5대')
    expect(byLabel['기존 여유']).toBe('0.5대')
  })

  it('3장: 증축안 없음 → 주택 층수 대안 검토, 표지 판정 확인 필요', async () => {
    const r = await build(T2)
    expect(r.plan.kind).toBe('none')
    expect(r.plan.alternatives.length).toBeGreaterThan(1)
    expect(r.summary.kpis[3].value).toBe('확인 필요')
    expect(r.summary.kpis[1].value).toBe('1세대 여유')
  })

  it('정북 이격 미입력 → 일조 확인 필요 문장, 필요 이격 10.15m', async () => {
    const r = await build(T2)
    expect(r.regulation.sunlight.join(' ')).toContain('10.15m')
    expect(r.regulation.sunlight.join(' ')).toContain('확인 필요')
  })
})

describe('부록: 데이터 출처 (기준 엑셀 시트명)', () => {
  it('엑셀 시트 5개와 수기입력 항목, 엑셀 파일명이 나온다', async () => {
    const r = await build(T1)
    const sources = r.appendix.sourceRows.map((row) => row[1]).join(' ')
    for (const sheet of ['건축물대장_2단계', '지역지구구역_2단계', '전유공용면적_2단계', '주차대수_세대별', '용적률완화_주차검토']) {
      expect(sources).toContain(`'${sheet}' 시트`)
    }
    expect(r.appendix.sourceRows.find((row) => row[0] === '정북 이격거리')![2]).toBe('미입력 — 확인 필요')
    expect(r.appendix.sourceFile).toContain('261007_데이터 통합')
    expect(r.appendix.excelNotes).toHaveLength(4)
  })

  it('시나리오 5개, B는 용적률 상한 교체로 표시 (배수 아님)', async () => {
    const r = await build(T1)
    expect(r.appendix.scenarioRows).toHaveLength(5)
    expect(r.appendix.scenarioRows[2][1]).toContain('용적률 상한 250%')
    expect(r.appendix.ruleRows[1][1]).toBe('제2종일반주거 200→250%, 제3종일반주거 250→300%')
  })
})

