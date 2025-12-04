# VidyaMitra Development Context
**Last Updated:** December 4, 2025

## Project Overview
VidyaMitra is an AI-powered personalized tutor for Indian schools. It uses WhatsApp as the primary channel, with web dashboards for teachers.

## Current Stack
- **Backend:** Node.js + Express (bot.js)
- **Database:** Vercel KV (Upstash Redis)
- **AI:** OpenAI GPT-4o-mini
- **WhatsApp:** Twilio
- **Hosting:** Vercel (serverless)
- **Domain:** vidyamitra-rho.vercel.app

## Key Files
```
/Users/gurmindersingh/ai/parentsaathi/
├── bot.js           # Main application (2200+ lines)
├── db.js            # Database abstraction layer
├── config.js        # White-label configuration
├── dashboard.html   # Teaching methods dashboard
├── website.html     # Landing page
├── package.json     # Dependencies
└── CONTEXT.md       # This file
```

## Features Completed

### Phase 1: WhatsApp Bot (Done)
- Homework Q&A via WhatsApp
- Image upload + AI processing
- Teacher's method matching
- Diagrams from Wikimedia
- User authorization system
- Rate limiting for unauthorized users

### Phase 2: Teacher Tools (Done)
- Teacher form with AI prefill (`/teacher`)
- Teaching methods dashboard (`/dashboard`)
- File upload for lesson plans
- Admin panel for user management (`/admin`)

### Phase 3: Assessment MVP (Just Completed - Dec 4, 2025)
- Multi-school demo support
- AI question generation
- Test creation with teacher review
- Student test-taking page
- Results dashboard with analytics

## Assessment Feature URLs

### Demo Schools (use ?school=X parameter)
| School | Assessment URL |
|--------|---------------|
| Springfields Academy | `/assessment?school=springfields` |
| Delhi Public School | `/assessment?school=dps` |
| Green Valley International | `/assessment?school=greenvalley` |
| Demo School | `/assessment?school=demo` |

### Routes Added
```
GET  /assessment?school=X        # Teacher creates test
POST /api/generate-questions     # AI generates MCQs
POST /api/tests                  # Save test
GET  /api/tests                  # List tests
GET  /api/tests/:testId          # Get test details
POST /api/tests/:testId/submit   # Student submits
GET  /api/tests/:testId/results  # Get results + analytics
GET  /test/:testId               # Student takes test
GET  /results/:testId            # Teacher views results
GET  /api/schools                # List demo schools
```

## Database Schema (Vercel KV)

### Existing Keys
- `teaching:methods` (hash) - Teaching methods
- `authorized:numbers` (set) - Authorized phone numbers
- `user:{phone}` - User info

### New Keys (Assessment)
- `{school}:tests` (set) - Test IDs for school
- `{school}:test:{testId}` - Test data
- `{school}:test:{testId}:attempts` (set) - Attempt IDs
- `{school}:attempt:{attemptId}` - Attempt data

## Demo Schools Config (in bot.js)
```javascript
const demoSchools = {
    'springfields': {
        id: 'springfields',
        name: 'Springfields Academy',
        shortName: 'Springfields',
        logo: '🏫',
        primaryColor: '#667eea'
    },
    'dps': {
        id: 'dps',
        name: 'Delhi Public School',
        shortName: 'DPS',
        logo: '📚',
        primaryColor: '#1a56db'
    },
    'greenvalley': {
        id: 'greenvalley',
        name: 'Green Valley International',
        shortName: 'GVI',
        logo: '🌿',
        primaryColor: '#059669'
    },
    'demo': {
        id: 'demo',
        name: 'Demo School',
        shortName: 'Demo',
        logo: '🎓',
        primaryColor: '#10b981'
    }
};
```

## Business Decisions Made

| Decision | Choice |
|----------|--------|
| Pricing Model | Per student/month (Rs 30-50) |
| Onboarding | Sales-led (demo calls) |
| Twilio Costs | Bundled (you pay) |
| App Timeline | After first 5 schools validated |

## Go-To-Market Strategy
1. **Teacher Referrals** - Find teachers on LinkedIn, give free access
2. **WhatsApp Viral Demo** - 60-sec demo video for parent groups
3. **LinkedIn Outreach** - DM principals with "Free Pilot" offer
4. **Parent Pressure** - Post in parent forums
5. **Case Study** - After first school success

## Next Steps (Not Yet Built)
- [ ] WhatsApp integration for test distribution
- [ ] More question types (fill-in-blank, short answer)
- [ ] Question bank persistence
- [ ] Bulk student import
- [ ] Parent reports
- [ ] Mobile app (React Native) - after 20 schools

## Technical Plan Document
Full technical design is at:
`/Users/gurmindersingh/.claude/plans/radiant-honking-pony.md`

Contains:
- Multi-tenant architecture design
- PostgreSQL schema for production
- Infrastructure diagram
- Cost estimates
- Migration path from demo to production

## Environment Variables Required
```
OPENAI_API_KEY=sk-...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+14155238886
SCHOOL_NAME=Your School
SCHOOL_SHORT_NAME=YS
DATABASE_TYPE=vercel-kv
```

## Demo Script (15 minutes)

1. **[2 min] Hook**
   - "What if creating a test took 2 minutes instead of 2 hours?"

2. **[4 min] Teacher Demo**
   - Open `/assessment?school=springfields`
   - Select: Class 8, Math, Linear Equations
   - Click "Generate 10 Questions" - AI creates MCQs
   - REVIEW: Deselect 3, edit 1, add 1 custom
   - Click "Create Test" → Get shareable link

3. **[2 min] Student Demo**
   - Open test link on phone
   - Take test, submit
   - See instant results with explanations

4. **[3 min] Results Demo**
   - Teacher sees all scores
   - "Rahul scored 7/10, weak in factorization"
   - Question-wise analysis

5. **[2 min] Integration Pitch**
   - Students who score low can ask VidyaMitra on WhatsApp
   - Homework help + Assessment = Complete solution

6. **[2 min] Q&A + Pilot Signup**

## Git History (Recent)
```
8467ebf Add Assessment MVP with multi-school demo support
b10d293 Improve AI prompt to detect specific chapter names
653a6de Fix subject normalization in teaching method API
5c50e38 Fix topic detection: pass student class
4691c5b Add off-topic query protection and brand identity
2c63063 Add rate limiting for unauthorized users
```

## Contact
- GitHub: https://github.com/sgurminder/parentsaathi
- Support: contact@euleanai.com
