import { catalogEntry, offers, rateCode } from './catalog'

export const cities = ['Казань', 'Челябинск'] as const
export type City = typeof cities[number]
export type Mode = 'Нормативная' | 'Коммерческая'
export const strategies = ['Ручной', 'Полуавтоматический', 'Автоматический'] as const
export type Strategy = typeof strategies[number]
export type Position = { name: string; unit: string; quantity: number }
export type Snapshot = Omit<Estimate, 'history'>
export type Estimate = {
  id: string
  title: string
  source: string
  positions: Position[]
  city: City
  mode: Mode
  strategy?: Strategy
  matches?: Record<string, string>
  excavation: Record<string, number>
  prices: Partial<Record<City, Record<string, string>>>
  suppliers?: Partial<Record<City, Record<string, string>>>
  rates: Record<string, string>
  updated: string
  history?: { label: string; data: Snapshot }[]
}
export type Line = Position & {
  key: string
  value: string
  total: number | null
  issue: string
  basis: string
  group: string
  calculationName?: string
  editable: boolean
  excavation?: boolean
  needsMatch?: boolean
}
export const sample: Position[] = [
  { name: 'Земляные работы', unit: 'м³', quantity: 32 },
  { name: 'Бетон В25', unit: 'м³', quantity: 12 },
  { name: 'Арматура А500С', unit: 'т', quantity: 0.8 },
]
const amountFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const volumeFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 })
export const number = (value: number) => volumeFormat.format(value)
export const money = (value: number) => amountFormat.format(value / 100) + ' ₽'

export function price(value: string) {
  const input = value.trim().replace(',', '.')
  return /^\d{1,6}(?:\.\d{1,2})?$/.test(input) ? Math.round(Number(input) * 100) : null
}

export function snapshot(estimate: Estimate): Snapshot {
  const { history: _history, ...data } = estimate
  return data
}

export function newEstimate(title: string, source: string, positions: Position[], city: City): Estimate {
  return { id: crypto.randomUUID(), title, source, positions, city, mode: 'Нормативная', strategy: 'Полуавтоматический', excavation: {}, prices: {}, rates: {}, updated: new Date().toISOString() }
}

export function matchedEntry(estimate: Estimate, index: number) {
  const position = estimate.positions[index]
  if (!position) return undefined
  const choice = estimate.matches?.[String(index)]
  return catalogEntry(choice ? { name: choice, unit: position.unit } : position)
}

function rekey<T>(values: Record<string, T> | undefined, index: number, removing: boolean) {
  return Object.fromEntries(Object.entries(values ?? {}).flatMap(([key, value]) => {
    const row = Number(key)
    if (row === index) return []
    return [[removing && row > index ? String(row - 1) : key, value]]
  }))
}

function resetPositionPricing(estimate: Estimate, index: number, removing = false) {
  return {
    excavation: rekey(estimate.excavation, index, removing),
    rates: rekey(estimate.rates, index, removing),
    prices: Object.fromEntries(cities.map((city) => [city, rekey(estimate.prices[city], index, removing)])),
    suppliers: Object.fromEntries(cities.map((city) => [city, rekey(estimate.suppliers?.[city], index, removing)])),
  }
}

export function applyMatch(estimate: Estimate, key: string, name: string): Partial<Estimate> {
  return {
    ...resetPositionPricing(estimate, Number(key)),
    matches: { ...estimate.matches, [key]: name },
  }
}

export function confirmExcavation(estimate: Estimate, key: string, rate: number): Partial<Estimate> {
  return {
    rates: rekey(estimate.rates, Number(key), false),
    excavation: { ...estimate.excavation, [key]: rate },
  }
}

export function revisePosition(estimate: Estimate, index: number, replacement?: Position): Partial<Estimate> {
  const old = estimate.positions[index]
  const positions = replacement
    ? estimate.positions.map((item, row) => index === row ? replacement : item)
    : estimate.positions.filter((_, row) => index !== row)
  if (replacement && replacement.name === old.name && replacement.unit === old.unit) return { positions }

  const removing = !replacement
  return {
    positions,
    matches: rekey(estimate.matches, index, removing),
    ...resetPositionPricing(estimate, index, removing),
  }
}

