# FIZIK JARAYONLARNI MODELLASHTIRISHNING DASTURIY TA'MINOTI
## 10-11 SINFLAR UCHUN - REZERFORD VA KEPLER QONUNLARI

---

## 📋 LOYIHA HAQIDA

### Maqsad:
O'quvchilarga fizik jarayonlarni visualizatsiya qilish va interaktiv tarzda o'rganish imkoniyatini berish.

### Asosiy yo'nalishlar:
1. **Rezerford tajribasi** - Atom tuzilishi
2. **Kepler qonunlari** - Sayyoralar harakati

### Texnologiyalar:
- HTML5
- CSS3
- JavaScript (Canvas API)
- PhET-ga o'xshash interaktiv interfeys

---

## 📁 LOYIHA TUZILMASI

```
fizika_modellar/
│
├── rezerford_model.html          # Rezerford tajribasi modeli
├── kepler_model.html              # Kepler qonunlari modeli
├── rezerford_dars_ishlanma.md    # Rezerford darsi
├── kepler_dars_ishlanma.md       # Kepler darsi
├── testlar.md                     # Testlar to'plami
└── README.md                      # Bu fayl
```

---

## 🚀 O'RNATISH VA ISHLATISH

### 1-usul: Bevosita brauzerda ochish

**Windows:**
1. `rezerford_model.html` faylini toping
2. Fayl ustiga o'ng tugmachani bosing
3. "Open with" → Brauzerni tanlang (Chrome, Firefox, Edge)

**Mac/Linux:**
```bash
# Terminal orqali
cd fizika_modellar
open rezerford_model.html        # Mac
xdg-open rezerford_model.html    # Linux
```

### 2-usul: Lokal server orqali

**Python bilan:**
```bash
# Python 3
cd fizika_modellar
python -m http.server 8000

# Keyin brauzerda oching:
# http://localhost:8000/rezerford_model.html
```

**Node.js bilan:**
```bash
# http-server o'rnating
npm install -g http-server

# Ishga tushiring
cd fizika_modellar
http-server -p 8000
```

### 3-usul: Maktab serveri

1. Barcha fayllarni server papkasiga ko'chiring
2. O'quvchilarga link bering:
   - `http://maktab-server/fizika/rezerford_model.html`
   - `http://maktab-server/fizika/kepler_model.html`

---

## 💻 TIZIM TALABLARI

### Minimal:
- **Brauzer:** Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Ekran:** 1024×768 piksel
- **Internet:** Kerak emas (oflayn ishlaydi)

### Tavsiya etiladi:
- **Ekran:** 1920×1080 piksel yoki kattaroq
- **Brauzer:** Eng so'ngi versiya
- **Qurilma:** Kompyuter yoki planshet (mobil uchun optimallashtirilmagan)

---

## 📖 FOYDALANISH QO'LLANMASI

### REZERFORD MODELI

#### Asosiy funksiyalar:

**1. Sozlamalar:**
- **Tezlik:** Alfa zarralar tezligini o'zgartirish (1-3 ×10⁷ m/s)
- **Masofa:** Nishon masofasini sozlash (10-100 nm)
- **Zarralar soni:** Bir vaqtda uchirish uchun (5-50 ta)

**2. Boshqaruv tugmalari:**
- ▶️ **Boshlash** - Tajribani ishga tushirish
- ⏸️ **Pauza** - Vaqtincha to'xtatish
- 🔄 **Qayta** - Qayta boshlash

**3. Statistika:**
- Umumiy zarralar soni
- O'tgan zarralar
- Sochilgan zarralar
- Qaytgan zarralar
- Sochilish foizi

#### Qanday ishlash kerak:

1. **Standart tajriba:**
   ```
   Tezlik: 1.5×10⁷ m/s
   Masofa: 50 nm
   Zarralar: 20 ta
   ```
   "Boshlash" tugmasini bosing va kuzating!

2. **Tezlik ta'sirini o'rganish:**
   - Dastlab past tezlikda (1.0)
   - Keyin yuqori tezlikda (3.0)
   - Natijalarni solishtiring

3. **Masofa ta'sirini o'rganish:**
   - Yaqin masofa (10 nm)
   - Uzoq masofa (100 nm)
   - Farqlarni tahlil qiling

### KEPLER MODELI

#### 3 ta bo'lim:

**1-QONUN: ELLIPS**
- Sayyora tanlash (Merkuriy, Venera, Yer, Mars)
- Yarim katta o'q (a) o'zgartirish
- Ekssentrisitet (e) sozlash
- Perigeliy va afeliy masofalarini kuzatish

**2-QONUN: YUZALAR**
- Vaqt oralig'ini tanlash
- Yuzalar tengligini tekshirish
- Sayyora tezligining o'zgarishini kuzatish

**3-QONUN: DAVR**
- Barcha sayyoralarni birga ko'rish
- T²/a³ munosabatini tekshirish
- Har bir sayyora uchun hisoblash

#### Qanday ishlash kerak:

1. **Ellipsni o'rganish:**
   - Turli sayyoralarni tanlang
   - Ekssentrisitetni o'zgartiring
   - Orbit shaklini kuzating

