import { useEffect, useRef, useState } from 'react'
import { cities, confirmExcavation, estimateLines, money, number, type Estimate, type Mode } from './estimate'

type Action = { label: string; key: string; mode: Mode; rate?: number }
type Reply = { text: string; actions?: Action[]; copy?: boolean }
const prompts = ['Объясни выбор расценки', 'Почему изменилась стоимость?', 'Что нужно уточнить?']

export function explainRate(estimate: Estimate, selected?: string | null): Reply {
  const normative = { ...estimate, mode: 'Нормативная' as const }
  const lines = estimateLines(normative)
  const line = lines.find(item => item.key === selected) ?? lines.find(item => item.excavation) ?? lines[0]
  if (!line) return { text: 'В спецификации пока нет строк. Добавьте первую позицию.' }
  if (!line.excavation) return { text: [line.name, line.basis, line.total === null ? line.issue : number(line.quantity) + ' ' + line.unit + ' × ' + line.value + ' ₽ = ' + money(line.total)].join('\n') }
  const rates = [450, 520]
  const actions = rates.map(rate => ({ label: rate === 450 ? 'Применить без погрузки' : 'Применить с погрузкой', key: line.key, mode: normative.mode, rate }))
  const variants = rates.map((rate, index) => {
    const candidate = estimateLines({ ...normative, ...confirmExcavation(estimate, line.key, rate) }).find(item => item.key === line.key)!
    return (index === 0 ? 'Без погрузки' : 'С погрузкой') + ': ' + number(line.quantity) + ' ' + line.unit + ' × ' + rate + ' ₽ = ' + money(candidate.total!)
  })
  return { text: [line.name + ' · ' + line.basis, ...variants, 'По проекту грунт нужно грузить в транспорт?'].join('\n'), actions }
}

export function explainCost(estimate: Estimate, previous?: Estimate): Reply {
  const now = { ...estimate, mode: 'Коммерческая' as const }
  const before = { ...(previous ?? estimate), city: previous?.city ?? cities.find(city => city !== estimate.city)!, mode: now.mode }
  const oldLines = new Map(estimateLines(before).map(line => [line.key, line]))
  const changes: string[] = []
  const missing: string[] = []
  let delta = 0
  for (const line of estimateLines(now)) {
    const old = oldLines.get(line.key)
    if (!old || old.total === null || line.total === null) { missing.push(line.name); continue }
    const diff = line.total - old.total
    delta += diff
    if (diff || old.basis !== line.basis) changes.push(line.name + ': ' + money(old.total) + ' → ' + money(line.total) + ' (' + money(diff) + ')')
  }
  return { text: [before.city === now.city ? 'Изменение цены · ' + now.city : 'Сравнение цен: ' + before.city + ' → ' + now.city,
    ...changes, 'Разница по сопоставимым строкам: ' + money(delta),
    ...(missing.length ? ['Для полного сравнения уточните цены: ' + missing.join(', ') + '.'] : [])].join('\n') }
}

export function listQuestions(estimate: Estimate): Reply {
  const questions: string[] = []
  const actions: Action[] = []
  for (const mode of ['Нормативная', 'Коммерческая'] as const) {
    for (const line of estimateLines({ ...estimate, mode }).filter(line => line.issue)) {
      const question = line.excavation ? 'Проектировщику: предусмотрена ли погрузка грунта?' : mode === 'Нормативная' ? 'Сметчику: какую расценку применить?' : line.issue === 'Цена устарела' ? 'Снабжению: действует ли последняя цена?' : 'Снабжению: какую стоимость подтвердить для региона ' + estimate.city + '?'
      questions.push(line.name + ' — ' + question)
      actions.push({ key: line.key, mode, label: mode + ' · ' + line.name })
    }
  }
  return { text: questions.join('\n') || 'Открытых замечаний по двум расчётам нет.', copy: !!questions.length, actions }
}

export function EstimateAssistant({ estimate, previous, selected, onApply, onOpen }: {
  estimate: Estimate; previous?: Estimate; selected: string | null
  onApply: (key: string, rate: number) => void; onOpen: (mode: Mode, key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  function closeChat() {
    setOpen(false)
    launcher.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!open) return
    input.current?.focus({ preventScroll: true })
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog:modal')) closeChat()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const end = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<{ question: string; reply: Reply; revision: string }[]>([])
  const [copyStatus, setCopyStatus] = useState('')
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages])
  function ask(question: string) {
    if (!question.trim()) return
    const reply = /уточн|вопрос|замечан|провер/i.test(question) ? listQuestions(estimate)
      : /стоим|цен[ауы]|сумм|регион|поставщик|подорож|дешев/i.test(question) ? explainCost(estimate, previous)
      : /расцен|погруз|выбор|вариант/i.test(question) ? explainRate(estimate, selected)
      : { text: 'Учебный чат умеет объяснить расценку, сравнить стоимость и собрать вопросы по смете. Выберите действие ниже.' }
    setMessages(items => [...items, { question, reply, revision: estimate.updated }])
    setCopyStatus('')
    setQuery('')
  }
  return <>
    <button ref={launcher} type="button" className="chat-launcher" aria-expanded={open} aria-controls="estimate-chat" aria-haspopup="dialog"
      aria-label={open ? 'Свернуть Сметная AI' : 'Открыть Сметная AI'} title="Сметная AI" onClick={() => open ? closeChat() : setOpen(true)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {open ? <path d="m6 9 6 6 6-6" /> : <><path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.6-5A8.5 8.5 0 1 1 20.5 11.5Z" /><path d="M8 10h8m-8 4h5" /></>}
      </svg>
    </button>
    <dialog open={open} id="estimate-chat" className="estimate-chat" aria-labelledby="estimate-chat-title">
      <header className="between"><div><h2 id="estimate-chat-title">Сметная AI</h2><small>{estimate.title} · учебный режим</small></div><button type="button" aria-label="Закрыть чат" onClick={closeChat}>×</button></header>
      <div className="chat-history" role="log">{messages.map(({ question, reply, revision }, i) => <article key={i}>
        <strong>{question}</strong><p>{reply.text}</p>
        {i === messages.length - 1 && revision === estimate.updated && <div className="actions">{reply.actions?.map(action =>
          <button key={action.label} onClick={() => {
            if (action.rate !== undefined) {
              onApply(action.key, action.rate)
              setMessages(items => [...items, { question: action.label, reply: { text: 'Расценка применена к нормативной смете.' }, revision }])
            } else { closeChat(); onOpen(action.mode, action.key) }
          }}>{action.label}</button>)}
          {reply.copy && <button onClick={async () => {
            try { await navigator.clipboard.writeText(reply.text); setCopyStatus('Вопросы скопированы') }
            catch { setCopyStatus('Выделите текст вопросов и скопируйте вручную') }
          }}>Скопировать вопросы</button>}</div>}
      </article>)}<div ref={end} /></div>
      <small role="status">{copyStatus}</small>
      <div className="chat-prompts">{prompts.map(prompt => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); ask(query) }}><input ref={input} aria-label="Вопрос по смете" placeholder="Задайте вопрос по смете" value={query} onChange={event => setQuery(event.target.value)} /><button type="submit" className="primary chat-send" aria-label="Отправить сообщение" title="Отправить сообщение" disabled={!query.trim()}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-7 7 7-7 7 7" /></svg>
      </button></form>
    </dialog>
  </>
}
