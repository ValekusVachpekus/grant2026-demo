import { useState, type FormEvent } from 'react'
import { rateCode, catalog, offers, type CatalogEntry } from './catalog'
import { cities, money, type City, type Estimate, type Position } from './estimate'

const examples = ['бетон', 'залить фундамент бетононасосом', 'покрасить потолок']
const stopWords = new Set(['для', 'как', 'нужно', 'мне', 'чем', 'работа', 'работы', 'цена', 'материал', 'купить', 'сколько'])
const substitutions: Record<string, string> = {
  залить: 'бетонирование', заливка: 'бетонирование', бетонировать: 'бетонирование',
  выкопать: 'земляные', котлован: 'земляные', копка: 'земляные',
  покрасить: 'окраска', покраска: 'окраска', красить: 'окраска',
  оштукатурить: 'штукатурка', гидроизоляция: 'гидроизоляция',
}
function tokens(value: string) {
  return (value.toLowerCase().replaceAll('ё', 'е').match(/[а-яa-z0-9]+/g) ?? []).filter((word) => !stopWords.has(word))
}

export function findRates(query: string) {
  const words = tokens(query).map((word) => substitutions[word] ?? word)
  if (!words.length) return []
  return catalog.map((item) => {
    const names = tokens(item.name)
    const group = tokens(item.group)
    const score = words.reduce((sum, word) => {
      const exact = names.some((name) => name === word)
      const root = word.length > 5 ? word.slice(0, -2) : word
      const similar = root.length >= 3 && names.some((name) => name.startsWith(root))
      const related = root.length >= 4 && group.some((name) => name.startsWith(root))
      return sum + (exact ? 9 + Math.min(word.length, 12) / 4 : similar ? 6 : related ? 1 : 0)
    }, 0)
    return { item, score }
  }).filter(({ score }) => score >= 6).sort((first, second) => second.score - first.score).map(({ item }) => item)
}

export function QueryBox({ value, onChange, onSearch, compact = false, placeholder }: {
  value: string; onChange: (value: string) => void; onSearch: (value: string) => void; compact?: boolean; placeholder?: string
}) {
  return (
    <form className={'query-box' + (compact ? ' query-compact' : '')} onSubmit={(event) => { event.preventDefault(); if (value.trim()) onSearch(value.trim()) }}>
      <label>
        <span className="search-mark" aria-hidden="true" />
        <input aria-label="Описание работы или материала" type="search" value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? 'Опишите работу или материал'} required />
      </label>
      <button type="submit" className="primary">{compact ? 'Найти ↗' : 'Найти расценки'}</button>
    </form>
  )
}

function RateCard({ item, city, onAdd, estimates, targetId, full, onExpand }: {
  item: CatalogEntry; city: City; onAdd: (position: Position, id?: string) => void; estimates: Estimate[]; targetId?: string; full: boolean; onExpand: () => void
}) {
  const [quantity, setQuantity] = useState('1')
  const [destination, setDestination] = useState(targetId ?? estimates[0]?.id ?? '')
  const [tab, setTab] = useState<'Состав затрат' | 'Региональная цена'>('Состав затрат')
  const material = item.kind === 'Материалы'
  const offer = offers(item, city)[0]
  const labor = material ? 0 : Math.round(item.rate * .6 * 100)
  const machines = material ? 0 : Math.round(item.rate * .18 * 100)
  const resources = item.rate * 100 - labor - machines

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const volume = Number(quantity.replace(',', '.'))
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(quantity) || volume <= 0 || volume > 100_000) return
    onAdd({ name: item.name, unit: item.unit, quantity: volume }, destination || undefined)
  }

  return (
    <article className={'rate-card panel' + (full ? ' rate-full' : '')}>
      <header className="rate-head">
        <div className="rate-id"><code>{rateCode(item)}</code><span>{item.kind}</span></div>
        <h2>{item.name}</h2>
        <p className="muted">{item.group} · расчёт за 1 {item.unit}</p>
      </header>
      <div className="rate-amount">
        <div><span>За единицу</span><strong>{money(item.rate * 100)}</strong></div>
        <div><span>Источник</span><strong className="rate-source">Учебный каталог</strong></div>
      </div>
      <div className="rate-tabs" aria-label="Данные расценки">
        {(['Состав затрат', 'Региональная цена'] as const).map((label) => <button key={label} type="button" aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}
      </div>
      {tab === 'Состав затрат' ? <dl className="cost-lines">
        <div><dt>Оплата труда</dt><dd>{labor ? money(labor) : '—'}</dd></div>
        <div><dt>Машины и механизмы</dt><dd>{machines ? money(machines) : '—'}</dd></div>
        <div><dt>Материалы</dt><dd>{money(resources)}</dd></div>
        <div className="cost-total"><dt>Прямые затраты</dt><dd>{money(item.rate * 100)}</dd></div>
      </dl> : <dl className="cost-lines">
        <div><dt>Региональный прайс</dt><dd>{city}</dd></div>
        <div><dt>{offer?.name ?? 'Предложение'}</dt><dd>{offer ? money(offer.price * 100) : 'По запросу'}</dd></div>
        {offer && <div><dt>Дата прайса</dt><dd>{offer.date}{offer.stale ? ' · истёк' : ''}</dd></div>}
      </dl>}
      {full && <section className="rate-context">
        <h3>Применение</h3>
        <p>{material ? 'Позиция учитывает стоимость материала в указанной единице. Проверьте марку и характеристики по спецификации.' : 'Проверьте, совпадают ли условия выполнения и состав работ со спецификацией объекта.'}</p>
        <p className="muted">Код и цены относятся к учебному каталогу. Параметры официальной нормативной базы проверяются при подключении источника.</p>
      </section>}
      <form className="rate-add" onSubmit={add}>
        {(!targetId && estimates.length > 0) && <label className="field">Смета<select value={destination} onChange={(event) => setDestination(event.target.value)}>{estimates.map((estimate) => <option key={estimate.id} value={estimate.id}>{estimate.title}</option>)}</select></label>}
        <div className="rate-add-row">
          <label className="field">Объём, {item.unit}<input aria-label="Объём добавляемой позиции" type="number" min="0.001" max="100000" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></label>
          <button type="submit" className="primary">Добавить в смету</button>
        </div>
      </form>
      {!full && <button className="rate-expand text-button" type="button" onClick={onExpand}>Открыть карточку <span aria-hidden="true">↗</span></button>}
    </article>
  )
}

