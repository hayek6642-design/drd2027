function showRewardEffect(value) {
  const effect = document.createElement('div')
  effect.className = 'balloon-reward'
  effect.textContent = `+${value}`
  effect.style.position = 'fixed'
  effect.style.top = '50%'
  effect.style.left = '50%'
  effect.style.transform = 'translate(-50%, -50%)'
  effect.style.fontSize = '24px'
  effect.style.fontWeight = 'bold'
  effect.style.color = value > 0 ? '#4CAF50' : '#f44336'
  effect.style.zIndex = '10000'
  effect.style.animation = 'rewardFloat 1.5s ease-out'
  
  document.body.appendChild(effect)
  
  setTimeout(() => {
    effect.remove()
  }, 1500)
}

export function renderBalloon(balloon) {
  const el = document.createElement('div')
  el.className = 'balloon'
  
  // Set balloon appearance based on type
  el.style.width = '60px'
  el.style.height = '80px'
  el.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%'
  el.style.backgroundColor = balloon.type === 'normal' ? '#FF6B6B' : 
                             balloon.type === 'rare' ? '#4ECDC4' : '#F7FFF7'
  el.style.position = 'fixed'
  el.style.zIndex = '1000'
  el.style.cursor = 'pointer'
  el.style.animation = 'float 3s ease-in-out infinite'
  
  // Random position
  const maxX = window.innerWidth - 60
  const maxY = window.innerHeight - 80
  const x = Math.random() * maxX
  const y = Math.random() * maxY
  
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  
  el.onclick = async () => {
    try {
      const res = await fetch('/api/balloon/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(balloon)
      })

      const data = await res.json()

      el.remove()

      if (data.value > 0) {
        showRewardEffect(data.value)
      }
    } catch (error) {
      console.error('Balloon click error:', error)
    }
  }

  document.body.appendChild(el)

  setTimeout(() => el.remove(), 5000)
}

// Add CSS animations
const style = document.createElement('style')
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes rewardFloat {
    0% { 
      opacity: 1; 
      transform: translate(-50%, -50%) scale(1); 
    }
    100% { 
      opacity: 0; 
      transform: translate(-50%, -100px) scale(1.5); 
    }
  }
`
document.head.appendChild(style)