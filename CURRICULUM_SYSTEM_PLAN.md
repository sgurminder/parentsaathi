# Curriculum & Question Bank System - Design Document

## Overview

A system where teachers can:
1. Define curriculum/chapters for their classes
2. Add content and assessments per chapter
3. Reuse work year-over-year
4. Leverage a global question bank to reduce AI costs

---

## Part 1: Curriculum Management

### Data Structure

```javascript
// School-specific curriculum
curriculum: {
  id: "cur_abc123",
  schoolId: "SNPS",
  academicYear: "2024-25",
  class: "8",
  subject: "Mathematics",
  createdBy: "teacher_phone",

  chapters: [
    {
      id: "ch_001",
      number: 1,
      name: "Rational Numbers",
      description: "Understanding rational numbers and operations",
      ncertChapter: "Chapter 1",  // Link to NCERT for reference
      estimatedHours: 12,

      // Learning objectives
      objectives: [
        "Understand properties of rational numbers",
        "Perform operations on rational numbers",
        "Represent rational numbers on number line"
      ],

      // Sub-topics for granular tracking
      topics: [
        { id: "t1", name: "Properties of Rational Numbers", weightage: 30 },
        { id: "t2", name: "Operations on Rational Numbers", weightage: 40 },
        { id: "t3", name: "Number Line Representation", weightage: 30 }
      ],

      status: "active",  // draft | active | archived
      teachingMethod: "tm_xyz",  // Link to teaching method
      assessments: ["assess_1", "assess_2"],  // Linked assessments

      // Year-over-year tracking
      history: [
        { year: "2023-24", avgScore: 72, studentsCount: 45 },
        { year: "2024-25", avgScore: null, studentsCount: 42 }
      ]
    }
  ],

  // Carry forward settings
  carryForward: {
    fromYear: "2023-24",
    includeContent: true,
    includeAssessments: true,
    resetScores: true
  }
}
```

### Teacher Interface for Curriculum

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Curriculum Manager - Class 8 Mathematics                    │
│  Academic Year: 2024-25                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [+ Add Chapter]  [Import from NCERT]  [Copy from Last Year]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Ch 1: Rational Numbers                        [Edit] [▼]│   │
│  │ ────────────────────────────────────────────────────────│   │
│  │ 📝 Content: Added  │ 📊 Tests: 2  │ 📈 Last Year: 72%  │   │
│  │                                                         │   │
│  │ Topics:                                                 │   │
│  │ ├── Properties of Rational Numbers      [30%] ✓        │   │
│  │ ├── Operations on Rational Numbers      [40%] ✓        │   │
│  │ └── Number Line Representation          [30%] ○        │   │
│  │                                                         │   │
│  │ [Add Teaching Method] [Create Test] [View Questions]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Ch 2: Linear Equations               [Edit] [▼]         │   │
│  │ ────────────────────────────────────────────────────────│   │
│  │ 📝 Content: Pending  │ 📊 Tests: 0  │ 📈 Last Year: 68%│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Global Question Bank

### Why a Global Bank?

| Approach | AI Cost | Quality | Personalization |
|----------|---------|---------|-----------------|
| Generate every time | High ($$$) | Variable | High |
| School-level bank | Medium ($$) | Consistent | Medium |
| **Global bank** | Low ($) | Curated | Medium-High |

### Question Bank Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL QUESTION BANK                      │
│                   (Shared across all schools)                │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Class 6    │  │  Class 7    │  │  Class 8    │  ...    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │    Math     │  │   Science   │  │   English   │  ...    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────┐       │
│  │  Topic: Rational Numbers                         │       │
│  │                                                  │       │
│  │  Questions: 150+                                 │       │
│  │  ├── Easy: 50      (Bloom: Remember/Understand) │       │
│  │  ├── Medium: 60    (Bloom: Apply/Analyze)       │       │
│  │  └── Hard: 40      (Bloom: Evaluate/Create)     │       │
│  │                                                  │       │
│  │  Types: MCQ (80), Fill-blank (30), Short (40)   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SCHOOL-SPECIFIC LAYER                        │
│                                                              │
│  School: SNPS                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Custom Questions (teacher-created)              │       │
│  │  School-specific examples                        │       │
│  │  Questions with school context                   │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Question Data Structure

