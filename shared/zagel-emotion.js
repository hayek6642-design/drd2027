// ===============================
// 😊 ZAGEL EMOTION - Mood Detection
// ===============================

export function detectEmotionFast(text) {
  const emotions = {
    happy: [/😄/, /😊/, /happy/, /سعيد/, /رايق/, /زين/],
    sad: [/😢/, /😭/, /sad/, /حزين/, /كسيح/, /تعبان/],
    angry: [/😠/, /angry/, /عصبي/, /زعلان/, /غصب/],
    excited: [/🎉/, /wow/, /رائع/, /ياااا/, /وااو/]
  }
  
  for (const [emotion, patterns] of Object.entries(emotions)) {
    if (patterns.some(p => p.test(text))) return emotion
  }
  return 'neutral'
}

export function getMoodBoost(emotion) {
  const boosts = {
    happy: { response: "أنت سعيد! 😄", tone: "upbeat" },
    sad: { response: "كل شي بيكون تمام 😊", tone: "gentle" },
    angry: { response: "خذ نفسك شوية 🧘", tone: "calming" },
    excited: { response: "أحلى خبر! 🎉", tone: "enthusiastic" },
    neutral: { response: null, tone: "normal" }
  }
  return boosts[emotion] || boosts.neutral
}

export default { detectEmotionFast, getMoodBoost }
