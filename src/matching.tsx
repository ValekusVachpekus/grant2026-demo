import { useEffect, useState } from 'react'
import { catalogEntry, type CatalogEntry } from './catalog'
import { matchedEntry, money, number, strategies, type Estimate, type Strategy } from './estimate'
import { findRates } from './finder'

export function Matching({ estimate, onMatch, onExcavation, onStrategy, onContinue, initialRow }: {
  estimate: Estimate
  onMatch: (key: string, name: string) => void
  onExcavation: (key: string, rate: number) => void
  onStrategy: (strategy: Strategy) => void
  onContinue: () => void
  initialRow?: number
}) {
  const unresolved = estimate.positions.findIndex((_, index) => !matchedEntry(estimate, index))
  const [index, setIndex] = useState(initialRow ?? (unresolved >= 0 ? unresolved : Math.max(0, estimate.positions.findIndex((_, row) => matchedEntry(estimate, row)?.name === 'Земляные работы' && estimate.excavation[row] === undefined))))
  const position = estimate.positions[index]
  const manual = estimate.strategy === 'Ручной'
  const [scanning, setScanning] = useState(() => Boolean(position) && !manual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!scanning) return
    const timer = window.setTimeout(() => setScanning(false), 900)
    return () => window.clearTimeout(timer)
  }, [scanning])
  const match = !manual && position ? matchedEntry(estimate, index) : undefined
  const exact = position && catalogEntry(position)
  const candidates = !manual && position
    ? findRates(position.name).filter((item) => item.unit === position.unit && item.name !== match?.name).slice(0, 4)
    : []

  function accept(item: CatalogEntry) {
    onMatch(String(index), item.name)
  }

  return (
    <section className="matching">
      <div className="panel matching-intro between">
        <div><h2>Подбор расценок из спецификации</h2><p>Строка из файла связывается с позицией справочника. Если есть варианты, выберите подходящий по условиям работы.</p></div>
        <label className="field">Участие сметчика<select value={estimate.strategy ?? 'Полуавтоматический'} onChange={(event) => onStrategy(event.target.value as Strategy)}>
          {strategies.map((strategy) => <option key={strategy}>{strategy}</option>)}
        </select></label>
      </div>
      <p className="matching-model muted">На этом примере подбор работает по учебному каталогу. В продукте семантический поиск найдёт близкие позиции в базе, а ИИ объяснит различия и сошлётся на источник.</p>
      {scanning && !manual ? <div className="panel matching-scan" role="status">
        <strong>Подбираем расценки по учебному каталогу…</strong>
        <div className="scan-track" aria-hidden="true"><span /></div>
      </div> : position ? (
        <div className="matching-grid">
          <section className="panel matching-list">
            <div className="panel-heading"><h2>Строки спецификации</h2><p>{estimate.positions.length} поз. {manual ? '· ручной режим' : `· без соответствия: ${estimate.positions.filter((_, row) => !matchedEntry(estimate, row)).length}`}</p></div>
            <ol>
              {estimate.positions.map((item, row) => (
                <li key={row}><button type="button" aria-pressed={row === index} onClick={() => setIndex(row)}>
                  <span>{item.name}</span><small className={manual || matchedEntry(estimate, row) ? 'muted' : 'warning'}>{manual ? 'Ручной ввод' : matchedEntry(estimate, row) ? 'Есть соответствие' : 'Нужен выбор'}</small>
                </button></li>
              ))}
            </ol>
          </section>
          <section className="panel matching-card">
            <header><p className="section-label"><span /> Исходная строка</p><h2>{position.name}</h2><p className="muted">{number(position.quantity)} {position.unit}</p></header>
            {match && <div className="current-match">
              <strong>{match.name}</strong>
              <span>Учебный справочник · {money((match.name === 'Земляные работы' ? estimate.excavation[index] ?? match.rate : match.rate) * 100)} за {match.unit}</span>
              <p>{exact?.name === match.name ? 'Совпали наименование и единица измерения.' : 'Соответствие подтверждено сметчиком. Исходное название сохранено.'}</p>
              {match.name === 'Земляные работы' && <fieldset><legend>Как выполняются земляные работы?</legend>
                {[450, 520].map(rate => <label key={rate}><input type="radio" name="excavation-choice" checked={estimate.excavation[index] === rate} onChange={() => onExcavation(String(index), rate)} /> {rate === 450 ? 'Без погрузки' : 'С погрузкой'} · {rate} ₽/м³</label>)}
              </fieldset>}
            </div>}
            {!match && !manual && candidates.length > 0 && <p className="matching-hint">В названии найдено описание схожей работы. Уточните способ выполнения, прежде чем применять расценку.</p>}
            {candidates.length > 0 && <ul className="match-candidates">
              {candidates.map((item) => <li key={item.name} className="between">
                <div><strong>{item.name}</strong><p className="muted">Учебный справочник · {money(item.rate * 100)} за {item.unit}</p>
                  {item.name === 'Разработка траншеи экскаватором' && <p>Когда на объекте предусмотрена работа техники.</p>}
                  {item.name === 'Разработка траншеи вручную' && <p>Когда грунт вынимают вручную.</p>}
                </div>
                <button type="button" onClick={() => accept(item)}>Применить</button>
              </li>)}
            </ul>}
            {!match && !candidates.length && <p className="matching-hint">{manual ? 'Расценки назначает сметчик. Перейдите к расчёту для ручного ввода.' : 'Подходящее соответствие не найдено. Укажите расценку вручную на следующем шаге.'}</p>}
          </section>
        </div>
      ) : <p className="panel empty">Сначала добавьте позицию или откройте учебную спецификацию.</p>}
      <div className="actions footer-actions"><button type="button" className="primary" onClick={onContinue} disabled={!position || (scanning && !manual)}>Перейти к расчёту</button></div>
    </section>
  )
}
