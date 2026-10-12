import { describe, expect, it } from 'vitest'
import { packUnits, type PackUnit } from '../paginate'

const block = (height: number): PackUnit => ({ height })
const table = (lead: number, head: number, rows: number[]): PackUnit => ({ height: 0, table: { leadHeight: lead, headHeight: head, rowHeights: rows } })

describe('packUnits — 쪽 나눔', () => {
  it('높이 합이 쪽 높이 안이면 한 쪽', () => {
    const r = packUnits([block(100), block(200), block(300)], 700)
    expect(r.pages).toHaveLength(1)
    expect(r.pages[0].map((i) => i.unit)).toEqual([0, 1, 2])
    expect(r.overflow).toBe(false)
  })

  it('블록은 쪽 사이에서 쪼개지지 않고 다음 쪽으로 넘어간다', () => {
    const r = packUnits([block(400), block(400), block(400)], 900)
    expect(r.pages.map((p) => p.map((i) => i.unit))).toEqual([[0, 1], [2]])
  })

  it('쪽 높이보다 큰 블록은 한 쪽을 단독으로 쓰고 overflow 표시', () => {
    const r = packUnits([block(100), block(1200), block(100)], 900)
    expect(r.pages.map((p) => p.map((i) => i.unit))).toEqual([[0], [1], [2]])
    expect(r.overflow).toBe(true)
  })

  it('표는 행 단위로 쪼개고 쪽마다 머리글을 다시 쓴다 (제목은 첫 조각에만)', () => {
    // 쪽 500: 제목 40 + 머리글 30 + 행 50 × 12 → 첫 쪽에 (500−70)/50 = 8행, 둘째 쪽에 (500−30)/50 → 4행
    const r = packUnits([table(40, 30, Array(12).fill(50))], 500)
    expect(r.pages).toHaveLength(2)
    expect(r.pages[0][0]).toEqual({ unit: 0, rows: [0, 8], first: true })
    expect(r.pages[1][0]).toEqual({ unit: 0, rows: [8, 12], first: false })
  })

  it('현재 쪽에 제목 + 머리글 + 한 행이 안 들어가면 표 전체를 새 쪽에서 시작 (제목만 남지 않음)', () => {
    const r = packUnits([block(450), table(40, 30, [50, 50])], 500)
    expect(r.pages.map((p) => p.map((i) => i.unit))).toEqual([[0], [1]])
    expect(r.pages[1][0]).toEqual({ unit: 0 + 1, rows: [0, 2], first: true })
  })

  it('표가 통째로 들어가면 쪼개지 않는다', () => {
    const r = packUnits([block(100), table(30, 30, [40, 40, 40])], 400)
    expect(r.pages).toHaveLength(1)
    expect(r.pages[0][1]).toEqual({ unit: 1, rows: [0, 3], first: true })
  })

  it('조각의 행 합은 원래 행 수와 같다 (행 누락·중복 없음)', () => {
    const rows = Array.from({ length: 37 }, (_, i) => 20 + (i % 5) * 7)
    const r = packUnits([block(60), table(30, 25, rows), block(80)], 300)
    const pieces = r.pages.flat().filter((i) => i.unit === 1)
    expect(pieces[0].rows![0]).toBe(0)
    for (let i = 1; i < pieces.length; i++) expect(pieces[i].rows![0]).toBe(pieces[i - 1].rows![1])
    expect(pieces[pieces.length - 1].rows![1]).toBe(37)
    expect(r.overflow).toBe(false)
  })
})
