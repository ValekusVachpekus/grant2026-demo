import { useEffect, useState } from 'react'
import { QueryBox } from './finder'
import type { ShowFeature } from './product'

import { projectExamples, type ProjectExample } from './catalog'

const projectImages = {
  'foundation.webp': import.meta.env.BASE_URL + 'foundation.webp',
  'drainage.webp': import.meta.env.BASE_URL + 'drainage.webp',
  'waterline.webp': import.meta.env.BASE_URL + 'waterline.webp',
}


export function Brand({ onClick }: { onClick: () => void }) {
  return <button type="button" className="brand" onClick={onClick}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Сметная</span></button>
}

export function Landing({ onCreate, onExample, onSearch, onPricing }: {
  onCreate: (fromBlank?: boolean) => void; onExample: (project: ProjectExample, showMatching?: boolean) => void
  onSearch: (query: string) => void; onPricing: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [hovered, setHovered] = useState(false)
  const project = projectExamples[active]

  useEffect(() => {
    if (paused || hovered) return
    const id = window.setInterval(() => setActive((index) => (index + 1) % projectExamples.length), 8500)
    return () => window.clearInterval(id)
  }, [paused, hovered])

  return (
    <>
      <section className="landing-hero">
        <div className="hero-text">
          <p className="section-label"><span /> Сметная документация</p>
          <h1>От спецификации<br className="wide-only" /> до сметы</h1>
          <p className="hero-copy">Соберите смету на строительные и инженерные работы. Откройте учебную спецификацию или добавьте позиции своим языком.</p>
          <div className="actions hero-actions">
            <button type="button" className="primary" onClick={() => onExample(projectExamples[0])}>Открыть смету фундамента <span aria-hidden="true">↗</span></button>
            <button type="button" className="secondary" onClick={() => onCreate(true)}>Создать с нуля</button>
          </div>
          <div className="format-strip"><span>Планируемый импорт</span><b>Excel</b><b>XML</b><b>JSON</b></div>
        </div>
        <div className="project-showcase" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <div className="hero-visual">
            <img key={project.image} src={projectImages[project.image]} alt={project.alt} />
            <div className="project-actions">
              <button type="button" onClick={() => onExample(project)}>Открыть смету ↗</button>
              <button type="button" aria-label={paused ? 'Запустить смену фотографий' : 'Приостановить смену фотографий'} onClick={() => setPaused(!paused)}>{paused ? '▶' : 'Ⅱ'}</button>
            </div>
            <div className="hero-search">
              <div className="between"><h2>Подбор расценки</h2><span>Работы и материалы</span></div>
              <QueryBox value={query} onChange={(value) => { setQuery(value); setPaused(true) }} onSearch={onSearch} placeholder={`Например, ${project.queries[0]}`} compact />
              <div className="hero-search-examples">
                {project.queries.map((example) => <button key={example} type="button" onClick={() => onSearch(example)}>{example}</button>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-process" aria-labelledby="process">
        <div className="between section-title"><h2 id="process">Как собрать смету</h2><button type="button" className="text-button" onClick={() => onCreate(true)}>Начать с пустой сметы <span aria-hidden="true">↗</span></button></div>
        <div className="steps steps-four">
          <article><span className="step-icon" aria-hidden="true">1</span><h3>Создайте объект</h3><p>Укажите название и регион цен. Откройте готовый пример или начните с пустого списка.</p></article>
          <article><span className="step-icon" aria-hidden="true">2</span><h3>Подберите расценки</h3><p>Поиск находит похожие работы и материалы по вашему описанию или по строкам файла.</p></article>
          <article><span className="step-icon" aria-hidden="true">3</span><h3>Проверьте расчёт</h3><p>Подтвердите спорные позиции, уточните объёмы и цены. Переключитесь между нормативной и коммерческой сметами.</p></article>
          <article><span className="step-icon" aria-hidden="true">4</span><h3>Откройте результат</h3><p>Проверьте итоговый документ, сохраните версию и откройте предпросмотр для печати.</p></article>
        </div>
      </section>
      <section className="ai-showcase">
        <div className="ai-explanation">
          <h2>Интеллектуальный поиск расценок</h2>
          <p>Опишите работу своими словами или откройте учебную ведомость. Поиск сопоставит описание с позициями справочника и покажет варианты, даже если формулировки различаются.</p>
          <p>Сметчик тратит меньше времени на перебор расценок: сразу видит источник, различия между вариантами и строки, где требуется его решение.</p>
          <details><summary>Как устроен подбор</summary><p>В целевой версии семантический поиск найдёт подходящие записи. Модель объяснит варианты на основе найденных источников (RAG). Расчётное ядро пересчитывает суммы по выбранной расценке и объёму.</p></details>
          <button type="button" className="secondary" onClick={() => onExample(projectExamples[2], true)}>Разобрать пример подбора ↗</button>
        </div>
        <div className="ai-example">
          <div className="ai-example-source"><span>Из спецификации</span><strong>Выкопать траншею под водопровод</strong><small>34 м³</small></div>
          <div className="ai-example-options">
            <div><strong>Разработка траншеи экскаватором</strong><small>Учтена работа техники</small></div>
            <div><strong>Разработка траншеи вручную</strong><small>Учтён ручной труд</small></div>
          </div>
          <p>Способ выполнения надо уточнить по проекту.</p>
        </div>
      </section>
      <section className="landing-cta"><div><h2>Один объект. Два расчёта.</h2><p>Нормативы и цены поставщиков доступны в отдельных режимах сметы.</p></div><button type="button" className="secondary" onClick={onPricing}>Посмотреть тарифы <span aria-hidden="true">↗</span></button></section>
    </>
  )
}

const plans = [
  { name: 'Ознакомительный', price: 'Открытый доступ', description: 'Для знакомства с рабочим кабинетом', benefits: ['Примеры строительных и инженерных смет', 'Поиск работ и материалов', 'Учебные спецификации'], button: 'Попробовать' },
  { name: 'Специалист', price: 'Подписка на месяц', description: 'Для частных сметчиков и проектировщиков', benefits: ['Нормативный и коммерческий расчёты', 'Сравнение предложений поставщиков', 'Сохранение и история смет'], button: 'Условия подписки' },
  { name: 'Команда', price: 'По запросу', description: 'Для проектных и строительных организаций', benefits: ['Общее рабочее пространство', 'Доступы по ролям', 'Прайсы и настройки организации'], button: 'Условия для команды' },
]

export function Pricing({ openWorkspace, show }: { openWorkspace: () => void; show: ShowFeature }) {
  return (
    <section className="pricing">
      <header>
        <p className="section-label"><span /> Подписка</p>
        <h1>Тарифы</h1>
        <p>Для частных сметчиков и строительных команд.</p>
      </header>
      <div className="plan-grid">
        {plans.map((plan, index) => (
          <article className={'plan' + (index === 1 ? ' plan-featured' : '')} key={plan.name}>
            <h2>{plan.name}</h2><p>{plan.description}</p><strong className="plan-price">{plan.price}</strong>
            <ul>{plan.benefits.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <button type="button" className={index < 2 ? 'primary' : 'secondary'} onClick={index === 0 ? openWorkspace : () => show(plan.name, 'Подключение в разработке. Цены, лимиты и условия подписки будут опубликованы после пилотного запуска.')}>{plan.button} <span aria-hidden="true">↗</span></button>
          </article>
        ))}
      </div>
      <p className="pricing-note">Цены и лимиты платных планов уточняются.</p>
      <details><summary>Какие форматы запланированы?</summary><p>Excel, XML и JSON. Это планируемые форматы. В макете доступны подготовленные примеры.</p></details>
      <details><summary>Как перейти к смете?</summary><p>Откройте рабочий кабинет и создайте смету из готового примера или добавьте расценки через поиск.</p></details>
    </section>
  )
}
