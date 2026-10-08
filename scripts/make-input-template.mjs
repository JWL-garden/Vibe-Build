// '가정값 입력' 엑셀 양식 만들기 — npm run data:template
// 경로: lib/data/source.json sources.input.excelPath (상위 폴더, 저장소에 올리지 않음)
// 파일이 없으면 새로 만들고, 있으면 **없는 시트만 추가**한다 (이미 입력한 값은 절대 덮어쓰지 않는다).
// 시트 → JSON 변환 규칙은 lib/data/sheetMap.json (source: "input"), 변환은 npm run data:excel.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import XLSX from 'xlsx'
import { PROJECT_ROOT, readJson } from './lib/excel-utils.mjs'
import { loadSourceConfig } from './lib/table-source.mjs'

const config = loadSourceConfig('input')
const path = resolve(PROJECT_ROOT, config.excelPath)

/** T1·T2 = 랜딩 예시 중 '기준 엑셀' 태그 */
const targets = readJson(resolve(PROJECT_ROOT, 'lib/mock/examples.json')).filter((e) =>
  String(e.tag ?? '').includes('기준 엑셀'),
)

/** 시트 정의: 머리글 + 처음 넣어 둘 행 (값을 모르면 빈칸) */
const SHEETS = [
  {
    name: '증축층면적_옵션2',
    note: '증축층 바닥면적 옵션2 — 모델링 등에서 뽑은 면적(㎡). 빈칸이면 옵션1(최상층 전유 × 0.9)을 쓴다. 적용 옵션은 lib/rules/baseRules.ts floorPlate.method',
    header: ['PNU', '필지', '증축층바닥면적(㎡)', '출처', '메모'],
    rows: targets.map((t) => [t.pnu, t.label, null, null, null]),
  },
  {
    // 2026-10-08 결정 1~6·12 — 값·범위·등급·출처를 한 행에. 보수/기준/낙관 = 수익 시나리오 (전환율은 결정 6에 따라 엔진이 정함)
    // 등급: A 공식 데이터·법령 / B 공개자료 기반 / C 프로젝트 가정(결정 4: 보고서에 범위와 함께 출력) / 빈칸 = 확인 실패
    name: '가정값',
    note: '보수·기준·낙관은 ROI에 불리한 값 → 유리한 값. 등급 A·B는 자료명·기관·기준일 필수. 값을 모르면 빈칸(보고서에 "입력 대기"). 수정 후 npm run data:excel',
    header: ['키', '항목', '단위', '보수', '기준', '낙관', '등급', '자료명', '기관', '기준일', 'URL', '메모'],
    rows: [
      ['baseRate', '한국은행 기준금리', '%', 3.0, 3.0, 3.0, 'A', '통화정책방향 결정 (2026.8.27, 0.25%p 인상)', '한국은행 금융통화위원회', '2026-08-27',
        'https://www.fntimes.com/html/view.php?ud=202608270949202066179ad43907_18', '서울주택정보마당 전월세전환율 화면에도 "기준금리 3%(2026년 9월 기준)". 다음 금통위 2026-10-22'],
      ['marketConversionHousing', '시장 전월세전환율 (주택·연립다세대)', '%', 5.625, 5.625, 5.625, 'A', '전월세 전환율 — 영등포구 연립다세대 (분기)', '서울특별시 서울주택정보마당', '2026-09-30',
        'https://housinginfo.seoul.go.kr/hmpg/rent/rent/rentDetail.do', '최근 12개월(4개 분기) 평균: 2025 4분기 5.8 · 2026 1분기 5.5 · 2분기 5.5 · 3분기 5.7 (서울 전체 3분기 5.4)'],
      ['marketConversionCommercial', '시장 전월세전환율 (상가·사무실)', '%', null, null, null, null, null, null, null, null,
        '확인 실패 — 상업용 전환율 자료 미확보. 주거 외 용도 증축·신축 시에만 사용'],
      ['expansionCostPerPyeong', '증축 공사비 단가', '원/평', 8000000, 8000000, 8000000, 'C', '2026-10-08 결정 12 (사용자 결정)', '프로젝트', '2026-10-08', null,
        '÷ 3.305785㎡/평 = 약 2,420,000원/㎡. 범위는 시공사 견적 확보 시 입력'],
      ['expansionCostPerUnit', '증축 세대당 인허가 등 제반비용', '원/세대', 5000000, 5000000, 5000000, 'C', '2026-10-08 결정 12 (사용자 결정)', '프로젝트', '2026-10-08', null,
        '설계·감리·인허가·부담금 등 기타 제반비용 포함으로 봄'],
      ['newBuildCostTable', '신축 단가 — 건물신축단가표 (다세대주택 용도별 평균)', '원/㎡', 2055379, 2055379, 2055379, 'B', '2025년도 건물신축단가표 (용도별 건물표준단가+부대설비단가 평균)', '한국부동산원', '2025-11-25',
        'https://www.acode-architects.com/news/yongdobyeol-pyeongdan-geonchukbi-2026/', '2차 인용 값 — 단가표 원본(유료) 확인 필요. 신축 단가 = max(이 값, 엑셀 신축비용 자료)'],
      ['newBuildCostExcel', '신축 단가 — 건축물 신축비용 자료 (엑셀)', '원/㎡', null, null, null, null, null, null, null, null, '제공 예정 (결정 12) — 받으면 입력'],
      ['acquisitionTaxRate', '취득세 등 (원시취득)', '비율', 0.0316, 0.0316, 0.0316, 'A', '지방세법 제11조 원시취득 2.8% + 지방교육세 0.16% + 농어촌특별세 0.2%', '법령', '2026-10-08',
        'https://korea.legal/wiki/%ec%a7%80%eb%b0%a9%ec%84%b8%eb%b2%95-%ec%a0%9c11%ec%a1%b0/', '증축·신축 연면적의 공사비(과세표준 가정)에 적용 — 세무사 확인 필요'],
      ['loanInterestRate', '대출 금리', '비율', 0.0516, 0.0466, 0.043, 'B', '금융기관 가중평균금리 (2026년 8월, 신규취급액)', '한국은행', '2026-08-31',
        'https://biz.newdaily.co.kr/site/data/html/2026/09/30/2026093000176.html', '기준 = 주택담보대출 4.66%, 낙관 = 기업대출 4.30%, 보수 = 기준 +0.5%p(금리 상승 가정, C)'],
      ['loanRatio', '대출 비율 (총사업비 대비)', '비율', 0.5, 0.5, 0.5, 'C', null, null, null, null, '프로젝트 가정 — 건축주 자금계획 확인 필요'],
      ['constructionMonths', '공사 기간', '개월', 8, 6, 5, 'C', null, null, null, null, '프로젝트 가정 — 시공사 공정표로 교체'],
      ['vacancyRate', '공실률', '비율', 0.1, 0.05, 0.03, 'C', null, null, null, null, '프로젝트 가정 — 주택 공실률 공식 통계 부족'],
      ['opexRate', '운영비율 (임대수입 대비)', '비율', 0.15, 0.1, 0.08, 'C', null, null, null, null, '프로젝트 가정 — 수선·보험·관리 위탁 등'],
      ['maintenanceFeePerUnit', '관리비 (세대당 월)', '원/월', null, null, null, null, null, null, null, null,
        '확인 실패 — 실거래 신고자료에 관리비 없음. 임대사례 시트 관리비 칸 또는 이 행에 입력'],
      ['contingencyRate', '예비비율 (사업비 소계 대비)', '비율', 0.1, 0.05, 0.03, 'C', null, null, null, null, '프로젝트 가정'],
      ['capRate', '시장 환원율', '비율', 0.05, 0.045, 0.04, 'C', null, null, null, null, '프로젝트 가정 — 감정평가 자문으로 교체'],
      ['rentGrowthRate', '임대료 상승률 (연)', '비율', 0, 0.02, 0.03, 'C', null, null, null, null, '프로젝트 가정'],
      ['discountRate', '할인율 (NPV)', '비율', 0.06, 0.05, 0.04, 'C', null, null, null, null, '프로젝트 가정'],
    ],
  },
  {
    // 결정 5 — 연립·다세대 전월세 실거래 (당산동6가, 부족하면 영등포구), 최근 12개월, 전용 0~30 / 30~60㎡
    // npm run data:rent (서울 열린데이터광장 키 필요)로 채우거나 직접 입력. API를 쓰지 않고 고정값으로 관리한다.
    name: '임대사례',
    note: '보증금·월세·관리비는 만원. 전월세구분 = 전세|월세. npm run data:rent 는 출처가 "서울 열린데이터광장"인 행만 다시 쓴다 (직접 입력한 행은 유지)',
    header: ['출처', '계약일', '자치구', '법정동', '지번', '층', '전월세구분', '전용면적(㎡)', '보증금(만원)', '월세(만원)', '관리비(만원)', '건물용도', '건축년도', '신규갱신', '메모'],
    rows: [],
  },
]

const existed = existsSync(path)
const workbook = existed ? XLSX.readFile(path) : XLSX.utils.book_new()
const added = []
for (const s of SHEETS) {
  if (workbook.Sheets[s.name]) continue
  const sheet = XLSX.utils.aoa_to_sheet([s.header, ...s.rows, [], [`[설명] ${s.note}`]])
  XLSX.utils.book_append_sheet(workbook, sheet, s.name)
  added.push(s.name)
}
if (added.length === 0) {
  console.log(`추가할 시트 없음: ${path}`)
} else {
  XLSX.writeFile(workbook, path)
  console.log(`${existed ? '저장' : '생성'}: ${path}\n추가한 시트: ${added.join(', ')}`)
}
