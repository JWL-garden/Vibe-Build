// 건축물대장 원본 CSV → lib/mock/registry.json 변환 스크립트
// 실행: npm run data:buildings
// 원본은 상위 폴더(../)에 있고 저장소에 올리지 않는다. 결과 JSON만 커밋한다.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const INPUT = resolve(here, '../../건축물대장_PNU변환.csv')
const OUTPUT = resolve(here, '../lib/mock/registry.json')

/** 따옴표("...")로 감싼 칸과 칸 안의 쉼표를 처리하는 간단한 CSV 파서 */
function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const text = readFileSync(INPUT, 'utf8').replace(/^﻿/, '') // BOM 제거
const [header, ...body] = parseCsv(text)
const records = body.map((cells) => Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()])))

const str = (v) => (v === '' ? null : v)
const num = (v) => (v === '' || Number.isNaN(Number(v)) ? 0 : Number(v))
// 대장에서 0은 "값 없음"을 뜻하는 경우가 많은 항목 → null로 바꿔 화면에 "정보 없음"으로 표시
const numOrNull = (v) => (num(v) === 0 ? null : num(v))
const date = (v) => (/^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null)

const buildings = records.map((r) => ({
  id: r['관리건축물대장PK'],
  pnu: r['PNU'],
  address: r['대지위치'],
  roadAddress: str(r['도로명대지위치']),
  buildingName: str(r['건물명']),
  dongName: str(r['동명칭']),
  registerType: r['대장종류코드명'],
  siteAreaM2: numOrNull(r['대지면적(㎡)']),
  buildingAreaM2: num(r['건축면적(㎡)']),
  bcrPercent: numOrNull(r['건폐율(%)']),
  totalFloorAreaM2: num(r['연면적(㎡)']),
  farFloorAreaM2: num(r['용적률산정연면적(㎡)']),
  farPercent: numOrNull(r['용적률(%)']),
  mainUse: r['주용도코드명'],
  etcUse: str(r['기타용도']),
  households: num(r['세대수(세대)']),
  heightM: numOrNull(r['높이(m)']),
  floorsAbove: num(r['지상층수']),
  floorsBelow: num(r['지하층수']),
  approvalDate: date(r['사용승인일']),
}))

writeFileSync(OUTPUT, JSON.stringify(buildings, null, 2) + '\n', 'utf8')
console.log(`건축물 ${buildings.length}건 → ${OUTPUT}`)