```javascript
question: {
  id: "q_global_12345",

  // Classification
  board: "CBSE",           // CBSE | ICSE | State boards
  class: "8",
  subject: "Mathematics",
  chapter: "Rational Numbers",
  topic: "Operations on Rational Numbers",
  subtopic: "Multiplication of Rationals",

  // Question content
  type: "mcq",             // mcq | fill_blank | short | long | true_false
  difficulty: "medium",     // easy | medium | hard
  bloomLevel: "apply",      // remember | understand | apply | analyze | evaluate | create

  // The question itself
  content: {
    text: "What is the product of -3/4 and 8/9?",
    latex: "\\frac{-3}{4} \\times \\frac{8}{9} = ?",  // For math rendering
    image: null,           // URL if has image
    audio: null,           // URL if has audio (for language)
  },

  // Options (for MCQ)
  options: [
    { id: "a", text: "-2/3", latex: "\\frac{-2}{3}", isCorrect: true },
    { id: "b", text: "2/3", latex: "\\frac{2}{3}", isCorrect: false },
    { id: "c", text: "-24/36", latex: "\\frac{-24}{36}", isCorrect: false },
    { id: "d", text: "24/36", latex: "\\frac{24}{36}", isCorrect: false }
  ],

  // Answer & explanation
  answer: {
    correct: "a",
    explanation: "Multiply numerators: -3 × 8 = -24. Multiply denominators: 4 × 9 = 36. Simplify: -24/36 = -2/3",
    explanationLatex: "\\frac{-3 \\times 8}{4 \\times 9} = \\frac{-24}{36} = \\frac{-2}{3}",
    explanationSteps: [
      "Multiply the numerators: -3 × 8 = -24",
      "Multiply the denominators: 4 × 9 = 36",
      "Write the fraction: -24/36",
      "Simplify by dividing both by 12: -2/3"
    ]
  },

  // Hints (progressive)
  hints: [
    "Remember: When multiplying fractions, multiply numerators together and denominators together",
    "The sign of the product: negative × positive = negative",
    "Don't forget to simplify your answer"
  ],

  // Metadata
  source: "ai_generated",   // ai_generated | teacher_created | imported | curated
  quality: "verified",      // unverified | verified | expert_reviewed
  language: "en",

  // Usage stats (for optimization)
  stats: {
    timesUsed: 1250,
    avgCorrectRate: 0.62,
    avgTimeSeconds: 45,
    discriminationIndex: 0.35,  // How well it differentiates good/weak students
    feedbackPositive: 89,
    feedbackNegative: 12
  },

  // Tags for smart filtering
  tags: ["fractions", "multiplication", "negative-numbers", "simplification"],

  // Version control
  version: 2,
  createdAt: "2024-01-15",
  updatedAt: "2024-06-20",
  createdBy: "system",      // or teacher_id if custom

  // School-specific overrides (if any)
  schoolOverrides: {
    "SNPS": {
      customHint: "Remember what we discussed in class about the sign rules!",
      localExample: "Like calculating discount on school fees"
    }
  }
}
```

### Question Generation & Storage Flow

```
Teacher requests: "Create 10 MCQs on Rational Numbers - Medium difficulty"
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Check Global Bank       │
                    │   "Rational Numbers" +    │
                    │   "Medium" + "MCQ"        │
                    └───────────────┬───────────┘
                                    │
                    ┌───────────────┴───────────┐
                    │                           │
                    ▼                           ▼
        Found 60 matching              Found < 10 matching
        questions                      questions
                    │                           │
                    ▼                           ▼
        Random select 10              Generate missing via AI
        (weighted by quality)         Store in global bank
                    │                           │
                    └───────────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Create Assessment       │
                    │   Link questions to test  │
                    │   Save to school records  │
                    └───────────────────────────┘
```

### Cost Optimization Strategy

```
Month 1-3: Build initial bank
├── AI generates questions as teachers request
├── All generated questions stored in global bank
├── Cost: High (building inventory)
└── Target: 500+ questions per topic

Month 4+: Reuse & optimize
├── 80% of requests fulfilled from bank
├── AI only for gaps or custom requests
├── Cost: 80% reduction
└── Quality improves via feedback
```

---

## Part 3: Images & Graphics

### Types of Visual Content

| Type | Use Case | Storage | Generation |
|------|----------|---------|------------|
| Diagrams | Geometry, Science | CDN | AI (DALL-E) or Manual |
| Graphs | Math, Data | Generated | Chart.js/D3 |
| Equations | Math, Physics | Rendered | LaTeX → SVG |
| Photos | Science, Geography | CDN | Stock/Upload |
| Illustrations | All subjects | CDN | AI or Designer |

### Image Storage Structure

```javascript
// Question with image
question: {
  id: "q_geo_001",
  content: {
    text: "Find the area of the shaded region in the figure below.",
    images: [
      {
        id: "img_001",
        url: "https://cdn.vidyamitra.ai/questions/geo/shaded_region_001.png",
        thumbnail: "https://cdn.vidyamitra.ai/questions/geo/shaded_region_001_thumb.png",
        alt: "Circle with radius 7cm inscribed in a square",
        position: "below_text",  // below_text | inline | option_a | etc.
        width: 300,
        height: 300
      }
    ]
  },

  // For options with images
  options: [
    { id: "a", text: "154 cm²", image: null },
    { id: "b", text: "49 cm²", image: null },
    { id: "c", text: "42 cm²", image: null },
    { id: "d", text: "196 cm²", image: null }
  ],

  // Explanation with step-by-step images
  answer: {
    explanation: "...",
    images: [
      {
        id: "exp_img_001",
        url: "https://cdn.vidyamitra.ai/explanations/shaded_region_solution.png",
        caption: "Step-by-step solution"
      }
    ]
  }
}
```

