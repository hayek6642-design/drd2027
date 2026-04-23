import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.join(__dirname, '../../uploads/piccarboon')
const DAILY = path.join(ROOT, 'challenges/daily.json')

function ensureDirs() {
  const dirs = ['challenges','reference','submissions','scores','fraud','winners','losers','sponsor']
  for (const d of dirs) {
    const p = path.join(ROOT, d)
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
  }
}

function seedDaily() {
  if (!fs.existsSync(DAILY)) {
    const obj = {
      pose: 'standing',
      dominant_color: 'red',
      required_objects: ['cup'],
      head_to_chair_distance_cm: 30,
      camera_angle: 'front',
      sponsor: { name: 'RedBull', cta: 'Win Energy!', reward: 'Free Box' },
      creator: { id: 'yt-coder', cut: 0.3 }
    }
    fs.mkdirSync(path.dirname(DAILY), { recursive: true })
    fs.writeFileSync(DAILY, JSON.stringify(obj, null, 2))
  }
}

export function getCurrentChallenge() {
  ensureDirs()
  seedDaily()
  try {
    const raw = fs.readFileSync(DAILY, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default { getCurrentChallenge }
