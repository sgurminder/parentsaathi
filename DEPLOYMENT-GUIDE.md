# ParentSaathi - Vercel Deployment Guide
## White-Label School WhatsApp Bot

---

## 🎯 Overview

This guide will help you deploy ParentSaathi as a white-label solution for **Springfield Public School** on Vercel with persistent storage.

### Key Features
- ✅ White-labeled branding (Springfield Public School)
- ✅ Persistent storage (Vercel KV/Redis - survives restarts)
- ✅ Phone number authorization (only registered parents)
- ✅ Multi-child support (1 parent, multiple kids)
- ✅ Demo mode (for pitching without registration)
- ✅ Teacher-specific teaching methods

---

## 📋 Prerequisites

1. **Vercel Account** (free tier works)
2. **Twilio Account** with WhatsApp Sandbox
3. **OpenAI API Key**
4. **Git repository** (GitHub/GitLab/Bitbucket)

---

## 🚀 Step 1: Vercel Setup

### 1.1 Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project directory)
cd /Users/gurmindersingh/ai/parentsaathi
vercel
```

### 1.2 Create Vercel KV Database

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Name it: `parentsaathi-db`
7. Click **Create**

Vercel will automatically add these environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

---

## 🔧 Step 2: Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+14155238886

# Database
DATABASE_TYPE=vercel-kv

# Demo Mode (set to 'false' for production)
DEMO_MODE=true

# Node
NODE_ENV=production
```

---

## 📱 Step 3: Configure Twilio Webhook

1. Go to Twilio Console: https://console.twilio.com
2. Navigate to: **Messaging** → **WhatsApp Sandbox**
3. Set webhook URL to your Vercel URL:
   ```
   https://your-project.vercel.app/webhook
   ```
4. Method: **POST**
5. Click **Save**

---

## 👥 Step 4: Managing Authorized Numbers

### Option A: Demo Mode (For Pitching)

Keep `DEMO_MODE=true` in environment variables. Add demo numbers in `config.js`:

```javascript
demoNumbers: ['+919590105978', '+91XXXXXXXXXX']
```

**Demo mode allows these numbers to access without registration.**

### Option B: Production Mode (Real School)

1. Set `DEMO_MODE=false`
2. Authorize numbers via API:

```bash
# Authorize a parent's number
curl -X POST https://your-project.vercel.app/api/authorize \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: your-admin-secret" \
  -d '{
    "phone": "+919876543210",
    "studentName": "Rahul Sharma",
    "class": 8,
    "section": "A",
    "parentName": "Mr. Sharma"
  }'
```

3. Or bulk upload via CSV (create admin panel)

---

## 👨‍👩‍👧‍👦 Step 5: Multi-Child Support

Parents can register multiple children:

**WhatsApp Flow:**
```
Parent: Hi
Bot: Welcome! Select child:
     1️⃣ Rahul (Class 8A)
     2️⃣ Priya (Class 6B)
     ➕ Add new child

Parent: 1
Bot: Selected Rahul (Class 8A). Send homework question!
```

---

## 🎨 Step 6: White-Label Customization

Edit `config.js` to customize branding:

```javascript
school: {
    name: 'Springfield Public School',
    shortName: 'Springfield',
    logo: 'https://springfield.edu/logo.png',
    supportEmail: 'support@springfield.edu',
    supportPhone: '+91-9876543210'
}
```

---

## 📊 Step 7: Adding Teaching Methods

### Via Google Form

1. Teachers fill the form
2. Apps Script sends to: `https://your-project.vercel.app/api/form-webhook`
3. Auto-stored in Vercel KV

### Via API

```bash
curl -X POST https://your-project.vercel.app/api/teaching-method \
  -H "Content-Type: application/json" \
  -d '{
    "teacher": "Mrs. Sharma",
    "subject": "Mathematics",
    "classLevel": 8,
    "chapter": "Linear Equations",
    "method": "Step-by-step method...",
    "example": "Real-life example...",
    "commonMistakes": "Students often...",
    "tips": "Remember to..."
  }'
```

---

## 🧪 Step 8: Testing the Deployment

### 1. Test Health Endpoint
```bash
curl https://your-project.vercel.app/
```

### 2. Test WhatsApp Bot
Send to Twilio sandbox number:
```
Hi
```

### 3. Check Logs
```bash
vercel logs
```

---

## 🎭 Demo Mode vs Production Mode

| Feature | Demo Mode | Production Mode |
|---------|-----------|----------------|
| Phone Verification | ❌ Disabled for demo numbers | ✅ Required |
| Registration | ❌ Auto-approve | ✅ Must be pre-authorized |
| Data Persistence | ✅ Vercel KV | ✅ Vercel KV |
| Best For | **Pitching to schools** | **Live deployment** |

---

## 🎬 How to Demo Without Registration

**For School Pitch:**

1. Keep `DEMO_MODE=true`
2. Add your demo phone in `config.js`:
   ```javascript
   demoNumbers: ['+919590105978']
   ```
3. Show them:
   - Send "Hi" → Instant access (no registration)
   - Ask homework question → Get teacher's method
   - Show dashboard with analytics
   - Explain: "For production, we enable phone verification"

**Pitch Points:**
- "This is YOUR school's bot with YOUR branding"
- "Only registered Springfield parents can access"
- "Uses YOUR teachers' exact teaching methods"
- "Data stored securely, never lost"

---

## 🔒 Security Best Practices

1. **Use environment variables** - Never commit secrets
2. **Enable phone verification** in production
3. **Add rate limiting** (50 queries/day per parent)
4. **Use HTTPS only** (Vercel does this automatically)
5. **Add admin authentication** for management APIs

---

## 📈 Monitoring & Analytics

### View Logs
```bash
vercel logs --follow
```

### Check Database
```bash
# Install Vercel CLI KV commands
vercel kv list

# View authorized numbers
vercel kv smembers authorized:numbers
```

---

## 🐛 Troubleshooting

### Bot not responding
- Check Vercel logs: `vercel logs`
- Verify Twilio webhook URL
- Check environment variables

### Data not persisting
- Ensure `DATABASE_TYPE=vercel-kv`
- Verify KV environment variables
- Check Vercel KV dashboard

### Authorization failing
- Check if DEMO_MODE is enabled
- Verify phone number format (+91...)
- Check authorized numbers in KV

---

## 🚀 Going Live Checklist

- [ ] Set `DEMO_MODE=false`
- [ ] Upload authorized phone numbers
- [ ] Add all teacher methods
- [ ] Test with real parent numbers
- [ ] Set up monitoring/alerts
- [ ] Train teachers on form submission
- [ ] Create parent onboarding guide
- [ ] Set up support email/phone

---

## 💰 Cost Estimate (Monthly)

| Service | Free Tier | Paid (1000 parents) |
|---------|-----------|---------------------|
| Vercel | 100GB bandwidth | $20/month |
| Vercel KV | 256MB storage | $5-10/month |
| Twilio WhatsApp | $0.005/msg | ~$100/month |
| OpenAI API | - | ~$50/month |
| **Total** | **~$0** (demo) | **~$170/month** |

---

## 📞 Support

For deployment help:
- Email: support@springfield.edu
- Phone: +91-9876543210
- Docs: https://docs.parentsaathi.com

---

**Ready to deploy? Run `vercel` and follow the prompts!** 🚀