2. **Tezlik o'zgarishini kuzatish:**
   - 2-qonun bo'limiga o'ting
   - Animatsiyani ishga tushiring
   - Perigeliy va afeliydagi tezliklarni solishtiring

3. **Davr qonunini tekshirish:**
   - 3-qonun bo'limida barcha sayyoralarni yoqing
   - Har birining aylanish tezligini kuzating
   - T²/a³ = 1 ekanligini tekshiring

---

## 👨‍🏫 O'QITUVCHILAR UCHUN

### Dars rejasi:

**1-dars: Rezerford tajribasi (45 daqiqa)**
```
0-10 min:  Kirish, motivatsiya
10-25 min: Model bilan ishlash
25-35 min: Guruh ishlari
35-45 min: Xulosalar, uyga vazifa
```

**2-dars: Kepler qonunlari (45 daqiqa)**
```
0-10 min:  Kirish, tarixiy ma'lumot
10-30 min: Uchta qonun bilan tanishish
30-40 min: Amaliy mashqlar
40-45 min: Xulosalar
```

### Tavsiyalar:

✅ **Oldindan tayyorgarlik:**
- Modellarni sinab ko'ring
- Texnik jihozlarni tekshiring
- Zaxira variantni tayyorlang

✅ **Dars jarayonida:**
- Guruhlar bilan ishlang (3-4 kishi)
- Har bir guruhga topshiriq bering
- Faol muhokamani tashkil qiling

✅ **Muammolarni hal qilish:**
- Agar model ishlamasa - dars ishlanmadan foydalaning
- Agar internet yo'q bo'lsa - oflayn versiya ishlaydi
- Agar kompyuter kam bo'lsa - projektordan ko'rsating

---

## 🎓 O'QUVCHILAR UCHUN

### Nima o'rganasiz:

**Rezerford tajribasi:**
- ✓ Atom tuzilishi
- ✓ Yadro tushunchasi
- ✓ Alfa zarralar
- ✓ Kulonning kuchi
- ✓ Sochilish hodisasi

**Kepler qonunlari:**
- ✓ Elliptik orbitalar
- ✓ Sayyoralar harakati
- ✓ Gravitatsiya qonunlari
- ✓ Orbital parametrlar
- ✓ Quyosh sistemasi

### Qanday o'rganish kerak:

1. **Avval nazariya:**
   - Dars ishlanmani o'qing
   - Asosiy formulalarni yozing
   - Tushunmagan joylarni belgilang

2. **Keyin amaliyot:**
   - Model bilan tajriba o'tkazing
   - Turli parametrlarni sinab ko'ring
   - Natijalarni yozib boring

3. **Oxirida tahlil:**
   - Nazariya va amaliyotni solishtiring
   - Xulosalar chiqaring
   - Testlarni yeching

---

## 📊 BAHOLASH TIZIMI

### Rezerford bo'yicha:
| Topshiriq | Ball | Tavsif |
|-----------|------|--------|
| Darsda faollik | 20 | Ishtirok, savollar |
| Model bilan ish | 30 | To'g'ri foydalanish |
| Hisoblashlar | 30 | Masalalar yechish |
| Uyga vazifa | 20 | To'liqlik, sifat |
| **JAMI** | **100** | |

### Kepler bo'yicha:
| Topshiriq | Ball | Tavsif |
|-----------|------|--------|
| 1-qonun (Ellips) | 25 | Parametrlar o'lchash |
| 2-qonun (Yuzalar) | 25 | Tahlil qilish |
| 3-qonun (Davr) | 25 | Hisoblashlar |
| Umumiy test | 25 | Bilimlarni tekshirish |
| **JAMI** | **100** | |

### Yakuniy baho:
```
90-100 ball → "5" (A'lo)
75-89 ball  → "4" (Yaxshi)
60-74 ball  → "3" (Qoniqarli)
0-59 ball   → "2" (Qoniqarsiz)
```

---

## 🔧 TEXNIK YORDAM

### Tez-tez beriladigan savollar (FAQ):

**S: Model ishlamayapti, nima qilish kerak?**
J: 
1. Brauzer versiyasini tekshiring (Chrome 80+ kerak)
2. JavaScript yoqilganini tekshiring
3. Sahifani yangilang (F5 yoki Ctrl+R)
4. Boshqa brauzerda sinab ko'ring

**S: Animatsiya sekin ishlayapti?**
J:
1. Boshqa dasturlarni yoping
2. Tezlik sozlamasini pasaytiring
3. Zarralar/sayyoralar sonini kamaytiring

**S: Oflayn ishlayaptimi?**
J: Ha! Barcha fayllar kompyuteringizda, internet kerak emas.

**S: Mobil telefonda ishlaydimi?**
J: Texnik jihatdan ha, lekin kichik ekran uchun qulay emas. Planshet yoki kompyuter tavsiya etiladi.

**S: Ma'lumotlar saqlanadimi?**
J: Yo'q, brauzer yopilganda barcha ma'lumotlar o'chadi. Muhim natijalarni yozib oling.

