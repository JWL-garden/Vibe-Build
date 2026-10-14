// 기준 엑셀 필지 보고서 조립 (설계서 11장, 12-4)
// runAll 결과(SiteAnalysis)와 기준 엑셀 묶음(SiteData)을 보고서 장별 표·문장으로 바꾼다.
// 새로 계산하지 않고, 엑셀 값을 층별로 모으거나 표시 문자열로 바꾸는 일만 한다.

import { judgeSite, LIMIT_LABEL } from '@/lib/calc'
import { compareWithExcel, PARITY_TOLERANCE } from '@/lib/calc/excelParity'
import { formatNumber, formatRate, formatWon, formatWonExact, textOrEmpty, withUnit } from '@/lib/format'
import { buildingValueRule, landValueRule } from '@/lib/rules/financeDefaults'
import { policyNotes } from '@/lib/rules/policies'
import { getScenario, getViewScenario, HOME_SCENARIO_NAME, viewScenarios } from '@/lib/rules/scenarios'
import { describeOverrides } from './describeOverrides'
import { FINANCE_SCENARIO_LABEL, assetPaybackValue, assumptionRows, conversionRows, financeSection } from './financeSection'
import { buildSiteNextStep } from './nextStep'
import { sitePartners } from './partners'
import { buildSiteRisks } from './risks'
import { buildSiteSchedule } from './schedule'
import { scenarioSection } from './scenarioSection'
import { LAND_BADGE, landAreaSource, landBasisNote } from './landText'
import type {
  ExcelSite,
  ExcelUnit,
  FloorUseRow,
  HousingType,
  Kpi,
  ViewScenarioId,
  LimitingFactor,
  ReportRow,
  LandValueResult,
  RebuildResult,
  SiteAnalysis,
  SiteAssetSection,
  SiteData,
  SiteLandSection,
  SiteExpansionResult,
  SitePlanSection,
  SiteReport,
} from '@/types'

const f = (v: number, digits = 2) => formatNumber(v, digits)

/** 화면 ⑤단계와 보고서 2장이 함께 쓰는 현행→완화 표 (용적률, 주택 층수, 주택 연면적, 일조 수직 허용 높이) */
export interface RelaxRow {
  label: string
  note: string
  base: string
  relaxed: string
  /** 이 항목을 완화하는 시나리오 */
  by: string
  selected: string
  /** 선택 시나리오 값이 현행과 다른지 */
  changed: boolean
}

function ruleValues(e: SiteExpansionResult) {
  const type: HousingType = e.housing.housingType ?? '다세대'
  return {
    far: e.far.farLimitPercent,
    floors: e.rules.housing.maxFloors[type],
    area: e.rules.housing.maxAreaM2[type],
    areaWord: e.rules.housing.areaExclusive[type] ? '미만' : '이하',
    /** 이 건물에 적용한 일조 수직 허용 높이 (m) */
    sunLowHeight: e.sunlight.lowHeightM,
  }
}

/** 완화 값이 적용되는 화면 시나리오 (A·B·C는 ALL의 구성 요소라 화면에 없음) */
const RELAXED_BY = 'ALL, REBUILD'

export function relaxationRows(analysis: SiteAnalysis, zone: string): RelaxRow[] {
  const base = ruleValues(analysis.byScenario.BASE)
  const relaxed = ruleValues(analysis.byScenario.ALL)
  const sel = ruleValues(analysis.selected)
  const type = analysis.selected.housing.housingType
  const housingNote = type ?? '이 건물은 미적용'
  const multiFamily = type === '다가구' || type === '다세대'
  return [
    {
      label: '용적률 상한',
      note: zone,
      base: `${f(base.far, 0)}%`,
      relaxed: `${f(relaxed.far, 0)}%`,
      by: RELAXED_BY,
      selected: `${f(sel.far, 0)}%`,
      changed: sel.far !== base.far,
    },
    {
      label: '주택 층수',
      note: housingNote,
      base: `${base.floors}개층 이하`,
      relaxed: `${relaxed.floors}개층 이하`,
      by: RELAXED_BY,
      selected: `${sel.floors}개층 이하`,
      changed: sel.floors !== base.floors,
    },
    {
      label: '주택 연면적',
      note: housingNote,
      base: `${f(base.area, 0)}㎡ ${base.areaWord}`,
      relaxed: `${f(relaxed.area, 0)}㎡ ${relaxed.areaWord}`,
      by: RELAXED_BY,
      selected: `${f(sel.area, 0)}㎡ ${sel.areaWord}`,
      changed: sel.area !== base.area || sel.areaWord !== base.areaWord,
    },
    {
      label: '일조 수직 허용 높이 (건축법 개정안 26.11.12 기준)',
      note: multiFamily ? `${type} — 기준 높이 이상 부분은 높이의 1/2 이상 이격 (H/2)` : '다가구·다세대만 적용 (이 건물은 미적용)',
      base: `현행 ${f(base.sunLowHeight)}m 이상 : H/2`,
      relaxed: `완화 ${f(relaxed.sunLowHeight)}m 이상 : H/2`,
      by: RELAXED_BY,
      selected: `${f(sel.sunLowHeight)}m 이상 : H/2`,
      changed: sel.sunLowHeight !== base.sunLowHeight,
    },
  ]
}

/** 기준 엑셀 대장 값 → 건축물 정보 표 */
export function rowsFromExcelSite(s: ExcelSite): { label: string; value: string }[] {
  const p = s.parking
  return [
    { label: '대지위치', value: s.address },
    { label: '도로명', value: textOrEmpty(s.roadAddress) },
    { label: '용도지역', value: textOrEmpty(s.zone) },
    { label: '대지면적', value: withUnit(s.siteAreaM2, '㎡') + (s.outsideParcels > 1 ? ` (외필지 ${s.outsideParcels})` : '') },
    { label: '건축면적', value: withUnit(s.buildingAreaM2, '㎡') },
    { label: '건폐율', value: withUnit(s.bcrPercent, '%') },
    { label: '연면적', value: withUnit(s.totalFloorAreaM2, '㎡') },
    { label: '용적률산정연면적', value: withUnit(s.farFloorAreaM2, '㎡') },
    { label: '용적률', value: withUnit(s.farPercent, '%') },
    { label: '주용도', value: s.mainUse },
    { label: '기타용도', value: textOrEmpty(s.etcUse) },
    { label: '세대수 / 호수', value: `${s.households}세대 / ${s.unitCount}호` },
    { label: '높이 / 층수', value: `${withUnit(s.heightM, 'm')} / 지상 ${s.floorsAbove}층, 지하 ${s.floorsBelow}층` },
    { label: '구조', value: s.structure },
    { label: '승강기', value: `승용 ${s.elevators.passenger}대, 비상용 ${s.elevators.emergency}대` },
    {
      label: '주차 (대장)',
      value: `${p.total}대 (옥내자주 ${p.indoorSelf}, 옥외자주 ${p.outdoorSelf}, 옥내기계 ${p.indoorMechanical}, 옥외기계 ${p.outdoorMechanical})`,
    },
    { label: '사용승인일', value: textOrEmpty(s.approvalDate) },
    {
      label: '내진설계',
      value: s.seismic.applied ? `적용${s.seismic.capacity ? ` (${s.seismic.capacity})` : ''}` : '미적용',
    },
  ]
}

