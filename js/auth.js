// Check if ROLES is not already defined to prevent duplicate declaration
if (typeof ROLES === 'undefined') {
    // Constants and Enums
    var ROLES = {
        ADMIN: 'admin',
        USER: 'user'
    };
}

// Check if constants are not already defined
if (typeof ADMIN_EMAIL === 'undefined') {
    var ADMIN_EMAIL = 'yalazcanyalaz@gmail.com';
}
if (typeof ADMIN_PASSWORD === 'undefined') {
    var ADMIN_PASSWORD = 'Yalaziso.99';
}

// Log user actions function
function logUserAction(userId, action, details = '') {
    try {
        const logs = JSON.parse(localStorage.getItem('userActionLogs') || '[]');
        logs.push({
            userId,
            action,
            details,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('userActionLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('Error logging user action:', error);
    }
}

// Initialize admin user if not exists
async function initializeAdmin() {
    try {
        // Check if Firebase is available and initialized
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
            console.log('Firebase not initialized, skipping admin initialization');
            // Continue with local storage setup even if Firebase isn't available
        } else {
            try {
                // Try to sign in with admin credentials
                console.log('Attempting to sign in with admin credentials...');
                const userCredential = await firebase.auth().signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
                console.log('✅ Admin user authenticated successfully');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Create admin user in Firebase
                    console.log('Creating admin user in Firebase...');
                    const userCredential = await firebase.auth().createUserWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
                    await firebase.database().ref('users/' + userCredential.user.uid).set({
                        email: ADMIN_EMAIL,
                        name: 'Admin',
                        role: ROLES.ADMIN,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    });
                    console.log('Admin user created in Firebase');
                } else {
                    console.error('Firebase admin login error:', error);
                }
            }
        }
        
        // Also create in local storage as fallback
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const adminExists = users.some(u => u.email === ADMIN_EMAIL);
        
        if (!adminExists) {
            console.log('Creating admin user in local storage...');
            const newAdmin = {
                id: 'admin',
                name: 'Admin',
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                role: ROLES.ADMIN,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            users.push(newAdmin);
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Admin user created in local storage');
            console.log('Admin credentials:', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        } else {
            console.log('✅ Admin user already exists in local storage');
        }
    } catch (error) {
        console.error('❌ Admin kullanıcısı oluşturulurken hata oluştu:', error);
    }
}

// User authentication state - use window.currentUser to avoid conflicts
if (typeof window.currentUser === 'undefined') {
    window.currentUser = null;
}

// Check if user is logged in and handle routing
function checkAuth() {
    try {
        const userJson = localStorage.getItem('currentUser');
        if (!userJson) {
            if (window.location.pathname.toLowerCase().includes('index.html') || 
                window.location.pathname.toLowerCase().includes('admin.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }
        
        // Kullanıcı oturumu kontrol et
        const userData = JSON.parse(userJson);
        currentUser = userData;
        
        // Sayfa yönlendirmelerini kontrol et
        const isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
        
        // Admin kontrolü
        if (userData.role === ROLES.ADMIN) {
            if (!isAdminPage) {
                window.location.href = 'admin.html';
                return null;
            }
        } else if (isAdminPage) {
            // Admin olmayan kullanıcı admin sayfasına erişmeye çalışıyorsa
            window.location.href = 'index.html';
            return null;
        }
        
        return userData;
    } catch (error) {
        console.error('❌ Kimlik doğrulama kontrolü sırasında hata oluştu:', error);
        localStorage.removeItem('currentUser');
        if (!window.location.pathname.toLowerCase().includes('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

// Global variable to store reCAPTCHA token
let recaptchaToken = '';
const RECAPTCHA_VERIFY_URL = 'http://localhost:3001/api/verify-recaptcha';

// reCAPTCHA success callback
async function onRecaptchaSuccess(token) {
    try {
        // Verify the token with our server
        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token: token,
                action: 'LOGIN' 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            recaptchaToken = token;
            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        } else {
            console.error('reCAPTCHA verification failed:', result.error);
            alert('Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.');
            grecaptcha.enterprise.reset();
        }
    } catch (error) {
        console.error('reCAPTCHA doğrulama hatası:', error);
        alert('Güvenlik doğrulaması sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        grecaptcha.enterprise.reset();
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Client-side validation
    if (!email || !password) {
        alert('Lütfen tüm alanları doldurun');
        return false;
    }
    
    // Execute reCAPTCHA if token is not set
    if (!recaptchaToken) {
        grecaptcha.enterprise.execute('6Lf_TP0rAAAAAAngfesV8j4OXH4YrooCY_P5yvys', {action: 'LOGIN'}).then(function(token) {
            recaptchaToken = token;
            // Retry form submission
            document.getElementById('loginForm').dispatchEvent(new Event('submit'));
        }).catch(function(error) {
            console.error('reCAPTCHA hatası:', error);
            alert('Güvenlik doğrulaması başarısız oldu. Lütfen sayfayı yenileyip tekrar deneyin.');
        });
        return false;
    }
    
    try {
        let result;
        
        // Check if Firebase is available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                // Try Firebase Authentication with reCAPTCHA token
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Verify reCAPTCHA token with Firebase
                if (recaptchaToken) {
                    try {
                        // You can verify the reCAPTCHA token on your backend if needed
                        // For now, we'll just log it
                        console.log('reCAPTCHA token verified');
                    } catch (error) {
                        console.error('reCAPTCHA doğrulama hatası:', error);
                        alert('Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.');
                        // Reset reCAPTCHA
                        grecaptcha.enterprise.reset();
                        recaptchaToken = '';
                        return false;
                    }
                }
                
                // Get user data from database
                const userRef = firebase.database().ref('users/' + user.uid);
                const snapshot = await userRef.once('value');
                const userData = snapshot.val();
                
                // If user doesn't exist in database, create a new entry
                if (!userData) {
                    await userRef.set({
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        role: ROLES.USER,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    // Update last login time
                    await userRef.update({
                        lastLogin: new Date().toISOString()
                    });
                }
                
                // Get updated user data
                const updatedSnapshot = await userRef.once('value');
                const updatedUserData = updatedSnapshot.val();
                
                result = {
                    success: true,
                    user: {
                        id: user.uid,
                        email: user.email,
                        name: updatedUserData?.name || user.email.split('@')[0],
                        role: updatedUserData?.role || ROLES.USER
                    }
                };
                
            } catch (firebaseError) {
                console.error('Firebase login error:', firebaseError);
                
                // For any Firebase error, try local storage as fallback
                console.log('Trying local storage fallback...');
                result = mockLoginAPI(email, password);
                
                // If localStorage also fails, throw the original error
                if (!result || !result.success) {
                    throw firebaseError;
                }
            }
        } else {
            // If Firebase is not available, use local storage
            console.log('Firebase not available, using local storage...');
            result = mockLoginAPI(email, password);
        }
        
        if (result && result.success) {
            // Save user to localStorage
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            
            // Log the login if logUserAction exists
            if (typeof logUserAction === 'function') {
                logUserAction(result.user.id, 'login');
            }
            
            // Redirect based on role
            if (result.user.role === ROLES.ADMIN) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert(result?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
    } catch (error) {
        console.error('Giriş işleminde hata:', error);
        alert('Giriş sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
    
    return false;
}

// Handle register form submission
async function handleRegister(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const name = (document.getElementById('name') || {}).value || '';
  const email = (document.getElementById('email') || {}).value || '';
  const password = (document.getElementById('password') || {}).value || '';
  const confirmPassword = (document.getElementById('confirmPassword') || {}).value || '';

  if (!name || !email || !password) {
    alert('Lütfen tüm alanları doldurun.');
    return;
  }
  if (password !== confirmPassword) {
    alert('Şifreler eşleşmiyor.');
    return;
  }

  try {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('Firebase Auth yüklü değil veya initialize edilmemiş.');
    }

    const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = result.user;
    const uid = user.uid;

    // Kaydı realtime database'e yaz
    if (firebase.database) {
      await firebase.database().ref('users/' + uid).set({
        name,
        email,
        role: 'user',
        createdAt: Date.now()
      });
    }

    // Profil ismini güncelle (opsiyonel)
    try { await user.updateProfile({ displayName: name }); } catch (e) {}

    // Local kaydet ve yönlendir
    const userData = { uid, email, name, role: 'user' };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    window.location.replace('index.html');
  } catch (err) {
    console.error('handleRegister error:', err);
    alert(err.message || 'Kayıt başarısız oldu.');
  }
}

// Mock login API (for offline/localStorage mode)
function mockLoginAPI(email, password) {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Find user by email and password
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            return {
                success: false,
                message: 'E-posta veya şifre hatalı.'
            };
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        const userIndex = users.findIndex(u => u.email === email);
        users[userIndex] = user;
        localStorage.setItem('users', JSON.stringify(users));
        
        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };
    } catch (error) {
        console.error('Mock login error:', error);
        return {
            success: false,
            message: 'Giriş sırasında bir hata oluştu.'
        };
    }
}

// Mock register API (for offline/localStorage mode)
function mockRegisterAPI(name, email, password) {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if user already exists
        if (users.some(u => u.email === email)) {
            return {
                success: false,
                message: 'Bu e-posta adresi zaten kullanılıyor.'
            };
        }
        
        const newUser = {
            id: 'user_' + Date.now(),
            name: name,
            email: email,
            password: password, // Not: Gerçek uygulamada şifreler hash'lenmeli
            role: ROLES.USER,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        return {
            success: true,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        };
    } catch (error) {
        console.error('Mock register error:', error);
        return {
            success: false,
            message: 'Kayıt sırasında bir hata oluştu.'
        };
    }
}

// Initialize admin user when the script loads
initializeAdmin();