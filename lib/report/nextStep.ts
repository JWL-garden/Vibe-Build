// 보고서 10장 다음 단계 제안 — 고정 3단계 + "지금 결정할 한 가지"(위험·판정에서 규칙으로 선택)

import { judgeSite } from '@/lib/calc'
import type { NextStep, SiteAnalysis, SiteNextStepSection, SiteRiskSection } from '@/types'

const STEPS: NextStep[] = [
  {
    step: 1,
    title: '무료 상담·현황 확인',
    description: '이 보고서의 숫자와 확인 필요 항목을 함께 검토하고, 도면·소유 구조·임대 현황 등 건축주 자료로 입력 대기 값을 채웁니다.',
  },
  {
    step: 2,
    title: '정밀 타당성 검토',
    description: '구조안전진단, 정북 이격 실측, 동의 가능성, 시공사 견적·금융 상담으로 가정값을 실제 값으로 바꿔 사업성을 다시 계산합니다.',
  },
  {
    step: 3,
    title: '설계 계약·인허가',
    description: '정밀 검토 결과가 보수 시나리오에서도 성립하면 설계를 계약하고 인허가·시공사 선정으로 진행합니다.',
  },
]

export function buildSiteNextStep(analysis: SiteAnalysis, risk: SiteRiskSection): SiteNextStepSection {
  const judge = judgeSite(analysis)
  const has = (prefix: string) => risk.items.find((r) => r.title.startsWith(prefix))
  const rebuild = analysis.scenarioId === 'REBUILD'
  const base = analysis.finance.byScenario.BASE

  let decisionNow: string
  if (judge.status === 'impossible' || base.status === 'none') {
    decisionNow = '증축 규모를 제한한 요인(주차·주택 층수 등)을 해소할 수 있는지부터 확인할지 결정하세요. 이 조건이 풀리기 전에는 사업비를 쓰는 단계로 넘어갈 수 없습니다.'
  } else if (has('구분소유자')) {
    decisionNow = rebuild
      ? '구분소유자 전원에게 재건축 의사를 먼저 확인할지 결정하세요. 동의와 이주 합의 없이는 철거·신축을 진행할 수 없고, 그 결과에 따라 나머지 단계의 비용 지출 여부가 정해집니다.'
      : '구분소유자에게 옥상 증축 동의 의사를 먼저 확인할지 결정하세요. 동의 없이는 증축을 진행할 수 없고, 그 결과에 따라 구조진단·설계 등 비용이 나가는 단계의 진행 여부가 정해집니다.'
  } else if (has('구조안전')) {
    decisionNow = '구조안전진단을 의뢰할지 결정하세요. 구조 보강 필요 여부가 사업비와 증축 가능성을 가장 크게 바꿀 수 있습니다.'
  } else {
    decisionNow = `${risk.items[0]?.title ?? '확인 필요 항목'}부터 확인할지 결정하세요.`
  }

  return {
    steps: STEPS,
    decisionNow,
    checklist: risk.items
      .filter((r) => r.level !== '낮음')
      .slice(0, 5)
      .map((r) => `${r.title} — ${r.mitigation}`),
  }
}