/** 호별 면적(전유공용면적_2단계)을 층별로 모은다 */
export function floorUseRows(units: ExcelUnit[], pilotiFloor1: boolean): { rows: FloorUseRow[]; sharedCommonM2: number } {
  const floors = new Map<string, { order: number; label: string; uses: Set<string>; units: Set<string>; net: number; common: number }>()
  let sharedCommonM2 = 0
  for (const u of units) {
    for (const a of u.areas) {
      if (a.floor === null || a.floor === 0 || (a.floorType !== '지상' && a.floorType !== '지하')) {
        if (a.kind === '공용') sharedCommonM2 += a.areaM2
        continue
      }
      const under = a.floorType === '지하'
      const key = `${under ? 'B' : ''}${a.floor}`
      const row =
        floors.get(key) ??
        // 엑셀 층번호명 표기가 필지마다 달라('5층' / '5') 층번호로 다시 만든다
        { order: under ? -a.floor : a.floor, label: `${under ? '지하' : ''}${a.floor}층`, uses: new Set(), units: new Set(), net: 0, common: 0 }
      if (a.kind === '전유') {
        row.uses.add(u.mainUse)
        row.units.add(u.unitName)
        row.net += a.areaM2
      } else {
        row.common += a.areaM2
      }
      floors.set(key, row)
    }
  }
  const unitText = (names: string[]) =>
    names.length === 0 ? '—' : names.length <= 3 ? names.join(', ') : `${names[0]}~${names[names.length - 1]} (${names.length}호)`
  const rows = [...floors.values()]
    .sort((a, b) => a.order - b.order)
    .map((r) => ({
      floorLabel: r.label,
      uses: r.uses.size > 0 ? [...r.uses].join(', ') : r.order === 1 && pilotiFloor1 ? '필로티(가정)·공용' : '공용',
      units: unitText([...r.units].sort()),
      netM2: r.net,
      commonM2: r.common,
    }))
  return { rows, sharedCommonM2 }
}

const FLOOR_PLATE_METHOD = { option1: '옵션1: 최상층 전용 × 0.9', option2: '옵션2: 입력 엑셀', buildingArea: '건축면적 가정' } as const

/** 증축안이 없을 때 제한요인별 대안 검토 문장 */
const ALTERNATIVES: Record<LimitingFactor, string[]> = {
  housingFloors: [
    '증축층을 주택이 아닌 용도(근린생활시설 등)로 계획하는 방안 — 비주택 주차 기준으로 재산정 필요',
    '주택 층수 산정에서 제외되는 층(필로티·비주택 층) 인정 범위를 인허가권자와 사전 협의',
    '주택 층수 한도를 더 완화하는 정책안이 시행될 경우 재검토',
  ],
  housingArea: ['주택 연면적 한도 완화(C·ALL) 적용 시 재검토', '증축층을 비주택 용도로 계획하는 방안'],
  parking: ['대지 내 주차 추가 배치(기계식 포함) 또는 인근 부설주차장 확보 방안 검토'],
  far: ['용적률 상향(B·ALL) 시나리오가 시행될 경우 재검토'],
  sunlight: ['확인된 정북 이격거리 기준으로 증축 층수·형태 재검토', '상부를 북쪽에서 물려 짓는 계단식(셋백) 증축안 검토'],
  roof: ['현장·도면으로 지붕 형태와 계단실 위치 확인 후 재검토', '기존 건물 위 증축 대신 전체 재건축(재건축 계획안) 검토'],
  other: [],
}
const ALWAYS_ALTERNATIVE = '증축 대신 리모델링·용도변경으로 임대 수익을 높이는 방안'

/** 보고서 2장 추가 확인 항목 (고정 항목) */
const FIXED_CHECK_ITEMS = [
  '수직증축 구조안전(기초·기둥 하중) — 구조기술사 검토',
]

function planSection(analysis: SiteAnalysis): SitePlanSection {
  const e = analysis.selected
  if (analysis.scenarioId === 'REBUILD') {
    const r = analysis.rebuild
    return {
      kind: 'rebuild',
      heading: '전체 재건축안',
      plan: null,
      rebuild: r,
      addSpaces: null,
      alternatives: r.verdict === 'possible' ? [] : [ALWAYS_ALTERNATIVE],
    }
  }
  if (e.plan.verdict === 'possible') {
    return { kind: 'existing', heading: '기존 주차 범위 증축안', plan: e.plan, rebuild: null, addSpaces: null, alternatives: [] }
  }
  const o = e.parkingOption
  if (o?.verdict === 'possible') {
    return {
      kind: 'parkingOption',
      heading: `주차 ${o.addSpaces}대 추가 확보 조건 증축안`,
      plan: o,
      rebuild: null,
      addSpaces: o.addSpaces,
      alternatives: [],
    }
  }
  return {
    kind: 'none',
    heading: '증축안 없음 — 대안 검토',
    plan: null,
    rebuild: null,
    addSpaces: null,
    alternatives: [...ALTERNATIVES[e.plan.limitingFactor], ALWAYS_ALTERNATIVE],
  }
}

/** 1장 토지가액 (runAll의 analysis.land를 표시용으로만 바꾼다) */
/** 필지 PNU(19자리)를 대지위치 주소로: 대표 건물 주소의 동까지 + 본번-부번 */
function addressOfPnu(pnu: string, siteAddress: string): string {
  const head = siteAddress.replace(/\s*산?\d+(-\d+)?번지\s*$/, '')
  const mountain = pnu[10] === '1' ? '산' : ''
  const main = Number(pnu.slice(11, 15))
  const sub = Number(pnu.slice(15, 19))
  return `${head} ${mountain}${main}${sub > 0 ? `-${sub}` : ''}번지`
}

function landSection(land: LandValueResult, siteAddress: string): SiteLandSection {
  const won = formatWonExact
  const areaSource = landAreaSource(land)
  const rows: ReportRow[] = land.lots.map((l) => [addressOfPnu(l.pnu, siteAddress), `${f(l.areaM2)}㎡ (${areaSource})`, `${f(l.pricePerM2, 0)}원/㎡`, won(l.valueWon)])
  if (land.lots.length > 1) rows.push(['합계', `${f(land.areaUsedM2)}㎡`, '', won(land.valueWon!)])
  const notes = [...land.reasons]
  if (land.siteAreaM2 !== null && land.basis !== 'estimated') {
    notes.push(`건축물대장 대지면적: ${f(land.siteAreaM2)}㎡ (용적률·증축 계산에 사용)`)
  }
  notes.push('공시지가는 세금·부담금 산정용 공적 가격으로 시세와 다릅니다. 매매·담보 가치는 감정평가로 확인해야 합니다.')
  return {
    ...LAND_BADGE[land.basis],
    valueText: formatWon(land.valueWon),
    exactText: land.valueWon === null ? '정보 없음' : won(land.valueWon),
    basisNote: landBasisNote(land),
    rows,
    notes,
  }
}

