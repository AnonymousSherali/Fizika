# KEPLER QONUNLARI - DARS ISHLANMA
## 10-11 SINFLAR UCHUN

---

## DARSNING MAQSADI

### Bilimlar:
- O'quvchilar Kepler qonunlarining mohiyatini tushunishlari
- Sayyoralar harakati mexanizmini o'rganishlari
- Quyosh sistemasi dinamikasini tahlil qilishlari

### Ko'nikmalar:
- Interaktiv model yordamida sayyoralar harakatini kuzatish
- Matematik hisoblashlar va tahlillar o'tkazish
- Orbital parametrlarni aniqlash va o'lchash

### Kompetensiyalar:
- Astronomik masalalarni yechish qobiliyati
- Ma'lumotlarni grafik ko'rinishda taqdim etish
- Qonuniyatlarni amaliy tadqiqotlarda qo'llash

---

## DARSNING REJASI

### 1-BOSQICH: KIRISH (10 daqiqa)

**Motivatsiya:**
- Sayyoralar qanday harakat qiladi?
- Nima uchun Yer Quyosh atrofida aylanadi?
- Barcha sayyoralar bir xil tezlikdami?

**Tarixiy ma'lumot:**
- Iogann Kepler (1571-1630) - nemis astronomi
- Tixo Brake ning kuzatishlari
- 1609-1619 yillarda kashf etilgan uchta qonun
- Nyuton gravitatsiya nazariyasi bilan bog'liqligi

### 2-BOSQICH: ASOSIY QISM (30 daqiqa)

---

## BIRINCHI QONUN: ELLIPS QONUNI (10 daqiqa)

### Nazariy qism:

**Ta'rif:**
> "Har bir sayyora Quyosh atrofida ellips shaklidagi orbitada harakat qiladi, 
> Quyosh ellipsning fokuslaridan birida joylashgan."

**Asosiy tushunchalar:**

1. **Ellips elementlari:**
   - Yarim katta o'q: **a** (semimajor axis)
   - Yarim kichik o'q: **b** (semiminor axis)
   - Fokuslar orasidagi masofa: **2c**
   - Markazdan fokus masofasi: **c**

2. **Ekssentrisitet (e):**
   ```
   e = c/a
   ```
   - e = 0 → Aylana
   - 0 < e < 1 → Ellips
   - e = 1 → Parabola
   - e > 1 → Giperbola

3. **Ellips tenglamasi:**
   ```
   x²/a² + y²/b² = 1
   ```
   
4. **Bog'liqlik:**
   ```
   b² = a²(1 - e²)
   c = a × e
   ```

### Amaliy qism:

**Model bilan ishlash:**

1. **Merkuriy o'rganish:**
   - a = 0.39 AU
   - e = 0.206 (eng katta ekssentrisitet)
   - Orbital shakli aniq ko'rinadi

2. **Venera o'rganish:**
   - a = 0.72 AU
   - e = 0.007 (aylanaga yaqin)
   - Deyarli aylana shakli

3. **Yer o'rganish:**
   - a = 1.00 AU (ta'rif bo'yicha)
   - e = 0.017
   - Perigeliy: 147 mln km (yanvar)
   - Afeliy: 152 mln km (iyul)

4. **Mars o'rganish:**
   - a = 1.52 AU
   - e = 0.093
   - Yaqqol ko'rinadigan ellips

**Hisoblashlar:**

Yer uchun perigeliy va afeliy masofasini hisoblang:

```
Perigeliy: r_p = a(1 - e) = 1.00(1 - 0.017) = 0.983 AU
Afeliy: r_a = a(1 + e) = 1.00(1 + 0.017) = 1.017 AU
```

---

## IKKINCHI QONUN: YUZALAR QONUNI (10 daqiqa)

### Nazariy qism:

**Ta'rif:**
> "Sayyorani Quyosh bilan bog'lovchi radius-vektor teng vaqt oralig'ida 
> teng yuzalarni kesib o'tadi."

