// GLB 매스 모델의 노드 이름 규칙을 읽는 순수 함수 (three.js 의존 없음)
//
// 노드 이름 규칙 (261012_dangsan_sunlight_v4.glb):  {PNU 19자리}_{EXIST|REV}_F{층}[_SIDE|_TOP]
//   예) 1156011600001040010_EXIST_F03       → 104-10번지 기존 3층
//       1156011600001040010_REV_F05_SIDE    → 기존 5층 높이에서 일조 사선으로 물러난 면을 채우는 측면 보강부
//       1156011600001040010_REV_F06_TOP     → 기존 최상층 위에 새로 올리는 증축 층
//   TERRAIN                                  → 지형 (건물 아님)
//
// 주의: PNU 11번째 자리(대지/산 구분) 표기가 출처마다 다를 수 있다 (앱·v4 모델: 0 = 대지, 이전 모델: 1 = 대지).
//   필지 비교는 parcelKey()로 그 자리를 빼고 한다.

export type MassKind = 'EXIST' | 'REV'
/** REV 노드의 종류 — SIDE = 측면 보강(기존 층과 같은 높이), TOP = 새 층. 규칙에 없으면 null */
export type MassPart = 'SIDE' | 'TOP' | null

export interface MassNodeInfo {
  /** 노드 이름에 적힌 PNU 19자리 그대로 */
  pnu: string
  /** EXIST = 기존 층, REV = 증축(계획) 부분 */
  kind: MassKind
  /** 층 번호 (F03 → 3) */
  floor: number
  part: MassPart
}

const NODE_NAME = /^(\d{19})_(EXIST|REV)_F(\d+)(?:_(SIDE|TOP))?$/

/** 지형 노드 이름 */
export const TERRAIN_NODE_NAME = 'TERRAIN'

/** 주변 건물을 그리는 반경 (m, 대상 건물 중심 기준) — 모델에 835동이 있어 먼 건물은 그리지 않는다 */
export const CONTEXT_RADIUS_M = 150

/** 노드 이름을 해석한다. 규칙에 맞지 않으면 null (지형·보조 객체 등) */
export function parseMassNodeName(name: string): MassNodeInfo | null {
  const m = NODE_NAME.exec(name.trim())
  if (!m) return null
  return { pnu: m[1], kind: m[2] as MassKind, floor: Number(m[3]), part: (m[4] as MassPart) ?? null }
}

/** 대지/산 구분 자리(11번째)를 뺀 필지 비교용 키 (법정동 10자리 + 본번 4 + 부번 4) */
export function parcelKey(pnu: string): string {
  return pnu.slice(0, 10) + pnu.slice(11)
}

export function isSameParcel(a: string, b: string): boolean {
  return a.length === 19 && b.length === 19 && parcelKey(a) === parcelKey(b)
}

export type MassViewMode = 'before' | 'after'

export type MassRole =
  | 'targetExisting' //  대상 필지 기존 층 (회색)
  | 'targetAddition' //  대상 필지 증축 부분 (주황) — 증축 후 뷰에서만
  | 'targetRebuilt' //   재건축 신축 매스 (옅은 청록) — 재건축 증축 후 뷰: 기존 + 증축분 전체
  | 'context' //         주변 필지 기존 층 (회색 반투명)
  | 'hidden' //          표시 안 함 (주변 필지의 증축안, 증축 전 뷰의 증축 부분, 계산 층수를 넘는 층)

/** 뷰 설정 — 숫자(층수)는 계산 엔진(runAll) 결과만 받는다 */
export interface MassViewOptions {
  /** 대상 필지의 모델 기존 최상층 (EXIST 노드 중 가장 높은 층). 증축 판단 기준 */
  existTopFloor: number
  /** 계산 엔진의 증축 층수. null이면 모델의 증축 부분을 모두 보여준다 */
  addFloors: number | null
  /** 재건축: 계산 엔진의 신축 지상 층수. 있으면 "증축 후" 뷰는 이 층수까지의 기존 + 증축 전체를 신축 매스로 그린다 */
  rebuildFloors?: number | null
  /** 측면 보강부(SIDE)를 증축 연면적에 포함했는지 (계산 엔진 결과). false면 숨긴다. 생략(undefined)하면 증축 층이 있을 때 표시 */
  sideIncluded?: boolean
}

/**
 * 증축 부분(REV)을 지금 보여줄지.
 * 증축 층수가 0이면 모두 숨기고, 1 이상이면 (기존 최상층 + 증축 층수)까지의 층만 보여준다.
 * (측면 보강부(SIDE)는 기존 층과 같은 높이라 증축이 있을 때만 함께 표시한다)
 */
export function isRevShown(info: MassNodeInfo, opts: Pick<MassViewOptions, 'existTopFloor' | 'addFloors' | 'sideIncluded'>): boolean {
  if (info.part === 'SIDE' && opts.sideIncluded === false) return false
  if (opts.addFloors === null) return true
  return opts.addFloors >= 1 && info.floor <= opts.existTopFloor + opts.addFloors
}

/** 이 노드를 지금 뷰에서 어떤 역할로 그릴지 결정한다 */
export function massRole(info: MassNodeInfo, targetPnu: string, mode: MassViewMode, opts: MassViewOptions): MassRole {
  const isTarget = isSameParcel(info.pnu, targetPnu)
  if (!isTarget) return info.kind === 'EXIST' ? 'context' : 'hidden'

  if (mode === 'before') return info.kind === 'EXIST' ? 'targetExisting' : 'hidden'

  // 재건축 증축 후: 기존 건물은 철거되고 기존 + 증축 전체가 신축 매스. 계산된 지상 층수까지만 표시
  if (opts.rebuildFloors !== undefined && opts.rebuildFloors !== null) {
    return info.floor <= opts.rebuildFloors ? 'targetRebuilt' : 'hidden'
  }

  if (info.kind === 'EXIST') return 'targetExisting'
  return isRevShown(info, opts) ? 'targetAddition' : 'hidden'
}

/** 대상 필지의 모델 층 정보 (캡션·카메라용) */
export interface MassFloorSummary {
  /** 기존 최상층 (EXIST 중 가장 높은 층, 없으면 0) */
  existTopFloor: number
  /** 모델 전체 최상층 (EXIST·REV 중 가장 높은 층) */
  modelTopFloor: number
  /** 모델의 증축 층수 = 전체 최상층 − 기존 최상층 (0 이상) */
  modelAddFloors: number
  /** 측면 보강부(SIDE)가 있는지 */
  hasSide: boolean
}

export function summarizeFloors(infos: MassNodeInfo[]): MassFloorSummary {
  const exist = infos.filter((i) => i.kind === 'EXIST').map((i) => i.floor)
  const all = infos.map((i) => i.floor)
  const existTopFloor = exist.length ? Math.max(...exist) : 0
  const modelTopFloor = all.length ? Math.max(...all) : 0
  return {
    existTopFloor,
    modelTopFloor,
    modelAddFloors: Math.max(0, modelTopFloor - existTopFloor),
    hasSide: infos.some((i) => i.part === 'SIDE'),
  }
}
