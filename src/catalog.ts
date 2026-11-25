import type { City, Position } from './estimate'

export type CatalogEntry = {
  name: string
  unit: string
  group: string
  kind: 'Работы' | 'Материалы'
  quantity: number
  rate: number
  kazan?: number
  chelyabinsk?: number
  stale?: boolean
}

const foundationCatalog: CatalogEntry[] = [
  { name: 'Геодезическая разбивка осей', unit: 'компл.', group: 'Подготовка и земляные работы', kind: 'Работы', quantity: 1, rate: 6500 },
  { name: 'Снятие растительного слоя', unit: 'м³', group: 'Подготовка и земляные работы', kind: 'Работы', quantity: 14.5, rate: 290 },
  { name: 'Земляные работы', unit: 'м³', group: 'Подготовка и земляные работы', kind: 'Работы', quantity: 32, rate: 450 },
  { name: 'Обратная засыпка пазух', unit: 'м³', group: 'Подготовка и земляные работы', kind: 'Работы', quantity: 18, rate: 280 },
  { name: 'Уплотнение основания', unit: 'м²', group: 'Подготовка и земляные работы', kind: 'Работы', quantity: 64, rate: 135 },
  { name: 'Геотекстиль 250 г/м²', unit: 'м²', group: 'Основание и бетон', kind: 'Материалы', quantity: 86, rate: 96, kazan: 118, chelyabinsk: 109 },
  { name: 'Песок строительный', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 10.5, rate: 940, kazan: 1050, chelyabinsk: 980 },
  { name: 'Щебень 20–40 мм', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 7.2, rate: 1850, kazan: 2100, chelyabinsk: 1960 },
  { name: 'Устройство бетонной подготовки', unit: 'м²', group: 'Основание и бетон', kind: 'Работы', quantity: 64, rate: 310 },
  { name: 'Бетон В7,5', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 3.2, rate: 5100, kazan: 4680, chelyabinsk: 4450 },
  { name: 'Монтаж и демонтаж опалубки', unit: 'м²', group: 'Основание и бетон', kind: 'Работы', quantity: 42, rate: 760 },
  { name: 'Бетон В25', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 12, rate: 8500, kazan: 6300, chelyabinsk: 5900 },
  { name: 'Бетонирование фундамента', unit: 'м³', group: 'Основание и бетон', kind: 'Работы', quantity: 12, rate: 1380 },
  { name: 'Арматура А500С', unit: 'т', group: 'Армирование', kind: 'Материалы', quantity: 0.8, rate: 75000, chelyabinsk: 61500 },
  { name: 'Проволока вязальная', unit: 'кг', group: 'Армирование', kind: 'Материалы', quantity: 12, rate: 143, kazan: 158, chelyabinsk: 147 },
  { name: 'Фиксатор защитного слоя', unit: 'шт.', group: 'Армирование', kind: 'Материалы', quantity: 120, rate: 15, kazan: 17, chelyabinsk: 16 },
  { name: 'Сборка арматурного каркаса', unit: 'т', group: 'Армирование', kind: 'Работы', quantity: 0.8, rate: 12800 },
  { name: 'Мастика битумная', unit: 'кг', group: 'Защита и водоотведение', kind: 'Материалы', quantity: 52, rate: 174, kazan: 205, chelyabinsk: 193, stale: true },
  { name: 'Мембрана гидроизоляционная', unit: 'м²', group: 'Защита и водоотведение', kind: 'Материалы', quantity: 68, rate: 342, kazan: 395, chelyabinsk: 370 },
  { name: 'Гидроизоляция фундамента', unit: 'м²', group: 'Защита и водоотведение', kind: 'Работы', quantity: 52, rate: 485 },
  { name: 'Труба дренажная Ø110', unit: 'м', group: 'Защита и водоотведение', kind: 'Материалы', quantity: 38, rate: 410, kazan: 455, chelyabinsk: 432 },
  { name: 'Укладка дренажной трубы', unit: 'м', group: 'Защита и водоотведение', kind: 'Работы', quantity: 38, rate: 540 },
]

