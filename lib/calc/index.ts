// 계산 통합 함수 (설계서 5-6)
// TODO [3-4]: analyzeFinance(수익성) 구현 후 runAll 결과에 추가

import { formatNumber } from '@/lib/format'
import { getEffectiveRules, getScenario, scenarios } from '@/lib/rules/scenarios'
import type { BuildingRecord, Expandability, ExpansionResult, ScenarioId, SiteAnalysis, SiteData } from '@/types'
import { calcExpansion } from './expansion'
import { CHECK_LABEL, CHECK_STATUS_LABEL, LIMIT_LABEL } from './labels'

export { CHECK_LABEL, CHECK_STATUS_LABEL, LIMIT_LABEL }

/**
 * 한 필지를 모든 법규 시나리오(BASE/A/B/C/ALL)로 계산한다.
 * 화면·보고서의 모든 숫자는 이 결과만 사용한다.
 */
export function runAll(data: SiteData, scenarioId: ScenarioId): SiteAnalysis {
  const byScenario = Object.fromEntries(
    scenarios.map((s) => [
      s.id,
      calcExpansion(
        {
          scenarioId: s.id,
          site: data.site,
          units: data.units,
          netRatio: data.review.netRatio!,
          siteInput: data.siteInput,
        },
        getEffectiveRules(s.id),
      ),
    ]),
  ) as Record<ScenarioId, SiteAnalysis['selected']>
  return { pnu: data.pnu, scenarioId, byScenario, selected: byScenario[scenarioId] }
}

/** runAll 결과(선택 시나리오)로 증축 가능 여부 판정 — 화면 배지·보고서 버튼에 사용 */
export function judgeSite(analysis: SiteAnalysis): Expandability {
  const e = analysis.selected
  const name = `${getScenario(analysis.scenarioId).name}(${analysis.scenarioId})`
  const area = (v: number) => `${formatNumber(v, 1)}㎡`
  const { plan, parkingOption: option } = e

  if (plan.verdict === 'possible') {
    return {
      status: 'possible',
      reason: `${name} 적용 시 +${plan.addFloors}개층(+${area(plan.addGfaM2)}, ${plan.addUnits.length}세대) 증축이 가능합니다. 제한요인: ${LIMIT_LABEL[plan.limitingFactor]}`,
    }
  }
  if (option?.verdict === 'possible') {
    return {
      status: 'conditional',
      reason: `기존 주차로는 증축할 수 없지만, ${name} 적용 + 주차 ${option.addSpaces}대 추가 확보 시 +${option.addFloors}개층(+${area(option.addGfaM2)}) 증축을 검토할 수 있습니다.`,
    }
  }
  if (option?.verdict === 'check') {
    return {
      status: 'check',
      reason: `기존 주차로는 증축할 수 없고, 주차 ${option.addSpaces}대를 추가 확보해도 ${name} 기준 주택 층수가 ${e.housing.housingFloors + 1}개층 이상으로 한도(${e.housing.limit.floorLimit}개층)를 넘어 신규 층 주택은 불가합니다. 부분 증축·용도변경 대안 확인이 필요합니다.`,
    }
  }
  if (plan.verdict === 'check') {
    return {
      status: 'check',
      reason: `${name} 기준 주차·용적률로는 ${e.parking.plan.units.length}세대 여유가 있으나, 주택 층수가 ${e.housing.limit.housingFloorsAfter}개층으로 한도(${e.housing.limit.floorLimit}개층)를 넘어 신규 층 주택은 불가합니다. 부분 증축·용도변경 대안 확인이 필요합니다.`,
    }
  }
  return {
    status: 'impossible',
    reason: `${name} 기준으로 ${LIMIT_LABEL[plan.limitingFactor]} 때문에 증축할 수 없습니다.`,
  }
}

/**
 * 실제 건축물대장 레코드의 증축 가능 여부.
 * 지금은 계산 엔진(far·sunlight·expansion)이 없어 항상 '판정 대기'를 돌려준다.
 * TODO [2-4]: expansion 결과를 만든 뒤 judgeFromExpansion 으로 판정한다.
 */
export function judgeExpandability(_building: BuildingRecord): Expandability {
  return {
    status: 'pending',
    reason: '증축 가능 여부는 계산 엔진(용적률·일조권) 연결 후 자동으로 판정됩니다.',
  }
}

/** 증축 산정 결과로 증축 가능 여부 판정: 증축 층수가 1층 이상이면 가능 */
export function judgeFromExpansion(e: ExpansionResult, scenarioName: string): Expandability {
  if (e.addFloors > 0) {
    return {
      status: 'possible',
      reason: `${scenarioName} 적용 시 최대 +${e.addFloors}개층(+${e.addFloorAreaM2.toLocaleString('ko-KR')}㎡) 증축이 가능합니다. 제한요인: ${LIMIT_LABEL[e.limitingFactor]}`,
    }
  }
  return {
    status: 'impossible',
    reason: `${scenarioName} 기준으로 ${LIMIT_LABEL[e.limitingFactor]} 때문에 증축할 수 있는 층이 없습니다.`,
  }
}
