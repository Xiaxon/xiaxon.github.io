# STV HİLEYLE MÜCADELE - CS 1.6 Hileci Takip Sistemi

Bu proje, Counter-Strike 1.6 hilecilerini takip etmek ve listelemek için geliştirilmiş bir web uygulamasıdır.

## 📁 Dosyalar

- `index.html` - Ana sayfa HTML dosyası
- `style.css` - CSS stil dosyası
- `script.js` - JavaScript işlevsellik dosyası
- `README.md` - Bu dosya

## 🚀 GitHub Pages ile Deployment

### 1. GitHub Repository Oluşturma

1. GitHub'da yeni repository oluşturun
2. Bu dosyaları repository'ye yükleyin:
   ```
   index.html
   style.css
   script.js
   README.md
   ```

### 2. GitHub Pages Aktivasyonu

1. Repository settings > Pages
2. Source: "Deploy from a branch"
3. Branch: "main" veya "master"
4. Folder: "/ (root)"
5. Save butonuna tıklayın

### 3. Backend Entegrasyonu (Opsiyonel)

Eğer backend API'si kullanmak istiyorsanız:

1. `script.js` dosyasındaki `API_BASE` değişkenini değiştirin:
   ```javascript
   const API_BASE = 'https://your-backend-url.com';
   ```

2. Backend sunucunuz şu endpoint'leri desteklemelidir:
   - `GET /api/cheaters` - Tüm hileci verilerini getir
   - `POST /api/cheaters` - Yeni hileci ekle
   - `PUT /api/cheaters/:id` - Hileci güncelle
   - `DELETE /api/cheaters/:id` - Hileci sil
   - `WebSocket /ws` - Canlı güncellemeler

## 🔧 Özelleştirme

### Admin Şifreleri Değiştirme

`script.js` dosyasındaki admin şifrelerini değiştirin:

```javascript
const ADMIN_PASSWORDS = ['yeni-sifre-1', 'yeni-sifre-2'];
```

### Sosyal Medya Linklerini Değiştirme

`index.html` dosyasındaki Discord ve YouTube linklerini güncelleyin:

```html
<a href="https://discord.gg/YourDiscordLink" target="_blank">
<a href="https://www.youtube.com/@YourChannel" target="_blank">
```

### Renk Temasını Değiştirme

`style.css` dosyasındaki renk değişkenlerini düzenleyin:

```css
/* Ana renkler */
--stv-red: #990000;
--stv-red-light: #ff4444;
--stv-red-dark: #660000;
```

## 📱 Responsive Tasarım

Site mobil cihazlarda da uyumlu çalışacak şekilde tasarlanmıştır.

## 🛡️ Güvenlik

- Admin şifreleri frontend'de saklandığı için güvenlik açısından backend entegrasyonu önerilir
- Üretim ortamında mutlaka HTTPS kullanın
- Admin şifrelerini düzenli olarak değiştirin

## 🎨 Özellikler

- ✅ Dark mode gaming teması
- ✅ Responsive tasarım
- ✅ Arama ve filtreleme
- ✅ Sıralama işlevselliği
- ✅ Admin paneli
- ✅ Veri import/export
- ✅ Canlı güncelleme desteği (backend ile)
- ✅ Hoşgeldin modalı
- ✅ Toast bildirimleri

## 🔗 Canlı Demo

Site GitHub Pages üzerinde şu adreste yayınlanacak:
`https://[kullanici-adi].github.io/[repository-adi]/`

## ⚠️ Not

Bu sistem yalnızca eğitim ve topluluk kullanımı içindir. Hileci raporlama işlemlerinde doğru kanıtlar ve adil süreçler kullanılmalıdır.
