import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import * as tf from '@tensorflow/tfjs-node'

function resolveLocalPathFromUrl(url) {
  try {
    const u = new URL(url)
    const p = u.pathname
    if (p.startsWith('/uploads/piccarboon/')) {
      const fname = p.split('/').pop()
      return path.join(__dirname, '../../uploads/piccarboon', fname)
    }
  } catch {}
  return null
}

async function imageMetrics(imageUrl) {
  const local = resolveLocalPathFromUrl(imageUrl)
  const buf = fs.readFileSync(local)
  const img = tf.node.decodeImage(buf, 3)
  const gray = tf.mean(img, 2)
  const kx = tf.tensor2d([[1,0,-1],[2,0,-2],[1,0,-1]])
  const ky = tf.tensor2d([[1,2,1],[0,0,0],[-1,-2,-1]])
  const gx = tf.conv2d(gray.expandDims(-1), kx.reshape([3,3,1,1]), 1, 'same').squeeze()
  const gy = tf.conv2d(gray.expandDims(-1), ky.reshape([3,3,1,1]), 1, 'same').squeeze()
  const mag = tf.sqrt(tf.add(tf.square(gx), tf.square(gy)))
  const variance = tf.moments(mag).variance.arraySync()
  const brightness = tf.mean(gray).arraySync()
  img.dispose()
  return { variance, brightness }
}

export async function computeAntiFraudConfidence(imageUrl, previousFrames) {
  const m = await imageMetrics(imageUrl)
  const blurCheck = Math.max(0, Math.min(1, m.variance / 500))
  let frameVariance = 0
  if (Array.isArray(previousFrames) && previousFrames.length >= 2) {
    const a = previousFrames[0]
    const b = previousFrames[1]
    let diffSum = 0
    const len = Math.min(a.length || 0, b.length || 0)
    for (let i = 0; i < len; i += 16) diffSum += Math.abs(a[i] - b[i])
    frameVariance = Math.min(1, diffSum / Math.max(1, len / 16) / 64)
  }
  const lightingConsistency = Math.min(1, Math.abs(m.brightness - 128) / 128)
  const noiseArtifacts = Math.max(0, Math.min(1, 1 - blurCheck))
  const base = 0.4*blurCheck + 0.2*(1 - lightingConsistency) + 0.2*frameVariance + 0.2*(1 - noiseArtifacts)
  const score = Math.round(Math.max(0, Math.min(1, base)) * 100)
  return score
}

export default { computeAntiFraudConfidence }
