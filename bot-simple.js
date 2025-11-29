// =====================================================
// PARENTSAATHI - SIMPLEST INTEGRATION (FOR DEMO)
// =====================================================
// 
// This is the EASIEST approach - no Google Sheets API needed!
// Google Form → Apps Script webhook → Bot memory
//
// =====================================================

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// =====================================================
// IN-MEMORY "DATABASE" 
// Teaching methods stored here, updated via webhook
// =====================================================

const teachingMethods = {
    // Pre-loaded demo data (will be updated by form submissions)
    // Key format: "schoolCode-class-subject-chapter" (all lowercase, spaces removed)
};

// Helper to create key
function createKey(schoolCode, classLevel, subject, chapter) {
    const clean = (s) => s.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${clean(schoolCode)}-${clean(classLevel)}-${clean(subject)}-${clean(chapter)}`;
}

// =====================================================
// PRE-LOAD DEMO DATA
// =====================================================

function loadDemoData() {
    // Math - Linear Equations
    teachingMethods[createKey('demo', 8, 'math', 'linear equations')] = {
        teacher: 'Mrs. Sharma',
        class: 8,
        subject: 'Mathematics',
        chapter: 'Linear Equations',
        method: `I teach using the BALANCE method:
1. Think of equation as a weighing scale
2. Both sides must stay equal
3. Whatever you do to one side, do to the other
4. Goal: Get x alone on one side
5. First remove constants, then coefficients`,
        example: `Like a see-saw - if you add weight to one side, add same to other side to keep it balanced. 
2x + 5 = 11
Subtract 5 from both: 2x = 6
Divide both by 2: x = 3`,
        mistakes: `Forgetting to change sign when moving terms. If +5 moves across =, it becomes -5!`,
        tips: `Always verify by putting answer back in original equation.`
    };

    // Math - Quadratic Equations
    teachingMethods[createKey('demo', 10, 'math', 'quadratic equations')] = {
        teacher: 'Mrs. Sharma',
        class: 10,
        subject: 'Mathematics',
        chapter: 'Quadratic Equations',
        method: `For factorization, use "Split the Middle Term":
1. Write in form ax² + bx + c = 0
2. Find two numbers that MULTIPLY to give a×c
3. Those same numbers must ADD to give b
4. Split middle term using these numbers
5. Factor by grouping
6. Solve each factor = 0`,
        example: `x² + 5x + 6 = 0
Need: multiply to 6, add to 5 → That's 2 and 3!
x² + 2x + 3x + 6 = 0
x(x+2) + 3(x+2) = 0
(x+2)(x+3) = 0
x = -2 or x = -3`,
        mistakes: `Forgetting there are usually TWO answers in quadratic equations!`,
        tips: `Try factorization first. Use formula only when factorization is hard.`
    };

    // Science - Photosynthesis
    teachingMethods[createKey('demo', 8, 'science', 'photosynthesis')] = {
        teacher: 'Mr. Verma',
        class: 8,
        subject: 'Science',
        chapter: 'Photosynthesis',
        method: `I teach it as a COOKING RECIPE:
- Kitchen = Leaf (chloroplast)
- Chef = Chlorophyll (green pigment)
- Ingredients = CO2 + Water + Sunlight
- Dish = Glucose (food)
- Byproduct = Oxygen`,
        example: `Just like mom needs ingredients + stove + recipe to cook, plants need CO2 + water + sunlight + chlorophyll to make food!
6CO2 + 6H2O + Light → C6H12O6 + 6O2`,
        mistakes: `Confusing photosynthesis (MAKING food) with respiration (USING food). They're opposite!`,
        tips: `Photo = Light, Synthesis = Making. So Photosynthesis = Making using Light!`
    };

    // Add more as needed...
    
    console.log(`📚 Loaded ${Object.keys(teachingMethods).length} demo teaching methods`);
}

// =====================================================
// GOOGLE FORM WEBHOOK
// Form submissions come here and update our "database"
// =====================================================

/**
 * Receives data from Google Form via Apps Script webhook
 * 
 * Setup in Google Apps Script:
 * 
 * function onFormSubmit(e) {
 *   var data = {
 *     school: 'demo',
 *     teacher: e.values[1],
 *     class: e.values[2],
 *     subject: e.values[3],
 *     chapter: e.values[4],
 *     method: e.values[5],
 *     example: e.values[6],
 *     mistakes: e.values[7],
 *     tips: e.values[8]
 *   };
 *   
 *   UrlFetchApp.fetch('https://your-bot-url/api/add-method', {
 *     method: 'post',
 *     contentType: 'application/json',
 *     payload: JSON.stringify(data)
 *   });
 * }
 */
