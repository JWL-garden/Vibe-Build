// 표지 건물 일러스트의 층수 → 좌표 계산 (순수 함수, 표지 SVG viewBox 794×1123 기준)

export const COVER_VIEW = { w: 794, h: 1123 }
/** 일러스트 지면선 높이 (y) */
export const COVER_GROUND_Y = 750
/** 주인공 건물 */
export const COVER_BUILDING = { x: 372, w: 92 }
/** 지붕선 스케치(상단 좌측 집 4동) 축소 비율 — 왼쪽 아래 (64, 214)를 기준으로 줄인다 */
export const COVER_SKETCH_SCALE = 0.72

/** 일러스트 윗끝(축소한 지붕선 스케치)과 아랫끝(지면선) y — 배경 이미지의 세로 범위 */
const ART_TOP = 214 - (214 - 112) * COVER_SKETCH_SCALE

/** 상단 문구 블록(제목·부제): 가운데 정렬, 위쪽 y. maxWidth = 쪽 폭에서 좌우 32씩 뺀 값 */
export const COVER_TEXT_BLOCK = { top: 170, maxWidth: 730 }

/** 배경 이미지를 놓는 세로 영역 — 상단 문구 아래 ~ 하단 브랜드 위 */
const ART_REGION = { top: 320, bottom: 990 }

/**
 * 배경 이미지를 문구 블록과 브랜드 사이 영역의 상하 가운데에 놓기 위해 내리는 거리 (viewBox 단위)
 */
export function coverArtOffsetY(): number {
  return (ART_REGION.top + ART_REGION.bottom) / 2 - (ART_TOP + COVER_GROUND_Y) / 2
}

/** 층 높이 기본값 / 건물이 차지할 수 있는 최대 높이 (제목 영역을 넘지 않게) */
const MAX_FLOOR_H = 34
const MAX_HEIGHT = 310

export interface CoverBuilding {
  /** 기존 층수 (1 이상) */
  baseFloors: number
  /** 증축 층수 (0 이상, 증축 불가·미산정이면 0) */
  addFloors: number
  /** 층 높이 (기본 34, 층이 많으면 자동 축소) */
  floorH: number
  /** 기존 건물 윗면 y */
  baseTopY: number
  /** 증축 포함 건물 윗면 y */
  topY: number
  /** 창 한 변 길이 */
  winSize: number
  /** 창 위쪽 여백 */
  winOffsetY: number
}

/** 층수 → 층 높이·좌표. 층이 많아지면 건물이 영역을 넘지 않도록 층 높이를 줄인다 */
export function coverBuilding(floors: number, addFloors: number | null): CoverBuilding {
  const baseFloors = Math.max(1, Math.floor(floors) || 1)
  const add = addFloors !== null && addFloors > 0 ? Math.floor(addFloors) : 0
  const total = baseFloors + add
  const floorH = Math.min(MAX_FLOOR_H, MAX_HEIGHT / total)
  const k = floorH / MAX_FLOOR_H
  return {
    baseFloors,
    addFloors: add,
    floorH,
    baseTopY: COVER_GROUND_Y - floorH * baseFloors,
    topY: COVER_GROUND_Y - floorH * total,
    winSize: 16 * k,
    winOffsetY: 9 * k,
  }
}

/** 제목 글자 크기 상한 (px, viewBox 단위). 한 줄에 들어가지 않을 만큼 길면 이보다 줄인다 */
export const COVER_TITLE_FONT_SIZE = 52.8

/** 줄 폭 추정 (em): 한글·숫자·영문 한 글자 ≈ 0.97em(자간 -0.03em 반영), 띄어쓰기 ≈ 0.35em */
function lineWidthEm(line: string): number {
  let w = 0
  for (const ch of line) w += ch === ' ' ? 0.35 : 0.97
  return w
}

export interface CoverTitleLayout {
  /** 한 줄로 표시할 제목 */
  text: string
  /** 글자 크기 (px, viewBox 단위) — 기본 44, 한 줄이 폭을 넘으면 그만큼 줄인다 */
  fontSize: number
}

/** 제목을 한 줄로 두고, 문구 블록 폭(COVER_TEXT_BLOCK.maxWidth)에 들어가도록 글자 크기를 구한다 */
export function layoutCoverTitle(title: string): CoverTitleLayout {
  const text = title.trim().replace(/s+/g, ' ')
  const fit = Math.floor(COVER_TEXT_BLOCK.maxWidth / lineWidthEm(text))
  return { text, fontSize: Math.min(COVER_TITLE_FONT_SIZE, fit) }
}
