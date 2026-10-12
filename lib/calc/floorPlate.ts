// 증축층 바닥면적 (2026-10-08 결정 8) — 순수 함수
// 옵션1(기본): 전유면적 자료로 최상층 면적을 추론 → 전유면적이 있는 가장 높은 층의 전유면적 × 0.9
//   - 최상층에 층 지정 공용면적(계단실 등)이 있으면 그대로 계산 (최상층에 공용만 있고 전유가 없으면 그 아래 전유층 사용)
//   - 최상층에 층 지정 공용면적이 없으면 계단실이 올라가지 않은 것으로 보고 지붕을 본다:
//     지붕이 평슬라브가 아니면(경사·기와·판넬 등) 증축 불가 → 계산 보류
//   - '각층'으로만 등록된 공용면적(층 번호 없음)은 최상층 공용으로 보지 않는다
// 옵션2: 가정값 입력 엑셀 '증축층면적_옵션2' 값 (모델링 등에서 추출). 값이 없으면 옵션1로 계산한다.

import { formatNumber } from '@/lib/format'
import type { ExcelSite, ExcelUnit, FloorPlateResult, Rules } from '@/types'

export interface FloorPlateInput {
  site: ExcelSite
  units: ExcelUnit[]
  /** 옵션2 값 (㎡). 없으면 null */
  option2M2: number | null
}

const f = (v: number) => formatNumber(v, 2)

export function calcFloorPlate(input: FloorPlateInput, rules: Rules): FloorPlateResult {
  const { site, units, option2M2 } = input
  const rule = rules.floorPlate
  const roofText = [site.roof?.type, site.roof?.etc].filter(Boolean).join(' / ')

  // 층 번호가 있는 지상층별 전유·공용 면적
  const floors = new Map<number, { net: number; common: number }>()
  for (const u of units.filter((x) => x.pnu === site.pnu)) {
    for (const a of u.areas) {
      if (a.floorType !== '지상' || a.floor === null || a.floor <= 0) continue
      const row = floors.get(a.floor) ?? { net: 0, common: 0 }
      if (a.kind === '전유') row.net += a.areaM2
      else row.common += a.areaM2
      floors.set(a.floor, row)
    }
  }
  const floorNos = [...floors.keys()].sort((a, b) => b - a)
  const topFloor = floorNos[0] ?? null
  const netFloor = floorNos.find((n) => floors.get(n)!.net > 0) ?? null
  const netFloorNetM2 = netFloor === null ? null : floors.get(netFloor)!.net
  const topFloorHasCommon = topFloor !== null && floors.get(topFloor)!.common > 0
  const base = { topFloor, netFloor, netFloorNetM2, topFloorHasCommon, roofText }

  // 지붕 검사: 최상층에 층 지정 공용면적이 없을 때만
  let roofFlat: boolean | null = null
  if (netFloor !== null && !topFloorHasCommon) {
    roofFlat = !rule.nonFlatRoofKeywords.some((k) => roofText.includes(k))
    if (!roofFlat) {
      return {
        ...base,
        areaM2: null,
        method: rule.method,
        status: 'blocked',
        roofFlat,
        detail: `최상층(${topFloor}층)에 계단실 등 공용면적이 없고 지붕이 평슬라브가 아님(${roofText || '표기 없음'}) → 증축 불가, 계산 보류`,
      }
    }
  }

  if (rule.method === 'option2' && option2M2 !== null && option2M2 > 0) {
    return { ...base, areaM2: option2M2, method: 'option2', status: 'ok', roofFlat, detail: `옵션2: 가정값 입력 엑셀 값 ${f(option2M2)}㎡` }
  }

  if (netFloor === null || netFloorNetM2 === null) {
    return {
      ...base,
      areaM2: site.buildingAreaM2,
      method: 'buildingArea',
      status: 'fallback',
      roofFlat,
      detail: `호별 전용면적 자료가 없어 건축면적 ${f(site.buildingAreaM2)}㎡로 가정 — 확인 필요`,
    }
  }

  const areaM2 = netFloorNetM2 * rule.ratio
  const roofNote = topFloorHasCommon
    ? `최상층 공용면적 있음`
    : `최상층 층 지정 공용면적 없음, 지붕 ${roofText || '표기 없음'} → 평슬라브로 봄`
  const fallbackNote = rule.method === 'option2' ? ' (옵션2 값 없음 → 옵션1)' : ''
  return {
    ...base,
    areaM2,
    method: 'option1',
    status: 'ok',
    roofFlat,
    detail: `옵션1${fallbackNote}: ${netFloor}층 전용 ${f(netFloorNetM2)}㎡ × ${rule.ratio} = ${f(areaM2)}㎡ (${roofNote})`,
  }
}