export const catalog: CatalogEntry[] = [
  ...foundationCatalog,
  { name: 'Бетон В15', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 1, rate: 6200, kazan: 5400, chelyabinsk: 5180 },
  { name: 'Бетон В30', unit: 'м³', group: 'Основание и бетон', kind: 'Материалы', quantity: 1, rate: 8980, kazan: 6850, chelyabinsk: 6600 },
  { name: 'Укладка бетонной смеси бетононасосом', unit: 'м³', group: 'Основание и бетон', kind: 'Работы', quantity: 1, rate: 1650 },
  { name: 'Алмазное бурение бетона', unit: 'отв.', group: 'Основание и бетон', kind: 'Работы', quantity: 1, rate: 2420 },
  { name: 'Кладка стен из газобетонных блоков', unit: 'м³', group: 'Стены и перегородки', kind: 'Работы', quantity: 1, rate: 3400 },
  { name: 'Газобетонный блок D500', unit: 'м³', group: 'Стены и перегородки', kind: 'Материалы', quantity: 1, rate: 7200, kazan: 6900, chelyabinsk: 6720 },
  { name: 'Монтаж перегородок из гипсокартона', unit: 'м²', group: 'Стены и перегородки', kind: 'Работы', quantity: 1, rate: 1260 },
  { name: 'Штукатурка стен цементным раствором', unit: 'м²', group: 'Отделка', kind: 'Работы', quantity: 1, rate: 575 },
  { name: 'Окраска потолка водно-дисперсионной краской', unit: 'м²', group: 'Отделка', kind: 'Работы', quantity: 1, rate: 315 },
  { name: 'Окраска стен водно-дисперсионной краской', unit: 'м²', group: 'Отделка', kind: 'Работы', quantity: 1, rate: 295 },
  { name: 'Грунтование стен и потолков', unit: 'м²', group: 'Отделка', kind: 'Работы', quantity: 1, rate: 85 },
  { name: 'Краска водно-дисперсионная', unit: 'л', group: 'Отделка', kind: 'Материалы', quantity: 1, rate: 380, kazan: 410, chelyabinsk: 397 },
  { name: 'Колодец дренажный смотровой', unit: 'шт.', group: 'Защита и водоотведение', kind: 'Материалы', quantity: 1, rate: 5700, kazan: 5990, chelyabinsk: 5620 },
  { name: 'Разработка траншеи экскаватором', unit: 'м³', group: 'Инженерные сети', kind: 'Работы', quantity: 1, rate: 740 },
  { name: 'Разработка траншеи вручную', unit: 'м³', group: 'Инженерные сети', kind: 'Работы', quantity: 1, rate: 1850 },
  { name: 'Песчаная подушка под трубопровод', unit: 'м³', group: 'Инженерные сети', kind: 'Работы', quantity: 1, rate: 650 },
  { name: 'Труба водопроводная ПНД 32 мм', unit: 'м', group: 'Инженерные сети', kind: 'Материалы', quantity: 1, rate: 178, kazan: 185, chelyabinsk: 171 },
  { name: 'Укладка водопроводной трубы', unit: 'м', group: 'Инженерные сети', kind: 'Работы', quantity: 1, rate: 360 },
  { name: 'Муфта компрессионная 32 мм', unit: 'шт.', group: 'Инженерные сети', kind: 'Материалы', quantity: 1, rate: 324, kazan: 349, chelyabinsk: 337 },
  { name: 'Лента сигнальная «Водопровод»', unit: 'м', group: 'Инженерные сети', kind: 'Материалы', quantity: 1, rate: 31, kazan: 33, chelyabinsk: 29 },
  { name: 'Гидравлическое испытание водопровода', unit: 'компл.', group: 'Инженерные сети', kind: 'Работы', quantity: 1, rate: 4300 },
]

const normalize = (value: string) => value.trim().toLowerCase()
export const catalogEntry = (position: Pick<Position, 'name' | 'unit'>) =>
  catalog.find((item) => normalize(item.name) === normalize(position.name) && item.unit === position.unit)

export const detailedSample: Position[] = foundationCatalog.map(({ name, unit, quantity }) => ({ name, unit, quantity }))

function examplePosition(name: string, quantity: number): Position {
  const item = catalog.find((entry) => entry.name === name)
  if (!item) throw new Error('Пример ссылается на неизвестную позицию: ' + name)
  return { name, unit: item.unit, quantity }
}

export const projectExamples = [
  { id: 'foundation-kazan', title: 'Фундамент дома', label: 'Фундамент', source: 'Спецификация фундамента', city: 'Казань',
    image: 'foundation.webp', alt: 'Фундамент, опалубка и арматура', queries: ['бетон', 'залить фундамент бетононасосом'], positions: detailedSample },
  { id: 'drainage-kazan', title: 'Дренаж участка', label: 'Дренаж участка', source: 'Ведомость дренажных работ', city: 'Казань',
    image: 'drainage.webp', alt: 'Дренажная труба в траншее со щебнем и геотекстилем', queries: ['дренажная труба', 'смотровой колодец'],
    positions: [
      { name: 'Выкопать траншею под дренажную трубу', unit: 'м³', quantity: 28 },
      examplePosition('Геотекстиль 250 г/м²', 86),
      examplePosition('Щебень 20–40 мм', 14),
      examplePosition('Труба дренажная Ø110', 42),
      examplePosition('Укладка дренажной трубы', 42),
      examplePosition('Колодец дренажный смотровой', 3),
      examplePosition('Обратная засыпка пазух', 16),
    ],
  },
  { id: 'water-chelyabinsk', title: 'Наружный водопровод', label: 'Наружный водопровод', source: 'Ведомость наружного водопровода', city: 'Челябинск',
    image: 'waterline.webp', alt: 'Водопроводная труба на песчаном основании в открытой траншее', queries: ['пнд 32', 'испытание водопровода'],
    positions: [
      { name: 'Выкопать траншею под водопровод', unit: 'м³', quantity: 34 },
      examplePosition('Песчаная подушка под трубопровод', 4.8),
      examplePosition('Труба водопроводная ПНД 32 мм', 38),
      examplePosition('Укладка водопроводной трубы', 38),
      examplePosition('Муфта компрессионная 32 мм', 4),
      examplePosition('Лента сигнальная «Водопровод»', 38),
      examplePosition('Гидравлическое испытание водопровода', 1),
    ],
  },
] satisfies { id: string; title: string; label: string; source: string; city: City; image: 'foundation.webp' | 'drainage.webp' | 'waterline.webp'; alt: string; queries: string[]; positions: Position[] }[]

export type ProjectExample = typeof projectExamples[number]

export function offers(item: CatalogEntry, city: City) {
  const base = city === 'Казань' ? item.kazan : item.chelyabinsk
  if (base === undefined) return []
  return [
    { name: 'Поставщик 01', price: base, date: item.stale ? '10.11.2026' : '24.11.2026', expires: item.stale ? '17.11.2026' : '30.11.2026', stale: !!item.stale },
    { name: 'Поставщик 02', price: Math.ceil(base * 1.07), date: '23.11.2026', expires: '30.11.2026', stale: false },
    { name: 'Поставщик 03', price: Math.ceil(base * 1.12), date: '24.11.2026', expires: '02.12.2026', stale: false },
  ]
}

export function rateCode(item: CatalogEntry) {
  return 'КС–' + String(catalog.indexOf(item) + 1).padStart(3, '0')
}
