// Admin utilities
const AdminUtils = {
    // Get all user activity
    getAllUserActivity() {
        const messageLog = JSON.parse(localStorage.getItem('userMessageLog') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        return users.map(user => {
            const userMessages = messageLog.filter(log => log.userId === user.id);
            return {
                ...user,
                messageCount: userMessages.length,
                lastActive: userMessages.length > 0 ? 
                    new Date(userMessages[userMessages.length - 1].timestamp) : 
                    new Date(user.lastLogin),
                apiKey: localStorage.getItem(`ai_api_key_${user.id}`),
                conversations: this.getUserConversations(user.id)
            };
        });
    },

    // Get conversations for specific user
    getUserConversations(userId) {
        const conversationHistory = JSON.parse(localStorage.getItem('conversationHistory') || '{}');
        return Object.entries(conversationHistory)
            .filter(([username, _]) => {
                const user = this.findUserByUsername(username);
                return user && user.id === userId;
            })
            .flatMap(([_, conversations]) => conversations);
    },

    // Find user by username
    findUserByUsername(username) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.find(u => u.name === username);
    },

    // Get system statistics
    getSystemStats() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const messageLog = JSON.parse(localStorage.getItem('userMessageLog') || '[]');
        const conversationHistory = JSON.parse(localStorage.getItem('conversationHistory') || '{}');
        
        const today = new Date().toDateString();
        
        return {
            totalUsers: users.length,
            activeToday: users.filter(u => new Date(u.lastLogin).toDateString() === today).length,
            totalMessages: messageLog.length,
            totalConversations: Object.values(conversationHistory).flat().length
        };
    },

    // Monitor user sessions
    getUserSessions() {
        const activityLog = JSON.parse(localStorage.getItem('userActivityLog') || '[]');
        return activityLog.filter(log => 
            log.action === 'login' || log.action === 'logout'
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    // Get API key usage statistics
    getAPIKeyStats() {
        const messageLog = JSON.parse(localStorage.getItem('userMessageLog') || '[]');
        const stats = {};
        
        messageLog.forEach(log => {
            const key = log.apiKey;
            if (!stats[key]) {
                stats[key] = {
                    totalUses: 0,
                    lastUsed: null,
                    provider: log.provider
                };
            }
            stats[key].totalUses++;
            stats[key].lastUsed = new Date(log.timestamp);
        });
        
        return stats;
    },

    // Clear old logs to prevent quota exceeded errors
    clearOldLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('userLogs') || '[]');
            const recentLogs = logs.slice(-500); // Keep only last 500 logs
            localStorage.setItem('userLogs', JSON.stringify(recentLogs));
            return {
                success: true,
                removed: logs.length - recentLogs.length,
                remaining: recentLogs.length
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
};