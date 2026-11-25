import { useEffect, useRef, useState } from 'react'
import type { CatalogEntry, offers } from './catalog'
import { cities, money, type City } from './estimate'
import { findRates } from './finder'
import { historyMaterials, lowestMonths, priceHistory, supplierProfiles, type PricePoint } from './market'

const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' })
const dateLabel = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const axisLabel = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })
const periods = [3, 6, 12, 24] as const
const chartStart = 63
const chartEnd = 18

type HistorySeries = { material: CatalogEntry; points: PricePoint[]; color: string; dashed?: boolean }

function HistoryChart({ series, selected, onSelect }: { series: HistorySeries[]; selected: number; onSelect: (index: number) => void }) {
  const points = series[0].points
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const chart = element
    function draw() {
      const { width, height } = chart.getBoundingClientRect()
      if (!width || !height) return
      const context = chart.getContext('2d')
      if (!context) return
      const scale = window.devicePixelRatio || 1
      chart.width = Math.round(width * scale)
      chart.height = Math.round(height * scale)
      context.scale(scale, scale)

      const prices = series.flatMap((line) => line.points.map((point) => point.price))
      const minimum = Math.min(...prices)
      const maximum = Math.max(...prices)
      const margin = Math.max((maximum - minimum) * .14, minimum * .012, 100)
      const floor = Math.max(0, minimum - margin)
      const ceil = maximum + margin
      const top = 13
      const bottom = height - 32
      const x = (index: number) => chartStart + index / Math.max(1, points.length - 1) * (width - chartStart - chartEnd)
      const y = (value: number) => bottom - (value - floor) / (ceil - floor) * (bottom - top)
      context.font = '11px system-ui, sans-serif'
      context.fillStyle = '#666b60'
      context.textAlign = 'right'
      context.textBaseline = 'middle'
      for (let tick = 0; tick <= 4; tick++) {
        const value = floor + (ceil - floor) * tick / 4
        const row = y(value)
        context.strokeStyle = '#e4e1d5'
        context.beginPath()
        context.moveTo(chartStart, row)
        context.lineTo(width - chartEnd, row)
        context.stroke()
        context.fillText(axisLabel.format(Math.round(value / 100)), chartStart - 8, row)
      }
      const labelCount = width < 510 ? 3 : 5
      const labels = [...new Set(Array.from({ length: labelCount }, (_, index) =>
        Math.round(index * (points.length - 1) / (labelCount - 1))))]
      context.textAlign = 'center'
      for (const index of labels) context.fillText(dateLabel.format(points[index].date).replace(' г.', ''), Math.max(38, Math.min(width - 38, x(index))), height - 13)

      if (series.length === 1) {
        context.beginPath()
        context.moveTo(x(0), y(points[0].price))
        points.forEach((point, index) => context.lineTo(x(index), y(point.price)))
        context.lineTo(x(points.length - 1), bottom)
        context.lineTo(x(0), bottom)
        context.closePath()
        const gradient = context.createLinearGradient(0, top, 0, bottom)
        gradient.addColorStop(0, '#bc562836')
        gradient.addColorStop(1, '#bc562808')
        context.fillStyle = gradient
        context.fill()
      }

      if (points[selected]) {
        context.strokeStyle = '#aeaa9c'
        context.lineWidth = 1
        context.setLineDash([3, 4])
        context.beginPath()
        context.moveTo(x(selected), top)
        context.lineTo(x(selected), bottom)
        context.stroke()
      }
      for (const line of series) {
        context.setLineDash(line.dashed ? [6, 4] : [])
        context.beginPath()
        line.points.forEach((point, index) => index ? context.lineTo(x(index), y(point.price)) : context.moveTo(x(index), y(point.price)))
        context.strokeStyle = line.color
        context.lineWidth = 2.5
        context.lineJoin = 'round'
        context.stroke()
        context.setLineDash([])
        if (line.points[selected]) {
          context.beginPath()
          context.arc(x(selected), y(line.points[selected].price), 4.5, 0, 2 * Math.PI)
          context.fillStyle = line.color
          context.fill()
        }
      }

    }
    draw()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(draw) : undefined
    observer?.observe(chart)
    window.addEventListener('resize', draw)
    return () => { observer?.disconnect(); window.removeEventListener('resize', draw) }
  }, [points, selected, series])

  const point = points[selected] ?? points[points.length - 1]
  return <div className="history-graph">
    <canvas ref={canvas} aria-hidden="true" onPointerMove={(event) => {
      const box = event.currentTarget.getBoundingClientRect()
      if (box.width <= chartStart + chartEnd) return
      const fraction = (event.clientX - box.left - chartStart) / (box.width - chartStart - chartEnd)
      onSelect(Math.max(0, Math.min(points.length - 1, Math.round(fraction * (points.length - 1)))))
    }} />
    <div className="history-scrubber">
      <input type="range" min="0" max={points.length - 1} value={selected} aria-label="Месяц на графике" aria-valuetext={[dateLabel.format(point.date), ...series.map((line) => `${line.material.name}: ${money(line.points[selected].price)}`)].join(', ')} onChange={(event) => onSelect(Number(event.target.value))} />
      <output><span>{dateLabel.format(point.date)}</span>{series.map((line) => <strong key={line.material.name} style={{ color: line.color }}>{line.material.name} · {money(line.points[selected].price)}</strong>)}</output>
    </div>
  </div>
}

