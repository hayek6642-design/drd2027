function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateBalloon() {
  const rand = Math.random()

  if (rand < 0.7) return { type: 'normal', value: 5 }
  if (rand < 0.9) return { type: 'empty', value: 0 }
  return { type: 'rare', value: 25 }
}

export function createSpawner(engine, emit) {
  function spawnLoop() {
    const delay = randomBetween(120000, 360000) // 2–6 min

    setTimeout(() => {
      const balloon = generateBalloon()

      engine.registerSpawn()
      emit(balloon)

      spawnLoop()
    }, delay)
  }

  spawnLoop()
}