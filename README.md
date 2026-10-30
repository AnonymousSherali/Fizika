# FIZIK JARAYONLARNI MODELLASHTIRISHNING DASTURIY TA'MINOTI
## 10-11 SINFLAR UCHUN - 15 TA INTERAKTIV MODEL, 22 TA DARS ISHLANMA, 210+ TEST

---

## 📋 LOYIHA HAQIDA

### Maqsad:
O'quvchilarga fizik jarayonlarni visualizatsiya qilish va interaktiv tarzda o'rganish imkoniyatini berish.

### Asosiy yo'nalishlar:
1. **Rezerford tajribasi** - Atom tuzilishi
2. **Kepler qonunlari** - Sayyoralar harakati
3. **Matematik mayatnik** - Erkin tushish tezlanishini aniqlash
4. **Qiya tekislik** - Foydali ish koeffitsiyenti
5. **Om qonuni** - Zanjirning bir qismi uchun I = U/R
6. **Elektromagnit induksiya** - Faradey qonuni va Lens qoidasi
7. **Prujinali mayatnik** - T = 2π√(m/k), energiya almashinuvi
8. **Burchak ostida otilgan jism** - Traektoriya, H va L
9. **Ideal gaz qonunlari** - Izotermik, izobarik, izoxorik jarayonlar
10. **Yassi kondensator** - C = εε₀S/d, manbaga ulangan/uzilgan holat
11. **Impulsning saqlanish qonuni** - Elastik va noelastik to'qnashuvlar
12. **Yorug'likning sinishi** - Snellius qonuni, to'liq ichki qaytish
13. **Yupqa linza** - Tasvir yasash, 1/F = 1/d + 1/f
14. **Fotoeffekt** - Eynshteyn tenglamasi, qizil chegara
15. **Radioaktiv yemirilish** - N = N₀·2^(−t/T½)

