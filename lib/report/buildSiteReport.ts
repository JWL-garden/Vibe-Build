// 기준 엑셀 필지 보고서 조립 (설계서 11장, 12-4)
// runAll 결과(SiteAnalysis)와 기준 엑셀 묶음(SiteData)을 보고서 장별 표·문장으로 바꾼다.
// 새로 계산하지 않고, 엑셀 값을 층별로 모으거나 표시 문자열로 바꾸는 일만 한다.

import { judgeSite, LIMIT_LABEL } from '@/lib/calc'
import { compareWithExcel, PARITY_TOLERANCE } from '@/lib/calc/excelParity'
import { formatNumber, formatRate, formatWon, formatWonExact, textOrEmpty, withUnit } from '@/lib/format'
import { buildingValueRule, landValueRule } from '@/lib/rules/financeDefaults'
import { policyNotes } from '@/lib/rules/policies'
import { getScenario, scenarios } from '@/lib/rules/scenarios'
import { describeOverrides } from './describeOverrides'
import { LAND_BADGE, landAreaSource, landBaseMonthText, landBasisNote } from './landText'
import type {
  ExcelSite,
  ExcelUnit,
  FloorUseRow,
  HousingType,
  Kpi,
  LimitingFactor,
  ReportRow,
  LandValueResult,
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
      note: `${zone} — 상한 교체 (배수 아님)`,
      base: `${f(base.far, 0)}%`,
      relaxed: `${f(relaxed.far, 0)}%`,
      by: 'B, ALL',
      selected: `${f(sel.far, 0)}%`,
      changed: sel.far !== base.far,
    },
    {
      label: '주택 층수',
      note: housingNote,
      base: `${base.floors}개층 이하`,
      relaxed: `${relaxed.floors}개층 이하`,
      by: 'C, ALL',
      selected: `${sel.floors}개층 이하`,
      changed: sel.floors !== base.floors,
    },
    {
      label: '주택 연면적',
      note: housingNote,
      base: `${f(base.area, 0)}㎡ ${base.areaWord}`,
      relaxed: `${f(relaxed.area, 0)}㎡ ${relaxed.areaWord}`,
      by: 'C, ALL',
      selected: `${f(sel.area, 0)}㎡ ${sel.areaWord}`,
      changed: sel.area !== base.area || sel.areaWord !== base.areaWord,
    },
    {
      label: '일조 수직 허용 높이',
      note: multiFamily ? `${type} — 8·13 대책 '4~5층 수직 건축 허용' (15m 가정)` : '다가구·다세대만 적용 (이 건물은 미적용)',
      base: `${f(base.sunLowHeight)}m 이하`,
      relaxed: `${f(relaxed.sunLowHeight)}m 이하`,
      by: 'C, ALL',
      selected: `${f(sel.sunLowHeight)}m 이하`,
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
  sunlight: ['정북 이격거리 실측 후 재검토', '상부를 북쪽에서 물려 짓는 계단식(셋백) 증축안 검토'],
  other: [],
}
const ALWAYS_ALTERNATIVE = '증축 대신 리모델링·용도변경으로 임대 수익을 높이는 방안'

/** 보고서 2장 추가 확인 항목 (고정 항목) */
const FIXED_CHECK_ITEMS = [
  '지구단위계획·가로구역별 최고높이·고도지구 등 높이 제한',
  '수직증축 구조안전(기초·기둥 하중) — 구조기술사 검토',
]

function planSection(e: SiteExpansionResult): SitePlanSection {
  if (e.plan.verdict === 'possible') {
    return { kind: 'existing', heading: '기존 주차 범위 증축안', plan: e.plan, addSpaces: null, alternatives: [] }
  }
  const o = e.parkingOption
  if (o?.verdict === 'possible') {
    return {
      kind: 'parkingOption',
      heading: `주차 ${o.addSpaces}대 추가 확보 조건 증축안`,
      plan: o,
      addSpaces: o.addSpaces,
      alternatives: [],
    }
  }
  return {
    kind: 'none',
    heading: '증축안 없음 — 대안 검토',
    plan: null,
    addSpaces: null,
    alternatives: [...ALTERNATIVES[e.plan.limitingFactor], ALWAYS_ALTERNATIVE],
  }
}

