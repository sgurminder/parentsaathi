// =====================================================
// VIDYAMITRA - WHITE-LABEL CONFIGURATION
// =====================================================
// Set these environment variables to customize for each school:
// SCHOOL_NAME, SCHOOL_SHORT_NAME, SCHOOL_CODE, SUPPORT_EMAIL, SUPPORT_PHONE

const schoolName = process.env.SCHOOL_NAME || 'Your School';
const schoolShortName = process.env.SCHOOL_SHORT_NAME || schoolName.split(' ')[0];
const schoolCode = process.env.SCHOOL_CODE || 'SCHOOL';
const supportEmail = process.env.SUPPORT_EMAIL || 'contact@euleanai.com';
const supportPhone = process.env.SUPPORT_PHONE || '+91-9590105978';

module.exports = {
    // School Branding (configured via environment variables)
    school: {
        name: schoolName,
        shortName: schoolShortName,
        code: schoolCode,
        logo: process.env.SCHOOL_LOGO || '',
        website: process.env.SCHOOL_WEBSITE || '',
        supportEmail: supportEmail,
        supportPhone: supportPhone
    },

    // Bot Settings
    bot: {
        name: `VidyaMitra - ${schoolShortName}`,
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',

        welcomeMessage: `Welcome to VidyaMitra! 🎓

Your personal AI Study Companion for ${schoolName}.

I explain concepts exactly the way your teachers do - their methods, their examples.

Send any homework question to get started!`,

        notAuthorizedMessage: `Sorry, this number is not registered with ${schoolName}.

Please contact ${supportEmail} or ${supportPhone} to register.`,

        demoMode: process.env.DEMO_MODE === 'true',
        demoNumbers: ['+919590105978'],
    },

    // Database (Vercel KV for production)
    database: {
        type: process.env.DATABASE_TYPE || 'memory',
        kvUrl: process.env.KV_REST_API_URL,
        kvToken: process.env.KV_REST_API_TOKEN,
    },

    // Features
    features: {
        multipleChildren: true,
        imageSupport: true,
        voiceSupport: false,
        analytics: true,
    },

    // Limits
    limits: {
        maxQueriesPerDay: 50,
        maxChildrenPerParent: 3,
        responseMaxLength: 800,
    }
};
