# VidyaMitra - Technical Scaling Roadmap

## Current Stack (Phase 0)
- **Runtime:** Node.js (Express)
- **Database:** Vercel KV (Redis-based)
- **Hosting:** Vercel (Serverless)
- **AI:** OpenAI API
- **Messaging:** Twilio (WhatsApp)

**Suitable for:** 1-3 schools, ~1000 students

---

## Phase 1: Foundation (Before 10 Schools)

### Trigger Points
- More than 3 schools onboarded
- bot.js exceeds 15,000 lines
- Vercel KV costs exceed $50/month
- Need for complex queries (reports, analytics)

### Changes Required

#### 1. Code Restructuring
```
Current:
└── bot.js (single 10K+ line file)

Target:
├── src/
│   ├── index.js              # Entry point
│   ├── config/
│   │   └── database.js       # DB connections
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── chat.js           # /webhook, chat APIs
│   │   ├── teacher.js        # /api/teacher/*
│   │   ├── admin.js          # /api/admin/*
│   │   └── pwa.js            # PWA routes
│   ├── services/
│   │   ├── ai.js             # OpenAI interactions
│   │   ├── whatsapp.js       # Twilio/WhatsApp
│   │   ├── curriculum.js     # Curriculum logic
│   │   └── assessment.js     # Test generation
│   ├── models/
│   │   ├── user.js
│   │   ├── school.js
│   │   ├── curriculum.js
│   │   └── question.js
│   └── utils/
│       ├── validators.js
│       └── helpers.js
├── views/                    # HTML templates (if separated)
└── package.json
```

#### 2. Database Migration: Vercel KV → PostgreSQL

**Add Vercel Postgres** (or Supabase):
```sql
-- Core tables needed
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,  -- 'SNPS', 'DPS', etc.
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL,  -- 'student', 'teacher', 'admin'
    school_id INTEGER REFERENCES schools(id),
    class VARCHAR(10),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(phone, school_id)
);

CREATE TABLE curriculum (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id),
    teacher_id INTEGER REFERENCES users(id),
    class VARCHAR(10) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    chapter VARCHAR(255) NOT NULL,
    content TEXT,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER REFERENCES curriculum(id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(20),  -- 'mcq', 'short', 'long'
    options JSONB,
    answer TEXT,
    bloom_level VARCHAR(20),    -- 'remember', 'understand', etc.
    difficulty VARCHAR(10),     -- 'easy', 'medium', 'hard'
    times_used INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    message TEXT,
    response TEXT,
    topic VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Keep Redis for:**
- Session tokens
- OTP storage (with TTL)
- Rate limiting
- Caching frequent queries

#### 3. Migration Strategy
```javascript
// Dual-write during migration
async function saveUser(userData) {
    // Write to both during transition
    await db.kv.set(`user:${phone}`, userData);  // Old
    await db.postgres.users.upsert(userData);     // New
}

// Gradual read migration
async function getUser(phone) {
    // Try new first, fallback to old
    let user = await db.postgres.users.findByPhone(phone);
    if (!user) {
        user = await db.kv.get(`user:${phone}`);
        if (user) {
            // Migrate on read
            await db.postgres.users.upsert(user);
        }
    }
    return user;
}
```

### Estimated Effort: 2-3 weeks

---

## Phase 2: Production Ready (Before 100 Schools)

### Trigger Points
- More than 10 schools
- Vercel serverless timeouts occurring
- Need for background jobs (reports, bulk operations)
- Costs exceeding $200/month on Vercel

### Changes Required

#### 1. Move to Container Hosting
**Options:**
- Railway (easiest migration from Vercel)
- Render
- AWS ECS / Google Cloud Run
- DigitalOcean App Platform

**Benefits:**
- No cold starts
- Longer running processes
- WebSocket support for real-time
- More control over resources

#### 2. Add Job Queue
```javascript
// Bull queue for background jobs
const Queue = require('bull');

const reportQueue = new Queue('reports', redisUrl);
const notificationQueue = new Queue('notifications', redisUrl);

// Producer
reportQueue.add('weekly-report', {
    schoolId: 'SNPS',
    reportType: 'performance'
}, {
    repeat: { cron: '0 6 * * MON' }  // Every Monday 6 AM
});

