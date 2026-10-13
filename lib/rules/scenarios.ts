// 법규 완화 시나리오 (설계서 6-1, v3) — 모두 프로젝트 가정이며 현행법이 아니다.
// overrides 에는 바꿀 규칙값만 적고, getEffectiveRules 가 baseRules 와 깊은 병합한다.

import type { DeepPartial, Rules, Scenario, ScenarioId, ViewScenario, ViewScenarioId } from '@/types'
import { baseRules } from './baseRules'

// 일조 사선이 완화되면 기존 층 측면을 채우는 보강부(3D 모델 SIDE)도 증축 연면적에 포함한다 (2026-10-12 결정)
const A: DeepPartial<Rules> = { sunlight: { ratio: 0.25 }, massSide: { includeInGfa: true } }

// 배수(×1.2)가 아니라 용도지역별 상한값 자체를 교체한다
const B: DeepPartial<Rules> = { farLimitByZone: { 제2종일반주거지역: 250, 제3종일반주거지역: 300 } }

// 8·13 주택공급 대책(관계부처 합동, 2026.8.13) '다가구·다세대 건축기준 합리화'
//   (면적) 660 → 1,000㎡ 미만  (다가구 층수) 3 → 4개층 이하  (일조) 4~5층도 수직 건축 허용
// 다세대 층수 4→5개층은 '다가구·다세대 기준 합리화'·'4~5층 수직 허용'에 따른 프로젝트 해석 (보도자료 층수 문구는 다가구만 명시).
// 다중주택은 언급이 없어 완화하지 않는다. '4~5층 수직 허용'의 높이 17m는 건축법 개정안(2026.11.12 기준) 반영값.
const C: DeepPartial<Rules> = {
  housing: {
    maxFloors: { 다가구: 4, 다세대: 5 },
    maxAreaM2: { 다세대: 1000, 다가구: 1000 },
    areaExclusive: { 다세대: true, 다가구: true },
  },
  sunlight: { multiFamilyLowHeightM: 17 },
}

export const scenarios: Scenario[] = [
  { id: 'BASE', name: '현행 법규', rationale: '현행 건축법·서울시 조례 기준', isAssumption: false, overrides: {} },
  {
    id: 'A',
    name: '일조 사선 완화',
    rationale: '노후 저층 주거지 수직증축 활성화를 위해 정북 사선 비율을 1/2 → 1/4로 완화한다고 가정',
    isAssumption: true,
    overrides: A,
  },
  {
    id: 'B',
    name: '용적률 상향',
    rationale: '제2종일반주거 200→250%, 제3종일반주거 250→300% (배수 아님, 상한 교체)',
    isAssumption: true,
    overrides: B,
  },
  {
    id: 'C',
    name: '다가구·다세대 기준 합리화',
    rationale:
      '8·13 주택공급 대책(2026.8.13 발표, 법령 개정 전): 면적 660→1,000㎡ 미만, 다가구 3→4개층·다세대 4→5개층(프로젝트 해석), 일조 4~5층 수직 건축 허용(건축법 개정안 26.11.12 기준 17m)',
    isAssumption: true,
    overrides: C,
  },
  {
    id: 'ALL',
    name: '복합 완화',
    rationale: 'A(일조 사선)·B(용적률)·C(8·13 다가구·다세대 기준 합리화)를 동시에 적용한다고 가정',
    isAssumption: true,
    overrides: deepMerge(deepMerge(A, B), C),
  },
]

/**
 * 화면·보고서에 보이는 시나리오 3개 (2026-10-08 결정).
 * A·B·C는 ALL을 이루는 구성 요소로 위 scenarios에 남겨 두고(엑셀 대조 테스트는 B 사용), 화면에서는 고르지 않는다.
 */
export const viewScenarios: ViewScenario[] = [
  { id: 'BASE', name: '현행 법규', rationale: '현행 건축법·서울시 조례 기준, 기존 건물 위 증축', isAssumption: false, rulesId: 'BASE', kind: 'expansion' },
  {
    id: 'ALL',
    name: '복합 완화',
    rationale: '일조 사선 1/4·용적률 상한 교체(2종 250 / 3종 300%)·8·13 다가구·다세대 기준 합리화를 함께 적용, 기존 건물 위 증축',
    isAssumption: true,
    rulesId: 'ALL',
    kind: 'expansion',
  },
  {
    id: 'REBUILD',
    name: '복합 완화 + 전체 재건축',
    rationale: '복합 완화(ALL) 규칙으로 기존 건물을 철거하고 1층 필로티 주차 + 2층부터 주택으로 신축 (기준 엑셀 빈땅_신축시나리오 산식)',
    isAssumption: true,
    rulesId: 'ALL',
    kind: 'rebuild',
  },
]

export const VIEW_SCENARIO_IDS = viewScenarios.map((s) => s.id)

export function getViewScenario(id: ViewScenarioId): ViewScenario {
  const scenario = viewScenarios.find((s) => s.id === id)
  if (!scenario) throw new Error(`알 수 없는 화면 시나리오: ${id}`)
  return scenario
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 깊은 병합: override 에 있는 값만 바꾼 새 객체를 돌려준다. 배열은 통째로 교체, 원본은 바꾸지 않는다 */
export function deepMerge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override ?? base) as T
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue
    result[key] = isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key], value) : value
  }
  return result as T
}

export function getScenario(id: ScenarioId): Scenario {
  const scenario = scenarios.find((s) => s.id === id)
  if (!scenario) throw new Error(`알 수 없는 시나리오: ${id}`)
  return scenario
}

/** 시나리오를 적용한 계산용 규칙 = baseRules + overrides */
export function getEffectiveRules(id: ScenarioId): Rules {
  return deepMerge(baseRules, getScenario(id).overrides)
}
