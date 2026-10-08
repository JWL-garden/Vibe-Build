// 표 데이터 소스 — 변환 스크립트(build-excel-data)와 검사 스크립트(check-data)는 이 파일의 openTableSource만 쓴다.
// 소스 설정은 lib/data/source.json 의 sources.{id} 한 곳에서 관리한다.
//   kind: 'excel' — 엑셀 파일의 시트를 표로 읽는다 (지금 방식)
//   kind: 'api'   — (예정) 공공 API 응답을 엑셀 시트와 같은 열 이름의 행 배열로 바꿔 돌려준다.
//                   builder·sheetMap은 그대로 두고 이 파일에 어댑터만 추가하면 된다 (설계서 12-1, 2026-10-08 결정 10).

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import XLSX from 'xlsx'
import { DATA_DIR, PROJECT_ROOT, readJson } from './excel-utils.mjs'

/** source.json 의 소스 설정 하나 */
export function loadSourceConfig(id = 'base') {
  const json = readJson(resolve(DATA_DIR, 'source.json'))
  const config = json.sources?.[id]
  if (!config) throw new Error(`lib/data/source.json에 sources.${id}가 없습니다`)
  for (const k of ['kind', 'version', 'sourceDate']) {
    if (!config[k]) throw new Error(`lib/data/source.json sources.${id}에 ${k}가 없습니다`)
  }
  return { id, ...config }
}

/** source.json 에 등록된 소스 id 목록 */
export const sourceIds = () => Object.keys(readJson(resolve(DATA_DIR, 'source.json')).sources ?? {})

/**
 * 표 소스 열기. 반환: { id, kind, fileName, version, sourceDate, hash, names, has(name), read(name) }
 * read(name)은 [{열이름: 값}] 배열 (빈칸 = null).
 */
export function openTableSource(id = 'base') {
  const config = loadSourceConfig(id)
  if (config.kind === 'excel') return openExcel(config)
  if (config.kind === 'api') return openApi(config)
  throw new Error(`알 수 없는 소스 종류: sources.${id}.kind = ${config.kind}`)
}

function openExcel(config) {
  if (!config.excelPath) throw new Error(`sources.${config.id}에 excelPath가 없습니다`)
  const absPath = resolve(PROJECT_ROOT, config.excelPath)
  if (!existsSync(absPath)) {
    throw new Error(`엑셀이 없습니다: ${absPath}\n→ lib/data/source.json sources.${config.id}.excelPath를 확인하세요`)
  }
  const workbook = XLSX.readFile(absPath)
  return {
    ...config,
    absPath,
    fileName: basename(absPath),
    /** 파일 sha256 앞 16자리 — 같으면 변환 일시를 유지 */
    hash: createHash('sha256').update(readFileSync(absPath)).digest('hex').slice(0, 16),
    names: workbook.SheetNames,
    has: (name) => Boolean(workbook.Sheets[name]),
    read(name) {
      const sheet = workbook.Sheets[name]
      if (!sheet) throw new Error(`시트 없음: ${name} (${basename(absPath)})`)
      return XLSX.utils.sheet_to_json(sheet, { defval: null })
    },
  }
}

/** (예정) API 소스 — 표 이름별 어댑터가 엑셀과 같은 열 이름의 행을 돌려주게 만든다 */
function openApi(config) {
  throw new Error(
    `sources.${config.id}: API 소스는 아직 구현되지 않았습니다. scripts/lib/table-source.mjs의 openApi에 ` +
      `표 이름별 어댑터(API 응답 → 엑셀 시트와 같은 열 이름)를 추가하세요.`,
  )
}
