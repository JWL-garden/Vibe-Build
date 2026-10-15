import { describe, expect, it } from 'vitest'
import {
  COVER_GROUND_Y,
  COVER_SKETCH_SCALE,
  COVER_TEXT_BLOCK,
  COVER_TITLE_FONT_SIZE,
  coverArtOffsetY,
  coverBuilding,
  layoutCoverTitle,
} from '../coverLayout'

describe('표지 건물 층수', () => {
  it('기존 3층 + 증축 2층은 층 높이 34 그대로 (참조 표지)', () => {
    const b = coverBuilding(3, 2)
    expect(b.floorH).toBe(34)
    expect(b.baseTopY).toBe(COVER_GROUND_Y - 102)
    expect(b.topY).toBe(COVER_GROUND_Y - 170)
  })

  it('층이 많으면 건물 높이가 310을 넘지 않게 층 높이를 줄인다', () => {
    const b = coverBuilding(12, 3)
    expect(COVER_GROUND_Y - b.topY).toBeCloseTo(310, 6)
    expect(b.floorH).toBeLessThan(34)
    expect(b.winSize).toBeLessThan(16)
  })

  it('증축 0층·null이면 증축 층 없음', () => {
    expect(coverBuilding(5, 0).addFloors).toBe(0)
    expect(coverBuilding(5, null).addFloors).toBe(0)
    expect(coverBuilding(5, 0).topY).toBe(coverBuilding(5, 0).baseTopY)
  })
})

describe('표지 배치', () => {
  it('배경 이미지를 문구 블록 아래 ~ 브랜드 위 영역의 세로 가운데에 놓는다', () => {
    const dy = coverArtOffsetY()
    const top = 214 - 102 * COVER_SKETCH_SCALE + dy
    const bottom = COVER_GROUND_Y + dy
    expect((top + bottom) / 2).toBeCloseTo((320 + 990) / 2, 6)
    expect(top).toBeGreaterThan(320)
    expect(bottom).toBeLessThan(990)
  })

  it('제목은 한 줄, 최대 52.8px(44px의 1.2배). 한 줄이 폭을 넘으면 글자를 줄인다', () => {
    const em = (s: string) => [...s].reduce((w, ch) => w + (ch === ' ' ? 0.35 : 0.97), 0)
    const short = layoutCoverTitle('렉스빌 증축 사업 타당성 검토 보고서')
    expect(short.text).toBe('렉스빌 증축 사업 타당성 검토 보고서')
    expect(short.fontSize).toBeLessThanOrEqual(COVER_TITLE_FONT_SIZE)
    const long = layoutCoverTitle('더 채움 하우스 증축 사업 타당성 검토 보고서')
    expect(long.fontSize).toBeLessThan(short.fontSize)
    for (const t of [short, long]) {
      expect(em(t.text) * t.fontSize).toBeLessThanOrEqual(COVER_TEXT_BLOCK.maxWidth)
    }
  })
})
