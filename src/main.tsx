import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyMatch, matchedEntry, cities, confirmExcavation, estimateLines, money, newEstimate, number, price, revisePosition, sample, snapshot, strategies, summarize, withExampleCharges, type City, type Estimate, type Line, type Mode, type Position, type Strategy } from './estimate'
import { catalogEntry, detailedSample, projectExamples, type ProjectExample } from './catalog'
import { Directories, missingResource, PrintHeading, ProductOptions, Suppliers, type ShowFeature } from './product'
import { Finder } from './finder'
import { EstimateAssistant } from './assistant'
import { Matching } from './matching'
import { PriceHistory } from './market-ui'
import { Brand, Landing, Pricing } from './site'
import './style.css'

const storageKey = 'foundation-estimates-v2'
type Route = { page: 'home' | 'pricing' | 'finder' | 'estimates' | 'estimate' | 'new' | 'directories' | 'prices' | 'integrations' | 'settings'; id?: string; query?: string; material?: string; city?: City; row?: string }
function readRoute(): Route {
  const [path, query = ''] = location.hash.slice(1).split('?')
  const [page, id] = path.split('/').filter(Boolean)
  if (page === 'estimate' && id) {
    const params = new URLSearchParams(query)
    return { page, id, query: params.get('step') ?? undefined, material: params.get('material') ?? undefined, row: params.get('row') ?? undefined }
  }
  if (page === 'prices') {
    const params = new URLSearchParams(query)
    return { page, id: params.get('estimate') ?? undefined, material: params.get('material') ?? undefined, city: cities.find((city) => city === params.get('city')), row: params.get('row') ?? undefined }
  }
  if (page === 'finder') {
    const params = new URLSearchParams(query)
    return { page, id: params.get('estimate') ?? undefined, query: params.get('q') ?? undefined }
  }
  if (page === 'new') return { page, query: new URLSearchParams(query).get('method') ?? undefined }
  if (page === 'pricing' || page === 'estimates' || page === 'directories' || page === 'integrations' || page === 'settings') return { page }
  return { page: 'home' }
}
const stages = ['Спецификация', 'Подбор расценок', 'Расчёт и проверка', 'Предпросмотр', 'Замечания', 'Поставщики', 'История'] as const
type Stage = typeof stages[number]
const sampleSource = (source: string) => ({
  'Развёрнутая демонстрационная спецификация': 'Спецификация фундамента',
  'Демонстрационная спецификация': 'Спецификация фундамента',
  'Демонстрационный расчёт материалов': 'Ведомость материалов',
  'Демонстрационная смета после проверки': 'Ведомость объёмов работ',
  'Короткий пример': 'Спецификация фундамента',
})[source] ?? source

function restoreEstimate(estimate: Estimate): Estimate {
  return withExampleCharges({
    ...estimate, source: sampleSource(estimate.source),
    history: estimate.history?.map((version) => ({ ...version, data: withExampleCharges({ ...version.data, source: sampleSource(version.data.source) }) })),
  })
}