/** 1장 토지가액 (runAll의 analysis.land를 표시용으로만 바꾼다) */
function landSection(land: LandValueResult): SiteLandSection {
  const won = formatWonExact
  const areaSource = landAreaSource(land)
  const rows: ReportRow[] = land.lots.map((l) => [l.pnu, `${f(l.areaM2)}㎡ (${areaSource})`, `${f(l.pricePerM2, 0)}원/㎡`, won(l.valueWon)])
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
function assetSection(analysis: SiteAnalysis): SiteAssetSection {
  const a = analysis.asset
  const b = a.existingBuilding
  const cost = `재조달단가 ${f(b.unitCostWon / 1e4, 0)}만원/㎡`
  const hasAdd = a.addBuilding.gfaM2 > 0
  // 표는 원 단위 정확값 (억 단위 반올림이면 항목 합과 합계가 어긋나 보임), 억 단위 요약은 KPI 카드에만
  const rows: ReportRow[] = [
    ['토지가액', formatWonExact(a.land.valueWon), formatWonExact(a.land.valueWon), `${landBasisNote(a.land)} [${LAND_BADGE[a.land.basis].badge}]`],
    [
      '기존 건물가치',
      formatWonExact(b.valueWon),
      formatWonExact(b.valueWon),
      `연면적 ${f(b.gfaM2)}㎡ × ${cost} × 잔가율 ${formatRate(b.residualRate)} (경과 ${b.ageYears ?? '–'}년 / 내용연수 ${b.usefulLifeYears}년)`,
    ],
    [
      '증축 건물가치',
      '–',
      hasAdd ? formatWonExact(a.addBuilding.valueWon) : '–',
      hasAdd ? `증축 ${f(a.addBuilding.gfaM2, 1)}㎡ × ${cost} (신축)` : '증축안 없음',
    ],
    ['자산가치 합계', formatWonExact(a.beforeWon), formatWonExact(a.afterWon), '토지가액 + 건물가치 (원가 기준 참고값)'],
  ]
  const kpis: Kpi[] = [
    { label: '토지가액', value: formatWon(a.land.valueWon), caption: `${LAND_BADGE[a.land.basis].badge} · 공시지가 기준` },
    { label: '자산가치 (증축 전)', value: formatWon(a.beforeWon), caption: '토지 + 기존 건물' },
    { label: '자산가치 (증축 후)', value: formatWon(a.afterWon), caption: `${analysis.scenarioId} 시나리오 증축안` },
    {
      label: '증가 (원가 기준)',
      value: hasAdd ? formatWon(a.addBuilding.valueWon) : '없음',
      caption: hasAdd ? `증축 ${f(a.addBuilding.gfaM2, 1)}㎡` : '증축안 없음',
    },
  ]
  return {
    kpis,
    rows,
    yieldNote:
      '토지 포함 수익률 = (기존 NOI + 증축 NOI 증가) ÷ (증축 전 자산가치 + 총사업비) — 임대료·사업비(수익성 단계) 입력 후 계산됩니다. 증축 판단의 핵심 지표는 ROI(NOI 증가 ÷ 총사업비)입니다.',
    notes: [
      ...a.reasons,
      `${buildingValueRule.note}. 수익 기준 가치(NOI ÷ 환원율)와 더하면 토지를 두 번 세게 되므로 따로 봅니다.`,
      `경과연수 기준일: ${a.baseDate} (기준 데이터 기준일)`,
    ],
  }
}

/** 데이터 검증: 엑셀 '용적률완화_주차검토' 행 대조(시나리오 B) + 수기입력·가정 데이터 목록 */
function buildVerification(data: SiteData, analysis: SiteAnalysis, floorUses: FloorUseRow[]): SiteReport['verification'] {
  const parity = compareWithExcel(data.review, analysis.byScenario.B)
  const show = (v: number | null) => (v === null ? '빈칸' : f(v, 4))
  const input = data.siteInput
  const top = [...floorUses].reverse().find((r) => r.netM2 > 0)
  const C = analysis.byScenario.C.rules
  const todoRows: ReportRow[] = [
    [
      '정북 인접대지 이격거리',
      input?.northSetbackM != null ? `${f(input.northSetbackM)}m` : '미입력',
      input?.northSetbackM != null ? '수기입력' : '확인 필요 — 일조 검토 불가',
      'lib/data/siteInputs.json → northSetbackM',
    ],
    [
      '증축층 바닥면적',
      input?.floorPlateM2 != null
        ? `${f(input.floorPlateM2)}㎡`
        : `건축면적 ${f(data.site.buildingAreaM2)}㎡로 가정${top ? ` (최상층 ${top.floorLabel} 전유 ${f(top.netM2)}㎡)` : ''}`,
      input?.floorPlateM2 != null ? '수기입력' : '확인 필요 — 증축 층수에 영향',
      'lib/data/siteInputs.json → floorPlateM2',
    ],
    [
      '1층 필로티 여부',
      input ? (input.pilotiFloor1 ? '필로티' : '필로티 아님') : '미입력',
      input?.source === '수기입력' ? '수기입력' : '가정 — 도면 확인 필요',
      'lib/data/siteInputs.json → pilotiFloor1',
    ],
    [
      '일조 수직 허용 높이 (8·13 대책)',
      `${f(C.sunlight.multiFamilyLowHeightM ?? C.sunlight.lowHeightM)}m`,
      '프로젝트 가정 — 시행령 개정안 확인 필요',
      'lib/rules/scenarios.ts → C.sunlight.multiFamilyLowHeightM',
    ],
    ['건축물 숫자 (대지·연면적·호별 면적·주차)', data.sourceLabel, '기준 엑셀', '엑셀 수정 후 npm run data:excel 재실행'],
    ['임대료·공사비·시세 (수익성)', '미입력', '수익성 단계에서 입력 (예시 가정값)', 'lib/mock/owner.json, market.json'],
  ]
  if (data.site.outsideParcels > 1) {
    todoRows.push([`외필지 ${data.site.outsideParcels}개`, '대지 범위 미확인', '확인 필요', '토지대장·지적도 확인 후 기준 엑셀 반영'])
  }
  const land = analysis.land
  if (land.basis === 'estimated') {
    todoRows.push(['토지가액 구성 필지', '외필지 목록 없음 — 대표 필지 공시지가 × 대장 대지면적', '추정', 'lib/data/siteInputs.json → lots'])
  } else if (land.basis === 'mismatch') {
    todoRows.push(['토지대장 면적 ↔ 대장 대지면적', `${f(land.areaUsedM2)}㎡ ↔ ${f(land.siteAreaM2 ?? 0)}㎡`, '면적 확인 필요', '토지대장·건축물대장 확인'])
  }
  todoRows.push([
    '건물가치 가정 (재조달단가·내용연수·잔가율)',
    `${f(buildingValueRule.replacementCostPerM2Won / 1e4, 0)}만원/㎡ · ${analysis.asset.existingBuilding.usefulLifeYears}년 · 최저 ${formatRate(buildingValueRule.minResidualRate, 0)}`,
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
  const input = data.siteInput
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
      '8·13 대책 "4~5층도 수직 건축 허용" — 15m는 프로젝트 가정',
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
    ['추가 세대 최소 전용면적', `${pk.minUnitNetM2}㎡`, '기준 엑셀 가정'],
    ['다가구 가구별 전용면적', `연면적 × ${pk.multiFamilyNetRatio} ÷ 가구수`, '기준 엑셀 가정'],
    ['증축 층고', `${f(base.floorHeightM, 1)}m`, '프로젝트 가정'],
    [
      '증축층 바닥면적',
      input?.floorPlateM2 != null ? inputText(input.floorPlateM2, '㎡') : `건축면적 ${f(data.site.buildingAreaM2)}㎡로 가정 — 확인 필요`,
      '최상층 도면 확인 필요',
    ],
    [
      '토지가액',
      `Σ(구성 필지 토지대장 면적 × 개별공시지가), 외필지 자료가 없으면 대표 필지 공시지가 × 대장 대지면적(추정), 면적 차이 허용 ${landValueRule.areaToleranceM2}㎡`,
      '공시지가 기준 — 시세 아님',
    ],
    [
      '건물가치 (원가 기준)',
      `재조달단가 ${f(buildingValueRule.replacementCostPerM2Won / 1e4, 0)}만원/㎡, 내용연수 ${analysis.asset.existingBuilding.usefulLifeYears}년, 최저 잔가율 ${formatRate(buildingValueRule.minResidualRate, 0)}`,
      '예시 가정값 — 감정평가 아님',
    ],
  ]

  const sheet = (name: string) => `'${name}' 시트`
  const sourceRows: ReportRow[] = [
    ['대상 건축물 표제부 (대지·건축·연면적, 용적률, 높이, 층수, 구조, 사용승인일, 승강기, 주차대수)', sheet('건축물대장_2단계'), '기준 엑셀'],
    ['용도지역', sheet('지역지구구역_2단계'), '기준 엑셀'],
    ['층별·호별 전유/공용 면적, 주택 층수·면적', sheet('전유공용면적_2단계'), '기준 엑셀'],
    ['호별 주차 산정 기준 (제5호·제4호·제3호·제2-1호)', sheet('주차대수_세대별'), '기준 엑셀'],
    ['전용률, 완화 후 허용연면적·주차 검토 (엑셀 대조 정답표)', sheet('용적률완화_주차검토'), '계산 엔진과 자동 대조 (±0.01)'],
    [
      '개별공시지가 (원/㎡) — 토지가액',
      `${sheet('개별공시지가_2단계')} (브이월드 개별공시지가)`,
      analysis.land.priceBasis
        ? `기준연월 ${analysis.land.priceBasis.baseYear}.${analysis.land.priceBasis.baseMonth ?? '01'} (${landBaseMonthText(analysis.land)} 기준) · 공시일 ${analysis.land.priceBasis.announcedDate} · 시세 아님`
        : '공시지가 없음 — 토지가액 계산 불가',
    ],
    ['토지대장 지목·면적·소유구분', sheet('토지임야목록_2단계'), '필지 면적 검증·토지가액'],
    [
      '토지가액 구성 필지',
      'lib/data/siteInputs.json → lots',
      input?.lots?.length ? `${input.lots.length}필지 (수기입력)` : '미입력 — 외필지 없으면 대표 필지',
    ],
    ['정북 이격거리', 'lib/data/siteInputs.json', inputText(input?.northSetbackM ?? null, 'm')],
    ['증축층 바닥면적', 'lib/data/siteInputs.json', inputText(input?.floorPlateM2 ?? null, '㎡')],
    ['1층 필로티 여부', 'lib/data/siteInputs.json', input?.pilotiFloor1 ? '필로티(가정)' : '필로티 아님'],
    ['법규 기준·완화 시나리오', 'lib/rules (서울시 조례 기준 + 프로젝트 가정)', '현행법 아님 (A·B·C·ALL)'],
  ]

  return {
    scenarioRows: scenarios.map((sc) => [
      `${sc.id} ${sc.name}`,
      describeOverrides(sc.overrides),
      sc.rationale,
      sc.isAssumption ? '프로젝트 가정' : '현행',
    ]),
    ruleRows,
    sourceRows,
    policyRows: policyNotes.map((p) => [p.title, p.detail, p.usage]),
    policySource: [...new Set(policyNotes.map((p) => p.source))].join(', '),
    sourceFile: `${data.source.file} (버전 ${data.source.version}, 기준일 ${data.source.date}) — 원본 시트(건축물대장_원본 등)는 사용하지 않음`,
    excelNotes: data.excelNotes,
    formulas: [
      '허용 연면적 = 대지면적 × 용적률 상한 ÷ 100, 잔여 연면적 = 허용 − 현재 용적률산정 연면적, 잔여 전용 = 잔여 × 전용률',
      '현재 법정 주차 = 주택(세대기준·주택법 중 큰 값) + 비주택(용도별 시설면적 ÷ 기준면적, 복합용도는 소수 첫째자리 절사)',
      '기존 여유 = 실제 − 법정 (이미 부족한 대수는 증축 산정에서 제외, 비고5)',
      `주차 기준 최대 연면적 = 여유 주차 안에서 추가 전용이 최대가 되는 세대 조합(${s1.maxNetM2}㎡ ${s1.spaces}대 / ${s2.maxNetM2}㎡ ${s2.spaces}대 / 그 이상 ${s3.spaces}대)의 전용 합 ÷ 전용률`,
      '증축 연면적 = min(주차 기준, 용적률 잔여, 주택 연면적 잔여) → 증축 층수 = 올림(연면적 ÷ 증축층 바닥면적) → 일조 높이·주택 층수 검토',
      `정북 필요 이격 = 높이 ${sun.lowHeightM}m 이하 ${sun.lowSetbackM}m, 초과 시 높이 × 사선 비율`,
      '토지가액 = Σ(구성 필지 면적 × 개별공시지가) — 외필지 자료가 없으면 대표 필지 공시지가 × 대장 대지면적 (추정)',
      '자산가치(원가 기준) = 토지가액 + 연면적 × 재조달단가 × 잔가율, 잔가율 = max(최저 잔가율, 1 − 경과연수 ÷ 내용연수), 증축분 = 증축 연면적 × 재조달단가',
    ],
    disclaimer: [
      '본 보고서는 기준 엑셀 자료와 예시 가정값 기반의 개략 검토이며 투자 권유가 아닙니다. 실제 사업성은 정밀 조사와 세무·법률·감정평가 전문가 검토에 따라 달라질 수 있습니다.',
      '법규 완화 시나리오(A·B·C·ALL)는 프로젝트에서 가정한 정책안이며 현행법이 아닙니다.',
      '주차 기준 증축 면적은 기존 주차 여유 범위의 개략 산정이며, 주차 추가 확보 안은 대지 내 배치 가능 여부를 별도로 확인해야 합니다.',
      '실제 증축 가능성은 지구단위계획, 가로구역 높이제한, 고도지구, 주차장 기준, 구조안전 등에 따라 달라집니다.',
      '토지가액은 개별공시지가 기준(시세 아님)이고, 건물가치는 예시 가정값 기반 원가 추정으로 감정평가가 아닙니다.',
    ],
  }
}

export function buildSiteReport(data: SiteData, analysis: SiteAnalysis, createdAt: string): SiteReport {
  const { site, units, siteInput } = data
  const e = analysis.selected
  const base = analysis.byScenario.BASE
  const scenario = getScenario(analysis.scenarioId)
  const judge = judgeSite(analysis)
  const plan = planSection(e)
  const name = site.buildingName ?? site.address.replace(/^서울특별시\s*/, '')
  const zone = site.zone ?? '용도지역 정보 없음'

  // 0장 표지
  const p = plan.plan
  const kpis: Kpi[] = [
    {
      label: '증축 규모',
      value: p ? `+${p.addFloors}층 · +${f(p.addGfaM2, 1)}㎡` : '증축안 없음',
      caption: plan.kind === 'parkingOption' ? `주차 +${plan.addSpaces}대 조건` : p ? null : `제한: ${LIMIT_LABEL[e.plan.limitingFactor]}`,
    },
    {
      label: '추가 세대',
      value: p ? `${p.addUnits.length}세대` : `${e.parking.plan.units.length}세대 여유`,
      caption: p ? `전용 ${f(p.addNetM2, 1)}㎡` : '주차·용적률 기준',
    },
    { label: '주차', value: `여유 ${f(e.parking.spare)}대`, caption: `실제 ${f(e.parking.actual)} / 법정 ${f(e.parking.required.total)}` },
    {
      label: '판정',
      value: { possible: '증축 가능', conditional: '조건부 가능', check: '확인 필요', impossible: '증축 불가', pending: '판정 대기' }[judge.status],
      caption: `${analysis.scenarioId} 시나리오`,
    },
  ]

  // 1장 현황
  const floor = floorUseRows(units, siteInput?.pilotiFloor1 ?? false)
  const h = e.housing
  const stats: Kpi[] = [
    {
      label: '현재 용적률',
      value: `${f(base.far.currentFarPercent)}%`,
      caption: `현행 상한 ${f(base.far.farLimitPercent, 0)}%`,
    },
    {
      label: '미활용 연면적 (현행)',
      value: `${f(base.far.remainingGfaM2)}㎡`,
      caption: `완화(${f(analysis.byScenario.ALL.far.farLimitPercent, 0)}%) 시 ${f(analysis.byScenario.ALL.far.remainingGfaM2)}㎡`,
    },
    {
      label: '주택 현황',
      value: h.housingType ? `${h.housingFloors}개층 · ${f(h.housingAreaM2)}㎡` : '해당 없음',
      caption: h.housingType ? `${h.housingType} (전유+공용)` : null,
    },
    { label: '주차', value: `${f(e.parking.actual)}대`, caption: `현재 법정 ${f(e.parking.required.total)}대` },
  ]
  const notes = [`건축물 숫자는 ${data.sourceLabel}의 '건축물대장_2단계'·'전유공용면적_2단계' 시트 기준입니다.`]
  if (siteInput?.pilotiFloor1) {
    notes.push(
      floor.rows.some((r) => r.floorLabel === '1층')
        ? '1층은 필로티(주차 전용)로 가정했습니다 — 전유 호가 없습니다.'
        : '1층은 필로티(주차 전용, 가정)로 전유·공용면적 자료가 없어 표에 나오지 않습니다.',
    )
  }
  if (site.outsideParcels > 1) notes.push(`외필지 ${site.outsideParcels}개 — 대지 범위 확인이 필요합니다.`)

  // 2장 법규 검토
  const relaxRows = relaxationRows(analysis, zone).map((r) => [`${r.label} (${r.note})`, r.base, r.relaxed, r.by])
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
  parkingRows.push(
    ['현재 법정 대수', '주택은 세대기준·주택법 중 큰 값 + 비주택 합산', `${f(req.total)}대`],
    ['실제 주차 (대장)', '', `${f(e.parking.actual)}대`],
    ['기존 여유', '실제 − 법정', `${f(e.parking.spare)}대`],
  )
  const parkingNote = req.mixedUse
    ? '복합용도 건축물: 비주택 용도별로 소수 첫째자리까지 산정(둘째자리 이하 절사) 후 합산, 주택(제5호)은 별도 합산 (서울시 주차장 조례 별표2 비고4)'
    : '서울시 주차장 조례 별표2 기준'

  const scenarioRows: ReportRow[] = Object.values(analysis.byScenario).map((x) => {
    const o = x.parkingOption
    const verdict = { possible: '가능', check: '확인 필요', impossible: '불가' }[x.plan.verdict]
    return [
      `${x.scenarioId} ${getScenario(x.scenarioId).name}`,
      `${f(x.far.farLimitPercent, 0)}% / ${f(x.far.remainingGfaM2)}㎡`,
      `${f(x.parking.plan.gfaM2)}㎡`,
      x.housing.limit.applies ? `${f(x.housing.limit.areaGfaM2!)}㎡` : '미적용',
      x.housing.limit.applies
        ? `${x.plan.housingFloorsAfter ?? x.housing.housingFloors}/${x.housing.limit.floorLimit}개층${x.plan.attemptedFloors > 0 ? ` (+${x.plan.attemptedFloors}층 시)` : ''}`
        : '미적용',
      `${f(x.plan.addGfaM2)}㎡ · ${verdict}${o?.verdict === 'possible' ? ` (주차 +${o.addSpaces}대 시 ${f(o.addGfaM2)}㎡)` : ''}`,
      LIMIT_LABEL[x.plan.limitingFactor],
    ]
  })

  const a = analysis.byScenario.A
  const sunlight =
    base.requiredSetbackM === null
      ? ['일조 사선 미적용 지역입니다.']
      : [
          `1개층(층고 ${f(e.rules.floorHeightM, 1)}m) 증축 시 정북 인접대지 경계에서 현행 ${f(base.requiredSetbackM)}m, 완화 A ${f(a.requiredSetbackM!)}m 이상 떨어져야 합니다.`,
          e.allowedHeightM === null
            ? '정북 이격거리가 입력되지 않아 일조 검토는 "확인 필요"입니다. 도면으로 이격거리를 확인해 수기 입력해야 합니다.'
            : `입력된 정북 이격거리 기준 허용 높이는 ${f(e.allowedHeightM)}m입니다.`,
        ]

  const checkPlan = plan.plan ?? e.plan
  const checkItems = [
    ...checkPlan.checks.filter((c) => c.status === 'check').map((c) => c.detail),
    ...FIXED_CHECK_ITEMS,
    ...(plan.kind === 'parkingOption' ? [`주차 ${plan.addSpaces}대 추가 확보 시 대지 내 배치 가능 여부`] : []),
    ...(site.outsideParcels > 1 ? [`외필지 ${site.outsideParcels}개 — 대지 범위`] : []),
  ]

  return {
    meta: {
      title: `${name} 증축 사업 타당성 검토 보고서`,
      address: site.roadAddress ?? site.address,
      jibunAddress: site.address,
      createdAt,
      scenarioId: analysis.scenarioId,
      scenarioLabel: `${analysis.scenarioId} ${scenario.name}${scenario.isAssumption ? ' (프로젝트 가정)' : ''}`,
      sourceLabel: `${data.sourceLabel} · 개략 검토 · 완화 시나리오는 프로젝트 가정 · 투자 권유 아님`,
    },
    summary: { kpis, conclusion: judge.reason, addFloors: p?.addFloors ?? 0, floorsAbove: site.floorsAbove },
    status: {
      infoRows: rowsFromExcelSite(site),
      floorUses: floor.rows,
      sharedCommonM2: floor.sharedCommonM2,
      stats,
      notes,
      land: landSection(analysis.land),
    },
    regulation: {
      relaxRows,
      parkingRows,
      parkingNote,
      scenarioRows,
      selectedRow: scenarioRows.findIndex((r) => r[0].startsWith(`${analysis.scenarioId} `)),
      sunlight,
      checkItems,
    },
    plan,
    asset: assetSection(analysis),
    verification: buildVerification(data, analysis, floor.rows),
    appendix: buildAppendix(data, analysis),
    analysis,
  }
}
