import { catalog, type CatalogEntry } from './catalog'
import type { City } from './estimate'

export const historyMaterials = catalog
  .filter((item) => item.kind === 'Материалы' && (item.kazan !== undefined || item.chelyabinsk !== undefined))
  .sort((first, second) => first.name.localeCompare(second.name, 'ru'))

export type PricePoint = { date: Date; price: number }

const seasons = {
  concrete: [-.095, -.08, -.06, -.01, .035, .06, .07, .065, .03, .008, -.025, -.07],
  metal: [-.03, -.02, .005, .04, .065, .04, .018, .002, -.025, -.06, -.035, -.04],
  other: [-.05, -.045, -.02, .01, .032, .05, .055, .025, -.008, -.03, -.018, -.04],
}
const noise = [.004, -.006, .013, -.008, .002, .01, -.01, .005, -.012, .014, -.005, .008, -.003]

export function priceHistory(material: CatalogEntry, city: City): PricePoint[] {
  const reference = city === 'Казань' ? material.kazan : material.chelyabinsk
  if (reference === undefined) return []
  const family = material.name.startsWith('Бетон') ? 'concrete'
    : ['Арматура', 'Проволока'].some((word) => material.name.startsWith(word)) ? 'metal' : 'other'
  const variation = material.name.length + (city === 'Казань' ? 0 : 5)
  // Freeze the end date so this sample remains reproducible.
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10 - (23 - index), 1))
    const season = seasons[family][date.getUTCMonth()] - seasons[family][10]
    const bump = noise[(index + variation) % noise.length] - noise[(23 + variation) % noise.length]
    const factor = 1 + (index - 23) * .0015 + season + bump
    return { date, price: Math.round(reference * factor * 100) }
  })
}

export function lowestMonths(points: PricePoint[]) {
  if (points.length < 24) return []
  const months = Array.from({ length: 12 }, (_, month) => {
    const values = points.filter((point) => point.date.getUTCMonth() === month)
    const average = values.length ? Math.round(values.reduce((sum, point) => sum + point.price, 0) / values.length) : 0
    return { month, count: values.length, average }
  })
  return months.every((month) => month.count >= 2)
    ? months.sort((first, second) => first.average - second.average).slice(0, 2)
    : []
}

export const supplierProfiles: Record<string, { supply: string; quote: string; notes: { topic: string; text: string }[] }> = {
  'Поставщик 01': {
    supply: 'Самовывоз или доставка на объект по отдельному тарифу.',
    quote: 'Ближайшее окно отгрузки и минимальную партию уточняют при заказе.',
    notes: [
      { topic: 'Срок поставки', text: 'Отгрузку перенесли на следующий рабочий день, предупредив заранее.' },
      { topic: 'Документы', text: 'Паспорт качества передали с накладной.' },
    ],
  },
  'Поставщик 02': {
    supply: 'Доставка по региону, возможна разгрузка на объекте.',
    quote: 'Перед заказом уточняют, входит ли разгрузка в предложение.',
    notes: [
      { topic: 'Доставка', text: 'Согласовали утреннее окно. Узкий подъезд попросили описать заранее.' },
      { topic: 'Цена', text: 'Стоимость доставки указали отдельной строкой в счёте.' },
    ],
  },
  'Поставщик 03': {
    supply: 'Отгрузка со склада, доставка по заявке.',
    quote: 'Наличие и резерв партии подтверждают при выставлении счёта.',
    notes: [
      { topic: 'Комплектация', text: 'Уточнили наличие всей партии до оплаты.' },
      { topic: 'Связь', text: 'Дополнительные документы прислали после запроса.' },
    ],
  },
}
