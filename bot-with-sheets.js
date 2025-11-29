// =====================================================
// PARENTSAATHI SCHOOLS - BOT WITH GOOGLE SHEETS
// =====================================================
// No vector database needed! Uses simple Sheet lookup.
// =====================================================

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');
const { google } = require('googleapis');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =====================================================
// CONFIGURATION
// =====================================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Google Sheets Configuration
// Each school has its own Google Sheet
const SCHOOL_SHEETS = {
    'demo-school': {
        spreadsheetId: process.env.DEMO_SCHOOL_SHEET_ID, // e.g., "1ABC...xyz"
        name: 'Demo Public School',
        sheetName: 'TeachingMethods' // Tab name in the spreadsheet
    },
    'dps-noida': {
        spreadsheetId: process.env.DPS_NOIDA_SHEET_ID,
        name: 'DPS Noida',
        sheetName: 'TeachingMethods'
    }
    // Add more schools here
};

// Google Sheets API setup
let sheetsApi = null;

async function initGoogleSheets() {
    // Option 1: Using Service Account (recommended for production)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
        sheetsApi = google.sheets({ version: 'v4', auth });
    }
    // Option 2: Using API Key (simpler, for public sheets)
    else if (process.env.GOOGLE_API_KEY) {
        sheetsApi = google.sheets({ 
            version: 'v4', 
            auth: process.env.GOOGLE_API_KEY 
        });
    }
    console.log('Google Sheets API initialized');
}

// =====================================================
// GOOGLE SHEETS FUNCTIONS
// =====================================================

/**
 * Fetch all teaching methods from a school's Google Sheet
 * Sheet structure:
 * | Teacher | Class | Subject | Chapter | Topic | Method | Example | Mistakes | Tips |
 */
async function getTeachingMethodsFromSheet(schoolCode) {
    const school = SCHOOL_SHEETS[schoolCode];
    if (!school || !sheetsApi) {
        console.log('School not found or Sheets API not ready');
        return [];
    }

    try {
        const response = await sheetsApi.spreadsheets.values.get({
            spreadsheetId: school.spreadsheetId,
            range: `${school.sheetName}!A2:I`, // Skip header row
        });

        const rows = response.data.values || [];
        
        // Convert rows to objects
        return rows.map(row => ({
            teacher: row[0] || '',
            class: parseInt(row[1]) || 0,
            subject: (row[2] || '').toLowerCase(),
            chapter: (row[3] || '').toLowerCase(),
            topic: (row[4] || '').toLowerCase(),
            method: row[5] || '',
            example: row[6] || '',
            mistakes: row[7] || '',
            tips: row[8] || ''
        }));
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error.message);
        return [];
    }
}

/**
 * Find matching teaching method using simple filtering
 * NO VECTOR DB - just string matching!
 */
async function findTeachingMethod(schoolCode, classLevel, subject, chapter) {
    const methods = await getTeachingMethodsFromSheet(schoolCode);
    
    // Normalize search terms
    const searchSubject = subject.toLowerCase().trim();
    const searchChapter = chapter.toLowerCase().trim();
    
    // Simple filter - exact match on class & subject, fuzzy on chapter
    const matches = methods.filter(m => {
        const classMatch = m.class === classLevel;
        const subjectMatch = m.subject.includes(searchSubject) || 
                           searchSubject.includes(m.subject);
        const chapterMatch = m.chapter.includes(searchChapter) || 
                            searchChapter.includes(m.chapter);
        
        return classMatch && subjectMatch && chapterMatch;
    });

    // Return best match (first one found)
    if (matches.length > 0) {
        console.log(`Found ${matches.length} matching methods`);
        return matches[0];
    }

    // Try broader match (just subject + class)
    const broaderMatches = methods.filter(m => 
        m.class === classLevel && 
        (m.subject.includes(searchSubject) || searchSubject.includes(m.subject))
    );

    if (broaderMatches.length > 0) {
        console.log('Using broader subject match');
        return broaderMatches[0];
    }

    return null;
}

