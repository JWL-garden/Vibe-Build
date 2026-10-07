// 기준 데이터 검사 — npm run data:check (npm run data:excel 뒤에도 자동 실행)
// 검사 기준은 lib/data/sheetMap.json (required, columns, key, unique, min/max, values, targetRequired)
// 오류가 하나라도 있으면 종료 코드 1. 단위 이상값·미등록 시트 등은 경고만 출력.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DATA_DIR, PROJECT_ROOT, dataRows, loadSheetMap, loadSource, openWorkbook, readJson, readSheet } from './lib/excel-utils.mjs'

const errors = []
const warnings = []
const isEmpty = (v) => v === null || v === undefined || String(v).trim() === ''
const norm = (s) => String(s).replace(/[\s()㎡%_]/g, '')

const source = loadSource()
const sheetMap = loadSheetMap()
const workbook = openWorkbook(source)
console.log(`기준 엑셀 ${source.version} (${source.sourceDate}): ${source.fileName}\n`)

/** T1·T2 = 랜딩 예시 중 '기준 엑셀' 태그가 붙은 필지 */
const targets = readJson(resolve(PROJECT_ROOT, 'lib/mock/examples.json'))
  .filter((e) => String(e.tag ?? '').includes('기준 엑셀'))
  .map((e, i) => ({ id: `T${i + 1}`, pnu: e.pnu, label: e.label }))
if (!targets.length) errors.push('lib/mock/examples.json에 기준 엑셀 대상(T1·T2)이 없습니다')

// ── 1) 필수 시트 / sheetMap에 없는 시트 ────────────────────────────

for (const e of sheetMap) {
  if (!workbook.Sheets[e.sheet]) (e.required ? errors : warnings).push(`시트 없음: '${e.sheet}'${e.required ? ' (필수)' : ''}`)
}
for (const name of workbook.SheetNames) {
  if (!sheetMap.some((e) => e.sheet === name)) {
    warnings.push(`sheetMap에 없는 시트: '${name}' → 쓰려면 lib/data/sheetMap.json에 한 줄 추가`)
  }
}

// ── 시트별 검사 ─────────────────────────────────────────────

for (const e of sheetMap.filter((s) => (s.enabled || s.required) && workbook.Sheets[s.sheet])) {
  const all = readSheet(workbook, e.sheet)
  const rows = dataRows(all)
  const header = Object.keys(all[0] ?? {})
  const at = `'${e.sheet}'`

  // 2) 필수 컬럼 (columns + key)
  const needed = [...new Set([...Object.keys(e.columns), ...e.key])]
  const missing = needed.filter((c) => !header.includes(c))
  for (const c of missing) {
    const similar = header.filter((h) => norm(h).includes(norm(c)) || norm(c).includes(norm(h)))
    errors.push(`${at} 컬럼 없음: '${c}'${similar.length ? ` (비슷한 컬럼: ${similar.join(', ')})` : ''}`)
  }

  // 3) 키 중복
  if (e.unique && e.key.length && !e.key.some((k) => missing.includes(k))) {
    const seen = new Map()
    const blankKey = rows.filter((r) => e.key.some((c) => isEmpty(r[c])))
    if (blankKey.length) {
      warnings.push(`${at} 키(${e.key.join('+')})가 빈 행 ${blankKey.length}개: ${blankKey.slice(0, 3).map((r) => r.PNU ?? '').join(', ')} — 원본 데이터 없음 여부 확인`)
    }
    for (const r of rows.filter((x) => !blankKey.includes(x))) {
      const k = e.key.map((c) => r[c]).join(' | ')
      seen.set(k, (seen.get(k) ?? 0) + 1)
    }
    for (const [k, n] of seen) if (n > 1) errors.push(`${at} 키 중복 (${e.key.join('+')}): ${k} — ${n}행`)
  }

  // 4) T1·T2 필수값
  const required = Object.entries(e.columns).filter(([c, d]) => d.targetRequired && !missing.includes(c)).map(([c]) => c)
  if (required.length && 'PNU' in (rows[0] ?? {})) {
    for (const t of targets) {
      const tRows = rows.filter((r) => String(r.PNU) === t.pnu)
      if (!tRows.length) {
        errors.push(`${at} ${t.id}(${t.pnu}) 행 없음`)
        continue
      }
      for (const c of required) {
        const blank = tRows.filter((r) => isEmpty(r[c])).length
        if (blank) errors.push(`${at} ${t.id} '${c}' 비어 있음 (${blank}/${tRows.length}행)`)
      }
    }
  }

  // 5) 단위 이상값 · 허용값
  for (const [c, d] of Object.entries(e.columns)) {
    if (missing.includes(c)) continue
    const bad = []
    for (const r of rows) {
      const v = r[c]
      if (isEmpty(v)) continue
      if (d.values && !d.values.includes(v)) bad.push(`${r.PNU ?? ''} '${v}'`)
      if (d.min !== undefined || d.max !== undefined) {
        const n = Number(v)
        if (Number.isNaN(n)) bad.push(`${r.PNU ?? ''} '${v}'(숫자 아님)`)
        else if ((d.min !== undefined && n < d.min) || (d.max !== undefined && n > d.max)) bad.push(`${r.PNU ?? ''} ${n}`)
      }
    }
    if (bad.length) {
      const range = d.values ? `허용값 ${d.values.join('/')}` : `범위 ${d.min ?? ''}~${d.max ?? ''}`
      warnings.push(`${at} '${c}' ${range} 벗어남 ${bad.length}건: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? ' …' : ''}`)
    }
  }
}