function MaterialSearch({ label, options, onSelect }: {
  label: string; options: CatalogEntry[]; onSelect: (item: CatalogEntry) => void
}) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase().replaceAll('ё', 'е')
  const matches = term ? [...new Set([
    ...findRates(search).filter((item) => options.includes(item)),
    ...options.filter((item) => item.name.toLowerCase().replaceAll('ё', 'е').includes(term)),
  ])] : []

  function select(item: CatalogEntry) {
    onSelect(item)
    setSearch('')
  }

  return <div className="material-search">
    <form onSubmit={(event) => { event.preventDefault(); if (matches[0]) select(matches[0]) }}>
      <label className="field">{label}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setSearch('') }} placeholder="Например, бетон В25" /></label>
    </form>
    {search.trim() && (matches.length ? <ul className="material-results" aria-label={`Результаты · ${label}`}>
      {matches.map((item) => <li key={item.name}><button type="button" onClick={() => select(item)}><strong>{item.name}</strong><small>₽ за {item.unit}</small></button></li>)}
    </ul> : <p className="muted material-empty" role="status">Подходящих материалов не найдено.</p>)}
  </div>
}

export function PriceHistory({ initialMaterial, initialCity, onBack, backLabel }: {
  initialMaterial?: string; initialCity?: City; onBack?: () => void; backLabel?: string
}) {
  const [item, setItem] = useState(initialMaterial ?? 'Бетон В25')
  const [comparison, setComparison] = useState<CatalogEntry | null>(null)
  const [adding, setAdding] = useState(false)
  const [city, setCity] = useState<City>(initialCity ?? 'Казань')
  const [period, setPeriod] = useState<typeof periods[number]>(12)
  const [pointIndex, setPointIndex] = useState<number | null>(null)
  const material = historyMaterials.find((option) => option.name === item)
  const selectedSeries: HistorySeries[] = []
  if (material) selectedSeries.push({ material, points: priceHistory(material, city).slice(-period), color: '#a64122' })
  if (comparison) selectedSeries.push({ material: comparison, points: priceHistory(comparison, city).slice(-period), color: '#2c6855', dashed: true })
  const series = selectedSeries.filter((line) => line.points.length)
  const comparisonOptions = historyMaterials.filter((candidate) => candidate.unit === material?.unit && candidate !== material && candidate !== comparison)
  const change = (value: typeof periods[number]) => { setPeriod(value); setPointIndex(null) }

  function selectMaterial(value: CatalogEntry) {
    setItem(value.name)
    setAdding(false)
    setPointIndex(null)
    if (comparison === value || comparison?.unit !== value.unit) setComparison(null)
  }

  return <>
    {onBack && <div className="breadcrumbs"><button type="button" className="text-button" onClick={onBack}>{backLabel ?? '← К предложениям в смете'}</button></div>}
    <header className="page-header"><h1>История цен</h1><p>Найдите материал и сравните цены по месяцам в одном городе.</p></header>
    <section className="panel price-history" aria-label="Цена материала по месяцам">
      <div className="history-filters">
        <MaterialSearch label="Поиск материала" options={historyMaterials} onSelect={selectMaterial} />
        <label className="field">Город<select value={city} onChange={(event) => { setCity(event.target.value as City); setPointIndex(null) }}>
          {cities.map((option) => <option key={option}>{option}</option>)}
        </select></label>
        <div className="history-period">
          <span>Период</span>
          <div className="mode" aria-label="Период истории">{periods.map((value) => <button type="button" key={value} aria-pressed={value === period} onClick={() => change(value)}>{value} мес.</button>)}</div>
        </div>
      </div>
      <div className="history-selection">
        <span className="history-chip"><i aria-hidden="true" />{item}</span>
        {comparison && <span className="history-chip history-chip-compare"><i aria-hidden="true" />{comparison.name}
          <button type="button" aria-label={`Убрать из сравнения: ${comparison.name}`} onClick={() => setComparison(null)}>×</button>
        </span>}
        {comparisonOptions.length > 0 && <button type="button" className="text-button" aria-expanded={adding} onClick={() => setAdding(!adding)}>
          {adding ? 'Закрыть поиск' : comparison ? 'Заменить материал для сравнения' : '＋ Добавить к сравнению'}
        </button>}
      </div>
      {adding && comparisonOptions.length > 0 && <div className="history-compare-search">
        <MaterialSearch label={`Поиск для сравнения · ₽ за ${material?.unit}`} options={comparisonOptions} onSelect={(value) => { setComparison(value); setAdding(false); setPointIndex(null) }} />
      </div>}
      {selectedSeries.filter((line) => !line.points.length).map((line) =>
        <p key={line.material.name} className="history-source muted">{line.material.name} · в этом городе нет наблюдений.</p>
      )}

      {series.length ? <>
        {series.map((line) => {
          const first = line.points[0]
          const latest = line.points[line.points.length - 1]
          const minimum = line.points.reduce((low, point) => point.price < low.price ? point : low)
          const percent = (latest.price - first.price) / first.price * 100
          const trend = new Intl.NumberFormat('ru-RU', { signDisplay: 'exceptZero', maximumFractionDigits: 1 }).format(percent) + ' %'
          return <div className="history-summary" key={line.material.name} aria-label={line.material.name}>
            <div><span>Последняя цена ряда</span><strong style={{ color: line.color }}>{money(latest.price)}</strong><small>{line.material.name} · {dateLabel.format(latest.date)}</small></div>
            <div><span>Минимум периода</span><strong>{money(minimum.price)}</strong><small>{dateLabel.format(minimum.date)}</small></div>
            <div><span>Изменение за период</span><strong>{trend}</strong><small>от первого к последнему месяцу</small></div>
          </div>
        })}
        <HistoryChart series={series} selected={pointIndex ?? period - 1} onSelect={setPointIndex} />
        <aside className="history-interpretation">
          <strong>{period === 24 ? 'В какие месяцы цена была ниже' : 'Сравнение одинаковых месяцев'}</strong>
          {period === 24 ? <>
            {series.map((line) => <p key={line.material.name}><b>{line.material.name}</b> · {lowestMonths(line.points).map(({ month, average }) => `${monthLabel.format(new Date(Date.UTC(2026, month, 1)))} — ${money(average)}`).join(' · ')}</p>)}
            <p className="muted">Среднее по двум наблюдениям за каждый месяц.</p>
          </> : <button type="button" className="text-button" onClick={() => change(24)}>Посмотреть средние цены по месяцам за 2 года ↗</button>}
        </aside>
        <p className="history-source muted">Учебные данные, ₽ за {material?.unit}. Для вывода о сезонности нужны сопоставимые фактические цены за несколько лет.</p>
        <details className="history-values">
          <summary>Таблица цен по месяцам</summary>
          <div className="table-scroll"><table><thead><tr><th scope="col">Месяц</th>{series.map((line) => <th key={line.material.name} scope="col" className="number">{line.material.name}, ₽ за {line.material.unit}</th>)}</tr></thead>
            <tbody>{Array.from({ length: period }, (_, index) => period - 1 - index).map((index) => <tr key={index}><th scope="row">{dateLabel.format(series[0].points[index].date)}</th>
              {series.map((line) => <td key={line.material.name} className="number">{money(line.points[index].price)}</td>)}</tr>)}</tbody>
          </table></div>
        </details>
      </> : <p className="empty">{material ? 'Поищите другой материал или выберите другой город.' : 'Для этой позиции нет ряда цен. Найдите материал в учебном каталоге через поиск.'}</p>}
    </section>
  </>
}

