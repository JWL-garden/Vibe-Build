// 보고서 7장 리스크 — 규칙 기반 (설계서 7-1: runAll 결과·기준 엑셀 값에서만 만든다, AI 호출 없음)
// 각 규칙은 "조건 → 위험도 → 설명(숫자 포함) → 대응 방안"이고, 판단 기준값(경과연수 30년·대출비율 60% 등)은 아래 RISK_RULE에 둔다.

import { formatNumber, formatRate, formatWon } from '@/lib/format'
import { RELOCATION_MONTHS } from '@/lib/rules/projectSchedule'
import type { Risk, SiteAnalysis, SiteData, SiteRiskSection } from '@/types'

/** 위험도 판단 기준 (프로젝트 가정 — 설계서 7-1 [7-1]) */
export const RISK_RULE = {
  /** 경과연수: 이 이상이면 구조안전 '높음' */
  ageHighYears: 30,
  /** 경과연수: 이 이상이면 구조안전 '중간' */
  ageMidYears: 15,
  /** 대출비율이 이 값을 넘으면 금리 리스크 */
  loanRatioHigh: 0.6,
  /** 투자회수기간(년)이 이 값을 넘으면 사업성 리스크 '높음' */
  paybackHighYears: 10,
  /** ROI 변동폭 중 등급 C·D 비중이 이 값 이상이면 가정 의존도 '높음' */
  gradeCShareHigh: 0.5,
  /** 법정 주차 여유가 이 값(대) 미만이면 주차 리스크 */
  parkingSpareLow: 1,
} as const

const LEVEL_ORDER: Record<Risk['level'], number> = { 높음: 0, 중간: 1, 낮음: 2 }
const pct = (v: number | null, d = 1) => (v === null ? '–' : formatRate(v, d))

