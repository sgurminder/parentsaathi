// =====================================================
// PARENTSAATHI SCHOOLS - MVP DEMO BOT
// =====================================================
// This is a minimal working bot for demo purposes
// Uses: Twilio WhatsApp Sandbox + OpenAI GPT-4 Vision
// =====================================================

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =====================================================
// CONFIGURATION
// =====================================================

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Set in environment
});

// In-memory storage for demo (use database in production)
const teachingMethods = {
    "math-8-linear-equations": {
        teacher: "Mrs. Sharma",
        subject: "Mathematics",
        class: 8,
        chapter: "Linear Equations",
        method: `
            I always tell my students to follow these steps:
            1. First, identify the variable (usually x)
            2. Move all variable terms to the LEFT side
            3. Move all number terms to the RIGHT side
            4. Remember: When you move across '=', the sign changes!
            5. Solve for x
            6. Always verify by putting the answer back
        `,
        example: `
            Like sorting fruits in baskets - all apples in one basket, 
            all oranges in another. Similarly, all x's on one side, 
            all numbers on the other side.
        `,
        commonMistakes: `
            Students often forget to change the sign when moving terms.
            If +5 moves to other side, it becomes -5!
        `,
        tips: `
            Practice with simple equations first. Once the method is clear,
            any equation becomes easy!
        `
    },
    "math-8-quadratic-equations": {
        teacher: "Mrs. Sharma",
        subject: "Mathematics", 
        class: 8,
        chapter: "Quadratic Equations",
        method: `
            For quadratic equations (ax² + bx + c = 0):
            1. First check if it can be factorized
            2. Find two numbers that multiply to give 'c' and add to give 'b'
            3. Split the middle term using these numbers
            4. Factor by grouping
            5. Solve for x
        `,
        example: `
            Think of it like finding two friends whose ages multiply to 6 
            and add up to 5. Those friends are 2 and 3!
        `,
        commonMistakes: `
            Rushing to use the formula without trying factorization first.
            Factorization is faster when it works!
        `,
        tips: `
            Always try factorization first. Use formula only when factorization 
            doesn't work easily.
        `
    },
    "science-8-photosynthesis": {
        teacher: "Mr. Verma",
        subject: "Science",
        class: 8,
        chapter: "Photosynthesis",
        method: `
            I explain photosynthesis as a recipe:
            Ingredients: Carbon dioxide + Water + Sunlight
            Kitchen: Chloroplast (the green part)
            Chef: Chlorophyll
            Dish: Glucose (food for plant)
            Byproduct: Oxygen (which we breathe!)
        `,
        example: `
            Just like how your mother uses ingredients to cook food in the kitchen,
            plants use CO2, water, and sunlight to cook their own food!
        `,
        commonMistakes: `
            Confusing photosynthesis with respiration. 
            Photosynthesis MAKES food, Respiration USES food.
        `,
        tips: `
            Remember: Photo = Light, Synthesis = Making
            So Photosynthesis = Making (food) using Light
        `
    }
};

// User sessions (in-memory for demo)
const userSessions = {};

// School database (demo)
const schools = {
    "demo-school": {
        name: "Demo Public School",
        code: "DEMO",
        teachers: ["Mrs. Sharma", "Mr. Verma"]
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Detect topic from question using GPT
async function detectTopic(question, imageUrl = null) {
    const messages = [
        {
            role: "system",
            content: `You are a topic classifier for Indian school curriculum (CBSE).
            Given a homework question, identify:
            1. Subject (Math, Science, English, etc.)
            2. Class level (1-12)
            3. Chapter name
            4. Specific topic
            
            Respond in JSON format:
            {"subject": "...", "class": ..., "chapter": "...", "topic": "..."}`
        }
    ];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: "Identify the subject, class, and chapter for this homework question:" },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({
            role: "user",
            content: `Identify the subject, class, and chapter for this homework question: "${question}"`
        });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 200
    });

    try {
        return JSON.parse(response.choices[0].message.content);
    } catch {
        return { subject: "unknown", class: 8, chapter: "unknown", topic: "unknown" };
    }
}

// Find matching teaching method
function findTeachingMethod(subject, classLevel, chapter) {
    const key = `${subject.toLowerCase()}-${classLevel}-${chapter.toLowerCase().replace(/\s+/g, '-')}`;
    return teachingMethods[key] || null;
}