/** 5장 증축 전·후 자산가치 (원가 기준 참고값, runAll의 analysis.asset) */
export function assetSection(analysis: SiteAnalysis): SiteAssetSection {
  const a = analysis.asset
  const b = a.existingBuilding
  const unitText = b.unitCostWon === null ? '신축 단가 입력 대기' : `신축단가표 ${f(b.unitCostWon / 1e4, 1)}만원/㎡`
  const hasAdd = a.addBuilding.gfaM2 > 0
  const rebuild = a.demolished
  // 증축과 재건축은 각각 자기 공사비 전액을 건물가치로 인정한다 (2026-10-12 결정)
  const addNote = !hasAdd
    ? '증축안 없음'
    : a.addBuilding.basis === 'construction'
      ? `${rebuild ? '신축 공사비' : '증축 공사비'} 전액 (${rebuild ? '연면적' : '세대 면적'} ${f(analysis.finance.byScenario[analysis.finance.selected].project.constructionAreaM2, 1)}㎡${!rebuild && a.addBuilding.gfaM2 > analysis.finance.byScenario[analysis.finance.selected].project.constructionAreaM2 + 0.05 ? ` — 기존 세대 확장분 ${f(a.addBuilding.gfaM2 - analysis.finance.byScenario[analysis.finance.selected].project.constructionAreaM2, 1)}㎡ 제외` : ''})`
      : `${rebuild ? '재건축' : '증축'} ${f(a.addBuilding.gfaM2, 1)}㎡ × ${unitText} (공사비 미산정)`
  // 표는 원 단위 정확값 (억 단위 반올림이면 항목 합과 합계가 어긋나 보임), 억 단위 요약은 KPI 카드에만
  const rows: ReportRow[] = [
    [
      '기존 건물가치',
      formatWonExact(b.valueWon),
      rebuild ? '– (철거)' : formatWonExact(b.valueWon),
      `(연면적 ${f(b.gfaM2)}㎡${b.pilotiAreaM2 > 0 ? ` + 필로티 ${f(b.pilotiAreaM2)}㎡` : ''}) × ${unitText} = 재조달원가 ${formatWon(b.replacementCostWon)} × 잔가율 ${formatRate(b.residualRate)} (경과 ${b.ageYears ?? '–'}년, 연 ${formatRate(b.depreciationRatePerYear, 1)} 감가·지수형)`,
    ],
    [
      rebuild ? '신축 건물가치' : '증축 건물가치',
      '–',
      hasAdd ? formatWonExact(a.addBuilding.valueWon) : '–',
      addNote,
    ],
    ['자산가치 합계', formatWonExact(a.beforeWon), formatWonExact(a.afterWon), '건물가치 합계 (원가 기준 참고값)'],
  ]
  const kpis: Kpi[] = [
    { label: '토지가액', value: formatWon(a.land.valueWon), caption: `${LAND_BADGE[a.land.basis].badge} · 공시지가 기준` },
    { label: rebuild ? '자산가치 (재건축 전)' : '자산가치 (증축 전)', value: formatWon(a.beforeWon), caption: '기존 건물' },
    {
      label: rebuild ? '자산가치 (재건축 후)' : '자산가치 (증축 후)',
      value: formatWon(a.afterWon),
      caption: HOME_SCENARIO_NAME[analysis.scenarioId],
    },
    rebuild
      ? {
          label: '증감 (원가 기준)',
          value: a.afterWon === null || a.beforeWon === null ? '정보 없음' : formatWon(a.afterWon - a.beforeWon),
          caption: `신축 ${f(a.addBuilding.gfaM2, 1)}㎡ − 기존 건물 철거`,
        }
      : {
          label: '증가 (원가 기준)',
          value: hasAdd ? formatWon(a.addBuilding.valueWon) : '없음',
          caption: hasAdd ? `증축 ${f(a.addBuilding.gfaM2, 1)}㎡` : '증축안 없음',
        },
  ]
  return {
    kpis,
    rows,
    yieldNote: financeSection(analysis).yieldText,
    notes: [
      ...a.reasons,
      `${buildingValueRule.note}.`,
      `기존 건물 면적은 신축 공사비와 같은 기준(실공사면적: 연면적 + 필로티)입니다. 연 ${formatRate(buildingValueRule.depreciationRatePerYear, 1)} 감가는 서울 연립다세대 헤도닉 모형의 건물연식 계수(−0.011, 국토연구 125호, 2025)로, 토지 + 건물 합산 매매가의 연식 효과라 건물만의 감가율보다 낮을 수 있습니다.`,
      `경과연수 기준일: ${a.baseDate} (기준 데이터 기준일)`,
    ],
  }
}

/** 데이터 검증: 엑셀 '용적률완화_주차검토' 행 대조(시나리오 B) + 수기입력·가정 데이터 목록 */
function buildVerification(data: SiteData, analysis: SiteAnalysis): SiteReport['verification'] {
  const parity = compareWithExcel(data.review, analysis.byScenario.B)
  const show = (v: number | null) => (v === null ? '빈칸' : f(v, 4))
  const input = data.siteInput
  const fp = analysis.selected.floorPlate
  const C = analysis.byScenario.C.rules
  const todoRows: ReportRow[] = [
    [
      '증축층 바닥면적',
      fp.areaM2 === null ? '계산 보류' : `${f(fp.areaM2)}㎡ (${FLOOR_PLATE_METHOD[fp.method]})`,
      { ok: fp.method === 'option2' ? '입력 엑셀 값' : '자동 산정 (옵션1)', blocked: '증축 불가 — 지붕 형태', fallback: '확인 필요 — 호별 면적 없음' }[fp.status],
      "옵션2: 가정값 입력 엑셀 '증축층면적_옵션2' + lib/rules/baseRules.ts floorPlate.method",
    ],
    [
      '1층 필로티 여부',
      input ? (input.pilotiFloor1 ? '필로티' : '필로티 아님') : '미입력',
      input?.source === '수기입력' ? '수기입력' : '가정 — 도면 확인 필요',
      'lib/data/siteInputs.json → pilotiFloor1',
    ],
    [
      '일조 수직 허용 높이 (건축법 개정안 26.11.12 기준)',
      `${f(C.sunlight.multiFamilyLowHeightM ?? C.sunlight.lowHeightM)}m`,
      '건축법 개정안 26.11.12 기준 (시행 전)',
      'lib/rules/scenarios.ts → C.sunlight.multiFamilyLowHeightM',
    ],
    ['건축물 숫자 (대지·연면적·호별 면적·주차)', data.sourceLabel, '기준 엑셀', '엑셀 수정 후 npm run data:excel 재실행'],
    [
      '수익성 가정값 (공사비·임대료·공실·금리 등)',
      `${analysis.finance.byScenario.BASE.assumptions.filter((a) => a.grade === 'C').length}개 항목 등급 C (프로젝트 가정)`,
      '검토 후 확정 필요',
      "가정값 입력 엑셀 '가정값' 시트 → npm run data:excel",
    ],
  ]
  const land = analysis.land
  if (land.basis === 'estimated') {
    todoRows.push(['토지가액 구성 필지', `외필지 ${data.site.outsideParcels}개 목록 없음 — 대표 필지 공시지가 × 대장 대지면적`, '추정 (참고, 문제 아님)', 'lib/data/siteInputs.json → lots (입력하면 정확해짐)'])
  } else if (land.basis === 'mismatch') {
    todoRows.push(['토지대장 면적 ↔ 대장 대지면적', `${f(land.areaUsedM2)}㎡ ↔ ${f(land.siteAreaM2 ?? 0)}㎡`, '면적 확인 필요', '토지대장·건축물대장 확인'])
  }
  todoRows.push([
    '건물가치 가정 (재조달단가·내용연수·잔가율)',
    `신축단가표 단가 · 연 ${formatRate(buildingValueRule.depreciationRatePerYear, 1)} 감가(지수형) · 최저 잔가율 ${formatRate(buildingValueRule.minResidualRate, 0)}`,
    '예시 가정값',
    'lib/rules/financeDefaults.ts → buildingValueRule',
  ])
  return {
    parityRows: parity.map((p) => [p.name, show(p.excel), show(p.calc), p.match ? '일치' : '불일치']),
    allMatch: parity.every((p) => p.match),
    parityNote: `기준 엑셀 '용적률완화_주차검토' 행 ↔ 계산 엔진(시나리오 B, 용적률 완화 상한) — 허용오차 ±${PARITY_TOLERANCE}`,
    todoRows,
  }
}

