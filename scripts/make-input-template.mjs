// '가정값 입력' 엑셀 양식 만들기 — npm run data:template
// 경로: lib/data/source.json sources.input.excelPath (상위 폴더, 저장소에 올리지 않음)
// 파일이 없으면 새로 만들고, 있으면 **없는 시트만 추가**한다 (이미 입력한 값은 절대 덮어쓰지 않는다).
// 시트 → JSON 변환 규칙은 lib/data/sheetMap.json (source: "input"), 변환은 npm run data:excel.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import XLSX from 'xlsx'
import { PROJECT_ROOT, readJson } from './lib/excel-utils.mjs'
import { loadSourceConfig } from './lib/table-source.mjs'

const config = loadSourceConfig('input')
const path = resolve(PROJECT_ROOT, config.excelPath)

/** T1·T2 = 랜딩 예시 중 '기준 엑셀' 태그 */
const targets = readJson(resolve(PROJECT_ROOT, 'lib/mock/examples.json')).filter((e) =>
  String(e.tag ?? '').includes('기준 엑셀'),
)

/** 시트 정의: 머리글 + 처음 넣어 둘 행 (값을 모르면 빈칸) */
const SHEETS = [
  {
    name: '증축층면적_옵션2',
    note: '증축층 바닥면적 옵션2 — 모델링 등에서 뽑은 면적(㎡). 빈칸이면 옵션1(최상층 전유 × 0.9)을 쓴다. 적용 옵션은 lib/rules/baseRules.ts floorPlate.method',
    header: ['PNU', '필지', '증축층바닥면적(㎡)', '출처', '메모'],
    rows: targets.map((t) => [t.pnu, t.label, null, null, null]),
  },
]

const existed = existsSync(path)
const workbook = existed ? XLSX.readFile(path) : XLSX.utils.book_new()
const added = []
for (const s of SHEETS) {
  if (workbook.Sheets[s.name]) continue
  const sheet = XLSX.utils.aoa_to_sheet([s.header, ...s.rows, [], [`[설명] ${s.note}`]])
  XLSX.utils.book_append_sheet(workbook, sheet, s.name)
  added.push(s.name)
}
if (added.length === 0) {
  console.log(`추가할 시트 없음: ${path}`)
} else {
  XLSX.writeFile(workbook, path)
  console.log(`${existed ? '저장' : '생성'}: ${path}\n추가한 시트: ${added.join(', ')}`)
}