app.post('/api/add-method', (req, res) => {
    try {
        const { school, teacher, class: classLevel, subject, chapter, method, example, mistakes, tips } = req.body;
        
        const key = createKey(school || 'demo', classLevel, subject, chapter);
        
        teachingMethods[key] = {
            teacher,
            class: parseInt(classLevel),
            subject,
            chapter,
            method,
            example,
            mistakes,
            tips,
            addedAt: new Date().toISOString()
        };
        
        console.log(`✅ Added teaching method: ${key} by ${teacher}`);
        res.json({ success: true, key, totalMethods: Object.keys(teachingMethods).length });
    } catch (error) {
        console.error('Error adding method:', error);
        res.status(500).json({ error: error.message });
    }
});

// View all methods (for debugging)
app.get('/api/methods', (req, res) => {
    res.json({
        count: Object.keys(teachingMethods).length,
        methods: teachingMethods
    });
});

// =====================================================
// FIND TEACHING METHOD
// Simple string matching - NO VECTOR DB!
// =====================================================

function findTeachingMethod(schoolCode, classLevel, subject, chapter) {
    // Try exact match first
    const exactKey = createKey(schoolCode, classLevel, subject, chapter);
    if (teachingMethods[exactKey]) {
        console.log(`✅ Exact match found: ${exactKey}`);
        return teachingMethods[exactKey];
    }

    // Try fuzzy match - search through all methods
    const searchSubject = subject.toLowerCase();
    const searchChapter = chapter.toLowerCase();
    
    for (const [key, method] of Object.entries(teachingMethods)) {
        if (!key.startsWith(schoolCode)) continue;
        
        const keyParts = key.split('-');
        const methodClass = parseInt(keyParts[1]);
        const methodSubject = keyParts[2];
        const methodChapter = keyParts.slice(3).join('-');
        
        // Match class and (subject OR chapter contains search term)
        if (methodClass === classLevel) {
            if (methodSubject.includes(searchSubject) || searchSubject.includes(methodSubject)) {
                if (methodChapter.includes(searchChapter.replace(/\s+/g, '-')) || 
                    searchChapter.includes(methodChapter.replace(/-/g, ' '))) {
                    console.log(`✅ Fuzzy match found: ${key}`);
                    return method;
                }
            }
        }
    }

    // Try even broader - just subject match
    for (const [key, method] of Object.entries(teachingMethods)) {
        if (!key.startsWith(schoolCode)) continue;
        
        if (key.includes(searchSubject) && key.includes(classLevel.toString())) {
            console.log(`⚠️ Broad match found: ${key}`);
            return method;
        }
    }

    console.log(`❌ No match found for: ${schoolCode}-${classLevel}-${subject}-${chapter}`);
    return null;
}

// =====================================================
// GPT FUNCTIONS
// =====================================================

async function identifyTopic(question, imageUrl = null) {
    const messages = [{
        role: "system",
        content: `Identify the school subject, class level, and chapter for this homework question.
        Respond ONLY in JSON: {"subject": "math", "class": 8, "chapter": "linear equations"}`
    }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: "What subject, class, and chapter is this?" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: question });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            max_tokens: 100
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: "unknown", class: 8, chapter: "unknown" };
    } catch (e) {
        console.error('Topic identification error:', e.message);
        return { subject: "unknown", class: 8, chapter: "unknown" };
    }
}

async function generateResponse(question, method, imageUrl = null) {
    const prompt = `You are explaining homework using ${method.teacher}'s teaching style.

${method.teacher}'s METHOD:
${method.method}

${method.teacher}'s EXAMPLE:
${method.example}

COMMON MISTAKES:
${method.mistakes}

TIPS:
${method.tips}

Rules:
1. Start with "Here's how ${method.teacher} explains this:"
2. Use the SAME method and examples
3. Be warm and encouraging
4. Mention common mistakes
5. Max 280 words`;

    const messages = [{ role: "system", content: prompt }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: question || "Explain this homework" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: question });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 450
    });

    return response.choices[0].message.content;
}

