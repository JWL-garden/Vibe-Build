import { describe, expect, it } from 'vitest'
import { isSameParcel, massRole, parseMassNodeName, visibleRevFloors } from '../massModel'

describe('GLB 매스 노드 이름', () => {
  it('규칙에 맞는 이름을 해석한다', () => {
    expect(parseMassNodeName('1156011600101040010_REV_F07')).toEqual({
      pnu: '1156011600101040010',
      kind: 'REV',
      floor: 7,
    })
  })

  it('규칙에 맞지 않으면 null', () => {
    expect(parseMassNodeName('Ground')).toBeNull()
    expect(parseMassNodeName('115601160010104001_EXIST_F01')).toBeNull() // 18자리
  })

  it('건축물대장 PNU(대지=0)와 토지 PNU(대지=1)를 같은 필지로 본다', () => {
    expect(isSameParcel('1156011600001040010', '1156011600101040010')).toBe(true)
    expect(isSameParcel('1156011600001040010', '1156011600101100021')).toBe(false)
  })
})

describe('뷰별 표시 역할', () => {
  const app = '1156011600001040010' // 앱의 104-10번지
  const exist = parseMassNodeName('1156011600101040010_EXIST_F03')!
  const rev = parseMassNodeName('1156011600101040010_REV_F07')!
  const nearExist = parseMassNodeName('1156011600101100021_EXIST_F01')!
  const nearRev = parseMassNodeName('1156011600101100021_REV_F04')!

  it('증축 전: 대상 기존층만, 증축층 숨김', () => {
    expect(massRole(exist, app, 'before')).toBe('targetExisting')
    expect(massRole(rev, app, 'before')).toBe('hidden')
  })

  it('증축 후: 대상 기존층 + 증축층', () => {
    expect(massRole(exist, app, 'after')).toBe('targetExisting')
    expect(massRole(rev, app, 'after')).toBe('targetAddition')
  })

  it('주변 필지: 기존층은 배경, 증축안은 항상 숨김', () => {
    expect(massRole(nearExist, app, 'after')).toBe('context')
    expect(massRole(nearRev, app, 'after')).toBe('hidden')
  })
})

describe('계산된 증축 층수만큼만 표시 (2026-10-08)', () => {
  it('모델 증축층 6·7·8층 중 계산 결과 +1개층이면 6층만', () => {
    expect([...visibleRevFloors([8, 6, 7], 1)]).toEqual([6])
    expect([...visibleRevFloors([6, 7, 8], 0)]).toEqual([])
    expect([...visibleRevFloors([6, 7], 5)]).toEqual([6, 7]) // 모델이 더 적으면 있는 만큼
    expect([...visibleRevFloors([7, 6], null)]).toEqual([6, 7]) // 계산 결과 없으면 전부
  })

  it('증축 후 뷰: 보이지 않는 증축층은 숨김', () => {
    const app = '1156011600001040010'
    const f6 = parseMassNodeName('1156011600101040010_REV_F06')!
    const f7 = parseMassNodeName('1156011600101040010_REV_F07')!
    const shown = visibleRevFloors([6, 7, 8], 1)
    expect(massRole(f6, app, 'after', shown)).toBe('targetAddition')
    expect(massRole(f7, app, 'after', shown)).toBe('hidden')
  })
})
