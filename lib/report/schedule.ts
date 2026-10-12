// 보고서 8장 추진 절차·일정 조립 — 단계·기간은 lib/rules/projectSchedule.ts(프로젝트 가정), 공사 기간·금액은 runAll 결과

import { formatNumber, formatWon } from '@/lib/format'
import { scheduleStages } from '@/lib/rules/projectSchedule'
import type { ReportRow, ScheduleStep, SiteAnalysis, SiteScheduleSection } from '@/types'

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
      durationFloorRows: [],
      durationAreaRows: [],
      durationNote: '',
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

  const dur = analysis.finance.duration
  const row = (st: { label: string; count: number; median: number | null; p25: number | null; p75: number | null }): ReportRow => [
    st.label,
    `${st.count}건`,
    st.median === null ? '–' : `${formatNumber(st.median, 1)}개월`,
    st.p25 === null || st.p75 === null ? '–' : `${formatNumber(st.p25, 1)} ~ ${formatNumber(st.p75, 1)}개월`,
  ]

  return {
    status: 'ok',
    statusText: null,
    steps,
    totalMonths: cursor,
    durationFloorRows: dur.tables.byFloors.map(row),
    durationAreaRows: dur.tables.byArea.map(row),
    durationNote: dur.estimate
      ? `이 사업의 공사 기간은 ${dur.estimate.basis}인 ${formatNumber(dur.estimate.base, 1)}개월을 적용했습니다 (보수 ${formatNumber(dur.estimate.conservative, 1)} ~ 낙관 ${formatNumber(dur.estimate.optimistic, 1)}개월).`
      : '층별·면적별 실적으로 공사 기간을 정하지 못해 가정값을 사용했습니다.',
    notes: [
      '사전 검토·설계·인허가·시공사 선정·이주 철거·준공 단계는 프로젝트 가정 기간(근거 등급 C)이며 인허가·시공사 일정에 따라 달라집니다.',
      '공사 기간은 위 층별·면적별 공사 기간 실적(하우빌드 준공 현장)으로 갈음했습니다. 증축은 층당 공사 기간 × 증축 층수, 재건축은 지상 층수·연면적대 사례의 중앙값입니다.',
      '단계를 순차로 배치했습니다. 설계와 인허가 준비 등은 실제로 겹쳐 진행할 수 있어 전체 기간이 더 짧아질 수 있습니다.',
      '사업비에 반영되지 않은 비용(진단비·설계비 등)은 "사업비 미반영"으로 표시했습니다.',
    ],
  }
}