export function Finder({ initialQuery, estimates, target, onAdd, onBack }: {
  initialQuery: string; estimates: Estimate[]; target?: Estimate; onAdd: (position: Position, id?: string) => void; onBack: () => void
}) {
  const [city, setCity] = useState<City>(target?.city ?? 'Казань')
  const [query, setQuery] = useState(initialQuery)
  const [submitted, setSubmitted] = useState(initialQuery)
  const [kind, setKind] = useState('Все')
  const [selected, setSelected] = useState<CatalogEntry | null>(null)
  const [full, setFull] = useState(false)
  const results = submitted.trim() ? findRates(submitted) : []
  const filtered = results.filter((item) => kind === 'Все' || kind === item.kind)
  const item = selected ?? filtered[0]

  function submit(value: string) {
    setQuery(value)
    setSubmitted(value)
    setSelected(null)
    setKind('Все')
    setFull(false)
  }

  const card = item ? <RateCard key={item.name} item={item} city={city} estimates={estimates} targetId={target?.id} full={full} onAdd={onAdd} onExpand={() => setFull(true)} /> : null
  if (full && item) {
    return <section className="finder-details"><button type="button" className="text-button back" onClick={() => setFull(false)}>← К результатам поиска</button>{card}</section>
  }

  return (
    <div className="finder">
      {target && <div className="breadcrumbs"><button type="button" className="text-button" onClick={onBack}>← {target.title}</button></div>}
      <header className="page-header between">
        <div><h1>{target ? 'Добавить позицию' : 'Подбор расценок'}</h1><p>Опишите работу своими словами или введите название материала.</p></div>
        {!target && <label className="inline-field">Регион <select value={city} onChange={(event) => setCity(event.target.value as City)}>{cities.map((name) => <option key={name}>{name}</option>)}</select></label>}
      </header>
      <section className="finder-search">
        <QueryBox value={query} onChange={setQuery} onSearch={submit} />
        <div className="query-examples"><span>Попробуйте</span>{examples.map((example) => <button type="button" key={example} onClick={() => submit(example)}>{example}</button>)}</div>
      </section>
      {submitted && results.length ? <div className="finder-grid">
        <section className="finder-results">
          <div className="between results-heading"><div><h2>Результаты</h2><p className="muted">По запросу «{submitted}» · {filtered.length} поз.</p></div></div>
          <div className="result-filters">{['Все', 'Работы', 'Материалы'].map((label) => <button type="button" key={label} aria-pressed={kind === label} onClick={() => { setKind(label); setSelected(null) }}>{label}</button>)}</div>
          <div className="match-list">
            {filtered.map((result) => <button type="button" className="match" key={result.name} aria-pressed={item === result} onClick={() => setSelected(result)}>
              <span className="match-body"><code>{rateCode(result)}</code><strong>{result.name}</strong><small>{result.kind} · {result.group}</small></span>
              <span className="match-price"><strong>{money(result.rate * 100)}</strong><small>за {result.unit}</small></span>
            </button>)}
            {!filtered.length && <p className="empty">В выбранной категории совпадений нет.</p>}
          </div>
        </section>
        {card}
      </div> : submitted ? <div className="panel finder-empty"><h2>Совпадений нет</h2><p>Попробуйте указать материал, вид работы или синоним.</p></div> : (
        <div className="finder-categories">
          {[['Основание и бетон', 'бетон', 'Материалы и работы по устройству основания'], ['Земляные работы', 'земляные', 'Разработка грунта и подготовка участка'], ['Отделка', 'окраска', 'Окраска, грунтование и штукатурка']].map(([title, prompt, detail]) => (
            <button key={title} type="button" onClick={() => submit(prompt)}><strong>{title}</strong><span>{detail}</span><span aria-hidden="true">↗</span></button>
          ))}
        </div>
      )}
    </div>
  )
}