**Fizik ma'nosi:**

1. **Tezlik o'zgarishi:**
   - Perigeliyda (Quyoshga yaqin) → Tezroq
   - Afeliyda (Quyoshdan uzoq) → Sekinroq

2. **Impuls momenti saqlanish:**
   ```
   L = m × v × r = const
   ```
   
   Bu yerda:
   - m - sayyora massasi
   - v - chiziqli tezlik
   - r - radius-vektor

3. **Yuza tezligi:**
   ```
   dS/dt = (1/2) × r × v = const
   ```

4. **Tezliklar nisbati:**
   ```
   v_p / v_a = r_a / r_p
   ```

### Amaliy qism:

**Model bilan ishlash:**

1. **Kuzatish:**
   - Modelda sayyora harakatini boshlang
   - Qizil va ko'k yuzalarni kuzating
   - Yuzalar tengligini tekshiring

2. **O'lchash:**
   - 30 kunlik vaqt oralig'ini tanlang
   - Perigeliydagi yuzani o'lchang
   - Afeliydagi yuzani o'lchang
   - Solishtirishlar o'tkazing

**Misollar:**

Yer uchun:
- Perigeliydagi tezlik: ~30.3 km/s
- Afeliydagi tezlik: ~29.3 km/s
- Farq: ~3.3%

---

## UCHINCHI QONUN: DAVR QONUNI (10 daqiqa)

### Nazariy qism:

**Ta'rif:**
> "Sayyoraning orbital davrining kvadrati, orbit yarim katta o'qining 
> kubiga to'g'ri proporsionaldir."

**Matematik ifoda:**
```
T² / a³ = K = const
```

Bu yerda:
- T - orbital davr (yil)
- a - yarim katta o'q (AU)
- K - proporsionallik koeffitsienti

**Quyosh sistemasi uchun:**
```
T² / a³ = 1 (agar T yilda, a AU da)
```

**Umumiy holat:**
```
T² / a³ = 4π² / (G × M)
```

Bu yerda:
- G = 6.67×10⁻¹¹ N·m²/kg² (gravitatsiya doimiysi)
- M - markaziy jism massasi (Quyosh)

### Amaliy qism:

**Hisoblashlar:**

| Sayyora | a (AU) | T (yil) | a³ | T² | T²/a³ |
|---------|--------|---------|----|----|-------|
| Merkuriy | 0.39 | 0.24 | 0.059 | 0.058 | 0.98 |
| Venera | 0.72 | 0.62 | 0.373 | 0.384 | 1.03 |
| Yer | 1.00 | 1.00 | 1.000 | 1.000 | 1.00 |
| Mars | 1.52 | 1.88 | 3.512 | 3.534 | 1.01 |

**Ko'rinish:** K ≈ 1 (barcha sayyoralar uchun!)

**Model bilan ishlash:**

1. Barcha sayyoralarni birgalikda ishga tushiring
2. Qaysi sayyora tezroq aylanadi?
3. Qaysi sayyora sekinroq?
4. Davr va masofa o'rtasidagi bog'liqlikni kuzating

---

## 3-BOSQICH: MUSTAHKAMLASH (10 daqiqa)

### Guruh ishlari:

**1-guruh: Tadqiqotchilar**
- Yangi sayyora kashf qilindi: a = 2.5 AU
- Orbital davrini hisoblang
- Modelda tekshiring

**2-guruh: Muhandislar**
- Sun'iy yo'ldosh orbitasini loyihalang
- Yer atrofida 24 soatlik davr kerak
- Qanday balandlikda bo'lishi kerak?

**3-guruh: Tahlilchilar**
- Quyosh sistemasidagi barcha sayyoralar ma'lumotlarini tahlil qiling
- Grafik tuzing: T(a)
- Qonuniyatni aniqlang

---

## INTERAKTIV MODEL BILAN ISHLASH