// =====================================================
// GPT FUNCTIONS
// =====================================================

/**
 * Use GPT to identify class, subject, chapter from question
 */
async function identifyTopic(question, imageUrl = null) {
    const messages = [
        {
            role: "system",
            content: `You are a classifier for Indian school curriculum (CBSE/ICSE).
            Given a homework question, identify:
            1. Subject (math/science/english/hindi/social studies)
            2. Class level (1-12)
            3. Chapter name (be specific)
            4. Topic (specific concept)
            
            Respond ONLY in JSON format:
            {"subject": "math", "class": 8, "chapter": "linear equations", "topic": "solving equations"}`
        }
    ];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: "Identify the subject, class, and chapter:" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({
            role: "user",
            content: `Identify: "${question}"`
        });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 150
    });

    try {
        const content = response.choices[0].message.content;
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
        console.error('Error parsing topic:', e);
        return { subject: "unknown", class: 8, chapter: "unknown", topic: "unknown" };
    }
}

/**
 * Generate response using teacher's method
 */
async function generateTeacherResponse(question, teachingMethod, imageUrl = null) {
    const systemPrompt = `You are a homework helper using ${teachingMethod.teacher}'s teaching method.

IMPORTANT: Explain EXACTLY how ${teachingMethod.teacher} teaches this concept.

${teachingMethod.teacher}'s Method:
${teachingMethod.method}

${teachingMethod.teacher}'s Example:
${teachingMethod.example}

Common Mistakes to Warn About:
${teachingMethod.mistakes}

Tips:
${teachingMethod.tips}

Instructions:
1. Start with: "Here's how ${teachingMethod.teacher} explains this:"
2. Use the EXACT same method and examples
3. Be warm, encouraging, like talking to a parent
4. Mention common mistakes to watch for
5. Keep response under 300 words
6. End with a helpful tip`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: question || "Please explain this homework problem" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: question });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500
    });

    return response.choices[0].message.content;
}

/**
 * Generate generic response when no teacher method found
 */
async function generateGenericResponse(question, topicInfo, imageUrl = null) {
    const systemPrompt = `You are a helpful homework assistant for Indian school students.
    
This is a ${topicInfo.subject} question for Class ${topicInfo.class}.
Chapter: ${topicInfo.chapter}

Provide a clear, step-by-step explanation. Use simple language.
Keep response under 250 words.

End with: "📝 Note: I'll ask your teacher to add their specific method for this topic!"`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: question || "Please explain this" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({ role: "user", content: question });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 400
    });

    return response.choices[0].message.content;
}

// =====================================================
// USER SESSION MANAGEMENT
// =====================================================

const userSessions = {};

function getSession(phone) {
    if (!userSessions[phone]) {
        userSessions[phone] = {
            registered: false,
            schoolCode: null,
            class: null
        };
    }
    return userSessions[phone];
}

// =====================================================
// WHATSAPP WEBHOOK
// =====================================================

