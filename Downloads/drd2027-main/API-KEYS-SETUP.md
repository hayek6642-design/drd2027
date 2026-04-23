# 🔑 AI-Chat API Keys Setup Guide

This guide explains how to get free API keys and configure them for the AI-Chat hub.

## Current Status

✅ **Already Configured:**
- **Groq API** - Llama 3.1 8B Instant, Mixtral 8x7B (Free)
- **Google Gemini** - Gemini 1.5 Flash, Gemini 1.5 Flash 8B (Free tier)

⏳ **Optional to Add:**
- OpenRouter (Premium models with free tier)
- HuggingFace (Various open-source models)

---

## 1️⃣ Getting Groq API Key (FREE - Already Active ✅)

Groq offers free unlimited API access with rate limits.

### Steps:
1. Go to https://console.groq.com/
2. Click **"Sign Up"** or **"Log In"**
3. Navigate to **API Keys** in the sidebar
4. Click **"Create API Key"**
5. Copy the key
6. Already added to Render as `GROQ_API_KEY`

### Available Models:
- `mixtral-8x7b-32768` - Fast, powerful (128K context)
- `llama2-70b-4096` - Large language model
- `llama-3.1-8b-instant` - Fast and accurate

---

## 2️⃣ Getting Google Gemini API Key (FREE - Already Active ✅)

Google's free Gemini API is already set up.

### If you need a fresh key:
1. Go to https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key
4. Already added to Render as `GEMINI_API_KEY`

### Available Models:
- `gemini-1.5-flash` - Fast and balanced
- `gemini-1.5-pro` - More powerful
- `gemini-2.0-flash-exp` - Latest (experimental)

---

## 3️⃣ Getting OpenRouter API Key (Optional - Premium/Free Models)

OpenRouter provides access to 300+ models with flexible pricing.

### Steps:
1. Go to https://openrouter.ai/
2. Click **"Sign Up"** (top right)
3. Complete registration
4. Go to **API Keys** → **Create Key**
5. Copy your API key
6. Add to Render dashboard:
   ```
   OPENROUTER_API_KEY = your_key_here
   ```

### Free Models on OpenRouter:
- `meta-llama/llama-3-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`
- `nousresearch/nous-hermes-2-mixtral-8x7b-dpo:free`

### Premium (Paid) Models:
- `gpt-4-turbo` - Most capable
- `claude-3-opus` - Anthropic's best
- `gpt-4-vision` - With image analysis

---

## 4️⃣ Getting HuggingFace API Key (Optional - Open Source Models)

HuggingFace provides free inference API with generous rate limits.

### Steps:
1. Go to https://huggingface.co/
2. Click **Sign Up** (top right)
3. Complete registration
4. Go to **Settings** → **Access Tokens**
5. Click **New token** → Select "read" access
6. Copy the token
7. Add to Render dashboard:
   ```
   HUGGINGFACE_API_KEY = your_token_here
   ```

### Free Models Available:
- `gpt2` - Small, fast
- `google/flan-t5-xxl` - Strong reasoning
- `meta-llama/Llama-2-7b-chat` - Open source LLaMA

### Rate Limits:
- **Free tier**: ~5 requests/minute
- **Pro ($9/month)**: Unlimited requests

---

## 🔧 Adding API Keys to Render

### Method 1: Via Render Dashboard (Easy)

1. Go to https://dashboard.render.com/
2. Find your service: **dr-d-h51l** (DRD2027)
3. Click **Environment**
4. Scroll to **Environment Variables**
5. Click **Add Environment Variable**
6. Enter:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: `sk_live_...` (your actual key)
7. Click **Save Changes**
8. Service will auto-redeploy

### Method 2: Via CLI (Advanced)

```bash
# Set variable
curl -X POST "https://api.render.com/v1/services/srv-d75tk0vdiees73ffd1og/env-vars" \
  -H "Authorization: Bearer rnd_g1qDipOxJ21hHd7suZeCJ52BH92C" \
  -H "Content-Type: application/json" \
  -d '{"key":"OPENROUTER_API_KEY", "value":"your_key_here"}'
```

---

## 📋 Current Render Environment Variables

```
GROQ_API_KEY          = ✅ Configured
GEMINI_API_KEY        = ✅ Configured
OPENROUTER_API_KEY    = ⚠️ Placeholder (add real key)
HUGGINGFACE_API_KEY   = ⚠️ Placeholder (add real key)
NODE_ENV              = production
```

---

## 🧪 Testing Your Setup

After adding API keys:

1. **Wait 1-2 minutes** for Render to redeploy
2. Go to: https://dr-d-h51l.onrender.com/codebank/ai-chat.html
3. Check the **status indicator** (should be green ✅)
4. Select a model from the dropdown
5. Type a test message and click Send
6. If it works, you're all set! 🎉

---

## ⚠️ Troubleshooting

### Status shows red (error)
- Check Render logs: Dashboard → Your Service → Logs
- Ensure API keys are correct (copy-paste carefully)
- Wait for deployment to complete (1-2 minutes)

### No models appear
- Refresh the page (Ctrl+Shift+R)
- Open browser console (F12 → Console)
- Look for error messages

### "API Error" message appears
- Check which model you selected
- Try a different model
- Verify API key in Render Environment Variables

### Rate limited
- Free tiers have rate limits
- Wait a few minutes before retrying
- Consider upgrading to paid tier

---

## 💰 Cost Breakdown (Free Tier)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **Groq** | Unlimited | 🎉 Free |
| **Gemini** | 15 req/min | 🎉 Free |
| **OpenRouter** | ~Free models | Free + Paid options |
| **HuggingFace** | 5 req/min | Free + Pro ($9) |

**Recommendation**: Start with Groq + Gemini (both free, no setup needed). Add OpenRouter for premium models.

---

## 🚀 Next Steps

1. ✅ Groq & Gemini already working
2. (Optional) Add OpenRouter key for more models
3. (Optional) Add HuggingFace key for open-source models
4. Test the chat and enjoy! 🎊

---

## 📚 Resources

- **Groq Docs**: https://console.groq.com/docs
- **OpenRouter Docs**: https://openrouter.ai/docs
- **HuggingFace Docs**: https://huggingface.co/docs
- **Gemini API**: https://ai.google.dev/

---

## 🆘 Need Help?

Check the server logs:
```bash
# View recent errors
cd /tmp/drd2027
tail -n 100 server.log
```

Or check the AI-Chat console:
- Open browser DevTools (F12)
- Go to Console tab
- Look for error messages
- Check Network tab for failed requests
