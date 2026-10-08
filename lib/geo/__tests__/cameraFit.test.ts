import { describe, expect, it } from 'vitest'
import { MASS_VIEW, fitCamera, projectToScreen, viewDirection, type Vec3 } from '../cameraFit'

describe('3D 매스 카메라 — 북서 45° 조감, 화면 가득', () => {
  it('카메라 방향: 북서(-x, -z) 위쪽 45°', () => {
    const d = viewDirection(MASS_VIEW.azimuthDeg, MASS_VIEW.elevationDeg)
    expect(d[0]).toBeCloseTo(-0.5, 10) // 서쪽
    expect(d[2]).toBeCloseTo(-0.5, 10) // 북쪽 (-z)
    expect(d[1]).toBeCloseTo(Math.SQRT1_2, 10) // 45° 위
  })

  const corners = (min: Vec3, max: Vec3): Vec3[] =>
    [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z] as Vec3)))

  for (const [name, min, max, aspect] of [
    ['T1 크기 건물 (14.7 × 17.7 × 12.5m), 4:3', [-7.35, 0, -6.25], [7.35, 17.7, 6.25], 4 / 3],
    ['납작한 건물, 가로로 긴 화면', [-20, 0, -10], [20, 6, 10], 2],
    ['높은 건물, 세로 화면', [-4, 0, -4], [4, 40, 4], 0.75],
  ] as [string, Vec3, Vec3, number][]) {
    it(`${name}: 모든 모서리가 화면 안, 가장 바깥 모서리는 화면 끝(여백 ${MASS_VIEW.margin})에 닿음, 가운데 정렬`, () => {
      const { position, target } = fitCamera(min, max, aspect)
      const pts = corners(min, max).map((c) => projectToScreen(c, position, target, aspect))
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      const limit = 1 / MASS_VIEW.margin
      for (const p of pts) {
        expect(Math.abs(p[0])).toBeLessThanOrEqual(limit + 1e-6)
        expect(Math.abs(p[1])).toBeLessThanOrEqual(limit + 1e-6)
      }
      // 가로나 세로 중 한쪽은 화면 끝까지 찬다 (화면 가득)
      expect(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))).toBeGreaterThan(2 * limit * 0.97)
      // 가운데 정렬
      expect(Math.abs(Math.max(...xs) + Math.min(...xs))).toBeLessThan(0.03)
      expect(Math.abs(Math.max(...ys) + Math.min(...ys))).toBeLessThan(0.03)
    })
  }
})
