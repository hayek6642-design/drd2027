/**
 * Zagel AI - Gemini Integration for Smart Mode
 */

const API_KEY = window.ZAGEL_API_KEY || process.env.REACT_APP_GEMINI_KEY || '';

export const ZagelAI = (() => {

  // Convert to indirect speech (smart mode)
  async function toIndirect({ senderName, receiverName, text, tone = 'normal' }) {
    
    const toneInstructions = {
      normal: 'أسلوب ودي وعادي',
      romantic: 'أسلوب عاطفي ورقيق',
      urgent: 'أسلوب مستعجل ولكن لطيف',
      funny: 'أسلوب مضحك ومرح'
    };

    const prompt = \`
أنت زاجل، حمامة صغيرة مرحة تنقل الرسائل بين الناس.
حول الرسالة التالية إلى صيغة غير مباشرة (غير مباشرة) بأسلوب طفلة صغيرة لطيفة:

المرسل: \${senderName}
المستلم: \${receiverName}
الرسالة: "\${text}"
النبرة المطلوبة: \${toneInstructions[tone]}

المتطلبات:
1. ابدأ بـ "\${receiverName}!"
2. استخدم لغة بسيطة وعامية (مثل: يقولك، وصلتك، عندك)
3. لا تستخدم الفصحى الثقيلة
4. أضف إيموجي مناسب
5. اجعلها قصيرة (جملتين كحد أقصى)

أعد النص فقط بدون شرح:
\`;

    try {
      const res = await fetch(
        \`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=\${API_KEY}\`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await res.json();
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      return result || null;
      
    } catch (e) {
      console.error('[ZagelAI] Error:', e);
      return null;
    }
  }

  // Extract intent from voice command
  async function extractIntent(text) {
    
    const prompt = \`
حلل الأمر الصوتي التالي واستخرج النية:

"\${text}"

أعد JSON فقط بهذا الشكل:
{
  "action": "send_message | read_messages | quick_reply | go_to | unknown",
  "target": "اسم الشخص أو null",
  "message": "نص الرسالة أو null",
  "tone": "normal | urgent | romantic | funny",
  "confidence": 0.0 إلى 1.0
}

قواعس:
- "قول لـ" أو "قولي لـ" → action: "send_message"
- "اقرأ رسائلي" → action: "read_messages"  
- "رد عليه" → action: "quick_reply"
- "روح لـ" → action: "go_to"
\`;

    try {
      const res = await fetch(
        \`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=\${API_KEY}\`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return null;
      
    } catch (e) {
      console.error('[ZagelAI] Intent extraction failed:', e);
      return null;
    }
  }

  return {
    toIndirect,
    extractIntent
  };

})();
