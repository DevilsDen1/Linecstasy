// Admin kullanıcısını oluştur
function setupAdminUser() {
    const adminUser = {
        id: 'admin_' + Date.now(),
        name: 'Admin',
        email: 'yalazcanyalaz@gmail.com',
        password: 'Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };

    // Mevcut kullanıcıları al
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Eğer bu email ile kayıtlı kullanıcı yoksa ekle
    if (!users.some(u => u.email === adminUser.email)) {
        users.push(adminUser);
        localStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Admin kullanıcısı oluşturuldu!');
        console.log('Email:', adminUser.email);
        console.log('Şifre:', adminUser.password);
    } else {
        console.log('ℹ️ Admin kullanıcısı zaten mevcut');
    }
}

// Sayfa yüklendiğinde çalıştır
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAdminUser);
} else {
    setupAdminUser();
}
