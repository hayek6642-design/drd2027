import fs from 'fs'
import path from 'path'

describe('IndexCB storage and sync policy', () => {
  const htmlPath = path.join(process.cwd(), 'services/yt-clear/codebank/indexCB.html')
  let html = ''

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8')
  })

  test('asset-sync script is not loaded', () => {
    expect(html).not.toMatch(/codebank\/js\/asset-sync\.js/)
  })

  test('postMessage handler for CODEBANK_ASSETS_SYNC exists', () => {
    expect(html).toMatch(/addEventListener\(['"]message['"]/)
    expect(html).toMatch(/CODEBANK_ASSETS_SYNC/)
  })

  test('storage disabled flag set', () => {
    expect(html).toMatch(/__INDEXCB_STORAGE_DISABLED__/)
  })

  test('no asset-sync included', () => {
    expect(html).not.toMatch(/asset-sync\.js/)
  })

  test('does not listen for assets:updated', () => {
    expect(html).not.toMatch(/addEventListener\(['"]assets:updated['"]/)
  })
})