// Consumer
reportQueue.process('weekly-report', async (job) => {
    const report = await generateWeeklyReport(job.data);
    await sendReportToAdmin(report);
});
```

#### 3. Add Proper Logging & Monitoring
```javascript
// Structured logging with Pino
const logger = require('pino')();

logger.info({
    event: 'chat_message',
    userId: user.id,
    schoolId: school.code,
    topic: detectedTopic,
    responseTime: 230
}, 'Chat response sent');

// Error tracking with Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

#### 4. Add Caching Layer
```javascript
// Redis caching for expensive queries
async function getSchoolCurriculum(schoolId, classNum, subject) {
    const cacheKey = `curriculum:${schoolId}:${classNum}:${subject}`;

    let data = await redis.get(cacheKey);
    if (data) return JSON.parse(data);

    data = await db.curriculum.findMany({...});
    await redis.setex(cacheKey, 3600, JSON.stringify(data));  // 1 hour

    return data;
}
```

### Estimated Effort: 4-6 weeks

---

## Phase 3: Scale (Before 1000 Schools)

### Trigger Points
- 100+ schools
- Millions of daily API calls
- Complex analytics requirements
- Multi-region presence needed

### Changes Required

#### 1. Kubernetes Deployment
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vidyamitra-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vidyamitra-api
  template:
    spec:
      containers:
      - name: api
        image: vidyamitra/api:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vidyamitra-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vidyamitra-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### 2. Microservices Split
```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    (Kong / Nginx)                            │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    Auth     │ │    Chat     │ │ Curriculum  │ │  Analytics  │
│   Service   │ │   Service   │ │   Service   │ │   Service   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌─────────────┐         ┌─────────────┐
            │  PostgreSQL │         │ ClickHouse  │
            │   (OLTP)    │         │   (OLAP)    │
            └─────────────┘         └─────────────┘
```

#### 3. Analytics Data Warehouse
```sql
-- ClickHouse for analytics (columnar, fast aggregations)
CREATE TABLE chat_events (
    event_date Date,
    event_time DateTime,
    school_id String,
    user_id UInt64,
    topic String,
    response_time_ms UInt32,
    tokens_used UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (school_id, event_date, user_id);

-- Fast queries like:
SELECT
    school_id,
    topic,
    count() as questions,
    avg(response_time_ms) as avg_response
FROM chat_events
WHERE event_date >= today() - 30
GROUP BY school_id, topic
ORDER BY questions DESC;
```

#### 4. Multi-Region Setup
- Primary in India (Mumbai)
- Read replicas in other regions
- CDN for static assets
- Regional message queues

### Estimated Effort: 3-6 months

---

## Decision Log

| Date | Decision | Reason |
|------|----------|--------|
| Dec 2024 | Start with Vercel + KV | Fast iteration, low cost for MVP |
| Dec 2024 | Single bot.js file | Rapid development, easy debugging |
| TBD | Add PostgreSQL | Complex queries needed for curriculum/analytics |
| TBD | Move to containers | Serverless limits hitting |
| TBD | Kubernetes | Auto-scaling for 1000+ schools |

---

## Cost Projections

| Phase | Schools | Monthly Cost | Main Components |
|-------|---------|--------------|-----------------|
| 0 (Current) | 1-3 | $20-50 | Vercel Pro, KV |
| 1 | 3-10 | $50-150 | + Postgres |
| 2 | 10-100 | $200-800 | Railway/Render, Redis, Monitoring |
| 3 | 100-1000 | $2000-10000 | Kubernetes, Multi-DB, CDN |

---

## Key Principles

1. **Don't optimize prematurely** - Current stack works fine for 3 schools
2. **Migrate incrementally** - Dual-write, gradual cutover
3. **Keep Node.js** - It scales fine, architecture matters more
4. **Data is the moat** - Invest in proper data modeling early
5. **Monitor before scaling** - Know your bottlenecks before fixing them

---

## When to Start Phase 1

**Start code restructuring when ANY of these happen:**
- [ ] 4th school onboarded
- [ ] bot.js exceeds 12,000 lines
- [ ] First complex report requested
- [ ] Vercel KV bill > $30/month

---

*Last Updated: December 15, 2024*
