// GLB 매스 모델의 노드 이름 규칙을 읽는 순수 함수 (three.js 의존 없음)
//
// 노드 이름 규칙:  {PNU 19자리}_{EXIST|REV}_F{층}
//   예) 1156011600101040010_EXIST_F03  → 104-10번지 기존 3층
//       1156011600101040010_REV_F07    → 104-10번지 증축 7층
//
// 주의: PNU 11번째 자리(대지/산 구분) 표기가 출처마다 다르다.
//   - 이 앱(건축물대장, lib/data/sites.json): 0 = 대지, 1 = 산
//   - GLB(토지 PNU, 브이월드 등):            1 = 대지, 2 = 산
//   그래서 같은 필지라도 1156011600'0'01040010 과 1156011600'1'01040010 처럼 한 자리가 다르다.
//   필지 비교는 parcelKey()로 그 자리를 빼고 한다.

export type MassKind = 'EXIST' | 'REV'

export interface MassNodeInfo {
  /** 노드 이름에 적힌 PNU 19자리 그대로 */
  pnu: string
  /** EXIST = 기존 층, REV = 증축(계획) 층 */
  kind: MassKind
  /** 층 번호 (F03 → 3) */
  floor: number
}

const NODE_NAME = /^(\d{19})_(EXIST|REV)_F(\d+)$/

/** 노드 이름을 해석한다. 규칙에 맞지 않으면 null (지면·보조 객체 등) */
export function parseMassNodeName(name: string): MassNodeInfo | null {
  const m = NODE_NAME.exec(name.trim())
  if (!m) return null
  return { pnu: m[1], kind: m[2] as MassKind, floor: Number(m[3]) }
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
  | 'targetExisting' // 대상 필지 기존 층 (회색)
  | 'targetAddition' // 대상 필지 증축 층 (주황) — 증축 후 뷰에서만
  | 'context' //        주변 필지 기존 층 (흐린 흰색)
  | 'hidden' //         표시 안 함 (주변 필지의 증축안, 증축 전 뷰의 증축 층)

/**
 * 증축 후 뷰에 보여줄 대상 필지 REV 층 (2026-10-08)
 * 화면·보고서 숫자는 계산 엔진(runAll) 결과만 쓰므로, 모델에 증축층이 더 많아도 계산된 증축 층수만큼만 아래층부터 보여준다.
 * addFloors가 null이면(계산 결과 없음) 모델의 증축층을 모두 보여준다.
 */
export function visibleRevFloors(revFloors: number[], addFloors: number | null): Set<number> {
  const sorted = [...new Set(revFloors)].sort((a, b) => a - b)
  return new Set(addFloors === null ? sorted : sorted.slice(0, Math.max(0, addFloors)))
}

/** 이 노드를 지금 뷰에서 어떤 역할로 그릴지 결정한다. shownRev가 있으면 그 층만 증축층으로 그린다 */
export function massRole(info: MassNodeInfo, targetPnu: string, mode: MassViewMode, shownRev?: Set<number>): MassRole {
  const isTarget = isSameParcel(info.pnu, targetPnu)
  if (!isTarget) return info.kind === 'EXIST' ? 'context' : 'hidden'
  if (info.kind === 'EXIST') return 'targetExisting'
  if (mode !== 'after') return 'hidden'
  return !shownRev || shownRev.has(info.floor) ? 'targetAddition' : 'hidden'
}