### Har bir modelda:
- 🎯 Tayyor topshiriq va jonli o'lchovlar
- 📋 Laboratoriya jurnali: jadval, **grafik va chiziqli tahlil** (eng kichik kvadratlar, R²),
  CSV (Excel) va **PDF hisobot** (o'quvchi F.I.Sh., sinf, xulosa satrlari bilan)
- ⛶ To'liq ekran (proyektor uchun), ⌨️ klaviatura: Space / R / S
- 👩‍🏫 **O'qituvchi rejimi**: istalgan sahifa manziliga `?oqituvchi=1` qo'shing — modellarda
  kutilgan natijalar ko'rinadi; `?oqituvchi=0` bilan o'chiriladi
- 🌐 Interfeys tilini o'zgartirish: o'zbekcha / ruscha (suzuvchi «RU» tugmasi)

### Backend (hisoblar, sinflar, topshiriqlar, baholash):
Python + Django + PostgreSQL — [`backend/`](backend/README.md). Texnik topshiriq:
[`hujjatlar/backend_TZ.md`](hujjatlar/backend_TZ.md), bajarilish holati: [`backend/ROADMAP.md`](backend/ROADMAP.md).
Qo'llanmalar: o'qituvchi ([uz](hujjatlar/qollanma_oqituvchi.md), [ru](hujjatlar/qollanma_oqituvchi_ru.md)),
administrator ([uz](hujjatlar/qollanma_admin.md), [ru](hujjatlar/qollanma_admin_ru.md)).
Backend ishlamasa ham sayt (modellar, mashq testlari, ishlanmalar) avvalgidek oflayn ishlaydi.

### Oflayn ishlash (PWA):
Sayt bir marta internet bilan ochilgach, barcha sahifalar, modellar va testlar brauzer
xotirasiga saqlanadi va **internetsiz ham ochiladi**. Telefonda «Bosh ekranga qo'shish»
orqali ilova sifatida o'rnatiladi. Fayllar o'zgartirilganda kesh versiyasini oshiring:
`python3 tools/bump_version.py` (barcha `?v=`, `sw.js` versiyasi va oflayn ro'yxat yangilanadi; CI tekshiradi).
(Oflayn rejim faqat `http(s)://` orqali ishlaydi, `file://` da emas.)

### Texnologiyalar:
- HTML5
- CSS3
- JavaScript (Canvas API)
- PhET-ga o'xshash interaktiv interfeys

---

## 📁 LOYIHA TUZILMASI

### Kod qanday joylashgan (qoida)
| Fayl turi | Qoida | Misol |
|---|---|---|
| **Sahifa** | `nom.html` — faqat belgilash (matn, tugmalar); uning kodi **yonida** `nom.js`. Har bir `nom.js` faqat o'z sahifasida ulanadi — sahifalar bir-birining kodiga tegmaydi | `modellar/kepler_model.html` + `modellar/kepler_model.js` |
| **Umumiy kod** | Bir nechta sahifa ishlatadi, ildizda turadi | `theme.js` (hamma sahifa), `model-tools.js` (15 model), `api.js` + `app.js` (hisob sahifalari), `i18n.js` |
| **Ma'lumot** | Kod emas, faqat ma'lumot | `testlar/bank.js` (savollar banki), `i18n-ru.js` (ruscha lug'at) |
| **Uslub** | | `styles.css` (umumiy), `app.css` (hisob sahifalari), `model-tools.css` (modellar) |

HTML ichida kod yo'q (inline `<script>`, `onclick="..."`): tugmalar `data-click="funksiya('qiymat')"` bilan
ulanadi (`theme.js`), bu brauzer xavfsizlik siyosati (CSP) uchun shart. Buni CI tekshiradi
(`backend/tests/test_frontend_assets.py`), kod sifatini — ESLint (`npm run lint`).


```
Fizika/                            # Tuzilma sayt bo'limlariga mos
│
├── index.html, index.js           # 🏠 Bosh sahifa (modellar katalogi) va uning kodi
├── kirish.html/.js, profil.html/.js # 👤 Kirish / ro'yxatdan o'tish, profil
├── oquvchi/, oqituvchi/           # 📋 O'quvchi sahifasi, o'qituvchi paneli
├── maxfiylik.html                 # 🔒 Maxfiylik siyosati
├── styles.css, app.css            # Umumiy stillar (dark mode bilan), hisob sahifalari
├── model-tools.css                # Laboratoriya vositalari uslubi
├── theme.js, theme-init.js        # Umumiy UI (rejim, til, hisob tugmasi, data-click); qorong'i rejim (<head>)
├── api.js, app.js                 # Backend bilan aloqa (token, oflayn navbat), sahifa yordamchilari
├── i18n.js, i18n-ru.js            # Ruscha tarjima (lug'at)
├── sw.js, manifest.webmanifest    # Oflayn ishlash (PWA)
├── model-tools.js                 # Jurnal, navigatsiya, klaviatura, topshiriq rejimi
├── tools/bump_version.py          # Kesh versiyasini oshirish
├── tekshiruv.html                 # 🔍 Deploy tekshiruvi (fayllar yuklanyaptimi)
├── .htaccess                      # Apache sozlamalari (MIME, kesh)
├── fonts/                         # Inter shrifti (internetsiz ham ishlaydi)
├── img/                           # Bosh sahifadagi model rasmlari
│
├── modellar/                      # 🎮 Interaktiv modellar
│   ├── rezerford_model.html       #   Rezerford tajribasi
│   ├── kepler_model.html          #   Kepler qonunlari
│   ├── mayatnik_model.html        #   Matematik mayatnik
│   ├── qiya_tekislik_model.html   #   Qiya tekislik (FIK)
│   ├── om_qonuni_model.html       #   Om qonuni (I = U/R)
│   ├── induksiya_model.html       #   Elektromagnit induksiya
│   ├── prujinali_mayatnik_model.html # Prujinali mayatnik
│   ├── otilgan_jism_model.html    #   Burchak ostida otilgan jism
│   ├── gaz_qonunlari_model.html   #   Ideal gaz qonunlari
│   ├── kondensator_model.html     #   Yassi kondensator
│   ├── impuls_model.html          #   Impulsning saqlanish qonuni
│   ├── yoruglik_sinishi_model.html #  Yorug'likning sinishi
│   ├── linza_model.html           #   Yupqa linza
│   ├── fotoeffekt_model.html      #   Fotoeffekt
│   └── radioaktiv_yemirilish_model.html # Radioaktiv yemirilish
│
├── dars_ishlanmalar/              # 📚 Dars ishlanmalar
│   ├── index.html                 #   Sahifa (/dars_ishlanmalar/)
│   ├── 10-sinf/                   #   12 ta dars (PDF + DOCX)
│   └── 11-sinf/                   #   10 ta dars (PDF; 8 tasi DOCX ham)
│
├── testlar/                       # 📝 Test va baholash
│   ├── testlar_online.html        #   Mashq testi (savollar serverdan, oflayn — o'rnatilgan bank)
│   ├── nazorat.html               #   Nazorat testi (o'qituvchi topshirig'i, serverda tekshiriladi)
│   ├── testlar.pdf                #   Testlar to'plami (PDF)
│   └── testlar.md                 #   Manba
│
├── hujjatlar/                     # 📋 Loyiha hujjatlari
│   ├── README.pdf                 #   Yo'riqnoma (PDF)
│   ├── metodika_qollanma.pdf      #   Metodika qo'llanma
│   ├── loyiha_algoritmi.html      #   Loyiha strukturasi diagrammasi
│   └── *.md                       #   Manba fayllar
│
├── backend/                       # ⚙️ Django backend (README.md, ROADMAP.md, Docker, nginx)
├── README.md                      # Bu fayl
```

---

## 🚀 O'RNATISH VA ISHLATISH

### 1-usul: Bevosita brauzerda ochish

**Windows:**
1. Loyiha papkasidagi `index.html` (bosh sahifa) faylini toping
2. Fayl ustiga o'ng tugmachani bosing
3. "Open with" → Brauzerni tanlang (Chrome, Firefox, Edge)

**Mac/Linux:**
```bash
# Terminal orqali
cd Fizika
open index.html        # Mac
xdg-open index.html    # Linux
```

### 2-usul: Lokal server orqali

**Python bilan:**
```bash
# Python 3
cd Fizika
python -m http.server 8000

# Keyin brauzerda oching:
# http://localhost:8000/  (bosh sahifa)
# http://localhost:8000/modellar/rezerford_model.html
```

**Node.js bilan:**
```bash
# http-server o'rnating
npm install -g http-server

# Ishga tushiring
cd Fizika
http-server -p 8000
```

### 3-usul: Hostingga joylash (ahost, cPanel va boshqalar)

**Muhim:** fayllarni yuklashda **papka tuzilishi saqlanishi** shart.

1. Loyihani ZIP qilib yuklab oling (GitHub → Code → Download ZIP)
2. Hosting **File Manager** ga kiring va `public_html` papkasini oching
3. ZIP ni **`public_html` ichiga** yuklang va o'sha yerda oching (Extract)
4. Fayllar shunday joylashishi kerak:

```
public_html/
├── index.html          ← bosh sahifa aynan shu yerda
├── styles.css
├── model-tools.css
├── theme.js
├── model-tools.js
├── .htaccess           ← Apache sozlamalari (yashirin fayl)
├── modellar/
├── testlar/
├── dars_ishlanmalar/
└── hujjatlar/
```

5. **Tekshirish:** brauzerda `sizningsayt.uz/tekshiruv.html` ni oching —
   u barcha fayllar to'g'ri yuklanayotganini ko'rsatadi

#### Tez-tez uchraydigan xatolar

| Muammo | Sabab | Yechim |
|--------|-------|--------|
| Sayt stilsiz (oddiy matn) ochiladi | `styles.css` yuklanmagan yoki noto'g'ri papkada | `tekshiruv.html` bilan tekshiring |
| Ba'zi sahifalar ochilmaydi | Papkalar yuklanmagan | `modellar/`, `testlar/` papkalarini tekshiring |
| Eski versiya ko'rinadi | Brauzer keshi | `Ctrl+F5` (yoki `Cmd+Shift+R`) bosing |
| Fayl topilmadi (404) | Katta-kichik harf | `styles.css` — hammasi kichik harfda |

**Eslatma:** `.htaccess` yashirin fayl. File Manager'da uni ko'rish uchun
"Show hidden files" (yashirin fayllarni ko'rsatish) ni yoqing.

### 4-usul: Maktab serveri

1. Barcha fayllarni server papkasiga ko'chiring
2. O'quvchilarga link bering:
   - `http://maktab-server/fizika/  (bosh sahifa)`
   - `http://maktab-server/fizika/modellar/kepler_model.html`

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

3. **Manba masofasi ta'sir qiladimi?**
   - Masofani 10 va 100 qilib, bir xil tezlikda seriya o'tkazing
   - Natija o'zgarmaydi: sochilish faqat tezlik (energiya) va
     nishon parametriga bog'liq — buning sababini tushuntiring

### KEPLER MODELI

#### 3 ta bo'lim:

**1-QONUN: ELLIPS**
- Sayyora tanlash (Quyosh sistemasining 8 ta sayyorasi)
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

### Joriy versiya: 2.0 (2026)

**Mavjud:**
- ✓ 15 ta interaktiv model (mexanika, molekulyar fizika, elektr, optika, kvant va yadro fizikasi)
- ✓ Laboratoriya jurnali: grafik, CSV, PDF hisobot; o'qituvchi rejimi
- ✓ Onlayn test: 15 mavzu, 170 savol + 48 masala, mavzu tanlash, izohlar
- ✓ 22 ta dars ishlanma (PDF + DOCX)
- ✓ Oflayn ishlash (PWA), qorong'i rejim, o'zbek/rus interfeysi

**Rejadagi yangilanishlar:**
- 📋 Bor atomi modeli, elektr maydon kuch chiziqlari
- 📋 O'zgaruvchan tok va tebranish konturi modeli
- 📋 Modellar ichidagi matnlarning to'liq rus tilidagi versiyasi

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

### Versiya 2.0 (2026)
- 9 ta yangi model, jurnal grafigi va PDF hisobot, o'qituvchi rejimi, PWA
- Testlar 15 mavzuga kengaytirildi, 9 ta yangi dars ishlanma

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
