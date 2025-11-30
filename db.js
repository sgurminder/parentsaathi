// =====================================================
// DATABASE ABSTRACTION LAYER
// =====================================================
// Supports: In-Memory, Vercel KV (Redis)
// =====================================================

const config = require('./config');

class Database {
    constructor() {
        this.type = config.database.type;
        this.cache = {
            teachingMethods: {},
            users: {},
            authorizedNumbers: new Set()
        };

        // Initialize Vercel KV if configured
        if (this.type === 'vercel-kv') {
            this.initializeVercelKV();
        }
    }

    async initializeVercelKV() {
        try {
            // Use @vercel/kv which works with Upstash Redis
            const { kv } = require('@vercel/kv');
            this.kv = kv;
            console.log('✅ Connected to Upstash Redis via Vercel KV');

            // Load data from KV to cache
            await this.loadFromKV();
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error);
            console.log('Falling back to in-memory storage');
            this.type = 'memory';
        }
    }

    async loadFromKV() {
        // Load teaching methods
        const methods = await this.kv.hgetall('teaching:methods');
        if (methods) {
            this.cache.teachingMethods = methods;
        }

        // Load authorized numbers
        const numbers = await this.kv.smembers('authorized:numbers');
        if (numbers) {
            this.cache.authorizedNumbers = new Set(numbers);
        }
    }

    // ==================== TEACHING METHODS ====================

    async getTeachingMethod(key) {
        if (this.type === 'vercel-kv') {
            return await this.kv.hget('teaching:methods', key);
        }
        return this.cache.teachingMethods[key];
    }

    async getAllTeachingMethods() {
        if (this.type === 'vercel-kv') {
            return await this.kv.hgetall('teaching:methods') || {};
        }
        return this.cache.teachingMethods;
    }

    async saveTeachingMethod(key, method) {
        this.cache.teachingMethods[key] = method;

        if (this.type === 'vercel-kv') {
            await this.kv.hset('teaching:methods', { [key]: method });
        }
    }

    // ==================== USER SESSIONS ====================

    async getUserSession(phoneNumber) {
        if (this.type === 'vercel-kv') {
            const session = await this.kv.get(`user:${phoneNumber}`);
            return session || null;
        }
        return this.cache.users[phoneNumber] || null;
    }

    async saveUserSession(phoneNumber, session) {
        this.cache.users[phoneNumber] = session;

        if (this.type === 'vercel-kv') {
            await this.kv.set(`user:${phoneNumber}`, session, {
                ex: 60 * 60 * 24 * 30 // 30 days expiry
            });
        }
    }

    async updateUserSession(phoneNumber, updates) {
        const session = await this.getUserSession(phoneNumber);
        if (session) {
            const updated = { ...session, ...updates };
            await this.saveUserSession(phoneNumber, updated);
            return updated;
        }
        return null;
    }

    // ==================== USER MANAGEMENT ====================

    async isAuthorized(phoneNumber) {
        // Demo mode: allow demo numbers
        if (config.bot.demoMode && config.bot.demoNumbers.includes(phoneNumber)) {
            return true;
        }

        if (this.type === 'vercel-kv') {
            return await this.kv.sismember('authorized:numbers', phoneNumber);
        }
        return this.cache.authorizedNumbers.has(phoneNumber);
    }

    async saveUserInfo(phoneNumber, userInfo) {
        // userInfo: { name, class, role ('student'|'teacher'), school }
        this.cache.authorizedNumbers.add(phoneNumber);

        if (this.type === 'vercel-kv') {
            await this.kv.sadd('authorized:numbers', phoneNumber);
            await this.kv.set(`user:${phoneNumber}`, userInfo);
        }
    }

    async markUserFirstContact(phoneNumber) {
        const userInfo = await this.getUserInfo(phoneNumber);
        if (userInfo && !userInfo.firstContactAt) {
            userInfo.firstContactAt = new Date().toISOString();
            userInfo.lastMessageAt = new Date().toISOString();
            await this.saveUserInfo(phoneNumber, userInfo);
            return true; // First time
        } else if (userInfo) {
            userInfo.lastMessageAt = new Date().toISOString();
            await this.saveUserInfo(phoneNumber, userInfo);
            return false; // Not first time
        }
        return false;
    }

    async getUserInfo(phoneNumber) {
        if (this.type === 'vercel-kv') {
            return await this.kv.get(`user:${phoneNumber}`);
        }
        return null;
    }

    async unauthorizeNumber(phoneNumber) {
        this.cache.authorizedNumbers.delete(phoneNumber);

        if (this.type === 'vercel-kv') {
            await this.kv.srem('authorized:numbers', phoneNumber);
            await this.kv.del(`user:${phoneNumber}`);
        }
    }

    async getAllAuthorizedUsers() {
        if (this.type === 'vercel-kv') {
            const numbers = await this.kv.smembers('authorized:numbers');
            const users = [];
            for (const number of numbers) {
                const info = await this.kv.get(`user:${number}`);
                if (info) {
                    users.push({ phoneNumber: number, ...info });
                }
            }
            return users;
        }
        return Array.from(this.cache.authorizedNumbers).map(num => ({ phoneNumber: num }));
    }

    // Legacy methods for backward compatibility
    async authorizeNumber(phoneNumber, studentInfo = {}) {
        return await this.saveUserInfo(phoneNumber, {
            ...studentInfo,
            role: studentInfo.role || 'student'
        });
    }

    async getStudentInfo(phoneNumber) {
        return await this.getUserInfo(phoneNumber);
    }

    // ==================== CHILDREN (Multi-child support) ====================

    async getChildren(phoneNumber) {
        if (this.type === 'vercel-kv') {
            return await this.kv.smembers(`parent:${phoneNumber}:children`) || [];
        }
        const session = this.cache.users[phoneNumber];
        return session?.children || [];
    }

    async addChild(phoneNumber, childInfo) {
        const children = await this.getChildren(phoneNumber);

        if (children.length >= config.limits.maxChildrenPerParent) {
            throw new Error(`Maximum ${config.limits.maxChildrenPerParent} children allowed per parent`);
        }

        const childId = `child_${Date.now()}`;
        const child = { id: childId, ...childInfo };

        if (this.type === 'vercel-kv') {
            await this.kv.sadd(`parent:${phoneNumber}:children`, childId);
            await this.kv.set(`child:${childId}`, child);
        } else {
            if (!this.cache.users[phoneNumber]) {
                this.cache.users[phoneNumber] = { children: [] };
            }
            if (!this.cache.users[phoneNumber].children) {
                this.cache.users[phoneNumber].children = [];
            }
            this.cache.users[phoneNumber].children.push(child);
        }

        return child;
    }

    async getChild(childId) {
        if (this.type === 'vercel-kv') {
            return await this.kv.get(`child:${childId}`);
        }
        // Search through all users
        for (const user of Object.values(this.cache.users)) {
            const child = user.children?.find(c => c.id === childId);
            if (child) return child;
        }
        return null;
    }

    // ==================== ANALYTICS ====================

    async incrementQueryCount(phoneNumber) {
        const today = new Date().toISOString().split('T')[0];
        const key = `queries:${phoneNumber}:${today}`;

        if (this.type === 'vercel-kv') {
            return await this.kv.incr(key);
        }

        // In-memory count
        if (!this.cache[key]) this.cache[key] = 0;
        return ++this.cache[key];
    }

    async getQueryCount(phoneNumber) {
        const today = new Date().toISOString().split('T')[0];
        const key = `queries:${phoneNumber}:${today}`;

        if (this.type === 'vercel-kv') {
            return (await this.kv.get(key)) || 0;
        }

        return this.cache[key] || 0;
    }
}

// Export singleton instance
module.exports = new Database();
