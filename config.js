// =====================================================
// WHITE-LABEL CONFIGURATION
// =====================================================

module.exports = {
    // School Branding
    school: {
        name: 'Springfields Public School',
        shortName: 'Springfields',
        code: 'SPS',
        logo: 'https://springfield.edu/logo.png', // Replace with actual logo URL
        website: 'https://springfield.edu',
        supportEmail: 'support@springfield.edu',
        supportPhone: '+91-9876543210'
    },

    // Bot Settings
    bot: {
        name: 'Springfields Study Buddy',
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886', // Twilio sandbox number

        welcomeMessage: `Welcome to Springfields Study Buddy! 🎓

I help Springfields students with homework using YOUR teacher's exact methods.

To get started, I need to verify your number is registered with our school.`,

        notAuthorizedMessage: `Sorry, this number is not registered with Springfields Public School.

Please contact the school office at support@springfield.edu or +91-9876543210 to register.`,

        demoMode: process.env.DEMO_MODE === 'true', // Enable for demos
        demoNumbers: ['+919590105978'], // Numbers that can access in demo mode
    },

    // Database (Vercel KV for production)
    database: {
        type: process.env.DATABASE_TYPE || 'memory', // 'memory' | 'vercel-kv' | 'postgres'
        kvUrl: process.env.KV_REST_API_URL,
        kvToken: process.env.KV_REST_API_TOKEN,
    },

    // Features
    features: {
        multipleChildren: true, // Allow one parent to register multiple children
        imageSupport: true,
        voiceSupport: false, // Future feature
        analytics: true,
    },

    // Limits
    limits: {
        maxQueriesPerDay: 50,
        maxChildrenPerParent: 3,
        responseMaxLength: 800, // characters
    }
};