// Generate response using teacher's method
async function generateResponse(question, teachingMethod, imageUrl = null) {
    const systemPrompt = `You are a homework helper for ${teachingMethod.teacher} at the school.
    
You must explain concepts EXACTLY the way ${teachingMethod.teacher} does:

${teachingMethod.teacher}'s Teaching Method:
${teachingMethod.method}

${teachingMethod.teacher}'s Favorite Example:
${teachingMethod.example}

Common Mistakes to Warn About:
${teachingMethod.commonMistakes}

Tips:
${teachingMethod.tips}

Instructions:
1. Start with "Here's how ${teachingMethod.teacher} would explain this:"
2. Use the SAME method and examples the teacher uses
3. Be warm and encouraging
4. Include the common mistakes warning
5. End with an encouraging tip
6. Keep response concise (under 300 words)`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (imageUrl) {
        messages.push({
            role: "user",
            content: [
                { type: "text", text: `Please explain this homework problem:\n${question}` },
                { type: "image_url", image_url: { url: imageUrl } }
            ]
        });
    } else {
        messages.push({
            role: "user",
            content: `Please explain this homework problem: ${question}`
        });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500
    });

    return response.choices[0].message.content;
}

// Generate generic response (when no teacher method found)
async function generateGenericResponse(question, topicInfo, imageUrl = null) {
    const systemPrompt = `You are a friendly homework helper for Indian school students.
    
Explain this ${topicInfo.subject} concept for Class ${topicInfo.class} students.

Instructions:
1. Use simple, clear language
2. Give step-by-step explanation
3. Include a real-life example
4. Mention common mistakes to avoid
5. Keep response under 300 words
6. End with: "Note: I'll notify your teacher to add their specific method for this topic!"`;

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
        messages.push({
            role: "user",
            content: question
        });
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500
    });

    return response.choices[0].message.content;
}

// =====================================================
// WHATSAPP WEBHOOK (Twilio)
// =====================================================