function restore(): Estimate[] {
  const expanded = { ...newEstimate('Фундамент дома', 'Спецификация фундамента', detailedSample, 'Казань'), id: 'foundation-kazan' }
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const data: unknown = JSON.parse(saved)
      if (Array.isArray(data)) return (data as Estimate[]).map(restoreEstimate)
    }
    const previous = localStorage.getItem('foundation-estimates-v1')
    if (previous) {
      const data: unknown = JSON.parse(previous)
      if (Array.isArray(data)) {
        const migrated = [expanded, ...data].map(restoreEstimate)
        localStorage.setItem(storageKey, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch {
    // The demo can still be used if browser storage is unavailable.
  }
  const samples: Estimate[] = [
    expanded,
    ...projectExamples.slice(1).map((project) => ({ ...newEstimate(project.title, project.source, project.positions, project.city), id: project.id })),
    {
      ...newEstimate('Ленточный фундамент', 'Ведомость материалов', detailedSample.slice(0, 17), 'Челябинск'),
      id: 'foundation-chelyabinsk',
      mode: 'Коммерческая',
    },
    {
      ...newEstimate('Фундамент коттеджа', 'Ведомость объёмов работ', detailedSample.slice(5, 17), 'Казань'),
      id: 'foundation-cottage',
    },
    { ...newEstimate('Фундамент частного дома', 'Спецификация фундамента', sample, 'Казань'), id: 'foundation-short' },
  ]
  return samples.map(restoreEstimate)
}

function Table({ label, children }: { label: string; children: ReactNode }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label}><table>{children}</table></div>
}

function Specification({ estimate, onVolume, onEdit }: { estimate: Estimate; onVolume: (index: number, volume: number) => void; onEdit: (index: number) => void }) {
  return (
    <Table label="Исходная спецификация">
      <thead><tr><th scope="col">№</th><th scope="col">Позиция</th><th scope="col">Раздел</th><th scope="col">Ед.</th><th scope="col" className="number">Объём</th><th scope="col">Действия</th></tr></thead>
      <tbody>{estimate.positions.map((position, index) => (
        <tr key={index}>
          <td className="muted">{index + 1}</td>
          <th scope="row">{position.name}</th>
          <td className="muted">{catalogEntry(position)?.group ?? 'Прочие позиции'}</td>
          <td>{position.unit}</td>
          <td className="number"><input key={position.quantity} className="volume-input" aria-label={`Объём: ${position.name}`} type="number" min="0.001" max="100000" step="0.001" defaultValue={position.quantity} onBlur={(event) => {
            if (event.currentTarget.validity.valid && event.currentTarget.valueAsNumber > 0) onVolume(index, event.currentTarget.valueAsNumber)
            else event.currentTarget.value = String(position.quantity)
          }} /></td>
          <td><button type="button" className="text-button" aria-label={`Редактировать: ${position.name}`} onClick={() => onEdit(index)}>Изменить</button></td>
        </tr>
      ))}</tbody>
    </Table>
  )
}

function PositionDialog({ position, onSave, onRemove, onClose }: {
  position: Position; onSave: (value: Position) => void; onRemove: () => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} onCancel={onClose}>
    <h2>Позиция спецификации</h2>
    <form className="position-form" onSubmit={(event) => {
      event.preventDefault()
      const fields = new FormData(event.currentTarget)
      const name = String(fields.get('name')).trim()
      const unit = String(fields.get('unit')).trim()
      const quantity = Number(fields.get('quantity'))
      if (name && unit && quantity > 0 && quantity <= 100_000) onSave({ name, unit, quantity })
    }}>
      <label className="field">Наименование<input name="name" defaultValue={position.name} required maxLength={200} autoFocus /></label>
      <div className="form-grid">
        <label className="field">Единица измерения<input name="unit" defaultValue={position.unit} required maxLength={16} /></label>
        <label className="field">Объём<input name="quantity" type="number" min="0.001" max="100000" step="0.001" defaultValue={position.quantity} required /></label>
      </div>
      <div className="actions"><button type="submit" className="primary">Сохранить позицию</button><button type="button" onClick={onClose}>Отмена</button><button type="button" className="text-button" onClick={onRemove}>Удалить позицию</button></div>
    </form>
  </dialog>
}

function ModeOverview({ estimate, onOpen }: { estimate: Estimate; onOpen: (mode: Mode) => void }) {
  return <section className="mode-overview" aria-label="Расчёты по спецификации">
    {(['Нормативная', 'Коммерческая'] as const).map((mode) => {
      const { total, issues, incomplete } = summarize(estimateLines({ ...estimate, mode }))
      return <button key={mode} type="button" className="mode-overview-card" onClick={() => onOpen(mode)}>
        <div className="between"><h2>{mode} смета</h2><strong>{money(total)}</strong></div>
        <p className="muted">{mode === 'Нормативная' ? 'Расценки из нормативного справочника' : `Прайсы, работы и доставка · ${estimate.city}`}</p>
        <div className="between"><small className={issues.length ? 'warning' : undefined}>{issues.length ? `${incomplete ? 'Неполный итог' : 'Предварительный итог'} · к проверке: ${issues.length}` : 'Готова к предпросмотру'}</small><span aria-hidden="true">↗</span></div>
      </button>
    })}
  </section>
}

function CalculationTable({ lines, preview, selectedKey, onSelect }: { lines: Line[]; preview: boolean; selectedKey?: string; onSelect: (key: string) => void }) {
  const groups = new Map<string, Line[]>()
  for (const line of lines) {
    const group = groups.get(line.group)
    if (group) group.push(line)
    else groups.set(line.group, [line])
  }
  return (
    <Table label={preview ? 'Предпросмотр сметы' : 'Расчётные позиции'}>
      <thead><tr><th scope="col">Позиция</th><th scope="col">Ед.</th><th scope="col" className="number">Объём</th><th scope="col" className="number">Цена за ед., ₽</th><th scope="col" className="number">Сумма, ₽</th>{!preview && <th scope="col">Проверка</th>}</tr></thead>
      {[...groups].map(([group, items]) => (
        <tbody key={group}>
          <tr className="group-row"><th scope="rowgroup" colSpan={preview ? 5 : 6}>{group}</th></tr>
          {items.map((line) => {
            const rate = price(line.value)
            return (
              <tr key={line.key} className={selectedKey === line.key && !preview ? 'selected-row' : undefined}>
                <th scope="row">
                  {preview ? (line.calculationName ?? line.name) : <button className="text-button" type="button" onClick={() => onSelect(line.key)}>{line.name}</button>}
                  {preview && <small className="row-detail">{line.calculationName && line.calculationName !== line.name && <>Из спецификации: {line.name} · </>}{line.basis}{line.issue && <> · {line.issue}</>}</small>}
                  {!preview && line.calculationName && line.calculationName !== line.name && <small className="row-detail">{line.calculationName}</small>}
                </th>
                <td>{line.unit}</td><td className="number">{number(line.quantity)}</td>
                <td className="number">{rate === null ? '—' : number(rate / 100)}</td><td className="number">{line.total === null ? '—' : number(line.total / 100)}</td>
                {!preview && <td><span className={line.issue ? 'warning' : 'muted'}>{line.issue || 'Учтено'}</span></td>}
              </tr>
            )
          })}
        </tbody>
      ))}
    </Table>
  )
}

function EditLine({ line, selectedRate, mode, onClose, onEdit, onConfirm, onAcceptPrice, onHistory }: {
  line: Line; selectedRate: number | null; mode: Estimate['mode']; onClose: () => void
  onEdit: (key: string, value: string) => void; onConfirm: (rate: number) => void; onAcceptPrice: () => void; onHistory?: () => void
}) {
  const [rate, setRate] = useState(selectedRate ?? 450)
  return (
    <aside className="inspector panel" aria-label="Детали позиции">
      <div className="between">
        <h3>{line.name}</h3><button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть детали">×</button>
      </div>
      <p className="muted">{number(line.quantity)} {line.unit}</p>
      {onHistory && <button type="button" className="text-button position-price-history" onClick={onHistory}>История цен ↗</button>}
      <dl><dt>Источник</dt><dd>{line.basis}</dd>
        {mode === 'Нормативная' && <><dt>Норматив</dt><dd>{line.basis.startsWith('Учебный') ? 'Учебная позиция · условная расценка' : 'Назначается сметчиком'}</dd><dt>Обоснование</dt><dd>{line.basis.startsWith('Учебный') ? (line.basis.startsWith('Учебный справочник · ') ? 'Соответствие выбрано сметчиком на шаге подбора.' : 'Совпали наименование и единица измерения.') : 'Расценка вводится вручную.'}</dd></>}
        {line.issue === 'Цена устарела' && <><dt>Последняя известная цена</dt><dd>{money((price(line.value) ?? 0))} · 10.11.2026</dd><dt>Срок действия</dt><dd>17.11.2026</dd></>}
      </dl>
      {line.issue === 'Цена устарела' && <button type="button" onClick={onAcceptPrice}>Подтвердить последнюю цену</button>}
      {line.excavation && (
        <form onSubmit={(event) => { event.preventDefault(); onConfirm(rate) }}>
          <p>В спецификации не указано, нужна ли погрузка грунта.</p>
          <fieldset>
            <legend>Выберите расценку</legend>
            <label><input type="radio" name="rate" checked={rate === 450} onChange={() => setRate(450)} /> Без погрузки · 450 ₽/м³</label>
            <label><input type="radio" name="rate" checked={rate === 520} onChange={() => setRate(520)} /> С погрузкой · 520 ₽/м³</label>
          </fieldset>
          <button className="primary" type="submit">Подтвердить расценку</button>
        </form>
      )}
      {line.editable && (
        <label className="field">Цена за единицу, ₽
          <input inputMode="decimal" value={line.value} onChange={(event) => onEdit(line.key, event.target.value)} aria-invalid={line.issue === 'Проверьте цену'} />
          {line.issue && line.issue !== 'Цена устарела' && <span className="warning" role="status">{line.issue === 'Проверьте цену' ? 'Введите сумму от 0 до 999 999,99 ₽.' : 'Укажите цену, чтобы включить позицию в расчёт.'}</span>}
        </label>
      )}
    </aside>
  )
}

function CreateEstimate({ onCreate, onCancel, fromBlank }: { onCreate: (estimate: Estimate) => void; onCancel: () => void; fromBlank?: boolean }) {
  const [title, setTitle] = useState<string>(fromBlank ? '' : projectExamples[0].title)
  const [city, setCity] = useState<City>(cities[0])
  const [method, setMethod] = useState<'Вручную' | 'Готовый пример'>(fromBlank ? 'Вручную' : 'Готовый пример')
  const [projectId, setProjectId] = useState(projectExamples[0].id)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selected = projectExamples.find((project) => project.id === projectId) ?? projectExamples[0]
    const source = method === 'Вручную' ? { name: 'Ручной ввод', positions: [] } : { name: selected.source, positions: selected.positions }
    if (title.trim()) {
      const estimate = newEstimate(title.trim(), source.name, source.positions, city)
      onCreate(method === 'Готовый пример' ? withExampleCharges(estimate) : estimate)
    }
  }

  function chooseExample(project: ProjectExample) {
    setProjectId(project.id)
    setTitle(project.title)
  }

  return (
    <>
      <button type="button" className="text-button back" onClick={onCancel}>← Мои сметы</button>
      <header className="page-header"><h1>Новая смета</h1><p>Укажите объект и выберите, откуда взять позиции. Подбор и проверка доступны после создания.</p></header>
      <ol className="create-steps" aria-label="Порядок подготовки сметы"><li aria-current="step">Объект и данные</li><li>Подбор расценок</li><li>Проверка и расчёт</li><li>Готовая смета</li></ol>
      <form className="panel create-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">Название сметы<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, фундамент частного дома" required maxLength={120} /></label>
          <label className="field">Регион цен<select value={city} onChange={(event) => setCity(event.target.value as City)}>{cities.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        <div className="upload">
          <h2>Как начать?</h2>
          <div className="start-methods" aria-label="Исходные данные">
            {(['Готовый пример', 'Вручную'] as const).map((option) => (
              <button key={option} type="button" aria-pressed={method === option} onClick={() => {
                setMethod(option)
                if (option === 'Готовый пример') chooseExample(projectExamples.find((project) => project.id === projectId) ?? projectExamples[0])
              }}>{option}</button>
            ))}
          </div>
          {method === 'Вручную' && <p className="muted">Начните с пустой сметы. Поиск предложит варианты по вашему описанию работы. Вы выберете позицию и укажете объём.</p>}
          {method === 'Готовый пример' && <label className="field example-select">Объект<select value={projectId} onChange={(event) => {
            const selected = projectExamples.find((project) => project.id === event.target.value)
            if (selected) chooseExample(selected)
          }}>{projectExamples.map((project) => <option key={project.id} value={project.id}>{project.label} · {project.positions.length} поз.</option>)}</select></label>}
        </div>
        <div className="actions"><button className="primary" type="submit" disabled={!title.trim()}>Создать смету</button><button type="button" onClick={onCancel}>Отмена</button></div>
      </form>
    </>
  )
}

const toolbarIcons = {
  'Переименовать': <><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" /></>,
  'Поделиться': <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.7 7.6-4.4m-7.6 7 7.6 4.4" /></>,
  'Закрыть смету': <path d="m6 6 12 12M18 6 6 18" />,
}

function ToolbarButton({ label, onClick }: { label: keyof typeof toolbarIcons; onClick: () => void }) {
  return <button type="button" className="toolbar-icon" aria-label={label} title={label} onClick={onClick}>
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{toolbarIcons[label]}</svg>
  </button>
}

function Workspace({ estimate, onChange, onClose, onFind, onHistory, show, notice, initialStage, initialMaterial, initialRow }: {
  estimate: Estimate; onChange: (patch: Partial<Estimate>) => void; onClose: () => void; onFind: () => void; show: ShowFeature; notice?: string; initialStage?: Stage
  onHistory: (material: string, city: City, row?: string) => void; initialMaterial?: string; initialRow?: string
}) {
  const [stage, setStage] = useState<Stage>(initialStage ?? 'Спецификация')
  const [row, setRow] = useState<string | null>(initialRow ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(false)
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const [editingPosition, setEditingPosition] = useState<number | null>(null)
  const [matchingRow, setMatchingRow] = useState<number | undefined>(undefined)
  const preview = stage === 'Предпросмотр'
  const lines = estimateLines(estimate)
  const commercial = estimate.mode === 'Коммерческая'
  const commercialLines = commercial ? lines : estimateLines({ ...estimate, mode: 'Коммерческая' })
  const selected = lines.find((line) => line.key === row)
  const { issues, total, incomplete } = summarize(lines)
  const totalLabel = incomplete ? 'Неполный итог' : issues.length ? 'Предварительный итог' : 'Итого'
  const visible = lines.filter((line) => (!filter || line.issue) && (line.name + ' ' + line.group).toLowerCase().includes(query.trim().toLowerCase()))
  const versions = estimate.history ?? []
  const advisory = missingResource(estimate)

  const [priceComparison, setPriceComparison] = useState<{ before: Estimate; positions: Estimate['positions'] }>()
  function changePrices(patch: Partial<Estimate>) {
    setPriceComparison({ before: estimate, positions: estimate.positions })
    onChange(patch)
  }

  function editLine(key: string, value: string, supplier?: string) {
    if (commercial || stage === 'Поставщики') {
      changePrices({
        prices: { ...estimate.prices, [estimate.city]: { ...estimate.prices[estimate.city], [key]: value } },
        suppliers: { ...estimate.suppliers, [estimate.city]: { ...estimate.suppliers?.[estimate.city], [key]: supplier ?? 'Ручной ввод' } },
      })
    } else {
      onChange({ rates: { ...estimate.rates, [key]: value } })
    }
  }

  function changeStage(next: Stage) {
    setStage(next)
    setRow(null)
    setMatchingRow(undefined)
  }

  function openCalculation(mode: Mode) {
    if (estimate.mode !== mode) onChange({ mode })
    changeStage('Расчёт и проверка')
  }

  function openIssue(key: string) {
    setStage('Расчёт и проверка')
    setQuery('')
    setFilter(false)
    setRow(key)
  }

  function saveVersion() {
    onChange({ history: [{ label: new Date().toLocaleString('ru-RU'), data: snapshot(estimate) }, ...versions] })
  }

  function exportEstimate() {
    if (commercial) {
      show('Выгрузка коммерческой сметы в Excel', 'В разработке. Пока можно открыть предпросмотр и сохранить смету в PDF через печать браузера.')
    } else if (issues.length) {
      show('Сначала проверьте смету', `Перед экспортом в ГРАНД-Смету нужно обработать все замечания. Осталось позиций: ${issues.length}. Откройте вкладку «Замечания». Файловая интеграция в разработке.`)
    } else {
      show('Экспорт в ГРАНД-Смету', 'В разработке. Формат файла локальной сметы будет выбран после проверки импорта в ГРАНД-Смету.')
    }
  }

  const citySelect = <label className="inline-field">Регион цен <select value={estimate.city} onChange={(event) => { changePrices({ city: event.target.value as City }); setRow(null) }}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
  const modeSelect = <div className="mode" aria-label="Режим расчёта">
    {(['Нормативная', 'Коммерческая'] as const).map((mode) => <button key={mode} type="button" aria-pressed={estimate.mode === mode} onClick={() => { onChange({ mode }); setRow(null) }}>{mode}</button>)}
  </div>

  return (
    <>
      <div className="breadcrumbs"><button type="button" className="text-button" onClick={onClose}>Мои сметы</button><span aria-hidden="true"> / </span><span>Карточка сметы</span></div>
      <header className="page-header between">
        <div><h1>{estimate.title}</h1><p>{estimate.source} · Регион цен: {estimate.city}</p></div>
        <div className="actions">
          <button className="primary" type="button" onClick={onFind}>＋ Добавить позицию</button>
          <EstimateAssistant estimate={estimate} selected={row}
            previous={priceComparison?.positions === estimate.positions ? priceComparison.before : undefined}
            onApply={(key, rate) => onChange(confirmExcavation(estimate, key, rate))}
            onOpen={(mode, key) => { onChange({ mode }); openIssue(key) }} />
          <ToolbarButton label="Переименовать" onClick={() => setTitleDraft(estimate.title)} />
          <ToolbarButton label="Поделиться" onClick={() => show('Совместный доступ', 'В разработке. Предоставление доступа к смете потребует общей учётной записи.')} />
          <ToolbarButton label="Закрыть смету" onClick={onClose} />
        </div>
      </header>
      {notice && <p className="success-notice" role="status">{notice}</p>}
      {titleDraft !== null && <form className="panel rename-form" onSubmit={(event) => {
        event.preventDefault()
        if (titleDraft.trim()) { onChange({ title: titleDraft.trim() }); setTitleDraft(null) }
      }}>
        <label className="field">Название сметы<input autoFocus value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} maxLength={120} required /></label>
        <button className="primary" type="submit" disabled={!titleDraft.trim()}>Сохранить</button>
        <button type="button" onClick={() => setTitleDraft(null)}>Отмена</button>
      </form>}
      <nav className="stages" aria-label="Этапы подготовки сметы">
        {stages.map((name) => <button key={name} type="button" aria-current={stage === name ? 'step' : undefined} onClick={() => changeStage(name)}>
          {name === 'Спецификация' ? '1. Спецификация' : name === 'Подбор расценок' ? '2. Подбор' : name === 'Расчёт и проверка' ? '3. Расчёт и проверка' : name === 'Предпросмотр' ? '4. Предпросмотр' : name}{name === 'Замечания' && issues.length > 0 && <span className="tab-count"> {issues.length}</span>}
        </button>)}
      </nav>

      {stage === 'Спецификация' && (
        <>
          {estimate.positions.length > 0 && <ModeOverview estimate={estimate} onOpen={openCalculation} />}
          <section className="panel">
            <div className="panel-heading between">
              <div><h2>Исходная спецификация</h2><p>{estimate.positions.length ? `Позиций: ${estimate.positions.length}. Объём можно уточнить в таблице.` : 'В смете пока нет позиций.'}</p></div>
              <button className="primary" type="button" onClick={estimate.positions.length ? () => changeStage('Подбор расценок') : onFind}>{estimate.positions.length ? 'Подобрать расценки' : 'Подобрать первую позицию'}</button>
            </div>
            {!estimate.positions.length && <p className="empty">Добавьте работы и материалы через подбор расценок.</p>}
            <Specification estimate={estimate} onEdit={setEditingPosition} onVolume={(index, quantity) => {
              const position = estimate.positions[index]
              if (position.quantity !== quantity) onChange(revisePosition(estimate, index, { ...position, quantity }))
            }} />
          </section>
          {editingPosition !== null && <PositionDialog position={estimate.positions[editingPosition]} onClose={() => setEditingPosition(null)}
            onSave={(position) => { onChange(revisePosition(estimate, editingPosition, position)); setEditingPosition(null) }}
            onRemove={() => {
              if (window.confirm('Удалить эту позицию из спецификации и обоих расчётов?')) {
                onChange(revisePosition(estimate, editingPosition))
                setEditingPosition(null)
              }
            }} />}
        </>
      )}

      {stage === 'Подбор расценок' && <Matching estimate={estimate} initialRow={matchingRow}
        onExcavation={(key, rate) => onChange(confirmExcavation(estimate, key, rate))}
        onMatch={(key, name) => onChange(applyMatch(estimate, key, name))}
        onStrategy={(strategy) => onChange({ strategy })}
        onContinue={() => changeStage('Расчёт и проверка')} />}

      {(stage === 'Расчёт и проверка' || preview) && (
        <>
          <div className="calculation-toolbar">
            {modeSelect}
            <div className="actions">
              {commercial && citySelect}
              {!preview && !commercial && <label className="inline-field">Подбор расценок <select value={estimate.strategy ?? 'Полуавтоматический'} onChange={(event) => { onChange({ strategy: event.target.value as Strategy }); setRow(null) }}>{strategies.map((strategy) => <option key={strategy}>{strategy}</option>)}</select></label>}
              <button type="button" onClick={exportEstimate}>Экспорт</button>
              {preview && <button type="button" className="primary" onClick={() => window.print()}>Печать / PDF</button>}
            </div>
          </div>
          <div className={selected && !preview ? 'work-grid' : ''}>
            <section className={'panel calculation' + (preview ? ' print-document' : '')}>
              {preview && <PrintHeading estimate={estimate} />}
              {!preview && <div className="panel-heading between">
                <div><h2>Позиции сметы</h2><p>{lines.length} позиций · учебный каталог</p></div>
                <div className="actions">
                  <input type="search" aria-label="Поиск по смете" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти позицию" />
                  <button type="button" aria-pressed={filter} className={filter ? 'issue-button' : undefined} onClick={() => setFilter(!filter)}>Только с замечаниями {issues.length ? `(${issues.length})` : ''}</button>
                </div>
              </div>}
              {!preview && !commercial && <p className="strategy-note muted">
                {estimate.strategy === 'Ручной' ? 'Расценки назначает сметчик.' : estimate.strategy === 'Автоматический' ? 'Справочник подставляет совпадения. Неоднозначный вариант требует подтверждения.' : 'Справочник предлагает совпадения, а сметчик проверяет источник и спорные позиции.'}
              </p>}
              <CalculationTable lines={preview ? lines : visible} preview={preview} selectedKey={row ?? undefined} onSelect={setRow} />
              {!preview && !visible.length && <p className="empty">По выбранным условиям позиций нет.</p>}
              {commercial && <details className="labor-detail" open={preview || undefined}>
                <summary>Состав строки «Стоимость работ»</summary>
                <ul>{estimate.positions.map((position, index) => matchedEntry(estimate, index)?.kind === 'Работы' &&
                  <li key={index}>{position.name} <span>{number(position.quantity)} {position.unit}</span></li>)}</ul>
                <small>Сумма за работы вводится вручную для выбранного региона цен.</small>
              </details>}
              <div className="total" aria-live="polite"><span>{totalLabel}</span><strong>{money(total)}</strong></div>
            </section>
            {selected && !preview && (
              <EditLine key={selected.key} line={selected} mode={estimate.mode} selectedRate={estimate.excavation[selected.key] ?? null} onClose={() => setRow(null)} onEdit={editLine}
                onHistory={estimate.positions[Number(selected.key)] ? () => onHistory(matchedEntry(estimate, Number(selected.key))?.name ?? selected.name, estimate.city, selected.key) : undefined}
                onAcceptPrice={() => editLine(selected.key, selected.value, 'Поставщик 01')}
                onConfirm={(rate) => onChange(confirmExcavation(estimate, selected.key, rate))} />
            )}
          </div>
          {!preview && <div className="actions footer-actions"><button type="button" onClick={saveVersion}>Сохранить версию</button><button className="primary" type="button" onClick={() => changeStage('Предпросмотр')}>Открыть предпросмотр</button></div>}
        </>
      )}

      {stage === 'Замечания' && (
        <section className="panel">
          <div className="panel-heading between"><div><h2>Проверка сметы</h2><p>{issues.length ? `Требуют внимания: ${issues.length}` : 'Незаполненных цен и неподтверждённых позиций нет.'}</p></div>{modeSelect}</div>
          {issues.map((line) => <div key={line.key} className="between option"><div><h3>{line.name}</h3><p className="warning">{line.issue}</p></div>
            <div className="actions">
              {line.needsMatch && <button type="button" onClick={() => { changeStage('Подбор расценок'); setMatchingRow(Number(line.key)) }}>Подобрать расценку</button>}
              <button type="button" onClick={() => openIssue(line.key)}>{line.needsMatch ? 'Ввести вручную' : 'Исправить'}</button>
            </div>
          </div>)}
          {advisory && <div className="option"><h3>Возможный пропуск</h3><p>{advisory}</p></div>}
        </section>
      )}

      {stage === 'Поставщики' && (
        <>
          <div className="calculation-toolbar between"><p className="muted">Выбранная цена сразу учитывается в коммерческой смете.</p>{citySelect}</div>
          <Suppliers estimate={estimate} lines={commercialLines} onChoose={editLine} onHistory={onHistory} initialMaterial={initialMaterial} />
        </>
      )}

      {stage === 'История' && (
        <section className="panel">
          <div className="panel-heading between"><div><h2>Версии сметы</h2><p>Сохраните снимок перед изменениями, чтобы вернуться к нему.</p></div><button className="primary" type="button" onClick={saveVersion}>Сохранить версию</button></div>
          {versions.length ? versions.map((version, index) => <div key={index} className="between option">
            <div><h3>{version.label}</h3><p className="muted">{version.data.mode} смета · {version.data.city} · {version.data.positions.length} исходных позиций</p></div>
            <button type="button" onClick={() => {
              if (window.confirm('Восстановить выбранную версию? Текущее состояние сохранится в истории.')) {
                onChange({ ...version.data, history: [{ label: new Date().toLocaleString('ru-RU'), data: snapshot(estimate) }, ...versions] })
              }
            }}>Восстановить</button>
          </div>) : <p className="empty">Сохранённых версий пока нет.</p>}
        </section>
      )}
    </>
  )
}

function FeatureDialog({ feature, close }: { feature: { title: string; message: string }; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  return <dialog ref={dialog} onCancel={close}><h2>{feature.title}</h2><p>{feature.message}</p><button autoFocus type="button" className="primary" onClick={close}>Понятно</button></dialog>
}

function App() {
  const [estimates, setEstimates] = useState(restore)
  const [route, setRoute] = useState(readRoute)
  const [storageError, setStorageError] = useState(false)
  const [query, setQuery] = useState('')
  const [feature, setFeature] = useState<{ title: string; message: string } | null>(null)
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null)
  const estimate = estimates.find((item) => item.id === route.id)
  const inside = ['estimates', 'estimate', 'new', 'directories', 'prices', 'integrations', 'settings'].includes(route.page)
  const visible = estimates.filter((item) => (item.title + ' ' + item.city + ' ' + item.source).toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    const sync = () => { setRoute(readRoute()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  function go(hash: string) {
    if (location.hash !== hash) location.hash = hash
    setRoute(readRoute())
  }

  function find(query: string, id?: string) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (id) params.set('estimate', id)
    go('#/finder' + (params.size ? '?' + params : ''))
  }

  const show: ShowFeature = (title, message) => setFeature({ title, message })

  function save(items: Estimate[]) {
    setEstimates(items)
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function open(id: string, showMatching = false) {
    go('#/estimate/' + id + (showMatching ? '?step=match' : ''))
  }

  function openPriceHistory(material: string, city: City, id: string, row?: string) {
    const params = new URLSearchParams({ material, city, estimate: id })
    if (row !== undefined) params.set('row', row)
    go('#/prices?' + params)
  }

  function openExample(project: ProjectExample, showMatching = false) {
    const example = estimates.find((item) => item.id === project.id)
    if (example) open(example.id, showMatching)
    else {
      const item = withExampleCharges({ ...newEstimate(project.title, project.source, project.positions, project.city), id: project.id })
      save([item, ...estimates])
      open(item.id, showMatching)
    }
  }

  function addPosition(position: Position, id?: string) {
    const target = estimates.find((item) => item.id === id)
    const item = target ?? newEstimate('Новая смета', 'Подбор расценок', [], 'Казань')
    if (item.positions.length >= 500) {
      show('Достигнут лимит сметы', 'В смете может быть до 500 исходных позиций.')
      return false
    }
    const updated = { ...item, positions: [...item.positions, position], updated: new Date().toISOString() }
    save(target ? estimates.map((current) => current.id === target.id ? updated : current) : [updated, ...estimates])
    setNotice({ id: item.id, text: `В смету добавлено: ${position.name}, ${number(position.quantity)} ${position.unit}.` })
    open(item.id)
    return true
  }

  function remove(item: Estimate) {
    if (window.confirm(`Удалить смету «${item.title}»?`)) save(estimates.filter((current) => current.id !== item.id))
  }

  const spaces = [
    ['Сметы', 'estimates'], ['Справочники', 'directories'], ['История цен', 'prices'], ['Интеграции', 'integrations'], ['Настройки', 'settings'],
  ] as const

  return (
    <div className={inside ? 'workspace-site' : 'public-site'}>
      <header className="topbar">
        <div className="topbar-inner">
          <Brand onClick={() => go('#/')} />
          <nav aria-label="Основные разделы">
            <button type="button" aria-current={route.page === 'home' ? 'page' : undefined} onClick={() => go('#/')}>Продукт</button>
            <button type="button" aria-current={route.page === 'finder' ? 'page' : undefined} onClick={() => find('')}>Подбор расценок</button>
            <button type="button" aria-current={route.page === 'pricing' ? 'page' : undefined} onClick={() => go('#/pricing')}>Тарифы</button>
          </nav>
          <button type="button" className="cabinet-button" onClick={() => go('#/estimates')}>Кабинет <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      {inside && <div className="appbar"><nav aria-label="Разделы кабинета">
        {spaces.map(([label, page]) => <button key={page} type="button" aria-current={(route.page === page || (page === 'estimates' && ['estimate', 'new'].includes(route.page))) ? 'page' : undefined} onClick={() => go('#/' + page)}>{label}</button>)}
      </nav></div>}
      <main className={'main-' + route.page}>
        {storageError && <p className="warning alert" role="alert">Браузер не сохранил изменения. Оставьте страницу открытой, чтобы продолжить работу.</p>}
        {route.page === 'home' && <Landing onCreate={(fromBlank) => go('#/new' + (fromBlank ? '?method=manual' : ''))} onExample={openExample} onSearch={find} onPricing={() => go('#/pricing')} />}
        {route.page === 'pricing' && <Pricing openWorkspace={() => go('#/estimates')} show={show} />}
        {route.page === 'finder' && <Finder key={route.id + ':' + route.query} initialQuery={route.query ?? ''} estimates={estimates} target={estimate} onAdd={addPosition} onBack={() => estimate ? open(estimate.id) : go('#/estimates')} />}
        {route.page === 'directories' && <Directories show={show} />}
        {route.page === 'prices' && <PriceHistory key={route.material + ':' + route.city} initialMaterial={route.material} initialCity={route.city} backLabel={route.row !== undefined ? '← К позиции сметы' : undefined} onBack={estimate ? () => {
          const params = new URLSearchParams({ step: route.row === undefined ? 'suppliers' : 'calculation', material: route.material ?? '' })
          if (route.row !== undefined) params.set('row', route.row)
          go('#/estimate/' + estimate.id + '?' + params)
        } : undefined} />}
        {(route.page === 'integrations' || route.page === 'settings') && <ProductOptions section={route.page === 'integrations' ? 'Интеграции' : 'Настройки'} show={show} />}
        {route.page === 'new' && <CreateEstimate key={route.query} fromBlank={route.query === 'manual'} onCancel={() => go('#/estimates')} onCreate={(item) => { save([item, ...estimates]); open(item.id) }} />}
        {route.page === 'estimate' && estimate && (
          <Workspace key={estimate.id + ':' + route.query + ':' + route.material + ':' + route.row} estimate={estimate} show={show} initialStage={route.query === 'match' ? 'Подбор расценок' : route.query === 'suppliers' ? 'Поставщики' : route.query === 'calculation' ? 'Расчёт и проверка' : undefined} initialMaterial={route.material} initialRow={route.row} notice={notice?.id === estimate.id ? notice.text : undefined}
            onHistory={(material, city, row) => openPriceHistory(material, city, estimate.id, row)}
            onFind={() => { setNotice(null); find('', estimate.id) }} onClose={() => { setNotice(null); go('#/estimates') }}
            onChange={(patch) => save(estimates.map((item) => item.id === estimate.id ? { ...item, ...patch, updated: new Date().toISOString() } : item))} />
        )}
        {route.page === 'estimate' && !estimate && <section className="panel finder-empty"><h1>Смета не найдена</h1><button type="button" onClick={() => go('#/estimates')}>Открыть мои сметы</button></section>}
        {route.page === 'estimates' && (
          <>
            <header className="page-header between">
              <div><h1>Мои сметы</h1><p>Проекты, спецификации и расчёты в работе.</p></div>
              <button className="primary" type="button" onClick={() => go('#/new')}>＋ Создать смету</button>
            </header>
            <section className="panel project-list">
              <div className="panel-heading between"><input type="search" aria-label="Поиск по списку смет" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название, регион цен или источник" /><span className="muted">Смет: {visible.length}</span></div>
              {visible.length ? (
                <Table label="Сохранённые сметы">
                  <thead><tr><th scope="col">Объект</th><th scope="col">Регион цен</th><th scope="col">Вид сметы</th><th scope="col">Спецификация</th><th scope="col">Изменена</th><th scope="col">Действия</th></tr></thead>
                  <tbody>{visible.map((item) => (
                    <tr key={item.id}>
                      <th scope="row"><button className="text-button" type="button" onClick={() => open(item.id)}>{item.title}</button></th>
                      <td>{item.city}</td><td>{item.mode}</td><td><span>{item.source}</span><span className="muted list-source">{item.positions.length} поз.</span></td><td>{new Date(item.updated).toLocaleDateString('ru-RU')}</td>
                      <td><div className="actions"><button type="button" className="text-button" aria-label={`Открыть смету ${item.title}`} onClick={() => open(item.id)}>Открыть</button><button type="button" className="text-button quiet" onClick={() => remove(item)} aria-label={`Удалить смету ${item.title}`}>Удалить</button></div></td>
                    </tr>
                  ))}</tbody>
                </Table>
              ) : <p className="empty">{query ? 'По вашему запросу ничего не найдено.' : 'Сохранённых смет пока нет. Создайте смету из спецификации.'}</p>}
            </section>
            <p className="storage-note">Сметы сохраняются в этом браузере.</p>
          </>
        )}
      </main>
      {(route.page === 'home' || route.page === 'pricing') && <footer className="site-footer"><Brand onClick={() => go('#/')} /><span>Рабочее место сметчика</span><button type="button" className="text-button" onClick={() => go('#/estimates')}>Открыть кабинет ↗</button></footer>}
      {feature && <FeatureDialog feature={feature} close={() => setFeature(null)} />}
    </div>
  )
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<App />)
