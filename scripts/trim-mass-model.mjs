// 3D 매스 모델(GLB) 경량화 + 부분 면적 추출 (2026-10-12)
//   npm run model:trim [원본.glb] [출력.glb]
// - 분석 대상(lib/mock/examples.json 의 tag '우선 분석' 필지 = T1·T2)과 그 주변(반경 CONTEXT_RADIUS_M + 여유) 건물, 지형만 남긴다.
//   원본은 835동 · 약 9.6MB 라서 로딩이 느리고 저장소에 올리기에도 크다.
// - 대상 필지 노드(EXIST·REV)의 평면 면적을 계산해 lib/data/massAreas.json 으로 저장한다.
//   측면 보강부(REV_F{n}_SIDE) 면적이 증축 연면적에 들어가므로 계산 엔진이 이 값을 읽는다 (모델 형상에서 추출한 값).
// 노드 이름 규칙은 lib/geo/massModel.ts 와 같다. 이 스크립트는 three.js 없이 @gltf-transform 만 쓴다.

import { writeFileSync, readFileSync, statSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune, dedup, joinPrimitives } from '@gltf-transform/functions'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = resolve(ROOT, process.argv[2] ?? '../261016_dangsan_sunlight_v7.glb')
const OUTPUT = resolve(ROOT, process.argv[3] ?? 'public/models/261016_dangsan_sunlight_v7_T1T2.glb')
const AREAS_JSON = resolve(ROOT, 'lib/data/massAreas.json')

/** lib/geo/massModel.ts 의 CONTEXT_RADIUS_M 과 같게 둔다 (테스트가 일치 여부를 확인) + 카메라 여유 */
const CONTEXT_RADIUS_M = 150
const MARGIN_M = 15

const NODE_NAME = /^(\d{19})_(EXIST|REV|NEW)_F(\d+)(?:_(SIDE|TOP|PARKING|CORE|BODY))?$/
const parcelKey = (pnu) => pnu.slice(0, 10) + pnu.slice(11)

const targets = JSON.parse(readFileSync(resolve(ROOT, 'lib/mock/examples.json'), 'utf8'))
  .filter((e) => String(e.tag ?? '').includes('우선 분석'))
  .map((e, i) => ({ id: `T${i + 1}`, pnu: e.pnu, key: parcelKey(e.pnu) }))
if (!targets.length) throw new Error("lib/mock/examples.json 에 '우선 분석' 대상(T1·T2)이 없습니다")

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(INPUT)
const root = doc.getRoot()

/** 노드 메시의 평면 좌표(x, z) 범위와 위쪽을 향한 면적 합 */
function measure(node) {
  const mesh = node.getMesh()
  if (!mesh) return null
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, up = 0
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const idx = prim.getIndices()
    if (!pos) continue
    const p = pos.getArray()
    for (let i = 0; i < p.length; i += 3) {
      minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i])
      minZ = Math.min(minZ, p[i + 2]); maxZ = Math.max(maxZ, p[i + 2])
    }
    const ia = idx ? idx.getArray() : null
    const tris = (ia ? ia.length : p.length / 3) / 3
    for (let t = 0; t < tris; t++) {
      const a = ia ? ia[t * 3] : t * 3
      const b = ia ? ia[t * 3 + 1] : t * 3 + 1
      const c = ia ? ia[t * 3 + 2] : t * 3 + 2
      const ux = p[b * 3] - p[a * 3], uy = p[b * 3 + 1] - p[a * 3 + 1], uz = p[b * 3 + 2] - p[a * 3 + 2]
      const vx = p[c * 3] - p[a * 3], vy = p[c * 3 + 1] - p[a * 3 + 1], vz = p[c * 3 + 2] - p[a * 3 + 2]
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
      const len = Math.hypot(nx, ny, nz)
      if (len > 0 && ny / len > 0.7) up += len / 2 // 위를 향한 면 = 평면(바닥) 면적
    }
  }
  if (!Number.isFinite(minX)) return null
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, planAreaM2: up }
}

// 1) 노드 분류 + 측정
const nodes = root.listNodes().map((node) => {
  const m = NODE_NAME.exec(node.getName())
  return {
    node,
    name: node.getName(),
    info: m ? { pnu: m[1], kind: m[2], floor: Number(m[3]), part: m[4] ?? null } : null,
    isTerrain: node.getName() === 'TERRAIN',
    m: measure(node),
  }
})

