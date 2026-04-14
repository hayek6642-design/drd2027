// ===============================
// 🧠 ZAGEL EMOTION - Fast Emotion Detection
// ===============================

export function detectEmotionFast(text) {
  const emotions = {
    happy: [/😄/, /😊/, /happy/, /سعيد/, /فرحان/],
    sad: [/😢/, /😭/, /sad/, /حزين/, /تعبان/],
    angry: [/😠/, /angry/, /عصبي/, /غاضب/],
    excited: [/🎉/, /wow/, /رائع/, /عظيم/, /ممتاز/],
    calm: [/peaceful/, /هادي/, /مرتاح/]
  }
  
  for (const [emotion, patterns] of Object.entries(emotions)) {
    if (patterns.some(p => p.test(text))) return emotion
  }
  return 'neutral'
}
