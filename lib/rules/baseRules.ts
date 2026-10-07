// 현행 법규 기본값 (설계서 6-1, v3)
// 완화 시나리오는 scenarios.ts 에서 이 값의 일부만 덮어쓴다.

import type { Rules } from '@/types'
import { zoningTable } from './zoningTable'

export const baseRules: Rules = {
  // 정북방향 일조 사선 (건축법 시행령 제86조, 2023 개정: 9m → 10m)
  sunlight: { applies: true, lowHeightM: 10, lowSetbackM: 1.5, ratio: 0.5 },

  // 용도지역별 용적률 상한 (서울시 조례) — 2종 200 / 3종 250
  farLimitByZone: Object.fromEntries(zoningTable.map((z) => [z.zone, z.farLimitPercent])),

  // 다세대·다가구·다중주택: 주택으로 쓰는 층수 3개층, 바닥면적 합계 660㎡ (건축법 시행령 별표1)
  housing: {
    maxFloors: { 다세대: 3, 다가구: 3, 다중주택: 3 },
    maxAreaM2: { 다세대: 660, 다가구: 660, 다중주택: 660 },
    excludePilotiFloor: true,
  },

  // 서울시 주차장 조례 별표2 — 기준 엑셀의 산정 방식과 동일
  parking: {
    perUnit: [
      { maxNetM2: 30, spaces: 0.5 },
      { maxNetM2: 60, spaces: 0.8 },
      { maxNetM2: null, spaces: 1.0 },
    ],
    neighborhoodM2PerSpace: 134,
    officeM2PerSpace: 100,
    nonHousingDecimals: 1,
    minUnitNetM2: 15,
    // 제4호 단독·다중: 50㎡ 초과 150㎡ 이하 1대, 150㎡ 초과분 100㎡당 1대
    detached: { minM2: 50, baseM2: 150, baseSpaces: 1, extraM2PerSpace: 100 },
    // 제5호 비교용 주택법 기준: 전용 85㎡ 이하 75㎡당 1대, 초과 65㎡당 1대
    housingAct: { smallMaxNetM2: 85, smallM2PerSpace: 75, largeM2PerSpace: 65 },
    multiFamilyNetRatio: 0.8,
  },

  maxAddFloors: null,
  floorHeightM: 3.3,
}