/** 부록: 시나리오 가정, 적용 기준값, 데이터 출처(기준 엑셀 시트명), 엑셀 산정 근거, 계산식, 면책 */
function buildAppendix(data: SiteData, analysis: SiteAnalysis): SiteReport['appendix'] {
  const base = analysis.byScenario.BASE.rules
  const all = analysis.byScenario.ALL.rules
  const sun = base.sunlight
  const pk = base.parking
  const [s1, s2, s3] = pk.perUnit
  const zone2 = '제2종일반주거지역'
  const zone3 = '제3종일반주거지역'
  const inputText = (v: number | null, unit: string) => (v === null ? '미입력 — 확인 필요' : `${f(v)}${unit} (수기입력)`)

  const ruleRows: ReportRow[] = [
    [
      '정북 일조 사선',
      `높이 ${sun.lowHeightM}m 이하 ${sun.lowSetbackM}m 이격, 초과 부분 높이의 ${sun.ratio}배 이격 (A: ${all.sunlight.ratio}배)`,
      '건축법 시행령 제86조 / A는 프로젝트 가정',
    ],
    [
      '용적률 상한',
      `제2종일반주거 ${base.farLimitByZone[zone2]}→${all.farLimitByZone[zone2]}%, 제3종일반주거 ${base.farLimitByZone[zone3]}→${all.farLimitByZone[zone3]}%`,
      '서울시 도시계획 조례 / B는 프로젝트 가정 (상한 교체)',
    ],
    [
      '주택 층수',
      `다세대 ${base.housing.maxFloors.다세대}→${all.housing.maxFloors.다세대}개층, 다가구 ${base.housing.maxFloors.다가구}→${all.housing.maxFloors.다가구}개층, 다중주택 ${base.housing.maxFloors.다중주택}→${all.housing.maxFloors.다중주택}개층 이하`,
      '건축법 시행령 별표1 / C는 8·13 대책 (다세대 5개층은 프로젝트 해석)',
    ],
    [
      '주택 연면적',
      `${f(base.housing.maxAreaM2.다세대, 0)}㎡ 이하 → 다가구·다세대 ${f(all.housing.maxAreaM2.다세대, 0)}㎡ ${all.housing.areaExclusive.다세대 ? '미만' : '이하'} (다중주택 ${f(all.housing.maxAreaM2.다중주택, 0)}㎡ 이하)`,
      '건축법 시행령 별표1 / C는 8·13 대책',
    ],
    [
      '일조 수직 허용 높이 (다가구·다세대)',
      `${sun.lowHeightM}m → ${all.sunlight.multiFamilyLowHeightM ?? sun.lowHeightM}m`,
      '건축법 개정안 26.11.12 기준 — 17m 이상 부분 높이의 1/2 이상 이격 (H/2)',
    ],
    [
      '주차 — 주택(제5호)',
      `세대당 전용 ${s1.maxNetM2}㎡ 이하 ${s1.spaces}대, ${s2.maxNetM2}㎡ 이하 ${s2.spaces}대, 초과 ${s3.spaces}대 (주택법 기준과 큰 값)`,
      '서울시 주차장 조례 별표2',
    ],
    [
      '주차 — 비주택',
      `근생 ${pk.neighborhoodM2PerSpace}㎡당, 업무 ${pk.officeM2PerSpace}㎡당 1대, 단독·다중 ${pk.detached.minM2}~${pk.detached.baseM2}㎡ ${pk.detached.baseSpaces}대 + 초과 ${pk.detached.extraM2PerSpace}㎡당 1대`,
      '서울시 주차장 조례 별표2, 비고4(복합용도 절사)',
    ],
    ['증축 세대 최소 면적 (옥탑세대, 연면적 = 전용)', `${pk.addedUnitMinNetM2}㎡`, '프로젝트 가정 — 연면적 ÷ 14㎡ = 최대 세대 수 (재건축 신축은 기준 엑셀 15㎡)'],
    ['다가구 가구별 전용면적', `연면적 × ${pk.multiFamilyNetRatio} ÷ 가구수`, '기준 엑셀 가정'],
    ['증축 층고', `${f(base.floorHeightM, 1)}m`, '프로젝트 가정'],
    [
      '전체 재건축',
      `복합 완화 규칙, 최대 건축면적 = 대지 × 건폐율 ${f(analysis.rebuild.bcrLimitPercent, 0)}%, 전용률 ${base.rebuild.netRatio}, 세대당 최소 전용 ${pk.minUnitNetM2}㎡, ${base.rebuild.pilotiFloor1 ? '1층 필로티 주차 + 2층부터 주택' : '1층부터 주택'}`,
      '기준 엑셀 빈땅_신축시나리오 산식 / 건폐율 서울시 조례 / 필로티는 프로젝트 가정',
    ],
    [
      '증축층 바닥면적',
      `옵션1: 전용면적이 있는 최상층의 전용 × ${base.floorPlate.ratio} (최상층에 층 지정 공용면적이 없으면 지붕 확인 — ${base.floorPlate.nonFlatRoofKeywords.join('·')} 표기는 증축 불가) / 옵션2: 가정값 입력 엑셀 값`,
      `적용 ${base.floorPlate.method === 'option1' ? '옵션1' : '옵션2'} — 2026-10-08 결정 (프로젝트 가정)`,
    ],
    [
      '토지가액',
      `Σ(구성 필지 토지대장 면적 × 개별공시지가), 외필지 자료가 없으면 대표 필지 공시지가 × 대장 대지면적(추정), 면적 차이 허용 ${landValueRule.areaToleranceM2}㎡`,
      '공시지가 기준 — 시세 아님',
    ],
    [
      '건물가치 (원가 기준)',
      `기존 = (연면적 + 필로티) × 신축단가표 단가 × exp(−${formatRate(buildingValueRule.depreciationRatePerYear, 1)} × 경과연수), 최저 잔가율 ${formatRate(buildingValueRule.minResidualRate, 0)} / 증축·신축 = 해당 공사비 전액`,
      '예시 가정값 — 감정평가 아님',
    ],
  ]

  // 항목·출처 문구는 261014_부록1_데이터 출처.xlsx 기준 (2026-10-14). 출처 줄 끝 "(도메인)"은 화면에서 링크가 된다. 비고는 기존 값 유지(확정 대기)
  const isRebuild = getViewScenario(analysis.scenarioId).kind === 'rebuild'
  const sourceRows: ReportRow[] = [
    ['대상 건축물 표제부', '건축물대장 표제부, 건축HUB (hub.go.kr)', 'PNU 생성 → 가비지 열 17개 삭제 → 2·3종 필지만 남김, 대지면적 공란은 토지대장으로 보완'],
    ['용도지역', '건축인허가 지역지구구역, 건축HUB (hub.go.kr)\n토지이용계획속성조회, 브이월드 (vworld.kr)', '2·3종 행만 남김 → 두 자료가 다르면 최신 날짜 적용, 걸침 필지는 2종 적용'],
    ['층별·호별 전용/공용 면적', '건축물대장 전유공용면적, 건축HUB (hub.go.kr)', 'PNU 생성 → 대상 필지만 남김 → 호별 전용·공용 합계와 전용률 산출'],
    ['호별 주차 산정 기준', '서울특별시 주차장 조례 별표 2, 주택건설기준 등에 관한 규정, 국가법령정보센터 (law.go.kr)', '세대기준·주택법 중 큰 값, 근생 134㎡당 1대, 반올림 없음'],
    ['전용률·허용연면적·주차 검토', '서울특별시 도시계획 조례, 국가법령정보센터 (law.go.kr)', '대지 × 완화 용적률 상한 − 현재 연면적 → 기존 여유 주차 내 추가 세대 수 산출'],
    ...(isRebuild
      ? [
          [
            '신축 공사비 실적',
            '준공 현장 공사비, 하우빌드 (howbuild.com)\n건설공사비지수, 한국건설기술연구원 (kict.re.kr)',
            '217개 현장 수집 → 2026년 기준 환산과 2025년도 건물신축단가표 (용도별 건물표준단가+부대설비단가 평균) · 한국부동산원 · 2025-11-25 · 철거비 포함 중 높은 값',
          ],
        ]
      : []),
    ['개별공시지가', '개별공시지가속성조회, 브이월드 (vworld.kr)', 'PNU 11번째 자리 보정 후 매칭, 2026.1.1 기준'],
    ['토지대장 지목·면적', '토지임야목록, 브이월드 (vworld.kr)', 'PNU 매칭 → 건축물대장 대지면적과 대조'],
    [
      '토지가액 구성 필지',
      '건축물대장 부속지번, 건축HUB (hub.go.kr)',
      '대표 + 부속 지번 면적 × 공시지가 합산',
    ],
    [
      '정북 이격거리',
      '연속지적도, 브이월드 (vworld.kr)\n건축법 시행령 제86조, 국가법령정보센터 (law.go.kr)',
      '필지 경계로 정북 이격 확인',
    ],
    ['증축층 바닥면적', '건축물대장 전유공용면적·표제부, 건축HUB (hub.go.kr)', '최상층 전용 × 0.9'],
    ['1층 필로티 여부', '건축물대장 층별개요, 건축HUB (hub.go.kr)', '필로티 가정, 도면 확인 필요'],
    [
      '법규 기준',
      '건축법 시행령·서울시 조례, 국가법령정보센터 (law.go.kr)\n「수도권 23만호+α 추가 공급」, 국토교통부 (molit.go.kr)',
      '현행 기준과 완화 시나리오 비교',
    ],
    ['수익성 가정값', '기준금리, 한국은행 (bok.or.kr)\n지방세법, 국가법령정보센터 (law.go.kr)', '공식값(A)과 사용자 결정값(C) 구분'],
    ['임대 사례', '연립다세대 전월세 실거래가, 공공데이터포털 (data.go.kr)', '전세 제외 → 평형 구간별 평당 중앙값 × 세대 전용평수'],
  ]

  return {
    // 현행 법규 + 이 보고서의 시나리오만 (2026-10-12)
    scenarioRows: viewScenarios.filter((sc) => sc.id === 'BASE' || sc.id === analysis.scenarioId).map((sc) => [
      sc.id === 'BASE' ? '현행 법규' : sc.name,
      sc.kind === 'rebuild' ? `${sc.rulesId} 규칙 + 기존 건물 철거 후 신축` : describeOverrides(getScenario(sc.rulesId).overrides),
      sc.rationale,
      sc.isAssumption ? '완화 기준' : '현행',
    ]),
    ruleRows,
    sourceRows,
    policyRows: policyNotes.map((p) => [p.title, p.detail, p.usage]),
    assumptionRows: assumptionRows(analysis.finance.byScenario.BASE),
    conversionRows: conversionRows(analysis),
    assumptionNotes: data.assumptionNotes,
    policySource: [...new Set(policyNotes.map((p) => p.source))].join(', '),
    sourceFile: `${data.source.file} (버전 ${data.source.version}, 기준일 ${data.source.date}) — 원본 시트(건축물대장_원본 등)는 사용하지 않음`,
    excelNotes: data.excelNotes,
    formulas: [
      '허용 연면적 = 대지면적 × 용적률 상한 ÷ 100, 잔여 연면적 = 허용 − 현재 용적률산정 연면적, 잔여 전용 = 잔여 × 전용률',
      '현재 법정 주차 = 주택(세대기준·주택법 중 큰 값) + 비주택(용도별 시설면적 ÷ 기준면적, 복합용도는 소수 첫째자리 절사)',
      '기존 여유 = 실제 − 법정 (이미 부족한 대수는 증축 산정에서 제외, 비고5)',
      `주차 기준 최대 연면적 = 여유 주차 안에서 추가 전용이 최대가 되는 세대 조합(${s1.maxNetM2}㎡ ${s1.spaces}대 / ${s2.maxNetM2}㎡ ${s2.spaces}대 / 그 이상 ${s3.spaces}대)의 전용 합 ÷ 전용률`,
      '증축 연면적 = min(주차 기준, 용적률 잔여, 주택 연면적 잔여) → 증축 층수 = 올림(연면적 ÷ 증축층 바닥면적) → 일조 높이·주택 층수 검토 → (일조 완화 시) 증축계획안 증축 가능 연면적 안에서 세대로 확보되는 면적만 적용(기존 세대 확장분·측면 보강부 제외)',
      `정북 필요 이격 = 높이 ${sun.lowHeightM}m 이하 ${sun.lowSetbackM}m, 초과 시 높이 × 사선 비율`,
      '토지가액 = Σ(구성 필지 면적 × 개별공시지가) — 외필지 자료가 없으면 대표 필지 공시지가 × 대장 대지면적 (추정)',
      '자산가치(원가 기준) = 토지가액 + 연면적 × 재조달단가 × 잔가율, 잔가율 = max(최저 잔가율, 1 − 경과연수 ÷ 내용연수), 증축분 = 증축 연면적 × 재조달단가',
      '재건축 연면적 = min(대지 × 용적률 상한, 대지 × 건폐율 × 주택 층수 한도, 주택 연면적 한도), 세대수 = 내림(연면적 × 전용률 ÷ 최소 세대 전용), 재건축 후 자산가치 = 토지가액 + 신축 연면적 × 재조달단가',
      '사업비(증축) = 세대 연면적(기존 세대 확장분 제외) ÷ 3.305785 × 평당 단가 + 제반비용(공사비 × 5%) + 취득세 등 + 금융비용(대출 × 금리 × 공사기간 ÷ 12 × 0.5) / 재건축 공사비 = 공사 연면적(필로티 포함) × max(건물신축단가표, 엑셀 신축비용)',
      '연 임대수입 = Σ 세대 월 환산 임대료 × 12, 월 환산 임대료 = 고정분 + 평당 증가분 × 전용(평) (신규 월세 실거래의 전용면적 회귀, 월세 + 보증금 × 전환율 ÷ 12, 구간 구분 없음), NOI = 임대수입 × (1 − 공실률) × (1 − 운영비율)',
      '전환율: 주택은 모든 시나리오 연 6.0% 고정(보증금 1,000만원당 월 5만원, 사용자 지정, 법정 상한 5.0%는 참고), 상가 = 보수는 min(시장, 법정 상한 12%·기준금리 × 4.5), 기준·낙관은 시장 전환율',
      'ROI = 연 NOI 증가 ÷ 총사업비, 회수기간 = 총사업비 ÷ 연 NOI 증가, ROE = (NOI 증가 − 대출 × 금리) ÷ 자기자본, 자산가치 증가 = NOI 증가 ÷ 환원율',
    ],
    disclaimer: [
      '본 보고서는 기준 엑셀 자료와 예시 가정값 기반의 개략 검토이며 투자 권유가 아닙니다. 실제 사업성은 정밀 조사와 세무·법률·감정평가 전문가 검토에 따라 달라질 수 있습니다.',
      '주차 기준 증축 면적은 기존 주차 여유 범위의 개략 산정이며, 주차 추가 확보 안은 대지 내 배치 가능 여부를 별도로 확인해야 합니다.',
      '실제 증축 가능성은 주차장 기준, 구조안전 등에 따라 달라집니다.',
      '토지가액은 개별공시지가 기준(시세 아님)이고, 건물가치는 예시 가정값 기반 원가 추정으로 감정평가가 아닙니다.',
      '수익성은 임대 모델(보증금 + 월세, 사업주체 대표 1인) 기준 개략 추정입니다. 등급 C(프로젝트 가정) 값은 범위와 함께 표시했으며, 세무·금융·감정평가 전문가 확인이 필요합니다.',
    ],
  }
}