### O'quvchilar uchun topshiriqlar:

#### **Topshiriq 1: Ellips parametrlari (1-qonun)**

1. Merkuriy sayyorasini tanlang
2. Yarim katta o'qni o'lchang (modelda)
3. Ekssentrisitetni yozing
4. Perigeliy va afeliy masofalarini hisoblang:
   ```
   r_p = a(1 - e) = _______
   r_a = a(1 + e) = _______
   ```

5. Modelda ko'rsatilgan qiymatlar bilan taqqoslang

#### **Topshiriq 2: Tezlik o'zgarishi (2-qonun)**

1. 2-qonun bo'limiga o'ting
2. Animatsiyani ishga tushiring
3. Kuzating:
   - Sayyora qayerda tezroq harakat qiladi?
   - Qayerda sekinroq?
4. Yuzalar tengligini tekshiring
5. Vaqt oralig'ini o'zgartiring va natijani kuzating

#### **Topshiriq 3: Davr hisoblash (3-qonun)**

1. 3-qonun bo'limiga o'ting
2. Barcha sayyoralarni kuzating
3. Jadval to'ldiring:

| Sayyora | a (AU) | T (yil) | T²/a³ |
|---------|--------|---------|-------|
| Merkuriy | | | |
| Venera | | | |
| Yer | | | |
| Mars | | | |

4. T²/a³ qiymati barcha sayyoralar uchun doimiymi?

#### **Topshiriq 4: Kreativ topshiriq**

1. O'zingizning "sayyorangiz" uchun parametrlar o'ylab toping
2. Uning orbital xususiyatlarini hisoblang:
   - a = _____ AU
   - e = _____
   - T = _____ yil
   - v_max = _____ km/s
   - v_min = _____ km/s

---

## UYGA VAZIFA

### 1. Nazariy savollar:

a) Kepler qonunlarini o'z so'zlaringiz bilan tushuntiring

b) Nima uchun sayyoralar aylana emas, ellips bo'ylab harakatlanadi?

c) Ekssentrisitet qanday ma'noga ega?

d) Kepler qonunlari Nyuton qonunlari bilan qanday bog'liq?

### 2. Hisoblash masalalari:

**Masala 1:**
Yupiter uchun a = 5.2 AU. Orbital davrini toping.

**Yechish:**
```
T² = a³
T² = (5.2)³ = 140.608
T = √140.608 = 11.86 yil
```

**Masala 2:**
Sun'iy yo'ldosh Yer atrofida 90 daqiqada aylanadi. 
Orbita radiusini toping.

**Berilgan:**
- T = 90 min = 5400 s
- M_Yer = 5.97×10²⁴ kg
- G = 6.67×10⁻¹¹ N·m²/kg²

**Topish kerak:** r = ?

**Formula:**
```
T² = (4π²/GM) × r³
r³ = T² × GM / 4π²
r = ∛(T² × GM / 4π²)
```

**Masala 3:**
Kometa Quyoshga 0.5 AU yaqinlashadi va 35.5 AU uzoqlashadi.
a) Yarim katta o'qni toping
b) Orbital davrini hisoblang
c) Ekssentrisitetni aniqlang

### 3. Tadqiqot vazifasi:

Internet yoki kitoblardan quyidagi ma'lumotlarni toping:

a) Qaysi sayyorada eng katta ekssentrisitet?
b) Qaysi sayyora eng yaqin aylana orbitada?
c) Xalqaro kosmik stantsiya (ISS) orbital parametrlari
d) "Voyager" zondlari hozirgi pozitsiyasi

---

## BAHOLASH MEZONI

### Darsda faollik (30 ball):
- Savollarga javob berish - 10 ball
- Guruh ishida ishtirok - 10 ball
- Model bilan to'g'ri ishlash - 10 ball