app.post('/webhook', async (req, res) => {
    const twiml = new MessagingResponse();
    
    try {
        const from = req.body.From; // User's WhatsApp number
        const body = req.body.Body || ''; // Message text
        const numMedia = parseInt(req.body.NumMedia || 0);
        const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;

        console.log(`Message from ${from}: ${body}`);
        if (mediaUrl) console.log(`Media URL: ${mediaUrl}`);

        // Initialize or get user session
        if (!userSessions[from]) {
            userSessions[from] = {
                registered: false,
                school: null,
                class: null,
                lastQuery: null
            };
        }

        const session = userSessions[from];

        // Handle registration flow
        if (!session.registered) {
            if (body.toLowerCase().includes('hi') || body.toLowerCase().includes('hello') || body.toLowerCase().includes('start')) {
                const welcomeMsg = `Welcome to ParentSaathi! 🎓

I help with homework using YOUR teacher's methods.

To get started, please tell me:
1. Your school name
2. Your class (e.g., Class 8)

Example: "Demo Public School, Class 8"`;
                
                twiml.message(welcomeMsg);
            } 
            else if (body.toLowerCase().includes('demo') || body.toLowerCase().includes('class')) {
                // Simple registration for demo
                session.registered = true;
                session.school = 'demo-school';
                session.class = 8; // Default to class 8 for demo
                
                const regMsg = `Great! You're registered! ✅

School: Demo Public School
Class: 8

Now send me any homework question or photo, and I'll explain it the way your teachers do! 📸`;
                
                twiml.message(regMsg);
            }
            else {
                twiml.message(`Please say "Hi" to start, or send your school name and class.`);
            }
        }
        // Handle homework queries
        else {
            // Check for feedback
            if (body === '👍' || body.toLowerCase() === 'yes' || body.toLowerCase() === 'helpful') {
                twiml.message(`Thank you for the feedback! 🙏 Happy to help anytime!`);
            }
            else if (body === '👎' || body.toLowerCase() === 'no') {
                twiml.message(`I'm sorry it wasn't helpful. I'll notify your teacher to improve this explanation. Is there anything specific you'd like me to clarify?`);
            }
            // Process homework question
            else {
                // Detect topic
                const topicInfo = await detectTopic(body, mediaUrl);
                console.log('Detected topic:', topicInfo);

                // Find teacher's method
                const teachingMethod = findTeachingMethod(
                    topicInfo.subject,
                    topicInfo.class,
                    topicInfo.chapter
                );

                let response;
                if (teachingMethod) {
                    // Generate response using teacher's method
                    response = await generateResponse(body, teachingMethod, mediaUrl);
                    response += `\n\n---\nWas this helpful? Reply 👍 or 👎`;
                } else {
                    // Generate generic response
                    response = await generateGenericResponse(body, topicInfo, mediaUrl);
                }

                // Store query for analytics
                session.lastQuery = {
                    question: body,
                    topic: topicInfo,
                    hasImage: !!mediaUrl,
                    timestamp: new Date()
                };

                twiml.message(response);
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
        twiml.message('Sorry, I encountered an error. Please try again or contact support.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// =====================================================
// TEACHER API ENDPOINTS
// =====================================================

// Add teaching method (from Google Form webhook or admin panel)
app.post('/api/teaching-method', (req, res) => {
    const { 
        teacher, 
        subject, 
        classLevel, 
        chapter, 
        method, 
        example, 
        commonMistakes, 
        tips 
    } = req.body;

    const key = `${subject.toLowerCase()}-${classLevel}-${chapter.toLowerCase().replace(/\s+/g, '-')}`;
    
    teachingMethods[key] = {
        teacher,
        subject,
        class: classLevel,
        chapter,
        method,
        example,
        commonMistakes,
        tips,
        createdAt: new Date()
    };

    console.log(`Added teaching method: ${key}`);
    res.json({ success: true, key });
});

// Get all teaching methods (for admin)
app.get('/api/teaching-methods', (req, res) => {
    res.json(teachingMethods);
});

// =====================================================
// GOOGLE FORM WEBHOOK
// =====================================================

// This endpoint receives data from Google Form via Zapier/Make
app.post('/api/form-webhook', (req, res) => {
    console.log('Received form submission:', req.body);
    
    // Map Google Form fields to our schema
    const formData = req.body;
    
    const teachingMethod = {
        teacher: formData.teacher_name || formData['Teacher Name'],
        subject: formData.subject || formData['Subject'],
        classLevel: parseInt(formData.class || formData['Class']),
        chapter: formData.chapter || formData['Chapter Name'],
        method: formData.explanation || formData['How do you explain this?'],
        example: formData.example || formData['Your favorite example'],
        commonMistakes: formData.mistakes || formData['Common mistakes students make'],
        tips: formData.tips || formData['Tips for parents']
    };

    // Store it
    const key = `${teachingMethod.subject.toLowerCase()}-${teachingMethod.classLevel}-${teachingMethod.chapter.toLowerCase().replace(/\s+/g, '-')}`;
    teachingMethods[key] = {
        ...teachingMethod,
        class: teachingMethod.classLevel,
        createdAt: new Date()
    };

    console.log(`Added from form: ${key}`);
    res.json({ success: true, key });
});

// =====================================================
// ANALYTICS ENDPOINTS (for demo dashboard)
// =====================================================

app.get('/api/stats', (req, res) => {
    // Demo stats
    res.json({
        totalQueries: 147,
        queriestoday: 23,
        topSubjects: [
            { subject: 'Mathematics', count: 89 },
            { subject: 'Science', count: 42 },
            { subject: 'English', count: 16 }
        ],
        topChapters: [
            { chapter: 'Linear Equations', count: 34 },
            { chapter: 'Quadratic Equations', count: 28 },
            { chapter: 'Photosynthesis', count: 19 }
        ],
        peakHours: '7 PM - 9 PM',
        satisfaction: 4.7,
        teachersCoverage: '78%'
    });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/', (req, res) => {
    res.json({
        status: 'ParentSaathi Schools Bot is running!',
        version: '1.0.0-demo',
        endpoints: {
            webhook: 'POST /webhook',
            addMethod: 'POST /api/teaching-method',
            getMethods: 'GET /api/teaching-methods',
            formWebhook: 'POST /api/form-webhook',
            stats: 'GET /api/stats'
        }
    });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ParentSaathi Schools Bot running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});

// =====================================================
// SETUP INSTRUCTIONS
// =====================================================
/*

1. INSTALL DEPENDENCIES:
   npm init -y
   npm install express twilio openai

2. SET ENVIRONMENT VARIABLES:
   export OPENAI_API_KEY="your-openai-api-key"

3. RUN THE BOT:
   node bot.js

4. EXPOSE TO INTERNET (for Twilio):
   npx ngrok http 3000
   Copy the https URL

5. CONFIGURE TWILIO:
   - Go to Twilio Console > Messaging > WhatsApp Sandbox
   - Set Webhook URL to: https://your-ngrok-url/webhook
   - Method: POST

6. TEST:
   - Send "join <sandbox-keyword>" to Twilio WhatsApp number
   - Then send "Hi" to start

7. CONNECT GOOGLE FORM:
   - Create form with fields matching the schema
   - Use Zapier/Make to send form submissions to /api/form-webhook

*/
