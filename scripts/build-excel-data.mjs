// 데이터 소스(기준 엑셀·가정값 입력 엑셀) → lib/data/*.json 변환 스크립트 (설계서 12-1)
// 실행: npm run data:excel
// 소스 경로·버전: lib/data/source.json (sources.base / sources.input) / 시트 → JSON 매핑: lib/data/sheetMap.json
// 소스는 scripts/lib/table-source.mjs 로만 연다 — 나중에 API로 바꿔도 아래 builder는 그대로 쓴다.
// 원본 엑셀은 상위 폴더(../)에 있고 저장소에 올리지 않는다. 결과 JSON만 커밋한다.
// 숫자는 반올림하지 않고 엑셀 값 그대로 저장한다 (엑셀 대조 테스트 ±0.01 비교용).

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { CONVERTERS, DATA_DIR, dataRows, date, isPnu, loadSheetMap, num, numOrNull, readJson, str } from './lib/excel-utils.mjs'
import { openTableSource } from './lib/table-source.mjs'

const sheetMap = loadSheetMap()
/** 소스는 필요할 때 한 번만 연다 */
const opened = {}
const sourceOf = (id) => {
  if (!opened[id]) {
    opened[id] = openTableSource(id)
    console.log(`${opened[id].label ?? id} ${opened[id].version} (${opened[id].sourceDate}): ${opened[id].fileName ?? opened[id].kind}`)
  }
  return opened[id]
}
/** 전용 builder는 기준 엑셀(base)에서 읽는다 */
const read = (name) => sourceOf('base').read(name)
const now = new Date().toISOString()

const warnings = []

// ── 전용 builder: 시트 여러 개를 합쳐 중첩 구조를 만드는 출력 ─────────────

const builders = {
  // sites.json: 건축물대장_2단계 + 지역지구구역_2단계
  sites() {
    const zonesByPnu = {}
    for (const r of read('지역지구구역_2단계')) {
      const list = (zonesByPnu[r.PNU] ??= [])
      if (!list.includes(r['지역지구구역코드명'])) list.push(r['지역지구구역코드명'])
    }

    const items = read('건축물대장_2단계').map((r) => {
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
        /** 지붕 (예: '(철근)콘크리트' / 기타지붕 '평스라브') — 증축층 바닥면적 옵션1의 증축 가능 판단 */
        roof: { type: str(r['지붕코드명']), etc: str(r['기타지붕']) },
      }
    })
    return { items }
  },

  // units.json: 전유공용면적_2단계 (호별 면적) + 주차대수_세대별 (호별 주차)
  units() {
    const parkingByUnit = {}
    for (const r of read('주차대수_세대별')) {
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
    for (const r of read('전유공용면적_2단계')) {
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
    return { items: [...unitsByKey.values()] }
  },

  // parkingReview.json: 용적률완화_주차검토 (엑셀 대조 테스트의 정답표)
  parkingReview() {
    // 시트 아래쪽의 '[근거]', '[가정]' 같은 설명 줄은 PNU 칸에 문장이 들어 있다 → notes로 따로 보관
    const reviewRows = read('용적률완화_주차검토')
    const notes = reviewRows.filter((r) => !isPnu(r.PNU) && str(r.PNU)).map((r) => String(r.PNU))

    const items = reviewRows.filter((r) => isPnu(r.PNU)).map((r) => ({
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
    /** notes = 엑셀 시트 하단의 산정 근거·가정 문장 */
    return { notes, items }
  },
}

// ── generic builder: sheetMap columns의 field·type대로 한 시트를 옮긴다 (새 시트용) ──

function buildGeneric(entry) {
  const fields = Object.entries(entry.columns).filter(([, c]) => c.field)
  if (!fields.length) throw new Error(`sheetMap '${entry.sheet}': generic builder는 columns에 field가 필요합니다`)
  const rows = sourceOf(entry.source).read(entry.sheet)
  const hasPnu = rows.length > 0 && 'PNU' in rows[0]
  // PNU 열이 있으면 19자리가 아닌 줄(설명 문장 등)은 notes로 보관
  const notes = hasPnu ? rows.filter((r) => !isPnu(r.PNU) && str(r.PNU)).map((r) => String(r.PNU)) : []
  const items = (hasPnu ? rows.filter((r) => isPnu(r.PNU)) : rows).map((r) => {
    const item = {}
    for (const [col, c] of fields) {
      const convert = CONVERTERS[c.type ?? 'raw']
      if (!convert) throw new Error(`sheetMap '${entry.sheet}.${col}': 알 수 없는 type '${c.type}'`)
      item[c.field] = convert(r[col])
    }
    return item
  })
  return notes.length ? { notes, items } : { items }
}

// ── 실행: enabled 시트를 output별로 묶어서 변환 ─────────────────────────

const outputs = new Map()
for (const entry of sheetMap.filter((e) => e.enabled)) {
  if (!entry.output || !entry.builder) throw new Error(`sheetMap '${entry.sheet}': enabled인데 output·builder가 없습니다`)
  if (!outputs.has(entry.output)) outputs.set(entry.output, { builder: entry.builder, entries: [] })
  const out = outputs.get(entry.output)
  if (out.builder !== entry.builder) throw new Error(`sheetMap: ${entry.output}의 builder가 시트마다 다릅니다`)
  if (out.entries.length && out.entries[0].source !== entry.source) {
    throw new Error(`sheetMap: ${entry.output}의 시트들이 서로 다른 소스에서 옵니다`)
  }
  out.entries.push(entry)
}

mkdirSync(DATA_DIR, { recursive: true })
for (const [output, { builder, entries }] of outputs) {
  let built
  if (builder === 'generic') {
    if (entries.length !== 1) throw new Error(`sheetMap: generic 출력 ${output}에는 시트가 하나만 올 수 있습니다`)
    built = buildGeneric(entries[0])
  } else if (builders[builder]) {
    built = builders[builder]()
  } else {
    throw new Error(`sheetMap: 알 수 없는 builder '${builder}' (${output})`)
  }
  const source = sourceOf(entries[0].source)
  const path = resolve(DATA_DIR, output)
  mkdirSync(dirname(path), { recursive: true })
  const prev = existsSync(path) ? readJson(path).meta : null
  const sheets = entries.map((e) => ({ name: e.sheet, rows: dataRows(source.read(e.sheet)).length }))
  const meta = {
    /** 소스 id (lib/data/source.json sources.{id}) */
    source: source.id,
    /** 원본 파일명 */
    file: source.fileName,
    /** lib/data/source.json의 version · sourceDate */
    version: source.version,
    sourceDate: source.sourceDate,
    /** 파일 sha256 앞 16자리 */
    fileHash: source.hash,
    /** 변환 일시 (파일·버전이 그대로면 이전 값 유지) */
    convertedAt: prev?.fileHash === source.hash && prev?.version === source.version ? prev.convertedAt : now,
    /** 사용 시트와 데이터 행 수 (PNU 행만, 설명 줄 제외) */
    sheets,
    itemCount: built.items.length,
  }
  const data = { meta, ...built }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`${output}: ${data.items.length}건 (${sheets.map((s) => `${s.name} ${s.rows}행`).join(', ')})`)
}
for (const w of warnings) console.warn(`[확인] ${w}`)
