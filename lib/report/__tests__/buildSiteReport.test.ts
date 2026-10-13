// 보고서 1·2·3장 조립 — 숫자가 runAll·기준 엑셀(설계서 12-2)과 같은지
import { describe, expect, it } from 'vitest'
import { runAll } from '@/lib/calc'
import { calcExpansion } from '@/lib/calc/expansion'
import { deepMerge, getEffectiveRules } from '@/lib/rules/scenarios'
import { getSiteData } from '@/lib/services/mockService'
import type { ViewScenarioId } from '@/types'
import { buildSiteReport } from '../buildSiteReport'

const T1 = '1156011600001040010'
const DANGSAN = '1156011600001040048' // 104-48 당산빌: 2026-10-07 T1에서 제외, 주차 추가 확보 경로 회귀 테스트
const T2 = '1156011600001100019'
const build = async (pnu: string, id: ViewScenarioId = 'ALL') => {
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

  it('[테스트 규칙] 표지: 조건부 가능, +1층 · +29.5㎡ (주차 +1대 조건, 증축층 바닥면적 옵션1)', async () => {
    const r = await buildConditional()
    expect(r.summary.kpis[0].value).toBe('+1층 · +29.5㎡')
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
    expect(r.regulation.relaxRows[0].slice(1)).toEqual(['200%', '250%']) // 완화 시나리오 열 없음
    expect(r.regulation.relaxRows[0][0]).toBe('용적률 상한 (제2종일반주거지역)')
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['단독·다중주택(제4호)']).toBe('1.6대')
    expect(byLabel['근린생활시설(제3호)']).toBe('1.3대')
    expect(byLabel['현재 법정 대수']).toBe('2.9대')
    expect(byLabel['여유 주차대수']).toBe('0.1대')
    // 현행법규 + 이 보고서(증축 = ALL)의 시나리오 행만
    expect(r.regulation.scenarioRows.map((row) => row[0])).toEqual(['현행법규', '복합 완화'])
    expect(r.regulation.selectedRow).toBe(1)
  })

  it('[테스트 규칙] 3장: 주차 1대 추가 조건 증축안, 증축 면적 = expansion.addGfaM2', async () => {
    const r = await buildConditional()
    expect(r.plan.kind).toBe('parkingOption')
    expect(r.plan.plan).toBe(r.analysis.selected.parkingOption)
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(29.529, 3)
    expect(r.regulation.checkItems).toContain('주차 1대 추가 확보 시 대지 내 배치 가능 여부')
  })
})

describe('T1 104-10 렉스빌 보고서', () => {
  it('1장: 1층 필로티(가정), 2~5층 다세대, 주택 4개층·378.24㎡', async () => {
    const r = await build(T1)
    const uses = r.status.floorUses.map((f) => `${f.floorLabel}:${f.uses}`)
    expect(uses).toEqual(['1층:필로티(가정)·공용', '2층:다세대주택', '3층:다세대주택', '4층:다세대주택', '5층:다세대주택'])
    expect(r.status.stats[2].value).toBe('4개층 · 378.24㎡')
    expect(r.status.notes.join(' ')).not.toContain('필로티') // 필로티 가정 문구 삭제
    expect(r.status.stats.map((k) => k.label)).toEqual(['용적률', '추가확보 가능면적', '주택 현황', '주차'])
    expect(r.status.stats[0].caption).toBe('현행 용적률 최대 200%')
    expect(r.status.stats[1].caption).toBe('용적률 완화 시 120.51㎡')
    expect(r.status.stats[3].caption).toBe('법정 6.1대\n여유 주차 1.9대')
  })

  it('2장: 주차 세대기준 6.1, 실제 8, 여유 1.9', async () => {
    const r = await build(T1)
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['주택(제5호) 세대기준']).toBe('6.1대')
    expect(byLabel['실제 주차 (대장)']).toBe('8대')
    expect(byLabel['여유 주차대수']).toBe('1.9대')
  })

  it('3장 ALL: 기존 주차 증축안 +1층 · 증축계획안 엑셀 29.8㎡ · 옥탑 2세대, 표지 증축 가능', async () => {
    const r = await build(T1)
    expect(r.plan.kind).toBe('existing')
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(29.8, 3)
    expect(r.plan.plan!.sideGfaM2).toBe(0)
    expect(r.summary.kpis[0].value).toBe('+1층 · +29.8㎡')
    expect(r.summary.kpis[0].caption).toBeNull()
    // 수익성이 계산되면 표지 KPI = 규모 · 총사업비 · ROI · 회수기간 (설계서 11장), 판정은 회수기간 보조 문구
    expect(r.summary.kpis.map((k) => k.label)).toEqual(['증축 규모', '총사업비', '연간 수익률(ROI)', '투자회수기간 (자산가치 반영)'])
    expect(r.summary.kpis[1].value).toBe('7,831만원')
    expect(r.summary.kpis[2].value).toBe('21.4%')
    expect(r.summary.kpis[3].caption).toBeNull() // 투자회수기간 하단 작은 글자 삭제
    expect(r.summary.kpis[1].caption).toBe('자기자본 20% · 대출 80%') // 금액 대신 퍼센트
    expect(r.summary.conclusion).toBe('일조권 사선제한 및 층수제한 완화 적용 시 +1층(29.8㎡) 증축이 가능합니다. 제한요인: 주택 층수')
    expect(r.meta.scenarioLabel).toBe('일조권 사선제한 및 층수제한 완화')
  })

  it('3장 BASE(다세대 4개층 한도): 증축안 없음 → 대안 검토, 표지 1세대 여유·확인 필요', async () => {
    const r = await build(T1, 'BASE')
    expect(r.plan.kind).toBe('none')
    expect(r.summary.kpis[1].value).toBe('1세대 여유')
    expect(r.summary.kpis[3].value).toBe('확인 필요')
  })
})

