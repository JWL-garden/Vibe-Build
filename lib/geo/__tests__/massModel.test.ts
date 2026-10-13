import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import massAreas from '@/lib/data/massAreas.json'
import {
  CONTEXT_RADIUS_M,
  TERRAIN_NODE_NAME,
  isRevShown,
  isSameParcel,
  massRole,
  parseMassNodeName,
  summarizeFloors,
  type MassNodeInfo,
} from '../massModel'

const T1 = '1156011600001040010'
const T2 = '1156011600001100019'
const node = (name: string) => parseMassNodeName(name)!

describe('GLB 매스 노드 이름 (v4·v5)', () => {
  it('EXIST·REV·SIDE·TOP 이름을 해석한다', () => {
    expect(parseMassNodeName(`${T1}_EXIST_F03`)).toEqual({ pnu: T1, kind: 'EXIST', floor: 3, part: null })
    expect(parseMassNodeName(`${T1}_REV_F05_SIDE`)).toEqual({ pnu: T1, kind: 'REV', floor: 5, part: 'SIDE' })
    expect(parseMassNodeName(`${T1}_REV_F06_TOP`)).toEqual({ pnu: T1, kind: 'REV', floor: 6, part: 'TOP' })
    // 이전 모델 이름도 읽는다
    expect(parseMassNodeName('1156011600101040010_REV_F07')).toEqual({ pnu: '1156011600101040010', kind: 'REV', floor: 7, part: null })
  })

  it('규칙에 맞지 않으면 null (지형·18자리·알 수 없는 접미사)', () => {
    expect(parseMassNodeName(TERRAIN_NODE_NAME)).toBeNull()
    expect(parseMassNodeName('115601160010104001_EXIST_F01')).toBeNull()
    expect(parseMassNodeName(`${T1}_REV_F06_ROOF`)).toBeNull()
  })

  it('건축물대장 PNU(대지=0)와 토지 PNU(대지=1)를 같은 필지로 본다', () => {
    expect(isSameParcel(T1, '1156011600101040010')).toBe(true)
    expect(isSameParcel(T1, '1156011600101100021')).toBe(false)
  })

  it('주변 건물 반경은 150m', () => {
    expect(CONTEXT_RADIUS_M).toBe(150)
  })
})

describe('층 요약', () => {
  it('T1: 기존 최상층 5, 모델 최상층 6, 증축 1개층, 측면 보강 있음', () => {
    const infos = [1, 2, 3, 4, 5].map((f) => node(`${T1}_EXIST_F0${f}`)).concat(
      [node(`${T1}_REV_F04_SIDE`), node(`${T1}_REV_F05_SIDE`), node(`${T1}_REV_F06_TOP`)],
    )
    expect(summarizeFloors(infos)).toEqual({ existTopFloor: 5, modelTopFloor: 6, modelAddFloors: 1, hasSide: true })
  })

  it('노드가 없으면 0', () => {
    expect(summarizeFloors([])).toEqual({ existTopFloor: 0, modelTopFloor: 0, modelAddFloors: 0, hasSide: false })
  })
})

describe('뷰별 표시 역할 — 증축', () => {
  const t1 = { existTopFloor: 5, addFloors: 1 }
  const exist = node(`${T1}_EXIST_F03`)
  const side = node(`${T1}_REV_F05_SIDE`)
  const top = node(`${T1}_REV_F06_TOP`)
  const near = node('1156011600001100021_EXIST_F01')
  const nearRev = node('1156011600001100021_REV_F04_SIDE')

  it('증축 전: 대상 기존층만, 증축 부분 숨김', () => {
    expect(massRole(exist, T1, 'before', t1)).toBe('targetExisting')
    expect(massRole(side, T1, 'before', t1)).toBe('hidden')
    expect(massRole(top, T1, 'before', t1)).toBe('hidden')
  })

  it('증축 후(+1층): 기존층 + 측면 보강 + 새 층 모두 증축/기존 색', () => {
    expect(massRole(exist, T1, 'after', t1)).toBe('targetExisting')
    expect(massRole(side, T1, 'after', t1)).toBe('targetAddition')
    expect(massRole(top, T1, 'after', t1)).toBe('targetAddition')
  })

  it('증축 층수 0이면 증축 부분 전부 숨김 (측면 보강도)', () => {
    const none = { existTopFloor: 5, addFloors: 0 }
    expect(massRole(side, T1, 'after', none)).toBe('hidden')
    expect(massRole(top, T1, 'after', none)).toBe('hidden')
    expect(isRevShown(top, none)).toBe(false)
  })

  it('모델 증축 층수보다 계산 층수가 적으면 높은 층부터 숨김 (기존 5층 + 2층 = 7층까지)', () => {
    const tall = node(`${T1}_REV_F08_TOP`)
    expect(isRevShown(top, { existTopFloor: 5, addFloors: 2 })).toBe(true)
    expect(isRevShown(tall, { existTopFloor: 5, addFloors: 2 })).toBe(false)
    expect(isRevShown(tall, { existTopFloor: 5, addFloors: null })).toBe(true) // 계산 결과 없으면 전부
  })

  it('주변 필지: 기존층은 배경, 증축안은 항상 숨김', () => {
    expect(massRole(near, T1, 'after', t1)).toBe('context')
    expect(massRole(nearRev, T1, 'after', t1)).toBe('hidden')
    expect(massRole(near, T1, 'before', t1)).toBe('context')
  })
})

