// 기준 엑셀 공통 함수 — build-excel-data.mjs(변환)와 check-data.mjs(검사)가 같이 쓴다.
// 엑셀 경로·버전은 lib/data/source.json, 시트 매핑은 lib/data/sheetMap.json 에서만 읽는다.

import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const DATA_DIR = resolve(PROJECT_ROOT, 'lib/data')

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

/** lib/data/source.json + 엑셀 절대경로·파일명 */
export function loadSource() {
  const source = readJson(resolve(DATA_DIR, 'source.json'))
  for (const k of ['excelPath', 'version', 'sourceDate']) {
    if (!source[k]) throw new Error(`lib/data/source.json에 ${k}가 없습니다`)
  }
  const absPath = resolve(PROJECT_ROOT, source.excelPath)
  return { ...source, absPath, fileName: basename(absPath) }
}

/** lib/data/sheetMap.json 의 sheets 배열 */
export const loadSheetMap = () => readJson(resolve(DATA_DIR, 'sheetMap.json')).sheets

export function openWorkbook(source) {
  if (!existsSync(source.absPath)) {
    throw new Error(`기준 엑셀이 없습니다: ${source.absPath}\n→ lib/data/source.json의 excelPath를 확인하세요`)
  }
  return XLSX.readFile(source.absPath)
}

/** 시트를 [{열이름: 값}] 배열로 읽는다 */
export function readSheet(workbook, name) {
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error(`시트 없음: ${name}`)
  return XLSX.utils.sheet_to_json(sheet, { defval: null })
}

export const str = (v) => (v === null || v === '' ? null : String(v))
export const num = (v) => (v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
/** 대장에서 0이 "값 없음"을 뜻하는 항목 (대지면적·높이 등) */
export const numOrNull = (v) => (num(v) === 0 ? null : num(v))
export const date = (v) => {
  const s = String(v ?? '')
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null
}
/** PNU 19자리 — 아니면 시트 하단 설명 줄 등으로 보고 데이터 행에서 뺀다 */
export const isPnu = (v) => /^\d{19}$/.test(String(v))
export const pnu = (v) => (isPnu(v) ? String(v) : null)

/** sheetMap columns의 type → 변환 함수 (generic builder용) */
export const CONVERTERS = { str, num, numOrNull, date, pnu, raw: (v) => v }

/** 데이터 행만 (PNU 열이 있으면 19자리 PNU 행만) */
export const dataRows = (rows) => (rows.length && 'PNU' in rows[0] ? rows.filter((r) => isPnu(r.PNU)) : rows)
