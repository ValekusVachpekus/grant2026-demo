import type { Position } from './estimate'

const xmlLimit = 1024 * 1024
const utf8 = new TextDecoder()
const tag = (element: Document | Element, name: string) => Array.from(element.getElementsByTagNameNS('*', name))

function entries(buffer: ArrayBuffer) {
  const data = new DataView(buffer)
  const files = new Map<string, { offset: number; size: number; method: number }>()
  let end = data.byteLength - 22
  for (; end >= Math.max(0, data.byteLength - 65557); end--) {
    if (data.getUint32(end, true) === 0x06054b50 && end + 22 + data.getUint16(end + 20, true) === data.byteLength) break
  }
  if (end < 0 || end < data.byteLength - 65557) throw new Error('Не удалось открыть книгу Excel.')
  let cursor = data.getUint32(end + 16, true)
  const count = data.getUint16(end + 10, true)
  for (let index = 0; index < count; index++) {
    if (data.getUint32(cursor, true) !== 0x02014b50) throw new Error('Повреждена структура файла Excel.')
    const nameLength = data.getUint16(cursor + 28, true)
    const name = utf8.decode(new Uint8Array(buffer, cursor + 46, nameLength))
    files.set(name, {
      offset: data.getUint32(cursor + 42, true),
      size: data.getUint32(cursor + 20, true),
      method: data.getUint16(cursor + 10, true),
    })
    cursor += 46 + nameLength + data.getUint16(cursor + 30, true) + data.getUint16(cursor + 32, true)
  }
  return async (name: string) => {
    const item = files.get(name)
    if (!item) return null
    if (data.getUint32(item.offset, true) !== 0x04034b50 || ![0, 8].includes(item.method)) throw new Error('Не удалось прочитать лист Excel.')
    const start = item.offset + 30 + data.getUint16(item.offset + 26, true) + data.getUint16(item.offset + 28, true)
    const bytes = new Uint8Array(buffer, start, item.size)
    const fileStream = new Blob([bytes]).stream()
    const stream = item.method === 8 ? fileStream.pipeThrough(new DecompressionStream('deflate-raw')) : fileStream
    const reader = stream.getReader()
    let size = 0
    let content = ''
    const decoder = new TextDecoder()
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > xmlLimit) throw new Error('Размер листа Excel превышает лимит для демо.')
        content += decoder.decode(chunk.value, { stream: true })
      }
      const xml = new DOMParser().parseFromString(content + decoder.decode(), 'application/xml')
      if (tag(xml, 'parsererror').length) throw new Error('Не удалось прочитать лист Excel.')
      return xml
    } finally {
      await reader.cancel().catch(() => undefined)
    }
  }
}

export async function importExcel(file: File): Promise<Position[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx') || file.size < 22 || file.size > 2 * xmlLimit) {
    throw new Error('Выберите файл .xlsx размером до 2 МБ.')
  }
  const open = entries(await file.arrayBuffer())
  const sheet = await open('xl/worksheets/sheet1.xml')
  if (!sheet) throw new Error('В книге нет листа спецификации.')
  const shared = await open('xl/sharedStrings.xml')
  const text = (element: Element) => tag(element, 't').map((part) => part.textContent ?? '').join('')
  const strings = shared ? tag(shared, 'si').map(text) : []
  const rows = tag(sheet, 'row').map((row) => {
    const columns = tag(row, 'c')
    return ['A', 'B', 'C'].map((column) => {
      const cell = columns.find((candidate) => candidate.getAttribute('r')?.replace(/\d+$/, '') === column)
      if (!cell) return ''
      const raw = tag(cell, 'v')[0]?.textContent ?? ''
      const type = cell.getAttribute('t')
      return (type === 's' ? strings[Number(raw)] ?? '' : type === 'inlineStr' ? text(cell) : raw).trim()
    })
  })
  if (rows[0]?.join('|') !== 'Позиция|Ед.|Объём') throw new Error('Ожидаются колонки «Позиция», «Ед.» и «Объём». Скачайте шаблон.')
  return readPositions(rows.slice(1), 2)
}

function readPositions(rows: string[][], firstRow: number): Position[] {
  const positions = rows.flatMap(([name, unit, rawQuantity], index) => {
    if (!name && !unit && !rawQuantity) return []
    const quantity = Number(rawQuantity.replace(',', '.'))
    if (!name || !unit || !/^\d+(?:[.,]\d{1,3})?$/.test(rawQuantity) || quantity <= 0 || quantity > 100_000) {
      throw new Error(`Проверьте строку ${index + firstRow}. Нужны позиция, единица и объём от 0,001 до 100 000 с точностью до трёх знаков.`)
    }
    return [{ name, unit, quantity }]
  })
  if (!positions.length || positions.length > 500) throw new Error('В спецификации должно быть от 1 до 500 позиций.')
  return positions
}

export async function importSpecification(file: File) {
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  if (extension === 'xlsx') return importExcel(file)
  if (!file.size || file.size > 2 * xmlLimit) throw new Error('Размер спецификации должен быть от 1 байта до 2 МБ.')
  if (extension === 'json') {
    const data: unknown = JSON.parse(await file.text())
    if (!data || typeof data !== 'object' || !('positions' in data) || !Array.isArray(data.positions)) {
      throw new Error('JSON должен содержать массив positions. Скачайте пример.')
    }
    return readPositions(data.positions.map((item): string[] => {
      if (!item || typeof item.name !== 'string' || typeof item.unit !== 'string' || typeof item.quantity !== 'number') {
        throw new Error('У каждой позиции должны быть поля name, unit и quantity.')
      }
      return [item.name.trim(), item.unit.trim(), String(item.quantity)]
    }), 1)
  }
  if (extension === 'xml') {
    const xml = new DOMParser().parseFromString(await file.text(), 'application/xml')
    if (xml.documentElement.localName !== 'specification' || tag(xml, 'parsererror').length) {
      throw new Error('XML должен содержать корневой элемент specification. Скачайте пример.')
    }
    return readPositions(Array.from(xml.documentElement.children).map((item) => {
      if (item.localName !== 'position') throw new Error('Каждая строка XML должна быть элементом position.')
      return ['name', 'unit', 'quantity'].map((field) => (item.getAttribute(field) ?? '').trim())
    }), 1)
  }
  throw new Error('Выберите спецификацию Excel, XML или JSON.')
}