describe('뷰별 표시 역할 — 재건축', () => {
  const opts = (rebuildFloors: number | null) => ({ existTopFloor: 6, addFloors: 1, rebuildFloors })
  const e = (f: number) => node(`${T2}_EXIST_F0${f}`)
  const side6 = node(`${T2}_REV_F06_SIDE`)
  const top7 = node(`${T2}_REV_F07_TOP`)

  it('증축 전은 증축과 같다: 기존 건물(회색)만', () => {
    expect(massRole(e(3), T2, 'before', opts(6))).toBe('targetExisting')
    expect(massRole(top7, T2, 'before', opts(6))).toBe('hidden')
  })

  it('증축 후: 기존 + 증축 전체가 신축 매스. 계산 지상 6층까지 — 7층(TOP)은 숨김', () => {
    expect(massRole(e(3), T2, 'after', opts(6))).toBe('targetRebuilt')
    expect(massRole(e(6), T2, 'after', opts(6))).toBe('targetRebuilt')
    expect(massRole(side6, T2, 'after', opts(6))).toBe('targetRebuilt')
    expect(massRole(top7, T2, 'after', opts(6))).toBe('hidden')
  })

  it('계산 층수가 모델보다 높거나 같으면 모델 전체를 신축 매스로 (T1: 6층)', () => {
    const t1top = node(`${T1}_REV_F06_TOP`)
    expect(massRole(t1top, T1, 'after', { existTopFloor: 5, addFloors: 1, rebuildFloors: 6 })).toBe('targetRebuilt')
    expect(massRole(t1top, T1, 'after', { existTopFloor: 5, addFloors: 1, rebuildFloors: 8 })).toBe('targetRebuilt')
  })

  it('주변 건물은 재건축 뷰에서도 배경', () => {
    expect(massRole(node('1156011600001100021_EXIST_F02'), T2, 'after', opts(6))).toBe('context')
  })
})

describe('실제 v5 모델 (public/models)', () => {
  // GLB JSON 청크의 노드 이름만 읽는다 (three.js 불필요)
  const glb = readFileSync(resolve(__dirname, '../../../public/models/261012_dangsan_sunlight_v5_T1T2.glb'))
  const jsonLen = glb.readUInt32LE(12)
  const names: string[] = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8')).nodes.map((n: { name: string }) => n.name)
  const infos = (pnu: string) =>
    names
      .map((n) => parseMassNodeName(n))
      .filter((i): i is MassNodeInfo => i !== null && isSameParcel(i.pnu, pnu))

  it('경량 모델: 지형 노드 + T1·T2와 주변 기존 층만 (원본 835동 → 반경 안만)', () => {
    expect(names).toContain(TERRAIN_NODE_NAME)
    const exist = names.filter((n) => /_EXIST_F\d+$/.test(n))
    expect(exist.length).toBeGreaterThan(100)
    expect(exist.length).toBeLessThan(835)
  })

  it('경량 모델의 측면 보강부(SIDE) 면적 = lib/data/massAreas.json (T1 36.52㎡, T2 83.98㎡)', () => {
    const sum = (pnu: string) =>
      (massAreas.items.find((i) => i.pnu === pnu)?.parts ?? []).filter((p) => p.part === 'SIDE').reduce((s, p) => s + p.planAreaM2, 0)
    expect(sum(T1)).toBeCloseTo(36.52, 2)
    expect(sum(T2)).toBeCloseTo(83.98, 2)
  })

  it('T1(104-10): 기존 5층 + 증축 1개층(TOP) + 측면 보강', () => {
    expect(summarizeFloors(infos(T1))).toEqual({ existTopFloor: 5, modelTopFloor: 6, modelAddFloors: 1, hasSide: true })
  })

  it('T2(110-19): 기존 6층 + 증축 1개층(TOP) + 측면 보강', () => {
    expect(summarizeFloors(infos(T2))).toEqual({ existTopFloor: 6, modelTopFloor: 7, modelAddFloors: 1, hasSide: true })
  })
})
