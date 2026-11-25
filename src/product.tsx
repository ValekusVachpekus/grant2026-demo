import { useState } from 'react'
import { catalog, offers } from './catalog'
import { cities, matchedEntry, money, number, type City, type Estimate, type Line } from './estimate'
import { historyMaterials } from './market'
import { SupplierCard } from './market-ui'

export type ShowFeature = (name: string, description: string) => void

export function Suppliers({ estimate, lines, onChoose, onHistory, initialMaterial }: {
  estimate: Estimate; lines: Line[]; onChoose: (key: string, value: string, supplier?: string) => void
  onHistory: (material: string, city: City) => void
  initialMaterial?: string
}) {
  const materials = lines.filter((line) => matchedEntry(estimate, Number(line.key))?.kind === 'Материалы')
  const [key, setKey] = useState(() => materials.find((line) => matchedEntry(estimate, Number(line.key))?.name === initialMaterial)?.key ?? materials[0]?.key ?? '')
  const [profile, setProfile] = useState<ReturnType<typeof offers>[number] | null>(null)
  const selected = materials.find((line) => line.key === key) ?? materials[0]
  const item = selected && matchedEntry(estimate, Number(selected.key))
  const prices = item ? offers(item, estimate.city) : []
  return (
    <section className="panel">
      <div className="panel-heading between">
        <div><h2>Сравнение поставщиков</h2><p>Предложения поставщиков · {estimate.city}</p></div>
        <div className="supplier-tools">
          {selected && <label className="field compact">Материал<select value={selected.key} onChange={(event) => setKey(event.target.value)}>{materials.map((line) => <option key={line.key} value={line.key}>{line.name}</option>)}</select></label>}
          {item && historyMaterials.some((material) => material.name === item.name) && <button type="button" onClick={() => onHistory(item.name, estimate.city)}>История цен ↗</button>}
        </div>
      </div>
      {selected && prices.length ? (
        <div className="table-scroll"><table>
          <thead><tr><th>Поставщик</th><th className="number">Цена за {selected.unit}</th><th>Дата прайса</th><th>Действует до</th><th>Действие</th></tr></thead>
          <tbody>{prices.map((offer) => (
            <tr key={offer.name}><th scope="row"><button type="button" className="text-button" onClick={() => setProfile(offer)}>{offer.name} ↗</button><small className="list-source">Карточка и отзывы</small></th><td className="number">{money(offer.price * 100)}</td><td>{offer.date}</td><td>{offer.expires}{offer.stale && <span className="badge warning">Устарела</span>}</td>
              <td>{estimate.suppliers?.[estimate.city]?.[selected.key] === offer.name ? <span>Выбрано</span> : (
                <button type="button" onClick={() => onChoose(selected.key, String(offer.price), offer.name)}>{offer.stale ? 'Подтвердить эту цену' : 'Выбрать цену'}</button>
              )}</td></tr>
          ))}</tbody>
        </table></div>
      ) : <p className="empty">{selected ? 'В региональном прайсе нет предложений. Цену можно добавить в расчёте вручную.' : 'В спецификации нет материалов из справочника.'}</p>}
      {profile && item && <SupplierCard offer={profile} material={item} city={estimate.city} onClose={() => setProfile(null)} />}
    </section>
  )
}