// ── 6) 변환 JSON이 지금 엑셀·버전과 맞는지, T1·T2가 들어 있는지 ──────────────

const fileHash = createHash('sha256').update(readFileSync(source.absPath)).digest('hex').slice(0, 16)
const outputs = [...new Set(sheetMap.filter((e) => e.enabled).map((e) => e.output))]
for (const output of outputs) {
  const path = resolve(DATA_DIR, output)
  if (!existsSync(path)) {
    errors.push(`${output} 없음 → npm run data:excel`)
    continue
  }
  const json = readJson(path)
  if (!json.meta) errors.push(`${output}에 meta 없음 → npm run data:excel`)
  else if (json.meta.fileHash !== fileHash || json.meta.version !== source.version) {
    warnings.push(`${output}이 지금 엑셀/버전과 다름 (${json.meta.version}) → npm run data:excel`)
  }
  for (const t of targets) {
    if (!json.items?.some((i) => i.pnu === t.pnu)) errors.push(`${output}에 ${t.id}(${t.pnu}) 없음`)
  }
}

// 수기 입력 파일 (엑셀에 없는 값)
const siteInputs = readJson(resolve(DATA_DIR, 'siteInputs.json')).items
for (const t of targets) {
  const s = siteInputs.find((i) => i.pnu === t.pnu)
  if (!s) warnings.push(`siteInputs.json에 ${t.id}(${t.pnu}) 없음 — 정북 이격거리 등 '확인 필요'로 표시됨`)
  else if (!['수기입력', '확인필요'].includes(s.source)) warnings.push(`siteInputs.json ${t.id} source='${s.source}' (수기입력|확인필요)`)
}

// ── 결과 ────────────────────────────────────────────────

for (const w of warnings) console.warn(`[경고] ${w}`)
for (const e of errors) console.error(`[오류] ${e}`)
console.log(`\n대상: ${targets.map((t) => t.label).join(' / ')}`)
console.log(`검사 시트 ${sheetMap.filter((e) => e.enabled || e.required).length}개 · 오류 ${errors.length} · 경고 ${warnings.length}`)
if (errors.length) process.exit(1)
console.log('data:check 통과')