describe('T2 보고서', () => {
  it('1장: 1층 필로티(가정), 2~5층 다세대, 6층 사무소, 주택 4개층·633.59㎡, 외필지는 토지가액 추정 안내만', async () => {
    const r = await build(T2)
    const uses = r.status.floorUses.map((f) => `${f.floorLabel}:${f.uses}`)
    expect(uses.slice(-5)).toEqual(['2층:다세대주택', '3층:다세대주택', '4층:다세대주택', '5층:다세대주택', '6층:사무소'])
    expect(r.status.stats[2].value).toBe('4개층 · 633.59㎡')
    expect(r.status.notes.join(' ')).toContain('외필지 3개')
    expect(r.status.notes.join(' ')).not.toContain('1층은 필로티')
  })

  it('2장: 주차 세대기준 9.9 + 근생 0.6 = 10.5, 여유 0.5', async () => {
    const r = await build(T2)
    const byLabel = Object.fromEntries(r.regulation.parkingRows.map((row) => [row[0], row[2]]))
    expect(byLabel['주택(제5호) 세대기준']).toBe('9.9대')
    expect(byLabel['근린생활시설(제3호)']).toBe('0.6대')
    expect(byLabel['현재 법정 대수']).toBe('10.5대')
    expect(byLabel['여유 주차대수']).toBe('0.5대')
  })

  it('3장 ALL: 기존 주차 증축안 +1층 · 증축계획안 엑셀 69.3㎡(세대 30 + 확장 39.3) · 1세대, 표지 증축 가능', async () => {
    const r = await build(T2)
    expect(r.plan.kind).toBe('existing')
    expect(r.plan.plan!.addGfaM2).toBeCloseTo(69.3, 2)
    expect(r.summary.kpis[3].caption).toBeNull() // 투자회수기간 하단 작은 글자 삭제
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
    expect(r.appendix.sourceFile).toContain('261012_데이터 통합')
    expect(r.appendix.excelNotes).toHaveLength(4)
  })

  it('부록 시나리오 표: 현행 법규 + 이 보고서의 시나리오만, ALL은 용적률 상한 교체로 표시 (배수 아님)', async () => {
    const r = await build(T1)
    expect(r.appendix.scenarioRows.map((row) => row[0])).toEqual(['현행 법규', '복합 완화'])
    expect(r.appendix.scenarioRows[1][1]).toContain('용적률 상한 250%')
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

  it('T1: 수정할 데이터 목록에 정북 이격(미입력)·증축층 면적(옵션1 자동 산정 53.83㎡)', async () => {
    const todo = (await build(T1)).verification.todoRows
    expect(todo[0]).toEqual(['정북 인접대지 이격거리', '미입력', '확인 필요 — 일조 검토 불가', 'lib/data/siteInputs.json → northSetbackM'])
    expect(todo[1].slice(1, 3)).toEqual(['53.83㎡ (옵션1: 최상층 전용 × 0.9)', '자동 산정 (옵션1)'])
  })

  it('T2: 외필지 3개는 문제로 제기하지 않는다 (2026-10-08 결정 7) — 확인 항목·추가 확인 목록에 없음', async () => {
    const r = await build(T2)
    expect(r.verification.todoRows.some((row) => row[0].startsWith('외필지'))).toBe(false)
    expect(r.regulation.checkItems.some((c) => c.includes('외필지'))).toBe(false)
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

  it('T2: 추정 배지 + 구성 필지 참고 항목 (문제 아님)', async () => {
    const r = await build(T2)
    expect(r.status.land.badge).toBe('추정')
    expect(r.status.land.exactText).toBe('1,777,075,300원')
    expect(r.verification.todoRows.some((row) => row[0] === '토지가액 구성 필지' && row[2] === '추정 (참고, 문제 아님)')).toBe(true)
  })

  it('3장 자산가치 표: 토지가액 행에 공시 기준, 합계 = runAll asset 값', async () => {
    const r = await build(T1)
    const [landRow, , addRow, totalRow] = r.asset.rows
    expect(landRow[3]).toContain('시세 아님')
    expect(landRow[3]).toContain('[면적 확인 필요]')
    expect(addRow[2]).toBe('72,116,003원') // 증축 공사비 전액 = 29.8㎡ ÷ 3.305785 × 800만원
    expect(addRow[3]).toContain('증축 공사비 전액')
    expect(totalRow.slice(1, 3)).toEqual(['1,867,535,499원', '1,939,651,502원']) // 표는 원 단위 정확값 (항목 합 = 합계)
    expect(r.asset.yieldNote).toContain('토지 포함 수익률')
  })
})

describe('5장 수익(토지·자산가치) KPI · 부록 공시지가 출처', () => {
  it('T1·T2 5장 KPI = runAll asset 값', async () => {
    const t1 = (await build(T1)).asset.kpis.map((k) => k.value)
    expect(t1).toEqual(['10.6억원', '18.7억원', '19.4억원', '7,212만원'])
    const t2 = (await build(T2)).asset.kpis.map((k) => k.value)
    expect(t2).toEqual(['17.8억원', '35.5억원', '37.2억원', '1.7억원'])
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

  it('T2 증축 면적은 0장과 같은 소수 첫째 자리 (69.3㎡ = 증축계획안 엑셀)', async () => {
    const r = await build(T2)
    expect(r.asset.kpis[3].caption).toBe('증축 69.3㎡')
    expect(r.summary.kpis[0].value).toContain('69.3㎡')
  })
})

describe('4장 사업비 · 5장 수익 · 부록 가정값 (2026-10-08 결정 1~6·12)', () => {
  it('T1 ALL: 4장 사업비 표 마지막 행 = 총사업비 = runAll finance 값, 입력 대기 항목 표시', async () => {
    const r = await build(T1)
    const fin = r.analysis.finance.byScenario.BASE
    expect(r.finance.status).toBe('ok')
    const total = r.finance.costRows[r.finance.costRows.length - 1]
    expect(total[0]).toBe('총사업비')
    expect(total[1]).toBe(`${fin.totalCostWon!.toLocaleString('ko-KR')}원`)
    expect(r.finance.costRows.find((row) => row[0] === '공사 중 임대 손실')![1]).toBe('입력 대기')
  })

  it('T1 ALL: 5장 KPI·시나리오 표 = runAll 값, 보수 전환율은 법정 상한', async () => {
    const r = await build(T1)
    expect(r.finance.kpis[0]).toMatchObject({ label: '단순 ROI', value: '21.4%' })
    expect(r.finance.revenueRows.map((row) => row[0])).toContain('관리비 수입')
    expect(r.finance.inputNotes).toContain('증축공사비 단가는 층별로 달라지므로 엑셀데이터 참고할 것')
    expect(r.finance.scenarioRows.map((row) => row[0])).toEqual(['보수', '기준', '낙관'])
    expect(r.finance.scenarioRows[0][1]).toBe('6.0% (고정)') // 보수도 6.0% 고정 (법정 상한 5.0%는 참고)
    expect(r.finance.unitRows).toHaveLength(2) // 새 세대 2 (T1은 측면 확장분 없음)
    expect(r.finance.bandRows).toHaveLength(3) // 보증금·월세·월 환산 (전용면적 구간 없음)
    expect(r.finance.bandRows.map((row) => row[0])).toEqual(['보증금', '월세', '월 환산 임대료 (보증금 1,000만원당 월 5만원)'])
    expect(r.finance.bandRows[2].slice(2, 4)).toEqual(['11.4만원 + 15.2만원 × 평', '+15.2만원'])
    expect(r.finance.bandNote).toContain('113건')
    expect(r.finance.bandNote).toContain('R² 0.49')
    expect(r.finance.bandNote).toContain('최소 임대면적 2.17평')
  })

  it('증축안이 없으면(T1 BASE) 4·5장은 계산 생략 안내, 표지 KPI는 규모·세대·주차·판정 유지', async () => {
    const r = await build(T1, 'BASE')
    expect(r.finance.status).toBe('none')
    expect(r.finance.statusText).toContain('계산하지 않았습니다')
    expect(r.summary.kpis.map((k) => k.label)).toEqual(['증축 규모', '추가 세대', '주차', '판정'])
  })

  it('부록 가정값 표: 등급 C 항목도 범위와 함께 출력 (결정 4), 전환율 표 2행', async () => {
    const a = (await build(T2)).appendix
    const vacancy = a.assumptionRows.find((row) => row[0] === '공실률')!
    expect(vacancy.slice(1, 4)).toEqual(['5.00%', '10.00% ~ 3.00%', 'C 프로젝트 가정'])
    const rate = a.assumptionRows.find((row) => row[0] === '한국은행 기준금리')!
    expect(rate[3]).toBe('A 공식')
    expect(a.conversionRows.map((row) => row[0])).toEqual(['주택 (연립·다세대)', '상가·사무실 (주거 외)'])
    expect(a.conversionRows[0].slice(1, 5)).toEqual(['5.0%', '6.0%', '6.0%', '6.0%']) // 법정 상한(참고), 시장 입력값, 보수·기준 적용 모두 6.0% 고정
  })
})

describe('6장 시나리오·민감도 (T1)', () => {
  it('ALL: 비교표 ROI 행·NPV 표·토네이도 기준 ROI가 runAll 값과 같다', async () => {
    const data = (await getSiteData(T1))!
    const a = runAll(data, 'ALL')
    const r = buildSiteReport(data, a, '2026-10-12')
    const s = r.scenario
    expect(s.status).toBe('ok')
    const roi = (id: 'CONSERVATIVE' | 'BASE' | 'OPTIMISTIC') => `${(a.finance.byScenario[id].metrics.roi! * 100).toFixed(1)}%`
    expect(s.compareRows.find((row) => row[0] === '단순 ROI')!.slice(1)).toEqual([roi('CONSERVATIVE'), roi('BASE'), roi('OPTIMISTIC')])
    expect(s.baseRoi).toBe(a.finance.byScenario.BASE.metrics.roi)
    expect(s.tornado.length).toBe(a.finance.sensitivity!.items.length)
    expect(s.cashflow).toHaveLength(20)
    expect(s.years).toBe(20)
    expect(s.cashflowScenarioRows).toHaveLength(3)
  })

  it('BASE(증축안 없음): 계산 생략 안내', async () => {
    const r = await build(T1, 'BASE')
    if (r.finance.status === 'none') {
      expect(r.scenario.status).toBe('none')
      expect(r.scenario.statusText).toContain('3장 대안 검토')
    }
  })
})

describe('7장 리스크 (규칙 기반)', () => {
  it('T1 ALL: 위험도 높은 순 정렬, 구조·일조(이격 미입력)·주차 포함, 법규 완화 미시행·구분소유자 동의는 없음', async () => {
    const r = await build(T1, 'ALL')
    const items = r.risk.items
    const order = { 높음: 0, 중간: 1, 낮음: 2 } as const
    for (let i = 1; i < items.length; i++) expect(order[items[i - 1].level]).toBeLessThanOrEqual(order[items[i].level])
    const by = (t: string) => items.find((x) => x.title.startsWith(t))!
    expect(by('구조안전').description).toContain('경과 18년')
    expect(items.some((x) => x.title.includes('구분소유자'))).toBe(false)
    expect(items.some((x) => x.title.startsWith('법규 완화'))).toBe(false)
    expect(by('일조').level).toBe('중간') // 정북 이격 미입력
    expect(by('일조').description).toContain('확인 필요')
    expect(items.every((x) => x.mitigation.length > 0)).toBe(true)
    expect(r.risk.summary).toContain('높음')
  })

  it('REBUILD: 이주·철거와 공사 중 임대 손실 리스크 높음 (계산한 금액을 총사업비에 포함, 철거비는 공사비에 포함)', async () => {
    const rb = await build(T1, 'REBUILD')
    const item = rb.risk.items.find((x) => x.title.startsWith('이주'))!
    expect(item.level).toBe('높음')
    expect(item.description).toContain('철거비는 신축 공사비에 포함')
    expect(rb.risk.items.some((x) => x.title.includes('구분소유자'))).toBe(false)
  })
})

describe('8~10장 일정·협업·다음 단계', () => {
  it('T1 ALL: 증축 일정 — 공사 기간은 가정값(2개월), 단계가 연속, 공사비 금액은 runAll 값', async () => {
    const data = (await getSiteData(T1))!
    const a = runAll(data, 'ALL')
    const r = buildSiteReport(data, a, '2026-10-12')
    const s = r.schedule
    expect(s.status).toBe('ok')
    expect(s.steps.some((x) => x.name === '이주·철거')).toBe(false)
    const construction = s.steps.find((x) => x.name === '공사')!
    expect(construction.durationMonths).toBe(a.finance.byScenario.BASE.assumptions.find((x) => x.key === 'constructionMonths')!.value)
    for (let i = 1; i < s.steps.length; i++) expect(s.steps[i].startMonth).toBe(s.steps[i - 1].startMonth + s.steps[i - 1].durationMonths)
    const last = s.steps[s.steps.length - 1]
    expect(s.totalMonths).toBe(last.startMonth + last.durationMonths)
    expect(construction.costNote).toContain('공사비')
    expect(construction.costNote).toContain('금융비용')
  })

  it('REBUILD: 이주·철거 단계 포함, 공사 기간 = 재건축 공사 기간', async () => {
    const data = (await getSiteData(T1))!
    const a = runAll(data, 'REBUILD')
    const s = buildSiteReport(data, a, '2026-10-12').schedule
    expect(s.steps.some((x) => x.name === '이주·철거')).toBe(true)
    expect(s.steps.find((x) => x.name === '공사')!.durationMonths).toBe(
      a.finance.byScenario.BASE.assumptions.find((x) => x.key === 'rebuildConstructionMonths')!.value,
    )
  })

  it('BASE(증축안 없음): 일정 생략. 협업·다음 단계는 항상 있음', async () => {
    const r = await build(T1, 'BASE')
    if (r.finance.status === 'none') {
      expect(r.schedule.status).toBe('none')
      expect(r.nextStep.decisionNow).toContain('제한한 요인')
    }
    expect(r.partners.map((p) => p.role)).toEqual(['건축사 (설계사무소)', '구조기술사', '시공사', '감정평가사·부동산 중개', '금융기관']) // 법무사·변호사, 세무사·회계사 삭제
    expect(r.nextStep.steps).toHaveLength(3)
  })

  it('T1 ALL: 지금 결정할 한 가지 = 구조안전진단 의뢰 (동의 항목 없음)', async () => {
    const r = await build(T1, 'ALL')
    expect(r.nextStep.decisionNow).toContain('구조안전진단')
    expect(r.nextStep.decisionNow).not.toContain('구분소유자')
    expect(r.nextStep.checklist.length).toBeGreaterThan(0)
  })
})

describe('보고서 제목 (2026-10-12)', () => {
  it('재건축 시나리오는 "재건축 사업 검토 보고서", 증축은 "증축 사업 타당성 검토 보고서"', async () => {
    expect((await build(T1, 'ALL')).meta.title).toBe('렉스빌 증축 사업 타당성 검토 보고서')
    expect((await build(T1, 'REBUILD')).meta.title).toBe('렉스빌 재건축 사업 검토 보고서')
    expect((await build(T2, 'REBUILD')).meta.title).toContain('재건축 사업 검토 보고서')
  })
})