### Amaliy topshiriqlar (40 ball):
- Topshiriq 1 (Ellips) - 10 ball
- Topshiriq 2 (Yuzalar) - 10 ball
- Topshiriq 3 (Davr) - 10 ball
- Topshiriq 4 (Kreativ) - 10 ball

### Uyga vazifa (30 ball):
- Nazariy savollar - 10 ball
- Hisoblash masalalari - 15 ball
- Tadqiqot vazifasi - 5 ball

**Jami: 100 ball**

**Baholash shkalasi:**
- 90-100 ball → "5" (A'lo)
- 75-89 ball → "4" (Yaxshi)
- 60-74 ball → "3" (Qoniqarli)
- 0-59 ball → "2" (Qoniqarsiz)

---

## QIZIQARLI FAKTLAR

### 🌍 Yer haqida:
- Perigeliy: 3-yanvar (qish!)
- Afeliy: 4-iyul (yoz!)
- Masofa farqi: 5 million km
- Tezlik farqi: 1 km/s

### 🪐 Sayyoralar rekordi:
- **Eng tez:** Merkuriy (47.87 km/s)
- **Eng sekin:** Neptun (5.43 km/s)
- **Eng elliptik:** Merkuriy (e=0.206)
- **Eng aylana:** Venera (e=0.007)

### ☄️ Kometalar:
- Galley kometasi: e ≈ 0.967
- Davr: 75-76 yil
- Eng yaqin: 0.6 AU
- Eng uzoq: 35 AU

### 🛰️ Sun'iy yo'ldoshlar:
- GPS yo'ldoshlari: ~20,200 km
- ISS: ~400 km
- Geostatsionar orbit: 35,786 km

---

## QO'SHIMCHA MATERIALLAR

### Video tavsiyalar:
1. "Kepler Laws Explained" - Crash Course Astronomy
2. "Solar System Formation" - PBS Space Time
3. "Orbital Mechanics" - NASA Education

### Foydali saytlar:
- NASA Solar System Exploration
- PhET Interactive Simulations
- Stellarium (virtual planetarium)
- Khan Academy - Astronomy

### Kitoblar:
1. "Cosmos" - Carl Sagan
2. "A Brief History of Time" - Stephen Hawking
3. "The Elegant Universe" - Brian Greene

---

## O'QITUVCHI UCHUN MASLAHATLAR

### ✅ Tayyorgarlik:
- Modelni oldindan sinab ko'ring
- Zarur hisoblashlarni tayyorlang
- Vizual materiallar to'plang
- Vaqt rejasini aniqlang

### ✅ Dars jarayonida:
- Sodda va tushunarli tushuntiring
- Ko'proq vizual misollar keltiring
- O'quvchilarni faol qilishtirishga harakat qiling
- Qiyin qismlarni takrorlang

### ✅ Darsdan keyin:
- O'quvchilar ishlarini tekshiring
- Qiyin bo'lgan mavzularni aniqlang
- Keyingi darsda takrorlang
- Ota-onalarga ma'lumot bering

### ⚠️ Tez-tez uchraydigan xatolar:
- Ellipsni aylanadan farqlash
- Ekssentrisitet tushunchasini tushunish
- T²/a³ formulasini qo'llash
- Birliklarni to'g'ri ishlatish

---

## NATIJA

### O'quvchilar bilishi kerak:
✓ Kepler uchta qonuni
✓ Ellips, perigeliy, afeliy tushunchalari
✓ Sayyoralar harakatining fizik mohiyati
✓ Orbital parametrlarni hisoblash usullari

### O'quvchilar qila olishi kerak:
✓ Modeldan foydalanish
✓ Orbital parametrlarni o'lchash
✓ Hisoblashlar o'tkazish
✓ Natijalarni tahlil qilish

---

**Darsni tayyorlagan:** [O'qituvchi ismi]
**Maktab:** [Maktab nomi]
**Sana:** [Dars sanasi]

**MUVAFFAQIYATLAR TILAYMIZ! 🌟🪐🚀**
