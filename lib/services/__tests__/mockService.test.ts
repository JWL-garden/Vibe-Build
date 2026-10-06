import { describe, expect, it } from 'vitest'
import { getBuildingsByPnu, searchSites } from '../mockService'

describe('searchSites', () => {
  it('지번 주소가 정확히 일치하면 그 필지 하나만 찾는다', async () => {
    const found = await searchSites('영등포구 당산동6가 3-1')
    expect(found.map((c) => c.pnu)).toEqual(['1156011600000030001'])
  })

  it('"번지"와 공백이 달라도 찾는다', async () => {
    const found = await searchSites('당산동6가3-1번지')
    expect(found.map((c) => c.pnu)).toEqual(['1156011600000030001'])
  })

  it('도로명 주소로도 찾는다', async () => {
    const found = await searchSites('양평로 2')
    expect(found.map((c) => c.pnu)).toContain('1156011600000010002')
  })

  it('없는 주소는 빈 배열', async () => {
    expect(await searchSites('강남구 역삼동 999')).toEqual([])
    expect(await searchSites('   ')).toEqual([])
  })
})

describe('getBuildingsByPnu', () => {
  it('한 필지에 여러 동이 있으면 모두 돌려준다', async () => {
    const list = await getBuildingsByPnu('1156011600000080000')
    expect(list.length).toBe(5)
  })
})