export function Directories({ show }: { show: ShowFeature }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState<City>('Казань')
  const filtered = catalog.filter((item) => (item.name + ' ' + item.group).toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <>
      <header className="page-header between">
        <div><h1>Справочники</h1><p>Нормативы, материалы и цены, доступные при подготовке смет.</p></div>
        <div className="actions">
          <button type="button" onClick={() => show('Импорт нормативной базы', 'В разработке. Подключение ФСНБ и ФГИС ЦС появится после проверки форматов и условий доступа.')}>Импорт нормативов</button>
          <button type="button" onClick={() => show('Обновление прайсов', 'В разработке. Сейчас поиск показывает демонстрационные прайсы Казани и Челябинска. Автоматическое обновление появится после подключения поставщиков.')}>Обновить прайсы</button>
        </div>
      </header>
      <section className="panel">
        <div className="panel-heading between">
          <label className="field compact">Поиск по справочнику<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например, бетон" /></label>
          <label className="field compact">Регион цен<select value={city} onChange={(event) => setCity(event.target.value as City)}>{cities.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        <div className="table-scroll"><table>
          <thead><tr><th>Позиция</th><th>Раздел</th><th>Ед.</th><th className="number">Условная расценка</th><th className="number">Условная цена</th></tr></thead>
          <tbody>{filtered.map((item) => {
            const market = offers(item, city)[0]
            return <tr key={item.name}><th scope="row">{item.name}</th><td>{item.group}</td><td>{item.unit}</td><td className="number">{money(item.rate * 100)}</td><td className="number">{market ? money(market.price * 100) : '—'}</td></tr>
          })}</tbody>
        </table></div>
        {!filtered.length && <p className="empty">По вашему запросу ничего не найдено.</p>}
      </section>
    </>
  )
}

const integrations = [
  ['ГРАНД-Смета', 'Файловый обмен локальными нормативными сметами.', 'Подключение зависит от испытаний формата экспорта на целевой версии ГРАНД-Сметы.'],
  ['Другие сметные системы', 'Дополнительные форматы обмена.', 'Форматы будут добавляться по согласованным требованиям.'],
  ['ФГИС ЦС и ФСНБ', 'Нормативы, индексы и официальные данные.', 'Порядок загрузки и обновления зависит от источника и условий доступа.'],
  ['Прайсы поставщиков', 'Региональные цены и сроки действия предложений.', 'Сейчас доступны условные предложения для Казани и Челябинска. Подключение источников требует договорённостей с поставщиками.'],
  ['Windows и Linux', 'Десктопное приложение с доступом к сметам.', 'Сборки Tauri появятся после подключения общего сервера.'],
  ['macOS', 'Дополнительная десктопная версия.', 'Поддержка macOS рассматривается как расширение.'],
]

const settings = [
  ['Правила расчёта', 'Коэффициенты, индексы, НДС и методика расчёта.', 'Правила нормативного расчёта предстоит проверить со сметчиком. В демонстрации используются простые условные расценки.'],
  ['Подбор расценок', 'Семантический поиск, объяснения и подтверждённые соответствия.', 'Демонстрационный подбор работает по справочнику. Подключение семантического поиска и запоминание исправлений запланированы отдельно.'],
  ['Обезличивание', 'Подготовка спецификаций к отправке на обработку.', 'Макет использует подготовленные спецификации. Обезличивание и внешний ИИ появятся после подключения сервера.'],
  ['Совместная работа', 'Права доступа и совместное редактирование.', 'Доступ нескольких пользователей требует общей учётной записи и сервера.'],
  ['Автономная работа', 'Просмотр и изменение смет в десктопном приложении без сети.', 'Офлайн-режим рассматривается как возможное расширение.'],
  ['Настройки организации', 'Собственные прайсы, сметные правила и адаптация.', 'Настройки для организаций будут подключаться по согласованным требованиям.'],
]

export function ProductOptions({ section, show }: { section: 'Интеграции' | 'Настройки'; show: ShowFeature }) {
  return (
    <>
      <header className="page-header"><h1>{section}</h1><p>{section === 'Интеграции' ? 'Источники данных, файловый обмен и приложения.' : 'Управление расчётом, обработкой данных и доступом.'}</p></header>
      <section className="panel options-list">{(section === 'Интеграции' ? integrations : settings).map(([name, summary, details]) => (
        <div key={name} className="between option"><div><h2>{name}</h2><p className="muted">{summary}</p></div><button type="button" onClick={() => show(name, 'В разработке. ' + details)}>Открыть</button></div>
      ))}</section>
    </>
  )
}

export function missingResource(estimate: Estimate) {
  const has = (name: string) => estimate.positions.some((item) => item.name.toLowerCase().includes(name))
  return has('дренаж') && !has('щебень') ? 'Проверьте, предусмотрена ли щебёночная обсыпка для дренажных работ.' :
    has('труба дренажная') && !has('колодец') ? 'В спецификации есть дренажная труба. Проверьте, нужен ли смотровой колодец.' : ''
}

export function PrintHeading({ estimate }: { estimate: Estimate }) {
  return <div className="print-heading"><p>{estimate.mode === 'Нормативная' ? 'Локальный сметный расчёт' : 'Коммерческий расчёт'} · учебный пример</p><h2>{estimate.title}</h2><p>{estimate.source}{estimate.mode === 'Коммерческая' && <> · Регион цен: {estimate.city}</>} · строк спецификации: {number(estimate.positions.length)}</p></div>
}
