// 보고서 1·2·3장 조립 — 숫자가 runAll·기준 엑셀(설계서 12-2)과 같은지
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcExpansion } from '@/lib/calc/expansion'
import { deepMerge, getEffectiveRules } from '@/lib/rules/scenarios'
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

/** 테스트 전용: 104-48을 'ALL + 다중주택 4개층' 규칙으로 계산한 보고서 (주차 추가 확보 증축안 경로 검증, 실제 시나리오 아님) */
async function buildConditional() {
  const data = (await getSiteData(DANGSAN))!
  const analysis = runAll(data, 'ALL')
  const rules = deepMerge(getEffectiveRules('ALL'), { housing: { maxFloors: { 다중주택: 4 } } })
  const selected = calcExpansion(
    { scenarioId: 'ALL', site: data.site, units: data.units, netRatio: data.review.netRatio!, siteInput: data.siteInput },
    rules,
  )
  return buildSiteReport(data, { ...analysis, selected, byScenario: { ...analysis.byScenario, ALL: selected } }, '2026-10-07')
}

describe('104-48 보고서 (참고)', () => {
  it('실제 규칙: 표지 확인 필요, 3장 대안 검토', async () => {
    const r = await build(DANGSAN)
    expect(r.summary.kpis[3].value).toBe('확인 필요')
    expect(r.plan.kind).toBe('none')
  })

  it('[테스트 규칙] 표지: 조건부 가능, +1층 · +100.9㎡ (주차 +1대 조건)', async () => {
    const r = await buildConditional()
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

  it('2장: 현행→완화 4줄(용적률·주택 층수·주택 연면적·일조 수직), 주차 산정 단독 1.6 + 근생 1.3 = 2.9, 여유 0.1', async () => {
    const r = await build(DANGSAN)
    expect(r.regulation.relaxRows).toHaveLength(4)
    expect(r.regulation.relaxRows[0].slice(1)).toEqual(['200%', '250%', 'B, ALL'])
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['단독·다중주택(제4호)']).toBe('1.6대')
    expect(byLabel['근린생활시설(제3호)']).toBe('1.3대')
    expect(byLabel['현재 법정 대수']).toBe('2.9대')
    expect(byLabel['기존 여유']).toBe('0.1대')
    expect(r.regulation.scenarioRows).toHaveLength(5)
    expect(r.regulation.selectedRow).toBe(4)
  })

  it('[테스트 규칙] 3장: 주차 1대 추가 조건 증축안, 증축 면적 = expansion.addGfaM2', async () => {
    const r = await buildConditional()
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

  it('3장 ALL: 기존 주차 증축안 +1층 · 99.27㎡ · 3세대, 표지 증축 가능', async () => {
    const r = await build(T1)
    expect(r.plan.kind).toBe('existing')
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(99.27, 2)
    expect(r.summary.kpis[0].value).toBe('+1층 · +99.3㎡')
    expect(r.summary.kpis[1].value).toBe('3세대')
    expect(r.summary.kpis[3].value).toBe('증축 가능')
  })

  it('3장 B(다세대 4개층 한도): 증축안 없음 → 대안 검토, 표지 3세대 여유·확인 필요', async () => {
    const r = await build(T1, 'B')
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

  it('3장 ALL: 기존 주차 증축안 +1층 · 36.25㎡ · 1세대, 표지 증축 가능', async () => {
    const r = await build(T2)
    expect(r.plan.kind).toBe('existing')
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(36.25, 2)
    expect(r.summary.kpis[3].value).toBe('증축 가능')
  })

  it('3장 BASE: 증축안 없음 → 주택 층수 대안 검토, 표지 1세대 여유·확인 필요', async () => {
    const r = await build(T2, 'BASE')
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

describe('부록 2: 데이터 검증', () => {
  it('T1·T2 모두 엑셀 10개 항목 일치', async () => {
    for (const pnu of [T1, T2]) {
      const v = (await build(pnu)).verification
      expect(v.parityRows).toHaveLength(10)
      expect(v.allMatch).toBe(true)
    }
  })

  it('T1: 수정할 데이터 목록에 정북 이격(미입력)·증축층 면적(최상층 5층 전유 59.81㎡)', async () => {
    const todo = (await build(T1)).verification.todoRows
    expect(todo[0]).toEqual(['정북 인접대지 이격거리', '미입력', '확인 필요 — 일조 검토 불가', 'lib/data/siteInputs.json → northSetbackM'])
    expect(todo[1][1]).toBe('건축면적 99.27㎡로 가정 (최상층 5층 전유 59.81㎡)')
  })

  it('T2: 외필지 3개 확인 항목 포함', async () => {
    const todo = (await build(T2)).verification.todoRows
    expect(todo.some((r) => r[0] === '외필지 3개')).toBe(true)
  })
})

describe('1장 토지가액·3장 자산가치 — 공시지가 기준 표기 (설계서 5-4 [0], [C\'])', () => {
  it('T1: 면적 확인 필요 배지 + 시세 아님·기준연월·공시일 표기', async () => {
    const land = (await build(T1)).status.land
    expect(land.badge).toBe('면적 확인 필요')
    expect(land.exactText).toBe('1,062,372,000원')
    expect(land.basisNote).toBe('개별공시지가 기준 (시세 아님) · 2026년 1월 1일 기준 · 2026-04-30 공시')
    expect(land.notes.join(' ')).toContain('건축물대장 대지면적: 199.5㎡')
  })

  it('T2: 추정 배지 + 구성 필지 확인 항목', async () => {
    const r = await build(T2)
    expect(r.status.land.badge).toBe('추정')
    expect(r.status.land.exactText).toBe('1,777,075,300원')
    expect(r.verification.todoRows.some((row) => row[0] === '토지가액 구성 필지' && row[2] === '추정')).toBe(true)
  })

  it('3장 자산가치 표: 토지가액 행에 공시 기준, 합계 = runAll asset 값', async () => {
    const r = await build(T1)
    const [landRow, , addRow, totalRow] = r.asset.rows
    expect(landRow[3]).toContain('시세 아님')
    expect(landRow[3]).toContain('[면적 확인 필요]')
    expect(addRow[2]).toBe('198,540,000원')
    expect(totalRow.slice(1, 3)).toEqual(['1,546,519,200원', '1,745,059,200원']) // 표는 원 단위 정확값 (항목 합 = 합계)
    expect(r.asset.yieldNote).toContain('수익성 단계')
  })
})

describe('5장 수익(토지·자산가치) KPI · 부록 공시지가 출처', () => {
  it('T1·T2 5장 KPI = runAll asset 값', async () => {
    const t1 = (await build(T1)).asset.kpis.map((k) => k.value)
    expect(t1).toEqual(['10.6억원', '15.5억원', '17.5억원', '2억원'])
    const t2 = (await build(T2)).asset.kpis.map((k) => k.value)
    expect(t2).toEqual(['17.8억원', '29.9억원', '30.6억원', '7,251만원'])
  })

  it('부록 데이터 출처: 개별공시지가_2단계 + 기준연월·공시일·시세 아님', async () => {
    const row = (await build(T2)).appendix.sourceRows.find((r) => r[1].includes('개별공시지가_2단계'))!
    expect(row[2]).toBe('기준연월 2026.01 (2026년 1월 1일 기준) · 공시일 2026-04-30 · 시세 아님')
  })
})

describe('5장 표시 점검 (2026-10-07 숫자 점검 반영)', () => {
  it('증축안이 없으면 증가 "없음", 증축 건물가치 "–"', async () => {
    const r = await build(T1, 'BASE')
    expect(r.asset.kpis[3].value).toBe('없음')
    expect(r.asset.rows[2][2]).toBe('–')
  })

  it('T2 증축 면적은 0장과 같은 소수 첫째 자리 (36.3㎡)', async () => {
    const r = await build(T2)
    expect(r.asset.kpis[3].caption).toBe('증축 36.3㎡')
    expect(r.summary.kpis[0].value).toContain('36.3㎡')
  })
})