### LaTeX Rendering for Math

```javascript
// Store equations in LaTeX, render on client
content: {
  text: "Solve for x:",
  latex: "\\frac{2x + 3}{4} = \\frac{x - 1}{2}",
  // Rendered using MathJax or KaTeX on frontend
}

// For complex diagrams, pre-render to SVG
content: {
  text: "In the triangle ABC shown:",
  svg: "<svg>...</svg>",  // Pre-rendered diagram
  // OR
  tikz: "\\begin{tikzpicture}...\\end{tikzpicture}",  // TikZ for complex math diagrams
}
```

### Image Generation Workflow

```
Teacher creates question: "Draw a right triangle with sides 3, 4, 5"
                                    │
                                    ▼
                    ┌───────────────────────────┐
                    │   Check Image Bank        │
                    │   "right triangle 3-4-5"  │
                    └───────────────┬───────────┘
                                    │
                    ┌───────────────┴───────────┐
                    │                           │
                    ▼                           ▼
            Image exists               Image doesn't exist
                    │                           │
                    ▼                           ▼
            Return URL                Generate options:
                                      1. SVG via code (preferred for geometry)
                                      2. AI image generation (for complex)
                                      3. Queue for manual creation
                                                │
                                                ▼
                                      Store in CDN
                                      Add to image bank
```

---

## Part 4: Database Schema

### KV Store Keys

```javascript
// Global question bank
`questions:global:${class}:${subject}:${topic}` → [question_ids]
`question:${question_id}` → {question_object}

// Question stats (separate for fast updates)
`question:${question_id}:stats` → {usage_stats}

// School curriculum
`school:${schoolId}:curriculum:${year}:${class}:${subject}` → {curriculum_object}

// School's custom questions
`school:${schoolId}:questions:${class}:${subject}` → [question_ids]

// Teacher's assessments
`school:${schoolId}:teacher:${teacherId}:assessments` → [assessment_ids]
`assessment:${assessment_id}` → {assessment_object}

// Image bank
`images:${category}:${tags}` → [image_urls]
`image:${image_id}` → {image_metadata}
```

### Indexes for Fast Lookup

```javascript
// For question search
`idx:questions:${board}:${class}:${subject}:${chapter}:${difficulty}` → [question_ids]
`idx:questions:${board}:${class}:${subject}:${type}` → [question_ids]
`idx:questions:tags:${tag}` → [question_ids]

// For image search
`idx:images:${subject}:${topic}` → [image_ids]
```

---

## Part 5: Implementation Phases

### Phase 1: Curriculum Management (Week 1-2)
- [ ] Add curriculum CRUD in teacher dashboard
- [ ] Import NCERT chapter structure
- [ ] Copy curriculum from previous year
- [ ] Link existing teaching methods to chapters

### Phase 2: Basic Question Bank (Week 3-4)
- [ ] Question data structure
- [ ] Store AI-generated questions
- [ ] Search/filter questions
- [ ] Teacher can select from bank

### Phase 3: Assessment Builder (Week 5-6)
- [ ] Drag-drop question selection
- [ ] Auto-generate from bank
- [ ] Preview assessment
- [ ] Assign to students

### Phase 4: Images & LaTeX (Week 7-8)
- [ ] LaTeX rendering (KaTeX)
- [ ] Image upload for questions
- [ ] SVG generation for geometry
- [ ] Image bank with search

### Phase 5: Optimization (Week 9-10)
- [ ] Question quality scoring
- [ ] Usage analytics
- [ ] Smart question selection
- [ ] Cache frequently used sets

---

## Part 6: Cost Analysis

### Current Cost (No Question Bank)
```
Per assessment (10 questions):
- AI generation: ~$0.05-0.10
- Per school per month: ~50 assessments = $2.50-5.00
- 100 schools: $250-500/month
```

### With Global Question Bank
```
After 6 months (bank built):
- 80% from bank: $0
- 20% new generation: $0.01-0.02 per assessment
- Per school per month: $0.50-1.00
- 100 schools: $50-100/month
- Savings: 80%
```

### Additional Savings
- Cached explanations reduce chat AI costs
- Pre-generated hints reduce follow-up queries
- Quality questions = fewer regeneration requests

---

## Open Questions

1. **Quality Control**: How do we ensure AI-generated questions are accurate?
   - Teacher verification workflow?
   - Community flagging?
   - Expert review for high-stakes topics?

2. **Regional Variations**: Do state boards need separate banks?
   - Start with CBSE, expand to ICSE
   - State boards can map to CBSE topics

3. **Copyright**: Can we use textbook questions?
   - AI-generated original questions only
   - Reference NCERT but don't copy

4. **Versioning**: How to handle curriculum changes?
   - Questions tagged by curriculum year
   - Archive old questions, don't delete

---

*Created: December 15, 2024*