/** 재건축 2장 추가 확인 항목 (고정) */
const REBUILD_CHECK_ITEMS = [
  '기존 세대 이주·철거 일정과 임차인 보상',
  '신축 시 현행 건축·주차·소방 기준 전체 재적용 여부',
]

/** 재건축 표지 KPI */
function rebuildKpis(r: RebuildResult, verdictText: string, scenarioId: ViewScenarioId): Kpi[] {
  const diff = r.gfaM2 - r.existing.gfaM2
  return [
    {
      label: '재건축 규모',
      value: `지상 ${r.totalFloors}층 · ${f(r.gfaM2, 1)}㎡`,
      caption: `기존 ${r.existing.floorsAbove}층 · ${f(r.existing.gfaM2, 1)}㎡ (${diff >= 0 ? '+' : '−'}${f(Math.abs(diff), 1)}㎡)`,
    },
    { label: '세대', value: `${r.households}세대`, caption: `기존 ${r.existing.households}세대 · 세대당 전용 ${f(r.netPerUnitM2, 1)}㎡` },
    { label: '법정 주차', value: `${f(r.parking.required, 1)}대`, caption: `계획안 ${r.parking.planned}대` },
    { label: '판정', value: verdictText, caption: HOME_SCENARIO_NAME[scenarioId] },
  ]
}