export function SupplierCard({ offer, material, city, onClose }: {
  offer: ReturnType<typeof offers>[number]; material: CatalogEntry; city: City; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const profile = supplierProfiles[offer.name]

  return <dialog ref={dialog} className="supplier-dialog" onCancel={onClose} aria-labelledby="supplier-title">
    <div className="between"><h2 id="supplier-title">{offer.name}</h2><button type="button" className="icon-button" aria-label="Закрыть карточку поставщика" onClick={onClose}>×</button></div>
    <p className="muted">{city} · учебная карточка поставщика</p>
    <div className="supplier-quote">
      <div><span>{material.name}</span><strong>{money(offer.price * 100)} / {material.unit}</strong></div>
      <div><span>Прайс от {offer.date}</span><strong className={offer.stale ? 'warning' : undefined}>Действует до {offer.expires}</strong></div>
    </div>
    <section className="supplier-section">
      <h3>Поставка</h3><p>{profile.supply} {profile.quote}</p>
    </section>
    <section className="supplier-section">
      <h3>Проверка реквизитов</h3>
      <p>Реестр сопоставляется с поставщиком по ИНН или ОГРН. Учебному поставщику реквизиты не присвоены.</p>
      <div className="actions">
        <a href="https://egrul.nalog.ru/" target="_blank" rel="noreferrer">ЕГРЮЛ / ЕГРИП ↗</a>
        <a href="https://www.rusprofile.ru/" target="_blank" rel="noreferrer">Rusprofile ↗</a>
      </div>
    </section>
    <section className="supplier-section">
      <h3>Отзывы о поставке</h3>
      <p className="muted">Примеры заметок вымышлены. В рабочей карточке здесь будут площадка, дата и ссылка на оригинал.</p>
      <ul>{profile.notes.map((note) => <li key={note.topic}><strong>{note.topic}</strong><span>{note.text}</span></li>)}</ul>
    </section>
    <button type="button" onClick={onClose}>К предложениям</button>
  </dialog>
}