### Muammolarni hal qilish:

**Problem:** Canvas qora ekran
**Yechim:** JavaScript xatosini tekshiring, Console ni oching (F12)

**Problem:** Tugmalar ishlamayapti
**Yechim:** onclick funksiyalar to'g'ri yozilganini tekshiring

**Problem:** Animatsiya to'xtab qoldi
**Yechim:** "Qayta" tugmasini bosing yoki sahifani yangilang

---

## 📚 QO'SHIMCHA MATERIALLAR

### Video darslar:
1. YouTube: "Rutherford Gold Foil Experiment"
2. Khan Academy: "Kepler's Laws"
3. PhET Simulations: Official tutorials

### Foydali saytlar:
- **NASA Solar System:** https://solarsystem.nasa.gov
- **PhET Colorado:** https://phet.colorado.edu
- **Khan Academy:** https://www.khanacademy.org/science/physics

### Kitoblar:
1. "Fizika" darsligi - 10-11 sinflar
2. "Atom fizikasi asoslari" - R.Feynman
3. "Astronomiya" - qo'shimcha o'quv qo'llanma

---

## 🎯 MAQSADLAR VA NATIJALAR

### O'qituvchilar uchun:
- ✓ Zamonaviy ta'lim texnologiyalarini qo'llash
- ✓ O'quvchilar qiziqishini oshirish
- ✓ Vizual va interaktiv o'qitish
- ✓ Dars samaradorligini oshirish

### O'quvchilar uchun:
- ✓ Fizik jarayonlarni ko'rish va tushunish
- ✓ Nazariy bilimni amaliyotga tatbiq etish
- ✓ Mustaqil tadqiqot ko'nikmalarini rivojlantirish
- ✓ Texnologiyalar bilan ishlash tajribasi

### Kutilayotgan natijalar:
- 📈 O'zlashtirish sifati 20-30% ortishi
- 🎓 DTM ball o'rtacha 5-10% yaxshilanishi
- ⭐ Fizikaga qiziqish oshishi
- 💡 Tushunish chuqurligi yaxshilanishi

---

## 🔄 YANGILANISHLAR VA RIVOJLANTIRISH

### Joriy versiya: 1.0 (2024)

**Mavjud:**
- ✓ Rezerford tajribasi modeli
- ✓ Kepler 3 ta qonuni modeli
- ✓ O'zbek tilida interfeys
- ✓ To'liq dars ishlanmalar
- ✓ Testlar to'plami

**Rejadagi yangilanishlar:**
- 📋 Bor atomi modeli qo'shish
- 📋 Nyuton gravitatsiya qonuni
- 📋 Elektr maydon vizualizatsiyasi
- 📋 3D modellar
- 📋 VR/AR versiyalar

---

## 📞 ALOQA VA YORDAM

### Texnik yordam:
- Email: [sizning email]
- Telegram: [guruh havolasi]
- GitHub: [loyiha havolasi]

### Takliflar va mulohazalar:
Agar sizda takliflar yoki savollar bo'lsa, biz bilan bog'laning!

---

## 📜 LITSENZIYA

Ushbu dasturiy ta'minot ta'lim maqsadida bepul taqdim etiladi.

**Ruxsat beriladi:**
- ✓ Maktablarda bepul foydalanish
- ✓ Nusxa ko'chirish va tarqatish
- ✓ O'zgartirish va moslashtirish

**Taqiqlanadi:**
- ✗ Tijoriy maqsadda sotish
- ✗ Mualliflikni o'zgartirish
- ✗ Zararli dastur qo'shish

---

## 🙏 MINNATDORCHILIK

**Rahmat:**
- PhET Interactive Simulations - ilhom uchun
- Anthropic Claude - dasturlash yordami uchun
- O'qituvchilar - feedback va takliflar uchun
- O'quvchilar - test qilish uchun

---

## 📝 O'ZGARTIRISHLAR TARIXI

### Versiya 1.0 (2024)
- Birinchi reliz
- Rezerford modeli
- Kepler modeli
- To'liq hujjatlar

---

**Muallif:** [Ismingiz]
**Tashkilot:** [Maktab/Universitet]
**Sana:** 2024-yil
**Versiya:** 1.0

---

## 🌟 LOYIHA MUVAFFAQIYATI UCHUN TAVSIYALAR

### 1. Puxta tayyorgarlik:
- Model va materiallarni oldindan sinab ko'ring
- Texnik jihozlarni tekshiring
- Zaxira variantlarni tayyorlang

### 2. Bosqichma-bosqich ta'lim:
- Oddiydan murakkabga o'ting
- Har bir qadamni tushuntiring
- Ko'proq misollar keltiring

### 3. Faol o'qitish:
- O'quvchilarni jalb qiling
- Savol-javob tashkil eting
- Guruh ishlarini rag'batlantiring

### 4. Doimiy takomillashtirish:
- O'quvchilar fikrlarini tinglang
- Muammolarni yozing va hal qiling
- Yangi g'oyalarni sinab ko'ring

---

**OMAD VA MUVAFFAQIYAT TILAYMIZ! 🚀🎓💫**