/** 2장 시나리오별 검토 표의 재건축 행 */
function rebuildScenarioRow(r: RebuildResult, name: string): ReportRow {
  const verdict = { possible: '가능', check: '확인 필요', impossible: '불가' }[r.verdict]
  const diff = r.gfaM2 - r.existing.gfaM2
  return [
    name,
    `${f(r.farLimitPercent, 0)}% / 신축 한도 ${f(r.farGfaM2)}㎡`,
    `법정 ${f(r.parking.required)}대 (${r.households}세대, 계획안 ${r.parking.planned}대)`,
    `한도 ${f(r.rules.housing.maxAreaM2[r.housingType], 0)}㎡ ${r.rules.housing.areaExclusive[r.housingType] ? '미만' : '이하'}`,
    `${r.housingFloors}/${r.floorLimit}개층${r.rules.rebuild.pilotiFloor1 ? ' + 필로티' : ''}`,
    `신축 ${f(r.gfaM2)}㎡ (${diff >= 0 ? '+' : '−'}${f(Math.abs(diff))}㎡) · ${verdict}`,
    LIMIT_LABEL[r.limitingFactor],
  ]
}

/** 표지·툴바에 표시하는 시나리오 이름 (2026-10-12 결정 — ALL·REBUILD 코드와 '프로젝트 가정'은 표시하지 않는다) */
export const REPORT_SCENARIO_LABEL: Record<ViewScenarioId, string> = {
  BASE: '현행 법규',
  ALL: '일조권 사선제한 및 층수제한 완화',
  REBUILD: '일조권 사선제한 및 층수제한 완화 + 전체 재건축',
}

/** 보고서 모든 쪽 바닥글 문구 (2026-10-12 결정) */
export const REPORT_FOOTER =
  '본 보고서는 국가 공공데이터 및 공식 행정 공부(건축물·토지대장 등)를 기준으로 작성된 검토 자료입니다. 단, 현장 여건에 따라 실제와 차이가 발생할 수 있으며 투자 권유를 의미하지 않습니다.'

