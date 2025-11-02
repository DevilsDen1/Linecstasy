const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB ve API kaldırıldı – bu sunucu yalnızca statik dosyaları servis eder.

// Admin paneli için statik dosyaları sun
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Ana sayfa
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);});
