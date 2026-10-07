// 법규 완화 시나리오 (설계서 6-1, v3) — 모두 프로젝트 가정이며 현행법이 아니다.
// overrides 에는 바꿀 규칙값만 적고, getEffectiveRules 가 baseRules 와 깊은 병합한다.

import type { DeepPartial, Rules, Scenario, ScenarioId } from '@/types'
import { baseRules } from './baseRules'

const A: DeepPartial<Rules> = { sunlight: { ratio: 0.25 } }

// 배수(×1.2)가 아니라 용도지역별 상한값 자체를 교체한다
const B: DeepPartial<Rules> = { farLimitByZone: { 제2종일반주거지역: 250, 제3종일반주거지역: 300 } }

const C: DeepPartial<Rules> = {
  housing: {
    maxFloors: { 다세대: 4, 다가구: 4, 다중주택: 4 },
    maxAreaM2: { 다세대: 1000, 다가구: 1000, 다중주택: 1000 },
  },
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
    name: '주택 층수·면적 완화',
    rationale: '다세대·다가구(다중주택 포함) 주택 층수 3층→4층 이하, 주택 연면적 660→1,000㎡',
    isAssumption: true,
    overrides: C,
  },
  {
    id: 'ALL',
    name: '복합 완화',
    rationale: 'A(일조 사선)·B(용적률)·C(주택 층수·면적) 완화를 동시에 적용한다고 가정',
    isAssumption: true,
    overrides: deepMerge(deepMerge(A, B), C),
  },
]

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