export function buildSiteReport(data: SiteData, analysis: SiteAnalysis, createdAt: string): SiteReport {
  const { site, units, siteInput } = data
  const e = analysis.selected
  const base = analysis.byScenario.BASE
  const scenario = getViewScenario(analysis.scenarioId)
  const judge = judgeSite(analysis)
  const plan = planSection(analysis)
  const rb = analysis.rebuild
  const name = site.buildingName ?? site.address.replace(/^서울특별시\s*/, '')
  const zone = site.zone ?? '용도지역 정보 없음'

  // 0장 표지
  const p = plan.plan
  /** 표지 결론 한 문장 — 시나리오 코드(ALL·REBUILD)와 '프로젝트 가정'은 쓰지 않는다 */
  const reportConclusion = () => {
    const label = REPORT_SCENARIO_LABEL[analysis.scenarioId]
    const prefix = HOME_SCENARIO_NAME[analysis.scenarioId]
    if (plan.kind !== 'rebuild' && judge.status === 'possible' && p) {
      return `${label} 적용 시 +${p.addFloors}층(${f(p.addGfaM2, 1)}㎡) 증축이 가능합니다. 제한요인: ${LIMIT_LABEL[p.limitingFactor]}`
    }
    return judge.reason.startsWith(prefix) ? label + judge.reason.slice(prefix.length) : judge.reason
  }
  const verdictText = { possible: '증축 가능', conditional: '조건부 가능', check: '확인 필요', impossible: '증축 불가', pending: '판정 대기' }[judge.status]
  const kpis: Kpi[] = plan.kind === 'rebuild' ? rebuildKpis(rb, verdictText, analysis.scenarioId) : [
    {
      label: '증축 규모',
      value: p ? `+${p.addFloors}층 · +${f(p.addGfaM2, 1)}㎡` : '증축안 없음',
      caption:
        plan.kind === 'parkingOption'
          ? `주차 +${plan.addSpaces}대 조건`
          : p
            ? p.sideGfaM2 > 0
              ? `측면 보강 ${f(p.sideGfaM2, 1)}㎡ 포함`
              : null
            : `제한: ${LIMIT_LABEL[e.plan.limitingFactor]}`,
    },
    {
      label: '추가 세대',
      value: p ? `${p.addUnits.length}세대` : `${e.rooftop.units.length}세대 여유`,
      caption: p ? `전용 ${f(p.addNetM2, 1)}㎡` : '주차·용적률 기준',
    },
    { label: '주차', value: `여유 ${f(e.parking.spare)}대`, caption: `실제 ${f(e.parking.actual)} / 법정 ${f(e.parking.required.total)}` },
    {
      label: '판정',
      value: verdictText,
      caption: HOME_SCENARIO_NAME[analysis.scenarioId],
    },
  ]

  const fin = analysis.finance.byScenario[analysis.finance.selected]
  if (fin.status === 'ok') {
    const c = analysis.finance.byScenario.CONSERVATIVE.metrics.roi
    const o = analysis.finance.byScenario.OPTIMISTIC.metrics.roi
    const pct = (v: number | null) => (v === null ? '–' : formatRate(v, 1))
    kpis.splice(
      1,
      3,
      {
        label: '총사업비',
        value: formatWon(fin.totalCostWon),
        caption:
          fin.totalCostWon && fin.equityWon !== null && fin.loanWon !== null
            ? `자기자본 ${formatRate(fin.equityWon / fin.totalCostWon, 0)} · 대출 ${formatRate(fin.loanWon / fin.totalCostWon, 0)}`
            : null,
      },
      // 재건축은 임대수익(NOI)만으로 회수기간이 길어지므로, 토지+건물 자산가치 전·후를 함께 보여준다 (원가 기준 참고값)
      plan.kind === 'rebuild' && analysis.asset.beforeWon !== null && analysis.asset.afterWon !== null
        ? {
            label: '자산가치 (재건축 후)',
            value: formatWon(analysis.asset.afterWon),
            caption: `재건축 전 ${formatWon(analysis.asset.beforeWon)} (${analysis.asset.afterWon >= analysis.asset.beforeWon ? '+' : '−'}${formatWon(Math.abs(analysis.asset.afterWon - analysis.asset.beforeWon))})`,
          }
        : { label: '연간 수익률(ROI)', value: pct(fin.metrics.roi), caption: `보수 ${pct(c)} ~ 낙관 ${pct(o)}` },
      {
        // 자산가치 증가분을 반영한 회수기간 (없으면 임대수익만 본 값). 임대수익만 본 값은 5장·6장에 병기
        label: fin.cashflow?.assetAdjusted ? '투자회수기간 (자산가치 반영)' : '투자회수기간',
        value: fin.cashflow?.assetAdjusted
          ? assetPaybackValue(fin.cashflow)
          : fin.metrics.paybackYears === null
            ? '–'
            : `${f(fin.metrics.paybackYears, 1)}년`,
        caption: null,
      },
    )
  }

  // 1장 현황
  const floor = floorUseRows(units, siteInput?.pilotiFloor1 ?? false)
  const h = e.housing
  const stats: Kpi[] = [
    {
      label: '용적률',
      value: `${f(base.far.currentFarPercent)}%`,
      caption: `현행 용적률 최대 ${f(base.far.farLimitPercent, 0)}%`,
    },
    {
      label: '추가확보 가능면적',
      value: `${f(base.far.remainingGfaM2)}㎡`,
      caption: `용적률 완화 시 ${f(analysis.byScenario.ALL.far.remainingGfaM2)}㎡`,
    },
    {
      label: '주택 현황',
      value: h.housingType ? `${h.housingFloors}개층 · ${f(h.housingAreaM2)}㎡` : '해당 없음',
      caption: h.housingType ? `${h.housingType} (전용+공용)` : null,
    },
    { label: '주차', value: `${f(e.parking.actual)}대`, caption: `법정 ${f(e.parking.required.total)}대\n여유 주차 ${f(e.parking.spare)}대` },
  ]
  const notes: string[] = []
  // 외필지는 행정상 묶인 필지일 수 있어 문제로 보지 않는다 (2026-10-08 결정 7) — 토지가액만 '추정'
  if (site.outsideParcels > 0 && analysis.land.basis === 'estimated') {
    notes.push(`외필지 ${site.outsideParcels}개 — 필지 목록이 없어 토지가액은 대표 필지 공시지가 × 대장 대지면적으로 추정했습니다.`)
  }

  // 2장 법규 검토
  const relaxRows = relaxationRows(analysis, zone).map((r) => [`${r.label} (${r.note})`, r.base, r.relaxed])
  const pr = e.rules.parking
  const req = e.parking.required
  const [s1, s2, s3] = pr.perUnit
  const parkingRows: ReportRow[] = []
  if (req.perUnit > 0 || req.housingAct > 0) {
    parkingRows.push(
      ['주택(제5호) 세대기준', `전용 ${s1.maxNetM2}㎡ 이하 ${s1.spaces}대 / ${s2.maxNetM2}㎡ 이하 ${s2.spaces}대 / 초과 ${s3.spaces}대`, `${f(req.perUnit)}대`],
      ['주택(제5호) 주택법 기준', `전용 ${pr.housingAct.smallMaxNetM2}㎡ 이하 ${pr.housingAct.smallM2PerSpace}㎡당 / 초과 ${pr.housingAct.largeM2PerSpace}㎡당 1대 (비교용)`, `${f(req.housingAct)}대`],
    )
  }
  if (req.detached > 0) {
    parkingRows.push(['단독·다중주택(제4호)', `시설면적 ${pr.detached.minM2}~${pr.detached.baseM2}㎡ ${pr.detached.baseSpaces}대, 초과분 ${pr.detached.extraM2PerSpace}㎡당 1대`, `${f(req.detached)}대`])
  }
  if (req.neighborhood > 0) parkingRows.push(['근린생활시설(제3호)', `시설면적 ${pr.neighborhoodM2PerSpace}㎡당 1대`, `${f(req.neighborhood)}대`])
  if (req.office > 0) parkingRows.push(['업무시설(제2-1호)', `시설면적 ${pr.officeM2PerSpace}㎡당 1대`, `${f(req.office)}대`])
  // 재건축 보고서는 '현재 법정 대수'·'여유 주차대수' 행을 두지 않는다 (2026-10-13)
  if (analysis.scenarioId === 'REBUILD') {
    parkingRows.push(['실제 주차 (대장)', '', `${f(e.parking.actual)}대`])
  } else {
    parkingRows.push(
      ['현재 법정 대수', '주택은 세대기준·주택법 중 큰 값 + 비주택 합산', `${f(req.total)}대`],
      ['실제 주차 (대장)', '', `${f(e.parking.actual)}대`],
      ['여유 주차대수', '실제 − 법정', `${f(e.parking.spare)}대`],
    )
  }
  const parkingNote = req.mixedUse
    ? '복합용도 건축물: 비주택 용도별로 소수 첫째자리까지 산정(둘째자리 이하 절사) 후 합산, 주택(제5호)은 별도 합산 (서울시 주차장 조례 별표2 비고4)'
    : '서울시 주차장 조례 별표2 기준'

  // 현행법규(BASE) + 이 보고서의 시나리오(증축 = ALL, 재건축 = REBUILD)만 보인다 — 다른 완화안 행은 두지 않는다 (2026-10-12)
  const shownScenarios = viewScenarios.filter((sc) => sc.id === 'BASE' || sc.id === analysis.scenarioId)
  const scenarioRows: ReportRow[] = shownScenarios.map((sc) => {
    if (sc.kind === 'rebuild') return rebuildScenarioRow(rb, sc.name)
    const x = analysis.byScenario[sc.rulesId]
    const o = x.parkingOption
    const verdict = { possible: '가능', check: '확인 필요', impossible: '불가' }[x.plan.verdict]
    return [
      sc.id === 'BASE' ? '현행법규' : sc.name,
      `${f(x.far.farLimitPercent, 0)}% / ${f(x.far.remainingGfaM2)}㎡`,
      `${f(x.rooftop.gfaM2)}㎡`,
      x.housing.limit.applies ? `${f(x.housing.limit.areaGfaM2!)}㎡` : '미적용',
      x.housing.limit.applies
        ? `${x.plan.housingFloorsAfter ?? x.housing.housingFloors}/${x.housing.limit.floorLimit}개층${x.plan.attemptedFloors > 0 ? ` (+${x.plan.attemptedFloors}층 시)` : ''}`
        : '미적용',
      `${f(x.plan.addGfaM2)}㎡ · ${verdict}${o?.verdict === 'possible' ? ` (주차 +${o.addSpaces}대 시 ${f(o.addGfaM2)}㎡)` : ''}`,
      LIMIT_LABEL[x.plan.limitingFactor],
    ]
  })

  const a = analysis.byScenario.ALL
  const sunlight =
    plan.kind === 'rebuild'
      ? rb.requiredSetbackM === null
        ? ['일조 사선 미적용 지역입니다.']
        : [
            `재건축 높이 ${f(rb.heightM)}m(지상 ${rb.totalFloors}층 × 층고 ${f(rb.rules.floorHeightM, 1)}m) 시 정북 인접대지 경계에서 ${f(rb.requiredSetbackM)}m 이상 떨어져야 합니다 (복합 완화 규칙).`,
            rb.allowedHeightM === null
              ? '정북 일조 검토는 확인 완료되었습니다.'
              : `입력된 정북 이격거리 기준 허용 높이는 ${f(rb.allowedHeightM)}m입니다.`,
          ]
      : base.requiredSetbackM === null
      ? ['일조 사선 미적용 지역입니다.']
      : [
          `1개층(층고 ${f(e.rules.floorHeightM, 1)}m) 증축 시 정북 인접대지 경계에서 현행 ${f(base.requiredSetbackM)}m, 복합 완화 ${f(a.requiredSetbackM!)}m 이상 떨어져야 합니다.`,
          e.allowedHeightM === null
            ? '정북 일조 검토는 확인 완료되었습니다.'
            : `입력된 정북 이격거리 기준 허용 높이는 ${f(e.allowedHeightM)}m입니다.`,
        ]

  const checkPlan = plan.kind === 'rebuild' ? rb : (plan.plan ?? e.plan)
  const checkItems = [
    ...checkPlan.checks.filter((c) => c.status === 'check').map((c) => c.detail),
    ...(plan.kind === 'rebuild' ? REBUILD_CHECK_ITEMS : FIXED_CHECK_ITEMS),
    ...(plan.kind === 'parkingOption' ? [`주차 ${plan.addSpaces}대 추가 확보 시 대지 내 배치 가능 여부`] : []),
  ]

  const risk = buildSiteRisks(data, analysis)

  return {
    meta: {
      title: `${name} ${analysis.scenarioId === 'REBUILD' ? '재건축 사업 검토 보고서' : '증축 사업 타당성 검토 보고서'}`,
      address: site.roadAddress ?? site.address,
      jibunAddress: site.address,
      createdAt,
      scenarioId: analysis.scenarioId,
      scenarioLabel: REPORT_SCENARIO_LABEL[analysis.scenarioId],
      sourceLabel: REPORT_FOOTER,
    },
    summary: {
      kpis,
      conclusion: reportConclusion(),
      // 재건축은 그림에서 기존 층수 대비 늘어난 층만 강조한다
      addFloors: plan.kind === 'rebuild' ? Math.max(0, rb.totalFloors - site.floorsAbove) : (p?.addFloors ?? 0),
      floorsAbove: site.floorsAbove,
    },
    status: {
      infoRows: rowsFromExcelSite(site),
      floorUses: floor.rows,
      sharedCommonM2: floor.sharedCommonM2,
      stats,
      notes,
      land: landSection(analysis.land, site.address),
    },
    regulation: {
      relaxRows,
      parkingRows,
      parkingNote,
      scenarioRows,
      selectedRow: analysis.scenarioId === 'BASE' ? 0 : scenarioRows.length - 1,
      sunlight,
      checkItems,
    },
    plan,
    asset: assetSection(analysis),
    finance: { ...financeSection(analysis), inputNotes: data.assumptionNotes },
    scenario: scenarioSection(analysis),
    risk,
    schedule: buildSiteSchedule(analysis),
    partners: sitePartners,
    nextStep: buildSiteNextStep(analysis, risk),
    verification: buildVerification(data, analysis),
    appendix: buildAppendix(data, analysis),
    analysis,
  }
}