async function generateGenericResponse(question, topic, imageUrl = null) {
    const prompt = `You are a friendly homework helper for Indian school students.
This is ${topic.subject} for Class ${topic.class}, chapter: ${topic.chapter}.
Give a clear, step-by-step explanation in under 250 words.
End with: "📝 I'll ask your teacher to add their method for this topic!"`;

    const messages = [{ role: "system", content: prompt }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: question || "Explain this" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: question });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 350
    });

    return response.choices[0].message.content;
}

// =====================================================
// USER SESSIONS
// =====================================================

const sessions = {};

// =====================================================
// WHATSAPP WEBHOOK
// =====================================================

app.post('/webhook', async (req, res) => {
    const twiml = new MessagingResponse();
    
    try {
        const from = req.body.From;
        const body = (req.body.Body || '').trim();
        const mediaUrl = parseInt(req.body.NumMedia || 0) > 0 ? req.body.MediaUrl0 : null;

        console.log(`\n📱 ${from}: ${body}${mediaUrl ? ' [+image]' : ''}`);

        // Get or create session
        if (!sessions[from]) {
            sessions[from] = { registered: false, school: 'demo', class: 8 };
        }
        const session = sessions[from];

        // Registration flow
        if (!session.registered) {
            if (body.toLowerCase().match(/hi|hello|start/)) {
                twiml.message(`Welcome to ParentSaathi! 🎓

I explain homework using YOUR teacher's methods.

To start, tell me your class:
Example: "Class 8" or "Class 10"`);
            }
            else if (body.toLowerCase().includes('class')) {
                const classMatch = body.match(/\d+/);
                session.class = classMatch ? parseInt(classMatch[0]) : 8;
                session.registered = true;
                twiml.message(`✅ Great! Class ${session.class} registered.

Now send any homework question or photo! 📸`);
            }
            else {
                twiml.message(`Say "Hi" to start! 👋`);
            }
        }
        // Homework flow
        else {
            if (body === '👍') {
                twiml.message(`Thank you! Happy to help! 🙏`);
            }
            else if (body === '👎') {
                twiml.message(`Sorry! I'll improve. What was confusing?`);
            }
            else {
                // 1. Identify topic
                const topic = await identifyTopic(body, mediaUrl);
                console.log('📚 Topic:', topic);

                // 2. Find teacher method (simple lookup, NO vector DB!)
                const method = findTeachingMethod(
                    session.school,
                    topic.class || session.class,
                    topic.subject,
                    topic.chapter
                );

                // 3. Generate response
                let response;
                if (method) {
                    response = await generateResponse(body, method, mediaUrl);
                    response += '\n\n---\nHelpful? 👍 or 👎';
                } else {
                    response = await generateGenericResponse(body, topic, mediaUrl);
                }

                twiml.message(response);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        twiml.message('Oops! Something went wrong. Please try again.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// =====================================================
// STATUS PAGE
// =====================================================

app.get('/', (req, res) => {
    const methodsList = Object.entries(teachingMethods).map(([key, m]) => 
        `• ${m.chapter} (Class ${m.class} ${m.subject}) - by ${m.teacher}`
    ).join('\n');

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ParentSaathi Bot Status</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #667eea; }
        .status { background: #dcfce7; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .methods { background: #f1f5f9; padding: 20px; border-radius: 10px; white-space: pre-wrap; }
        code { background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🎓 ParentSaathi Schools Bot</h1>
    <div class="status">
        <strong>✅ Status:</strong> Running<br>
        <strong>📚 Teaching Methods:</strong> ${Object.keys(teachingMethods).length} loaded
    </div>
    <h3>Loaded Methods:</h3>
    <div class="methods">${methodsList || 'No methods loaded yet'}</div>
    <h3>API Endpoints:</h3>
    <ul>
        <li><code>POST /webhook</code> - WhatsApp webhook</li>
        <li><code>POST /api/add-method</code> - Add teaching method (from Google Form)</li>
        <li><code>GET /api/methods</code> - View all methods</li>
    </ul>
</body>
</html>
    `);
});

// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 3000;

loadDemoData(); // Pre-load demo methods

app.listen(PORT, () => {
    console.log(`\n🚀 ParentSaathi Bot running on http://localhost:${PORT}`);
    console.log(`📋 WhatsApp Webhook: http://localhost:${PORT}/webhook`);
    console.log(`📝 Add Method API: http://localhost:${PORT}/api/add-method\n`);
});