// 2) 대상 필지별 중심 (대상 필지 모든 노드의 중심 평균이 아니라 전체 범위 중심 — 뷰의 박스 중심과 같게)
for (const t of targets) {
  const own = nodes.filter((n) => n.info && parcelKey(n.info.pnu) === t.key && n.m)
  if (!own.length) throw new Error(`${t.id}(${t.pnu}) 노드가 모델에 없습니다`)
  const meshes = own.map((n) => n.node.getMesh())
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const mesh of meshes) {
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute('POSITION')
      const mn = a.getMin([]), mx = a.getMax([])
      minX = Math.min(minX, mn[0]); maxX = Math.max(maxX, mx[0])
      minZ = Math.min(minZ, mn[2]); maxZ = Math.max(maxZ, mx[2])
    }
  }
  t.cx = (minX + maxX) / 2
  t.cz = (minZ + maxZ) / 2
  t.own = own
}

// 3) 남길 노드 결정
const keep = new Set()
for (const n of nodes) {
  if (n.isTerrain) keep.add(n)
  else if (n.info && targets.some((t) => parcelKey(n.info.pnu) === t.key)) keep.add(n) // 대상 필지 EXIST·REV 전부
  else if (n.info?.kind === 'EXIST' && n.m && targets.some((t) => Math.hypot(n.m.cx - t.cx, n.m.cz - t.cz) <= CONTEXT_RADIUS_M + MARGIN_M)) keep.add(n)
}
let removed = 0
for (const n of nodes) {
  if (keep.has(n)) continue
  n.node.dispose()
  removed++
}
await doc.transform(prune(), dedup())
// 건물(노드) 하나가 재질별로 여러 primitive 로 쪼개져 있어 한 노드 안에서만 같은 재질끼리 합친다 (파일 크기·로딩 시간).
// 노드를 합치면 이름(PNU_EXIST_F층)이 사라지므로 노드 사이는 합치지 않는다.
for (const mesh of root.listMeshes()) {
  const groups = new Map()
  for (const prim of mesh.listPrimitives()) {
    const key = `${prim.getMaterial()?.getName() ?? ''}|${prim.getMode()}|${prim.getIndices() ? 'i' : 'n'}`
    groups.set(key, [...(groups.get(key) ?? []), prim])
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const joined = joinPrimitives(group)
    for (const prim of group) {
      mesh.removePrimitive(prim)
      prim.dispose()
    }
    mesh.addPrimitive(joined)
  }
}
await doc.transform(prune())

mkdirSync(dirname(OUTPUT), { recursive: true })
await io.write(OUTPUT, doc)

// 4) 부분 면적 저장 (대상 필지, 앱 PNU 기준)
const round = (v) => Math.round(v * 100) / 100
const items = targets.map((t) => ({
  id: t.id,
  pnu: t.pnu,
  parts: t.own
    .map((n) => ({ name: n.name, kind: n.info.kind, floor: n.info.floor, part: n.info.part, planAreaM2: round(n.m.planAreaM2) }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.floor - b.floor),
}))
const data = {
  meta: {
    note: '3D 매스 모델 형상에서 추출한 평면 면적(위를 향한 면 합). 측면 보강부(SIDE) 면적이 증축 연면적에 포함된다. 재생성: npm run model:trim',
    sourceModel: INPUT.split(/[\\/]/).pop(),
    trimmedModel: OUTPUT.split(/[\\/]/).pop(),
    contextRadiusM: CONTEXT_RADIUS_M,
  },
  items,
}
writeFileSync(AREAS_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8')

const size = (p) => `${(statSync(p).size / 1024 / 1024).toFixed(2)}MB`
console.log(`노드 ${nodes.length}개 → ${keep.size}개 (제거 ${removed}), 원본 ${size(INPUT)} → ${size(OUTPUT)}`)
for (const t of targets) {
  const it = items.find((i) => i.pnu === t.pnu)
  const sum = (p) => round(it.parts.filter((x) => x.part === p).reduce((s, x) => s + x.planAreaM2, 0))
  console.log(`${t.id}: 측면 보강 ${sum('SIDE')}㎡, 증축 층(TOP) ${sum('TOP')}㎡, 기존 ${it.parts.filter((x) => x.kind === 'EXIST').length}개 층`)
}