app.post('/webhook', async (req, res) => {
    const twiml = new MessagingResponse();
    
    try {
        const from = req.body.From;
        const body = (req.body.Body || '').trim();
        const numMedia = parseInt(req.body.NumMedia || 0);
        const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;

        console.log(`\n📱 Message from ${from}: ${body}`);
        if (mediaUrl) console.log(`📷 Image: ${mediaUrl}`);

        const session = getSession(from);

        // ─────────────────────────────────────────────
        // REGISTRATION FLOW
        // ─────────────────────────────────────────────
        if (!session.registered) {
            const lowerBody = body.toLowerCase();
            
            if (lowerBody.includes('hi') || lowerBody.includes('hello') || lowerBody.includes('start')) {
                twiml.message(`Welcome to ParentSaathi! 🎓

I help with homework using YOUR teacher's methods.

Please tell me:
1. School name
2. Class (e.g., Class 8)

Example: "Demo School, Class 8"`);
            }
            else if (lowerBody.includes('demo') && lowerBody.includes('8')) {
                session.registered = true;
                session.schoolCode = 'demo-school';
                session.class = 8;
                
                twiml.message(`✅ Registered!

School: Demo Public School
Class: 8

Now send any homework question or photo! 📸`);
            }
            else if (lowerBody.includes('class')) {
                // Try to extract class number
                const classMatch = body.match(/class\s*(\d+)/i);
                if (classMatch) {
                    session.registered = true;
                    session.schoolCode = 'demo-school'; // Default for demo
                    session.class = parseInt(classMatch[1]);
                    
                    twiml.message(`✅ Registered for Class ${session.class}!

Send any homework question or photo to get started! 📸`);
                } else {
                    twiml.message(`Please specify your class. Example: "Class 8"`);
                }
            }
            else {
                twiml.message(`Please say "Hi" to get started!`);
            }
        }
        // ─────────────────────────────────────────────
        // HOMEWORK HELP FLOW
        // ─────────────────────────────────────────────
        else {
            // Handle feedback
            if (body === '👍' || body.toLowerCase() === 'helpful') {
                twiml.message(`Thank you! 🙏 Happy to help anytime!`);
            }
            else if (body === '👎' || body.toLowerCase() === 'not helpful') {
                twiml.message(`Sorry about that! I'll notify your teacher. Can you tell me what was confusing?`);
            }
            // Process homework question
            else {
                // Step 1: Identify topic using GPT
                console.log('🔍 Identifying topic...');
                const topicInfo = await identifyTopic(body, mediaUrl);
                console.log('📚 Topic identified:', topicInfo);

                // Step 2: Find teacher's method from Google Sheet
                console.log('📊 Searching Google Sheet...');
                const teachingMethod = await findTeachingMethod(
                    session.schoolCode,
                    topicInfo.class || session.class,
                    topicInfo.subject,
                    topicInfo.chapter
                );

                let response;
                
                // Step 3: Generate response
                if (teachingMethod) {
                    console.log(`✅ Found method by ${teachingMethod.teacher}`);
                    response = await generateTeacherResponse(body, teachingMethod, mediaUrl);
                    response += `\n\n---\nWas this helpful? 👍 or 👎`;
                } else {
                    console.log('❌ No teacher method found, using generic');
                    response = await generateGenericResponse(body, topicInfo, mediaUrl);
                }

                twiml.message(response);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
        twiml.message('Sorry, I encountered an error. Please try again!');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// =====================================================
// API ENDPOINTS
// =====================================================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: '✅ ParentSaathi Schools Bot Running',
        sheets: Object.keys(SCHOOL_SHEETS),
        sheetsApiReady: !!sheetsApi
    });
});

// Manually refresh sheet data (for testing)
app.get('/api/methods/:schoolCode', async (req, res) => {
    const methods = await getTeachingMethodsFromSheet(req.params.schoolCode);
    res.json({ count: methods.length, methods });
});

// Test topic identification
app.post('/api/identify', async (req, res) => {
    const { question } = req.body;
    const topic = await identifyTopic(question);
    res.json(topic);
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

async function start() {
    await initGoogleSheets();
    app.listen(PORT, () => {
        console.log(`\n🚀 ParentSaathi Schools Bot running on port ${PORT}`);
        console.log(`📋 Webhook URL: http://localhost:${PORT}/webhook`);
        console.log(`📊 Schools configured: ${Object.keys(SCHOOL_SHEETS).join(', ')}\n`);
    });
}

start();

// =====================================================
// ALTERNATIVE: IN-MEMORY CACHE (Faster for Demo)
// =====================================================
/*
If Google Sheets API is slow, cache the data:

let methodsCache = {};
let cacheTimestamp = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getMethodsCached(schoolCode) {
    const now = Date.now();
    if (methodsCache[schoolCode] && (now - cacheTimestamp[schoolCode]) < CACHE_TTL) {
        return methodsCache[schoolCode];
    }
    
    const methods = await getTeachingMethodsFromSheet(schoolCode);
    methodsCache[schoolCode] = methods;
    cacheTimestamp[schoolCode] = now;
    return methods;
}
*/
