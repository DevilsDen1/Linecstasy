// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2Dct0xz6sYqEH5MnSe4qc08Akbs5VYzY",
    authDomain: "linecstasy-ai-sohbet.firebaseapp.com",
    databaseURL: "https://linecstasy-ai-sohbet-default-rtdb.firebaseio.com",
    projectId: "linecstasy-ai-sohbet",
    storageBucket: "linecstasy-ai-sohbet.firebasestorage.app",
    messagingSenderId: "535942488129",
    appId: "1:535942488129:web:05bf2ad744a7248126e6c0"
};

// Global değişkenler
let app, auth, database;
let isFirebaseEnabled = false;

// Firebase'i başlat
async function initFirebase() {
    try {
        // Firebase modülünü kontrol et
        if (typeof firebase === 'undefined' || !firebase.initializeApp) {
            console.warn('Firebase kütüphanesi yüklenmedi, localStorage kullanılacak');
            isFirebaseEnabled = false;
            return false;
        }

        // Firebase zaten başlatılmış mı kontrol et
        if (!firebase.apps || !firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('Firebase başlatıldı');
            
            // Firebase Authentication'ı başlat
            auth = firebase.auth();
            
            // Admin olarak giriş yap (önce kimlik bilgileri kontrolü)
            // Eğer ADMIN_EMAIL/ADMIN_PASSWORD tanımlıysa admin ile giriş dene
            if (typeof ADMIN_EMAIL === 'string' && ADMIN_EMAIL && typeof ADMIN_PASSWORD === 'string' && ADMIN_PASSWORD) {
                try {
                    await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
                    console.log('✅ Admin olarak giriş yapıldı');
                } catch (error) {
                    console.error('❌ Admin girişi başarısız:', error);
                    // Admin girişi başarısızsa anonim girişe düş
                    try {
                        await auth.signInAnonymously();
                        console.log('⚠️ Anonim kullanıcı olarak devam ediliyor');
                    } catch (anonError) {
                        console.error('❌ Anonim giriş de başarısız:', anonError);
                        // Eğer hata auth/admin-restricted-operation ise anonim giriş Firebase Console'da kapalı demektir
                        if (anonError && anonError.code === 'auth/admin-restricted-operation') {
                            console.error('ℹ️ Anonymous sign-in disabled in Firebase Console. Enable it or provide admin credentials.');
                        }
                        isFirebaseEnabled = false;
                        return false;
                    }
                }
            } else {
                // Admin kimlik bilgileri yoksa hemen anonim giriş dene
                try {
                    await auth.signInAnonymously();
                    console.log('⚠️ Admin bilgisi yok — anonim kullanıcı olarak devam ediliyor');
                } catch (anonError) {
                    console.error('❌ Anonim giriş başarısız:', anonError);
                    if (anonError && anonError.code === 'auth/admin-restricted-operation') {
                        console.error('ℹ️ Anonymous sign-in disabled in Firebase Console. Enable it or provide admin credentials.');
                    }
                    isFirebaseEnabled = false;
                    return false;
                }
            }
            
            // Database referansını al
            database = firebase.database();
            isFirebaseEnabled = true;
        } else {
            app = firebase.app();
            auth = firebase.auth();
            database = firebase.database();
            isFirebaseEnabled = true;
        }
        
        // Auth ve Database servislerini başlat
        try {
            if (firebase.auth) {
                auth = firebase.auth();
            }
            if (firebase.database) {
                database = firebase.database();
            }
            isFirebaseEnabled = !!(auth && database);
            
            if (isFirebaseEnabled) {
                console.log('✅ Firebase başarıyla başlatıldı');
            } else {
                console.log('ℹ️ Firebase modülleri yüklenmedi, localStorage kullanılacak');
            }
            return isFirebaseEnabled;
        } catch (authError) {
            console.log('ℹ️ Firebase Auth yüklenemedi, localStorage kullanılacak');
            isFirebaseEnabled = false;
            return false;
        }
    } catch (error) {
        console.log('ℹ️ Firebase kullanılamıyor, localStorage ile devam ediliyor');
        isFirebaseEnabled = false;
        return false;
    }
}

// Firebase'i hemen başlat
let firebaseInitialized = initFirebase();