export function withExampleCharges<T extends Snapshot>(estimate: T): T {
  const foundation = ['Спецификация фундамента', 'Ведомость материалов', 'Ведомость объёмов работ'].includes(estimate.source)
  const drainage = estimate.source === 'Ведомость дренажных работ'
  const water = estimate.source === 'Ведомость наружного водопровода'
  if (!foundation && !drainage && !water) return estimate
  const expanded = estimate.positions.length > 3
  const work = foundation ? expanded ? ['138000', '126000'] : ['35000', '32500'] : drainage ? ['49000', '46000'] : ['38600', '35900']
  const delivery = foundation ? expanded ? ['24500', '22300'] : ['9000', '8000'] : drainage ? ['7600', '7100'] : ['6400', '5800']
  return {
    ...estimate,
    prices: Object.fromEntries(cities.map((city, index) => [
      city, { work: work[index], delivery: delivery[index], ...estimate.prices[city] },
    ])),
  }
}

export function summarize(lines: Line[]) {
  return {
    total: lines.reduce((sum, line) => sum + (line.total ?? 0), 0),
    issues: lines.filter((line) => line.issue),
    incomplete: lines.some((line) => line.total === null),
  }
}

export function estimateLines(estimate: Estimate): Line[] {
  const commercial = estimate.mode === 'Коммерческая'
  const manual = estimate.strategy === 'Ручной'
  const overrides = commercial ? estimate.prices[estimate.city] ?? {} : estimate.rates

  function line(position: Position, key: string, suggested: string, basis: string, group: string, excavation = false, stale = false): Line {
    const value = overrides[key] ?? suggested
    const rate = price(value)
    const issue = rate === null ? (value.trim() ? 'Проверьте цену' : 'Нет цены')
      : excavation && estimate.excavation[key] === undefined ? 'Требует подтверждения'
      : stale && overrides[key] === undefined ? 'Цена устарела' : ''
    const thousandths = BigInt(Math.round(position.quantity * 1000))
    const total = rate === null || issue === 'Цена устарела' ? null : Number((BigInt(rate) * thousandths + 500n) / 1000n)
    return { ...position, key, value, basis, group, editable: !excavation, excavation, issue, total }
  }

  const lines = estimate.positions.flatMap((position, index) => {
    const item = matchedEntry(estimate, index)
    const key = String(index)
    const group = item?.group ?? 'Прочие позиции'
    if (!commercial) {
      const excavation = !manual && item?.name === sample[0].name
      const suggested = manual || !item ? '' : String(estimate.excavation[key] ?? item.rate)
      const basis = overrides[key] !== undefined ? 'Ручной ввод'
        : estimate.matches?.[key] && suggested ? `Учебный справочник · ${item?.name}`
        : suggested ? 'Учебный справочник нормативов' : 'Ручной ввод'
      const result = line(position, key, suggested, basis, group, excavation)
      if (!manual && item) {
        result.basis += ' · ' + rateCode(item)
        const confirmed = estimate.excavation[key]
        result.calculationName = excavation && confirmed !== undefined
          ? `Разработка грунта ${confirmed === 520 ? 'с погрузкой' : 'без погрузки'}`
          : item.name
      }
      return [!manual && !item && !result.value.trim() ? { ...result, issue: 'Нужна расценка', needsMatch: true } : result]
    }
    if (item?.kind === 'Работы') return []
    const offer = item ? offers(item, estimate.city)[0] : undefined
    const chosen = estimate.suppliers?.[estimate.city]?.[key]
    const basis = chosen === 'Ручной ввод' ? chosen : chosen ? `Учебный прайс · ${chosen}` : offer ? `Учебный прайс · ${offer.name}` : 'Ручной ввод'
    return [line(position, key, offer ? String(offer.price) : '', basis, group, false, offer?.stale)]
  })

  if (commercial && estimate.positions.length) {
    lines.push(
      line({ name: 'Стоимость работ', unit: 'услуга', quantity: 1 }, 'work', '', 'Ручной ввод', 'Работы и логистика'),
      line({ name: 'Доставка материалов', unit: 'услуга', quantity: 1 }, 'delivery', '', 'Ручной ввод', 'Работы и логистика'),
    )
  }
  return lines
}