export function buildSiteRisks(data: SiteData, analysis: SiteAnalysis): SiteRiskSection {
  const { site, units, siteInput } = data
  const risks: Risk[] = []
  const rebuild = analysis.scenarioId === 'REBUILD'
  const e = analysis.selected
  const ageYears = analysis.asset.existingBuilding.ageYears
  const fin = analysis.finance.byScenario
  const base = fin.BASE
  const finOk = base.status === 'ok'

  // 1. 구조안전 — 경과연수·내진 적용 여부 (설계서 7-1)
  {
    const age = ageYears
    const seismic = site.seismic.applied
    const level: Risk['level'] =
      age !== null && age >= RISK_RULE.ageHighYears ? '높음' : (age !== null && age >= RISK_RULE.ageMidYears) || !seismic ? '중간' : '낮음'
    const seismicText = seismic
      ? `내진설계가 적용된 건물입니다${site.seismic.capacity ? ` (${site.seismic.capacity})` : ''}.`
      : '내진설계 적용 여부가 확인되지 않거나 적용되지 않은 건물입니다.'
    risks.push({
      title: rebuild ? '구조안전·지반 (철거 후 신축)' : '구조안전 (기존 건물 상부 증축)',
      level,
      description: `${site.structure}, 사용승인 ${site.approvalDate ?? '미상'}${age === null ? '' : ` (경과 ${age}년)`}. ${seismicText} ${
        rebuild ? '신축 구조·지반·인접 건물 영향은 별도 조사 전에는 알 수 없습니다.' : '기존 기둥·기초가 증축 하중을 견디는지는 구조 검토 전에는 알 수 없습니다.'
      }`,
      mitigation: rebuild
        ? '재건축은 기존 구조 의존이 없으나 지반·인접 건물 영향 조사가 필요합니다. 지질조사와 구조설계를 설계 단계에서 확정하세요.'
        : '구조기술사에게 구조안전진단·증축 가능 하중 검토를 의뢰하고, 보강이 필요하면 그 비용을 사업비(현재 구조 보강비 미반영)에 반영해 재검토하세요.',
    })
  }

  // (2026-10-12) 법규 완화 미시행·구분소유자 동의 리스크는 두지 않는다 — 완화 법규는 시행되는 것으로 결정됨

  // 4. 일조·높이 — 정북 이격거리 미입력, 필요 이격거리
  {
    const known = siteInput?.northSetbackM != null
    const required = e.requiredSetbackM
    const level: Risk['level'] = known && e.plan.checks.some((c) => c.item === 'sunlight' && c.status === 'fail') ? '높음' : known ? '낮음' : '중간'
    risks.push({
      title: '일조 사선·높이 제한',
      level,
      description: known
        ? `정북 이격거리 ${formatNumber(siteInput!.northSetbackM, 2)}m 기준으로 일조 검토를 반영했습니다.`
        : `정북 인접대지 경계까지의 이격거리가 입력되지 않아 일조 검토가 "확인 필요"입니다.${
            required !== null && !rebuild ? ` 1개층 증축 시 필요한 이격거리는 약 ${formatNumber(required, 2)}m입니다.` : ''
          } 지구단위계획·가로구역 높이·고도지구도 확인되지 않았습니다.`,
      mitigation: '배치도·지적도로 정북 이격거리를 실측해 입력하고, 토지이용계획확인서로 높이 제한·지구단위계획을 확인하세요.',
    })
  }

  // 5. 주차 — 여유 대수가 작거나 추가 확보 안에 의존
  {
    const spare = e.parking.spare
    const option = e.parkingOption
    const level: Risk['level'] = option ? '높음' : spare < RISK_RULE.parkingSpareLow ? '중간' : '낮음'
    risks.push({
      title: '주차 기준',
      level,
      description: `실제 ${formatNumber(e.parking.actual, 0)}대 / 법정 ${formatNumber(e.parking.required.total, 1)}대, 여유 ${formatNumber(spare, 1)}대입니다. 증축 세대는 이 여유 안에서만 설치할 수 있어 주차가 규모를 결정할 수 있습니다.${
        option ? ` 현재 여유로는 증축 세대가 없어 주차 ${option.addSpaces}대 추가 확보를 전제로 한 안입니다.` : ''
      }${
        rebuild ? ' 재건축은 신축 세대 기준 법정 주차를 대지 안에서 새로 확보해야 합니다.' : ''
      }`,
      mitigation: '주차 추가 확보(기계식·자주식) 가능 여부를 배치도로 확인하고, 조례 기준(소수점 처리 방식)을 지자체에 재확인하세요.',
    })
  }

  // 6. 토지 정보 — 대지면적 불일치·외필지
  {
    const b = analysis.land.basis
    if (b === 'mismatch' || b === 'estimated' || b === 'none') {
      risks.push({
        title: '토지 면적·필지 범위',
        level: '중간',
        description:
          b === 'mismatch'
            ? '토지대장 면적 합과 건축물대장 대지면적이 다릅니다. 용적률은 건축물대장 기준, 토지가액은 토지대장 기준으로 계산했습니다.'
            : b === 'estimated'
              ? `외필지(${site.outsideParcels}개)의 면적·공시지가를 확인하지 못해 토지가액을 대표 필지 기준으로 추정했습니다.`
              : '토지가액을 계산하지 못했습니다.',
        mitigation: '토지대장·지적도로 대지에 포함된 필지와 면적을 확인하고 구성 필지 목록을 입력하세요. 면적이 달라지면 용적률 잔여 면적이 바뀔 수 있습니다.',
      })
    }
  }

  if (finOk) {
    const cons = fin.CONSERVATIVE
    const cashflow = base.cashflow
    // 7. 자금·금리
    {
      const loanRatio = base.assumptions.find((a) => a.key === 'loanRatio')?.value ?? null
      const rate = base.assumptions.find((a) => a.key === 'loanInterestRate')
      const high = loanRatio !== null && loanRatio > RISK_RULE.loanRatioHigh
      risks.push({
        title: '자금 조달·금리',
        level: high ? '중간' : '낮음',
        description: `기준 시나리오는 총사업비 ${formatWon(base.totalCostWon)} 중 대출 ${formatWon(base.loanWon)}(${pct(loanRatio, 0)}), 자기자본 ${formatWon(base.equityWon)}입니다. 금리 ${pct(rate?.range.base ?? null, 2)}(보수 ${pct(rate?.range.low ?? null, 2)}) 기준이며, ${
          high ? `대출비율이 ${pct(RISK_RULE.loanRatioHigh, 0)}를 넘어 금리·자금 조달 변화에 민감합니다.` : '대출비율은 기준 이내입니다.'
        } 자기자본수익률(ROE)은 대출 비중이 커질수록 높게 보이지만 위험도 같이 커집니다.`,
        mitigation: '금융기관 사전 상담으로 대출 가능액·금리를 확인하고, 보수 시나리오(금리 상단·대출비율 하단)에서도 이자 상환이 가능한지 보세요.',
      })
    }

    // 8. 사업성 — 회수기간·ROI 하락 폭
    {
      const payback = cons.metrics.paybackYears
      const baseRoi = base.metrics.roi
      const consRoi = cons.metrics.roi
      const npvNeg = (base.cashflow?.npvWon ?? 0) < 0
      const level: Risk['level'] =
        (payback === null || payback > RISK_RULE.paybackHighYears) && (base.metrics.paybackYears ?? Infinity) > RISK_RULE.paybackHighYears
          ? '높음'
          : payback === null || payback > RISK_RULE.paybackHighYears || npvNeg
            ? '중간'
            : '낮음'
      risks.push({
        title: '사업성 (보수 시나리오)',
        level,
        description: `단순 ROI는 기준 ${pct(baseRoi)}, 보수 ${pct(consRoi)}이고 투자회수기간은 기준 ${
          base.metrics.paybackYears === null ? '–' : `${formatNumber(base.metrics.paybackYears, 1)}년`
        }, 보수 ${payback === null ? '회수 불가' : `${formatNumber(payback, 1)}년`}입니다.${
          cashflow ? ` ${cashflow.years.length}년 NPV는 기준 ${formatWon(cashflow.npvWon)}, 보수 ${formatWon(cons.cashflow?.npvWon ?? null)}입니다.` : ''
        }`,
        mitigation: '보수 시나리오에서도 회수 가능한지 확인하고, 공사비 견적·임대 사례를 보강해 불확실성을 줄인 뒤 결정하세요.',
      })
    }

    // 9. 가정 의존도 — 등급 C·D 비중
    {
      const s = analysis.finance.sensitivity
      if (s && s.gradeCShare !== null) {
        const high = s.gradeCShare >= RISK_RULE.gradeCShareHigh
        risks.push({
          title: '가정값 의존도',
          level: high ? '중간' : '낮음',
          description: `ROI 변동폭의 ${formatNumber(s.gradeCShare * 100, 0)}%가 근거 등급 C(프로젝트 가정) 값에서 나옵니다. 가장 큰 영향 변수는 "${s.items[0]?.label ?? '–'}"입니다. 공사비·공실·운영비 등은 실제 견적과 자료가 입력되면 달라집니다.`,
          mitigation: '공사비는 시공사 견적, 공실·운영비는 현재 임대 실적으로 바꿔 입력하세요. 6장 민감도 표의 변수 순서대로 자료를 확보하면 효과가 큽니다.',
        })
      }
    }

    // 10. 공사 중 임대 손실 — 재건축은 계산한 금액을 보이고, 증축은 입력 대기 항목
    {
      const loss = base.costs.find((c) => c.key === 'constructionLoss')
      if (rebuild) {
        const months = base.assumptions.find((a) => a.key === 'rebuildConstructionMonths')?.value ?? null
        risks.push({
          title: '이주·철거와 공사 중 임대 손실',
          level: '높음',
          description: `재건축은 기존 ${units.length}호를 철거하므로 임차인 이주·철거 ${RELOCATION_MONTHS}개월과 공사 ${months ?? '–'}개월 동안 임대수입이 끊깁니다. 공사 중 임대 손실 ${formatWon(loss?.amountWon ?? null)}(추정)을 총사업비에 포함했고, 철거비는 신축 공사비에 포함해 별도로 계산하지 않았습니다.`,
          mitigation: '현재 임대차 계약(만기·갱신 조건)을 확인해 이주 계획과 보상 비용을 정하고, 실제 임대료로 손실 추정을 다시 계산하세요.',
        })
      } else if (loss && loss.amountWon === null) {
        risks.push({
          title: '공사 중 임대 손실·임차인',
          level: '중간',
          description: '상부 증축 공사 중 소음·진동·동선 문제로 기존 임차인의 퇴거·임대료 협의가 생길 수 있습니다. 현재 사업비에서 공사 중 임대 손실은 입력 대기로 미반영입니다.',
          mitigation: '현재 임대차 계약(만기·갱신 조건)을 확인하고, 공사 중 손실을 가정값으로 입력해 사업비·현금흐름에 반영하세요.',
        })
      }
    }
  } else {
    risks.push({
      title: '수익성 미산정',
      level: '중간',
      description: base.status === 'none' ? '증축(재건축)안이 없어 수익성을 계산하지 않았습니다. 사업비·수익 관련 위험은 안이 정해진 뒤 평가할 수 있습니다.' : `가정값 입력 대기로 수익성을 계산하지 못했습니다 (${base.missing.join(', ')}).`,
      mitigation: '3장 대안 검토의 조건(주차 추가 확보, 주택 층수 한도 등)을 먼저 해결하거나 필요한 가정값을 입력한 뒤 다시 평가하세요.',
    })
  }

  risks.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])
  const count = (l: Risk['level']) => risks.filter((r) => r.level === l).length
  return {
    items: risks,
    summary: `위험도 높음 ${count('높음')}건 · 중간 ${count('중간')}건 · 낮음 ${count('낮음')}건 — 가장 먼저 확인할 항목: ${risks[0].title}`,
    rules: [
      `경과연수 ${RISK_RULE.ageHighYears}년 이상 구조안전 '높음', ${RISK_RULE.ageMidYears}년 이상 '중간'`,
      `대출비율 ${pct(RISK_RULE.loanRatioHigh, 0)} 초과 금리 리스크`,
      `보수 시나리오 회수기간 ${RISK_RULE.paybackHighYears}년 초과 사업성 리스크`,
      `ROI 변동의 ${pct(RISK_RULE.gradeCShareHigh, 0)} 이상이 등급 C·D 가정이면 가정 의존도 '중간'`,
    ],
  }
}