// Eğer hemen başlatılamazsa, sayfa yüklendikten sonra tekrar dene
if (!firebaseInitialized) {
    window.addEventListener('load', function() {
        initFirebase();
    });
}

// Kullanıcı kaydetme (Firebase + localStorage hybrid)
async function saveUserToDatabase(user) {
    // LocalStorage'a kaydet (offline çalışma için)
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingIndex = users.findIndex(u => u.id === user.id);
    
    if (existingIndex !== -1) {
        users[existingIndex] = user;
    } else {
        users.push(user);
    }
    localStorage.setItem('users', JSON.stringify(users));
    
    // Firebase'e kaydet (tüm cihazlar için)
    if (isFirebaseEnabled) {
        try {
            await database.ref('users/' + user.id).set(user);
            console.log('✅ Kullanıcı Firebase\'e kaydedildi:', user.email);
        } catch (error) {
            console.error('❌ Firebase kayıt hatası:', error);
        }
    }
}

// Tüm kullanıcıları getir
async function getAllUsersFromDatabase() {
    if (isFirebaseEnabled) {
        try {
            const snapshot = await database.ref('users').once('value');
            const users = [];
            snapshot.forEach((childSnapshot) => {
                users.push(childSnapshot.val());
            });
            
            // LocalStorage'ı da güncelle
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Firebase\'den', users.length, 'kullanıcı yüklendi');
            return users;
        } catch (error) {
            console.error('❌ Firebase okuma hatası:', error);
        }
    }
    
    // Firebase yoksa localStorage kullan
    return JSON.parse(localStorage.getItem('users') || '[]');
}

// Chat mesajlarını kaydet
async function saveChatToDatabase(userId, message) {
    // LocalStorage'a kaydet
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }
    chatHistory[userId].push(message);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    
    // Firebase'e kaydet
    if (isFirebaseEnabled) {
        try {
            await database.ref('chatHistory/' + userId).push(message);
        } catch (error) {
            console.error('❌ Firebase chat kayıt hatası:', error);
        }
    }
}

// Logları kaydet
async function saveLogToDatabase(log) {
    // LocalStorage'a kaydet
    let logs = JSON.parse(localStorage.getItem('userLogs') || '[]');
    logs.push(log);
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    localStorage.setItem('userLogs', JSON.stringify(logs));
    
    // Firebase'e kaydet
    if (isFirebaseEnabled) {
        try {
            await database.ref('logs').push(log);
        } catch (error) {
            console.error('❌ Firebase log kayıt hatası:', error);
        }
    }
}

// İstatistikleri kaydet
async function saveStatsToDatabase(userId, stats) {
    // LocalStorage'a kaydet
    const allStats = JSON.parse(localStorage.getItem('userStats') || '{}');
    allStats[userId] = stats;
    localStorage.setItem('userStats', JSON.stringify(allStats));
    
    // Firebase'e kaydet
    if (isFirebaseEnabled) {
        try {
            await database.ref('stats/' + userId).set(stats);
        } catch (error) {
            console.error('❌ Firebase stats kayıt hatası:', error);
        }
    }
}

// Gerçek zamanlı dinleyici (Admin paneli için)
function listenToUsersChanges(callback) {
    if (isFirebaseEnabled && database) {
        console.log('👂 Kullanıcı değişiklikleri dinleniyor...');
        database.ref('users').on('value', (snapshot) => {
            const users = [];
            snapshot.forEach((childSnapshot) => {
                // Admin dışındaki kullanıcıları da dahil et
                const userData = childSnapshot.val();
                users.push(userData);
            });
            
            // LocalStorage'ı güncelle
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Kullanıcı listesi güncellendi:', users.length, 'kullanıcı');
            
            // Callback'i çağır
            if (typeof callback === 'function') {
                callback(users);
            }
        }, (error) => {
            console.error('❌ Firebase dinleme hatası:', error);
        });
    }
}

function listenToLogsChanges(callback) {
    if (isFirebaseEnabled) {
        database.ref('logs').limitToLast(100).on('value', (snapshot) => {
            const logs = [];
            snapshot.forEach((childSnapshot) => {
                logs.push(childSnapshot.val());
            });
            localStorage.setItem('userLogs', JSON.stringify(logs));
            callback(logs);
        });
    }
}
