// 보고서 A4 쪽 나눔 — 측정한 블록 높이를 쪽 높이에 맞춰 차례로 담는 순수 함수 (DOM·React 의존 없음)
//
// 단위(unit)는 쪽 사이에서 쪼개지지 않는 덩어리다. 표(table)는 행 단위로 쪼갤 수 있고, 쪼갠 쪽마다 머리글을 다시 붙인다.
// 제목(lead)은 표의 첫 조각과 같은 쪽에 놓는다. 쪽 높이보다 큰 일반 블록은 어쩔 수 없이 한 쪽을 단독으로 쓴다(넘침).

export interface PackUnit {
  /** 쪼갤 수 없는 블록의 높이 (px). 표 단위면 무시 */
  height: number
  table?: {
    /** 표 앞 제목 높이 (없으면 0) — 첫 조각과 같은 쪽에 놓인다 */
    leadHeight: number
    /** 표 머리글 높이 */
    headHeight: number
    /** 행별 높이 */
    rowHeights: number[]
  }
}

export interface PackItem {
  /** 단위 번호 */
  unit: number
  /** 표 조각이면 [시작, 끝) 행 번호 */
  rows?: [number, number]
  /** 표 조각 중 첫 조각이면 true (제목도 함께 그린다) */
  first?: boolean
}

export interface PackResult {
  /** 쪽별 항목 */
  pages: PackItem[][]
  /** 쪽 높이보다 커서 넘치는 항목이 있는지 */
  overflow: boolean
}

/** capacity(px) 높이의 쪽에 단위를 차례로 담는다 */
export function packUnits(units: PackUnit[], capacity: number): PackResult {
  const pages: PackItem[][] = [[]]
  let used = 0
  let overflow = false
  const newPage = () => {
    if (pages[pages.length - 1].length > 0) pages.push([])
    used = 0
  }
  const place = (item: PackItem, height: number) => {
    pages[pages.length - 1].push(item)
    used += height
    if (height > capacity + 0.5) overflow = true
  }

  units.forEach((u, idx) => {
    if (!u.table) {
      if (used > 0 && used + u.height > capacity) newPage()
      place({ unit: idx }, u.height)
      return
    }
    const { leadHeight: lead, headHeight: head, rowHeights: rows } = u.table
    const total = lead + head + rows.reduce((s, h) => s + h, 0)
    if (used + total <= capacity) {
      place({ unit: idx, rows: [0, rows.length], first: true }, total)
      return
    }
    // 표를 여러 쪽으로 쪼갠다. 현재 쪽에 제목 + 머리글 + 한 행도 못 들어가면 새 쪽에서 시작
    if (rows.length > 0 && used > 0 && used + lead + head + rows[0] > capacity) newPage()
    let start = 0
    let first = true
    while (start < rows.length) {
      const avail = capacity - used - (first ? lead : 0) - head
      let end = start
      let sum = 0
      while (end < rows.length && sum + rows[end] <= avail) {
        sum += rows[end]
        end++
      }
      if (end === start) {
        if (used > 0) {
          newPage()
          continue
        }
        end = start + 1 // 새 쪽에서도 한 행이 안 들어가면 강제로 한 행
        sum = rows[start]
      }
      place({ unit: idx, rows: [start, end], first }, (first ? lead : 0) + head + sum)
      start = end
      first = false
      if (start < rows.length) newPage()
    }
    if (rows.length === 0) place({ unit: idx, rows: [0, 0], first: true }, lead + head)
  })

  if (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop()
  return { pages, overflow }
}
