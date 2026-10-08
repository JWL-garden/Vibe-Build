// 연립·다세대 전월세 실거래 → 가정값 입력 엑셀 '임대사례' 시트 (2026-10-08 결정 5)
// 실행: npm run data:rent  (서울 열린데이터광장 인증키 필요 — .env.local 에 SEOUL_OPEN_API_KEY=...)
// 화면·계산은 API를 직접 부르지 않는다. 이 스크립트로 한 번 받아 엑셀에 고정값으로 저장하고, npm run data:excel 로 변환한다.
//
// 자료: 서울시 부동산 전월세가 정보 (OA-21276, 서비스 tbLnOpendataRentV — 국토교통부 전월세 신고자료 기반)
// 범위: 가정값 입력 엑셀 기준일(source.json sources.input.sourceDate)부터 최근 12개월, 건물용도 '연립다세대', 전용 60㎡ 이하
// 지역: 당산동6가 → 전용 구간(0~30 / 30~60㎡)별 사례가 MIN_SAMPLES 미만이면 영등포구 전체 사례를 함께 넣는다
// 엑셀의 출처가 '서울 열린데이터광장'인 행만 다시 쓰고, 직접 입력한 행은 그대로 둔다.

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import XLSX from 'xlsx'
import { PROJECT_ROOT } from './lib/excel-utils.mjs'
import { loadSourceConfig } from './lib/table-source.mjs'

const SOURCE_LABEL = '서울 열린데이터광장 tbLnOpendataRentV'
const SHEET = '임대사례'
const DISTRICT = { code: '11560', name: '영등포구' }
const DONG = { code: '11600', name: '당산동6가' }
const MIN_SAMPLES = 10
const PAGE = 1000

function apiKey() {
  if (process.env.SEOUL_OPEN_API_KEY) return process.env.SEOUL_OPEN_API_KEY
  const env = resolve(PROJECT_ROOT, '.env.local')
  if (existsSync(env)) {
    const line = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith('SEOUL_OPEN_API_KEY='))
    if (line) return line.slice('SEOUL_OPEN_API_KEY='.length).trim()
  }
  throw new Error(
    'SEOUL_OPEN_API_KEY가 없습니다. 서울 열린데이터광장(data.seoul.go.kr)에서 일반 인증키를 받아 .env.local 에\n' +
      'SEOUL_OPEN_API_KEY=발급받은키 를 한 줄 추가한 뒤 다시 실행하세요. (키는 깃에 올라가지 않습니다)',
  )
}

/** 접수연도·지역으로 전체 행을 페이지 단위로 받는다 */
async function fetchAll(key, year, dong) {
  const rows = []
  for (let start = 1; ; start += PAGE) {
    const path = [key, 'json', 'tbLnOpendataRentV', start, start + PAGE - 1, year, DISTRICT.code, encodeURIComponent(DISTRICT.name)]
    if (dong) path.push(dong.code)
    const res = await fetch(`http://openapi.seoul.go.kr:8088/${path.join('/')}/`)
    const json = await res.json()
    const body = json.tbLnOpendataRentV
    if (!body) {
      if (json.RESULT?.CODE === 'INFO-200') break // 데이터 없음
      throw new Error(`API 오류: ${JSON.stringify(json.RESULT ?? json).slice(0, 200)}`)
    }
    rows.push(...body.row)
    if (start + PAGE - 1 >= body.list_total_count) break
  }
  return rows
}

const ymd = (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
const band = (area) => (area <= 30 ? 'S' : 'M')

async function main() {
  const key = apiKey()
  const config = loadSourceConfig('input')
  const until = config.sourceDate // YYYY-MM-DD
  const from = `${Number(until.slice(0, 4)) - 1}${until.slice(4)}` // 12개월 전 (같은 날 제외)
  const years = [...new Set([from.slice(0, 4), until.slice(0, 4)])]

  const pick = (rows) =>
    rows.filter((r) => {
      const d = ymd(r.CTRT_DAY)
      return r.BLDG_USG === '연립다세대' && d > from && d <= until && Number(r.RENT_AREA) > 0 && Number(r.RENT_AREA) <= 60
    })

  let rows = []
  for (const y of years) rows.push(...pick(await fetchAll(key, y, DONG)))
  const count = { S: rows.filter((r) => band(r.RENT_AREA) === 'S').length, M: rows.filter((r) => band(r.RENT_AREA) === 'M').length }
  console.log(`${DONG.name} 연립다세대 ${from} ~ ${until}: 0~30㎡ ${count.S}건, 30~60㎡ ${count.M}건`)

  if (count.S < MIN_SAMPLES || count.M < MIN_SAMPLES) {
    const district = []
    for (const y of years) district.push(...pick(await fetchAll(key, y, null)))
    const extra = district.filter((r) => r.STDG_NM !== DONG.name)
    console.log(`사례 부족(구간별 ${MIN_SAMPLES}건 미만) → ${DISTRICT.name} 다른 동 ${extra.length}건 추가`)
    rows = rows.concat(extra)
  }

  const out = rows.map((r) => [
    `${SOURCE_LABEL} (${r.STDG_NM === DONG.name ? '당산동6가' : '영등포구'})`,
    ymd(r.CTRT_DAY),
    r.CGG_NM,
    r.STDG_NM,
    `${Number(r.MNO)}${Number(r.SNO) ? `-${Number(r.SNO)}` : ''}`,
    r.FLR,
    r.RENT_SE,
    Number(r.RENT_AREA),
    Number(String(r.GRFE).replace(/,/g, '')),
    Number(String(r.RTFE).replace(/,/g, '')),
    null, // 관리비: 신고자료에 없음
    r.BLDG_USG,
    r.ARCH_YR ? Number(r.ARCH_YR) : null,
    r.NEW_UPDT_YN || null,
    null,
  ])

  const path = resolve(PROJECT_ROOT, config.excelPath)
  const workbook = XLSX.readFile(path)
  if (!workbook.Sheets[SHEET]) throw new Error(`'${SHEET}' 시트가 없습니다 → npm run data:template`)
  const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[SHEET], { header: 1, defval: null })
  const [header, ...body] = aoa
  // 직접 입력한 행과 설명 줄은 유지, 이전에 받은 API 행만 교체
  const kept = body.filter((r) => r.some((v) => v !== null && v !== '') && !String(r[0] ?? '').startsWith(SOURCE_LABEL))
  const notes = kept.filter((r) => String(r[0] ?? '').startsWith('['))
  const manual = kept.filter((r) => !String(r[0] ?? '').startsWith('['))
  workbook.Sheets[SHEET] = XLSX.utils.aoa_to_sheet([header, ...manual, ...out, [], ...notes])
  XLSX.writeFile(workbook, path)
  console.log(`'${SHEET}' 시트: 직접 입력 ${manual.length}행 유지 + API ${out.length}행 저장 → npm run data:excel`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
