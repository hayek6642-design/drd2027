import fs from 'fs'
import path from 'path'

describe('Layout and formatting consistency', () => {
  const htmlPath = path.join(process.cwd(), 'services/yt-clear/yt-new-clear.html')
  let html = ''

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8')
  })

  test('watch-time grid uses 1fr auto columns', () => {
    expect(html).toMatch(/#watch-time[\s\S]*grid-template-columns:\s*1fr\s+auto/)
  })

  test('counter container has increased gap and padding applied', () => {
    expect(html).toMatch(/#counter-container[\s\S]*gap:\s*32px\s*!important/)
    expect(html).toMatch(/#counter-container[\s\S]*padding:\s*12px\s+12px\s*!important/)
  })

  test('mobile breakpoint adjusts counter container width', () => {
    expect(html).toMatch(/@media\s*\(max-width:\s*768px\)/)
    expect(html).toMatch(/#counter-container[\s\S]*width:\s*90vw\s*!important/)
  })

  test('counter digits do not wrap', () => {
    expect(html).toMatch(/#counter[\s\S]*white-space:\s*nowrap/)
    expect(html).toMatch(/#counter[\s\S]*overflow:\s*hidden/)
  })

  test('stopwatch deciseconds are padded to two digits', () => {
    expect(html).toMatch(/String\(deci\)\.padStart\(2,\s*'0'\)/)
  })
})
