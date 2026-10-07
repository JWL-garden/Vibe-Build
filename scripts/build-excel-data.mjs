// 기준 엑셀 → lib/data/*.json 변환 스크립트 (설계서 12-1)
// 실행: npm run data:excel
// 원본 엑셀은 상위 폴더(../)에 있고 저장소에 올리지 않는다. 결과 JSON만 커밋한다.
// 숫자는 반올림하지 않고 엑셀 값 그대로 저장한다 (엑셀 대조 테스트 ±0.01 비교용).

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const here = dirname(fileURLToPath(import.meta.url))
const FILE_NAME = '261007_데이터 통합_사무소 업무시설 분리 및 복합용도 비고4 적용.xlsx'
const INPUT = resolve(here, '../..', FILE_NAME)
const OUT_DIR = resolve(here, '../lib/data')
/** 화면·보고서 출처 표기용 기준일 (파일명 261007) */
const SOURCE_DATE = '2026-10-07'

const workbook = XLSX.readFile(INPUT)

/** 시트를 [{열이름: 값}] 배열로 읽는다 */
function readSheet(name) {
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error(`시트 없음: ${name}`)
  return XLSX.utils.sheet_to_json(sheet, { defval: null })
}

const str = (v) => (v === null || v === '' ? null : String(v))
const num = (v) => (v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
/** 대장에서 0이 "값 없음"을 뜻하는 항목 (대지면적·높이 등) */
const numOrNull = (v) => (num(v) === 0 ? null : num(v))
const date = (v) => {
  const s = String(v ?? '')
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null
}
const source = (sheets) => ({ file: FILE_NAME, sheets, date: SOURCE_DATE })

const warnings = []

// ── 1) sites.json: 건축물대장_2단계 + 지역지구구역_2단계 ──────────────────

const zonesByPnu = {}
for (const r of readSheet('지역지구구역_2단계')) {
  const list = (zonesByPnu[r.PNU] ??= [])
  if (!list.includes(r['지역지구구역코드명'])) list.push(r['지역지구구역코드명'])
}

const sites = readSheet('건축물대장_2단계').map((r) => {
  const zones = zonesByPnu[r.PNU] ?? []
  if (zones.length !== 1) warnings.push(`용도지역 ${zones.length}개: ${r.PNU} ${zones.join(', ')}`)
  const parking = {
    indoorMechanical: num(r['옥내기계식대수(대)']) ?? 0,
    outdoorMechanical: num(r['옥외기계식대수(대)']) ?? 0,
    indoorSelf: num(r['옥내자주식대수(대)']) ?? 0,
    outdoorSelf: num(r['옥외자주식대수(대)']) ?? 0,
  }
  return {
    id: String(r['관리건축물대장PK']),
    pnu: String(r.PNU),
    address: r['대지위치'],
    roadAddress: str(r['도로명대지위치']),
    buildingName: str(r['건물명']),
    dongName: str(r['동명칭']),
    registerType: r['대장종류코드명'],
    /** 외필지수 — 1보다 크면 대지 범위 확인 필요 */
    outsideParcels: num(r['외필지수']) ?? 0,
    zone: zones[0] ?? null,
    zones,
    siteAreaM2: numOrNull(r['대지면적(㎡)']),
    buildingAreaM2: num(r['건축면적(㎡)']) ?? 0,
    bcrPercent: numOrNull(r['건폐율(%)']),
    totalFloorAreaM2: num(r['연면적(㎡)']) ?? 0,
    farFloorAreaM2: num(r['용적률산정연면적(㎡)']) ?? 0,
    farPercent: numOrNull(r['용적률(%)']),
    structure: r['구조코드명'],
    mainUse: r['주용도코드명'],
    etcUse: str(r['기타용도']),
    households: num(r['세대수(세대)']) ?? 0,
    families: num(r['가구수(가구)']) ?? 0,
    unitCount: num(r['호수(호)']) ?? 0,
    heightM: numOrNull(r['높이(m)']),
    floorsAbove: num(r['지상층수']) ?? 0,
    floorsBelow: num(r['지하층수']) ?? 0,
    elevators: { passenger: num(r['승용승강기수']) ?? 0, emergency: num(r['비상용승강기수']) ?? 0 },
    /** 실제 주차대수 (대) */
    parking: { ...parking, total: Object.values(parking).reduce((s, v) => s + v, 0) },
    approvalDate: date(r['사용승인일']),
    seismic: { applied: num(r['내진설계적용여부']) === 1, capacity: str(r['내진능력']) },
  }
})

// ── 2) units.json: 전유공용면적_2단계 (호별 면적) + 주차대수_세대별 (호별 주차) ──

const parkingByUnit = {}
for (const r of readSheet('주차대수_세대별')) {
  parkingByUnit[`${r.PNU}|${r['호명칭']}`] = {
    mainUse: r['주용도'],
    netAreaM2: num(r['전용면적']),
    facilityAreaM2: num(r['시설면적']),
    /** 적용기준 (예: '제5호(공동주택·오피스텔)', '제3호(근생 134㎡)', '제4호(단독)') */
    basis: r['적용기준'],
    perUnitSpaces: num(r['세대기준대수']),
    housingActSpaces: num(r['주택법대수']),
    neighborhoodSpaces: num(r['근생대수']),
    officeSpaces: num(r['업무대수']),
  }
}

const unitsByKey = new Map()
for (const r of readSheet('전유공용면적_2단계')) {
  const key = `${r.PNU}|${r['호명칭']}`
  if (!unitsByKey.has(key)) {
    unitsByKey.set(key, {
      pnu: String(r.PNU),
      unitName: String(r['호명칭']),
      mainUse: r['주용도코드명'],
      etcUse: str(r['기타용도']),
      areas: [],
      parking: null,
    })
  }
  unitsByKey.get(key).areas.push({
    /** '전유' | '공용' */
    kind: r['전유공용구분코드명'],
    /** '지상' | '지하' | '각층' | '복수층(하층)' | '복수층(상층)' */
    floorType: str(r['층구분코드명']),
    floor: num(r['층번호']),
    floorLabel: str(r['층번호명']),
    use: r['주용도코드명'],
    etcUse: str(r['기타용도']),
    areaM2: num(r['면적(㎡)']) ?? 0,
  })
}
for (const [key, parking] of Object.entries(parkingByUnit)) {
  const unit = unitsByKey.get(key)
  if (unit) unit.parking = parking
  else warnings.push(`주차대수_세대별에만 있는 호: ${key}`)
}
const units = [...unitsByKey.values()]

// ── 3) parkingReview.json: 용적률완화_주차검토 (엑셀 대조 테스트의 정답표) ──

// 시트 아래쪽의 '[근거]', '[가정]' 같은 설명 줄은 PNU 칸에 문장이 들어 있다 → notes로 따로 보관
const reviewRows = readSheet('용적률완화_주차검토')
const isPnu = (v) => /^\d{19}$/.test(String(v))
const reviewNotes = reviewRows.filter((r) => !isPnu(r.PNU) && str(r.PNU)).map((r) => String(r.PNU))

const parkingReview = reviewRows.filter((r) => isPnu(r.PNU)).map((r) => ({
  pnu: String(r.PNU),
  address: r['대지위치'],
  buildingName: str(r['건물명']),
  zone: r['용도지역'],
  /** 산정구분 (예: '집합건축물', '단독주택', '비주거') */
  category: r['산정구분'],
  mainUse: r['주용도'],
  etcUse: str(r['기타용도']),
  households: num(r['세대수_주거']),
  siteAreaM2: num(r['대지면적']),
  baseFarPercent: num(r['기준용적률']),
  relaxedFarPercent: num(r['완화용적률']),
  farFloorAreaM2: num(r['현재용적률산정연면적']),
  /** 완화후허용연면적 ★ */
  relaxedMaxGfaM2: num(r['완화후허용연면적']),
  /** 추가가능연면적 ★ */
  addableGfaM2: num(r['추가가능연면적']),
  netRatio: num(r['전용률']),
  /** 추가가능전용면적 ★ */
  addableNetM2: num(r['추가가능전용면적']),
  actualParking: num(r['실제주차대수']),
  required: {
    perUnit: num(r['현재법정_제5호세대기준']),
    housingAct: num(r['현재법정_제5호주택법']),
    detached: num(r['현재법정_제4호단독']),
    neighborhood: num(r['현재법정_근생']),
    office: num(r['현재법정_업무']),
  },
  /** 현재법정대수 ★ */
  requiredParking: num(r['현재법정대수']),
  /** 기존여유대수 ★ */
  spareParking: num(r['기존여유대수']),
  /** 주차여유내_최대추가세대 ★ */
  maxAddUnits: num(r['주차여유내_최대추가세대']),
  maxNetPerUnitM2: num(r['세대당최대전용']),
  addedRequired: num(r['증가법정대수']),
  requiredAfter: num(r['추가후법정대수']),
  /** 필요추가주차_1세대 ★ */
  needFor1Unit: num(r['필요추가주차_1세대']),
  maxAreaUnits: num(r['면적최대세대수']),
  needForMaxArea: num(r['필요추가주차_면적최대']),
  /** 판정 — '미산정'이면 엑셀 대조 테스트에서 제외 */
  verdict: str(r['판정']),
  note: str(r['비고']),
}))

// ── 저장 ───────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true })
const save = (name, data) => {
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${name}: ${data.items.length}건`)
}
save('sites.json', { source: source(['건축물대장_2단계', '지역지구구역_2단계']), items: sites })
save('units.json', { source: source(['전유공용면적_2단계', '주차대수_세대별']), items: units })
save('parkingReview.json', {
  source: source(['용적률완화_주차검토']),
  /** 엑셀 시트 하단의 산정 근거·가정 문장 */
  notes: reviewNotes,
  items: parkingReview,
})
for (const w of warnings) console.warn(`[확인] ${w}`)
