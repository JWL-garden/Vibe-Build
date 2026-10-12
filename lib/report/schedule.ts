// 보고서 8장 추진 절차·일정 조립 — 단계·기간은 lib/rules/projectSchedule.ts(프로젝트 가정), 공사 기간·금액은 runAll 결과

import { formatWon } from '@/lib/format'
import { scheduleStages } from '@/lib/rules/projectSchedule'
import type { ScheduleStep, SiteAnalysis, SiteScheduleSection } from '@/types'

export function buildSiteSchedule(analysis: SiteAnalysis): SiteScheduleSection {
  const base = analysis.finance.byScenario.BASE
  const rebuild = analysis.scenarioId === 'REBUILD'
  const monthsOf = (key: 'constructionMonths' | 'rebuildConstructionMonths') => base.assumptions.find((a) => a.key === key)?.value ?? null
  const constructionMonths = monthsOf(rebuild ? 'rebuildConstructionMonths' : 'constructionMonths')

  if (base.status === 'none') {
    return {
      status: 'none',
      statusText: '증축(재건축)안이 없어 추진 일정을 작성하지 않았습니다. 3장 대안 검토의 조건을 먼저 해결해야 합니다.',
      steps: [],
      totalMonths: 0,
      notes: [],
    }
  }

  const steps: ScheduleStep[] = []
  let cursor = 0
  for (const st of scheduleStages) {
    if (st.rebuildOnly && !rebuild) continue
    if (st.expansionOnly && rebuild) continue
    const months = st.months === 'construction' ? constructionMonths : st.months
    if (months === null) continue
    // 사업비 항목(4장) 금액 — 입력 대기 항목은 "입력 대기"로 표시
    const parts = (st.costKeys ?? []).flatMap((k) => {
      const c = base.costs.find((x) => x.key === k)
      return c ? [`${c.label} ${c.amountWon === null ? '입력 대기' : formatWon(c.amountWon)}`] : []
    })
    steps.push({
      name: st.name,
      startMonth: cursor,
      durationMonths: months,
      ownerDecision: st.ownerDecision,
      costNote: [st.costNote, ...parts].filter(Boolean).join(' — ') || null,
    })
    cursor += months
  }

  return {
    status: 'ok',
    statusText: null,
    steps,
    totalMonths: cursor,
    notes: [
      '단계별 기간은 프로젝트 가정(근거 등급 C)이며 인허가·시공사·소유자 동의 일정에 따라 달라집니다. 공사 기간은 가정값 입력 엑셀 값입니다.',
      '단계를 순차로 배치했습니다. 설계와 동의 확보 등은 실제로 겹쳐 진행할 수 있어 전체 기간이 더 짧아질 수 있습니다.',
      '사업비에 반영되지 않은 비용(진단비·설계비 등)은 "사업비 미반영"으로 표시했습니다 — 4장 입력 대기 항목과 함께 확인하세요.',
    ],
  }
}
