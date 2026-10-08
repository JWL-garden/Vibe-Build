// 3D 매스 뷰 카메라 (2026-10-08) — 순수 함수 (three.js 의존 없음)
// 북서쪽 위에서 45° 각도로 내려다보는 조감, 대상 건물이 화면을 최대한 채우도록 거리·중심을 맞춘다.
// 좌표 규칙(설계서 7-3): x = 동, -z = 북, y = 높이. 북서 = (-x, -z) 방향.

export type Vec3 = [number, number, number]

/** 뷰 설정 — 방향(방위각)·내려다보는 각도·화각·여백 */
export const MASS_VIEW = {
  /** 카메라가 있는 방위 (도, 북 = 0, 시계 방향). 북서 = 315 */
  azimuthDeg: 315,
  /** 수평면에서 위로 올린 각도 (도). 45 = 위에서 45° 내려다봄 */
  elevationDeg: 45,
  /** 세로 화각 (도) */
  fovDeg: 30,
  /** 여백 배율 (1 = 화면 끝에 딱 맞음) */
  margin: 1.04,
} as const

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]

/** 카메라 쪽 방향 단위벡터 (대상 → 카메라). 방위 0 = 북(-z), 90 = 동(+x) */
export function viewDirection(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = (azimuthDeg * Math.PI) / 180
  const el = (elevationDeg * Math.PI) / 180
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)]
}

/**
 * 상자(min~max)를 화면에 가득 채우는 카메라 위치·주시점.
 * 상자 모서리 8개가 화면 비율(aspect = 가로 ÷ 세로) 안에 margin만큼 여유를 두고 들어오는 가장 가까운 거리를 구하고,
 * 화면에서 건물이 가운데 오도록 주시점을 옮긴다 (원근 때문에 두 번 반복).
 */
export function fitCamera(min: Vec3, max: Vec3, aspect: number, view = MASS_VIEW): { position: Vec3; target: Vec3 } {
  const dir = viewDirection(view.azimuthDeg, view.elevationDeg)
  const forward: Vec3 = [-dir[0], -dir[1], -dir[2]]
  const right = norm(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const tanV = Math.tan(((view.fovDeg * Math.PI) / 180) / 2) / view.margin
  const tanH = tanV * Math.max(aspect, 1e-6)

  const corners: Vec3[] = []
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push([x, y, z])

  let target: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  let distance = 0
  for (let pass = 0; pass < 3; pass++) {
    // 1) 모든 모서리가 들어오는 최소 거리
    distance = 0
    for (const c of corners) {
      const v: Vec3 = [c[0] - target[0], c[1] - target[1], c[2] - target[2]]
      const depthOffset = dot(v, forward)
      distance = Math.max(distance, Math.abs(dot(v, right)) / tanH - depthOffset, Math.abs(dot(v, up)) / tanV - depthOffset)
    }
    // 2) 화면에서 치우친 만큼 주시점을 옮겨 가운데 정렬
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const c of corners) {
      const v: Vec3 = [c[0] - target[0], c[1] - target[1], c[2] - target[2]]
      const depth = distance + dot(v, forward)
      const sx = dot(v, right) / (depth * tanH)
      const sy = dot(v, up) / (depth * tanV)
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy)
    }
    target = add(add(target, right, ((minX + maxX) / 2) * distance * tanH), up, ((minY + maxY) / 2) * distance * tanV)
  }
  return { position: add(target, dir, distance), target }
}

/** 화면 좌표 (-1~1, 화각·여백 기준) — 테스트·확인용 */
export function projectToScreen(p: Vec3, position: Vec3, target: Vec3, aspect: number, view = MASS_VIEW): [number, number] {
  const forward = norm([target[0] - position[0], target[1] - position[1], target[2] - position[2]])
  const right = norm(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  const v: Vec3 = [p[0] - position[0], p[1] - position[1], p[2] - position[2]]
  const tanV = Math.tan(((view.fovDeg * Math.PI) / 180) / 2)
  const depth = dot(v, forward)
  return [dot(v, right) / (depth * tanV * aspect), dot(v, up) / (depth * tanV)]
}
