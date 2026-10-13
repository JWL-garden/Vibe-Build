// 현행 법규 기본값 (설계서 6-1, v3)
// 완화 시나리오는 scenarios.ts 에서 이 값의 일부만 덮어쓴다.

import type { Rules } from '@/types'
import { zoningTable } from './zoningTable'

export const baseRules: Rules = {
  // 정북방향 일조 사선 (건축법 시행령 제86조, 2023 개정: 9m → 10m)
  sunlight: { applies: true, lowHeightM: 10, lowSetbackM: 1.5, ratio: 0.5, multiFamilyLowHeightM: null },

  // 용도지역별 용적률 상한 (서울시 조례) — 2종 200 / 3종 250
  farLimitByZone: Object.fromEntries(zoningTable.map((z) => [z.zone, z.farLimitPercent])),

  // 건축법 시행령 별표1: 다세대 4개층 이하, 다가구·다중주택 3개층 이하, 바닥면적 합계 660㎡ 이하
  housing: {
    maxFloors: { 다세대: 4, 다가구: 3, 다중주택: 3 },
    maxAreaM2: { 다세대: 660, 다가구: 660, 다중주택: 660 },
    areaExclusive: { 다세대: false, 다가구: false, 다중주택: false },
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
    // 증축분은 옥탑세대 — 연면적 = 전용면적(전용률 1), 세대당 최소 14㎡로 나눠 최대 세대 수 산정 (2026-10-13 결정). minUnitNetM2(15)는 기준 엑셀 대조·재건축에 유지
    addedUnitMinNetM2: 14,
    addedUnitNetRatio: 1,
    // 제4호 단독·다중: 50㎡ 초과 150㎡ 이하 1대, 150㎡ 초과분 100㎡당 1대
    detached: { minM2: 50, baseM2: 150, baseSpaces: 1, extraM2PerSpace: 100 },
    // 제5호 비교용 주택법 기준: 전용 85㎡ 이하 75㎡당 1대, 초과 65㎡당 1대
    housingAct: { smallMaxNetM2: 85, smallM2PerSpace: 75, largeM2PerSpace: 65 },
    multiFamilyNetRatio: 0.8,
  },

  maxAddFloors: null,
  floorHeightM: 3.3,

  // 전체 재건축(철거 후 신축) — 기준 엑셀 '빈땅_신축시나리오' [가정]: 전유 80%·공용 20%, 최소 세대 전용 15㎡(parking.minUnitNetM2)
  // 1층 필로티 주차는 프로젝트 가정 (2026-10-08 결정). 다가구 19세대 이하 (건축법 시행령 별표1)
  rebuild: { netRatio: 0.8, pilotiFloor1: true, maxHouseholds: { 다가구: 19 } },

  // 증축층 바닥면적 (2026-10-08 결정 8) — 옵션1(기본): 최상층 전유 × 0.9 / 옵션2: 가정값 입력 엑셀(모델링 값)
  // 최상층에 층 지정 공용면적(계단실 등)이 없으면 지붕을 본다: 경사·기와·판넬 등이 적혀 있으면 증축 불가(계산 보류),
  // 그 밖의 표기(평스라브·스라브·(철근)콘크리트 등)는 평슬라브로 본다.
  floorPlate: {
    method: 'option1',
    ratio: 0.9,
    nonFlatRoofKeywords: ['경사', '기와', '와즙', '판넬', '샌드위', '피판넬'],
  },

  // 측면 보강부: 3D 모델의 REV_F{n}_SIDE (일조 사선 완화로 채우는 기존 층 측면). 일조 완화 시나리오(A·ALL)에서만 연면적에 포함
  massSide: { includeInGfa: false },
}
