// Vercel API Client - Çok Basit!
// Vercel'e deploy ettikten sonra otomatik çalışır

// UZAK API DEVRE DISI
if (typeof USE_REMOTE_API === 'undefined') {
    var USE_REMOTE_API = false;
}

// API Base URL (önemsiz; uzaktan çağrı yapılmayacak)
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = '/api';
}

// API Client
class APIClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        console.log('🌐 API Client başlatıldı:', this.baseUrl);
    }

    // Genel request fonksiyonu
    async request(endpoint, method = 'GET', data = null) {
        if (!USE_REMOTE_API) {
            throw new Error('Remote API disabled');
        }
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'API request failed');
        return result.data;
    }

    // Kullanıcı işlemleri
    async getAllUsers() {
        return await this.request('/users', 'GET');
    }

    async saveUser(user) {
        return await this.request('/users', 'POST', user);
    }

    async updateUser(userId, updates) {
        return await this.request('/users', 'PUT', { id: userId, ...updates });
    }

    async deleteUser(userId) {
        return await this.request('/users', 'DELETE', { id: userId });
    }

    async findUserByEmail(email) {
        const users = await this.getAllUsers();
        return users.find(u => u.email === email) || null;
    }

    // Chat işlemleri
    async saveChatMessage(userId, message) {
        return await this.request('/chat', 'POST', { userId, message });
    }

    async getChatHistory(userId) {
        return await this.request(`/chat?userId=${userId}`, 'GET');
    }

    // Log işlemleri
    async saveLog(log) {
        return await this.request('/logs', 'POST', log);
    }

    async getAllLogs() {
        return await this.request('/logs', 'GET');
    }

    // İstatistik işlemleri
    async saveStats(userId, stats) {
        return await this.request('/stats', 'POST', { userId, ...stats });
    }

    async getUserStats(userId) {
        return await this.request(`/stats?userId=${userId}`, 'GET');
    }
}

// Global API client
const api = new APIClient();

// Kolay kullanım için wrapper fonksiyonlar (MongoDB-config.js ile uyumlu)
async function saveUserToDB(user) {
    // Sadece LocalStorage (API kapalı)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex !== -1) {
        users[existingIndex] = user;
    } else {
        users.push(user);
    }
    localStorage.setItem('users', JSON.stringify(users));
    return user;
}

async function getAllUsersFromDB() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const snapshot = await firebase.database().ref('users').once('value');
            const users = [];
            snapshot.forEach((childSnapshot) => {
                users.push(childSnapshot.val());
            });
            
            // LocalStorage'ı güncelle
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Firebase\'den', users.length, 'kullanıcı alındı');
            return users;
        } catch (error) {
            console.error('Firebase kullanıcı getirme hatası:', error);
            // Hata durumunda localStorage'a dön
            return JSON.parse(localStorage.getItem('users') || '[]');
        }
    }
    
    // Firebase yoksa localStorage kullan
    return JSON.parse(localStorage.getItem('users') || '[]');
}

async function findUserByEmailDB(email) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.email === email) || null;
}

async function saveChatToDB(userId, message) {
    // Sadece LocalStorage
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }
    chatHistory[userId].push(message);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

async function saveLogToDB(log) {
    // Sadece LocalStorage
    let logs = JSON.parse(localStorage.getItem('userLogs') || '[]');
    logs.push(log);
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    localStorage.setItem('userLogs', JSON.stringify(logs));
}

async function saveStatsToDB(userId, stats) {
    // Sadece LocalStorage
    const allStats = JSON.parse(localStorage.getItem('userStats') || '{}');
    allStats[userId] = stats;
    localStorage.setItem('userStats', JSON.stringify(allStats));
}

console.log('✅ API Client (yalnızca localStorage) yüklendi');
