# «Fizika 10–11» — o'qituvchi uchun qo'llanma

*Русская версия: [qollanma_oqituvchi_ru.md](qollanma_oqituvchi_ru.md)*

Platforma bepul. Modellar, mashq testlari va dars ishlanmalardan ro'yxatdan o'tmasdan ham foydalanish mumkin.
Hisob ochsangiz — sinf yaratasiz, o'quvchilarga topshiriq berasiz, natijalarni avtomatik ko'rasiz.

---

## 1. Ro'yxatdan o'tish

1. Bosh sahifadagi **«Kirish»** tugmasi → **«O'qituvchi»** bo'limi.
2. Ism, familiya, telefon (yoki email), maktabingiz va parolni kiriting. Maktabingiz ro'yxatda bo'lmasa —
   yangisini kiriting: tuman/shahar ro'yxatdan tanlanadi (yo'q bo'lsa qo'lda yozing).
3. **Maxfiylik siyosatiga rozilik** belgisini qo'ying (siyosat matni: «Maxfiylik siyosati» havolasi).
4. Telefoningizga (yoki emailga) kelgan **6 xonali kodni** kiriting. Kod 10 daqiqa amal qiladi;
   kelmasa — «Kodni qayta yuborish».

Parolni unutdingizmi? «Kirish» sahifasida **«Parolni unutdim»** → telefon/email → kod → yangi parol.

> 10 marta noto'g'ri parol kiritilsa, hisob 15 daqiqaga bloklanadi.

## 2. Sinf yaratish va o'quvchilarni qo'shish

**O'qituvchi paneli → «Sinflar» → «Yangi sinf»** (masalan, «10-A», 2026–2027 o'quv yili).

O'quvchilarni qo'shishning uch usuli:

| Usul | Qanday | Qachon qulay |
|---|---|---|
| **Sinf kodi** | Sinfda `FZ-XXXX` ko'rinishidagi kod va havola chiqadi. O'quvchilar «Kirish → O'quvchi» bo'limida kodni kiritib, o'zi ro'yxatdan o'tadi | O'quvchilarda telefon/kompyuter bor |
| **Havola** | «Havolani nusxalash» → Telegram guruhiga tashlang. Havola orqali kirganda kod avtomatik qo'yiladi | Masofadan |
| **Ro'yxatdan import** | Excel (.xlsx) yoki CSV: ustunlar *Familiya, Ism*. Platforma har biriga login va vaqtinchalik parol yaratadi | Butun sinfni bir zumda |

Importdan keyin **«Login kartochkalari»** tugmasi — har bir o'quvchi uchun login/parol yozilgan kartochkalar.
Chop eting (yoki «PDF sifatida saqlash») va qirqib tarqating. O'quvchi birinchi kirishda parolini almashtiradi.

Kod bilan ishlash: **«Kodni yangilash»** (eskisi bekor bo'ladi), **muddat** belgilash yoki kodni o'chirib qo'yish
(sinf to'lgach begonalar qo'shilmasligi uchun).

### O'quvchilar ro'yxati
- **Parolni tiklash** — o'quvchi parolni unutsa, yangi vaqtinchalik parol chiqadi (o'quvchida telefon/email so'ralmaydi).
- **Boshqa sinfga ko'chirish**, **sinfdan chiqarish**.
- **Ikkinchi o'qituvchi** qo'shish (masalan, o'rinbosar): u ham sinfni ko'radi va baholaydi.
- O'quv yili tugagach — **«Arxivlash»**: sinf yopiladi, natijalar saqlanib qoladi. Unutsangiz ham, sinf
  **1-iyuldan keyin avtomatik arxivlanadi** (qo'shilish kodi o'chiriladi). Iyul–avgustda ochilgan sinf
  yangi o'quv yiliga yoziladi.

## 3. Topshiriq berish

**«Topshiriqlar» → «Yangi topshiriq»**. Ikki tur bor:

### Laboratoriya ishi (model bilan)
1. Modelni tanlang (masalan, «Matematik mayatnik»). Model qadamlari avtomatik qo'yiladi — xohlasangiz o'zgartiring.
2. Talablar: **kamida necha qator** o'lchash, **grafik** va **xulosa** majburiymi.
3. Sinflar, **boshlanish** va **muddat**. Kech topshirishga ruxsat va jarima foizi (masalan, −10%).

O'quvchi topshiriqni ochganda model **topshiriq rejimida** ochiladi: tepada sizning qadamlaringiz, pastda
jurnal. Jurnal har 2 soniyada serverga saqlanadi; internet uzilsa — keyin o'zi yuboriladi.

### Test
1. Mavzular, **savollar** va **masalalar** soni, **vaqt** (daqiqa), **urinishlar** (1–3).
2. To'g'ri javoblarni ko'rsatish: darhol (har savoldan keyin) / muddat tugagach / hech qachon.

Har o'quvchiga savollar va variantlar **aralash tartibda** tushadi; parametrlangan masalalarda **sonlar ham har xil**.
Test serverda tekshiriladi — to'g'ri javoblar o'quvchi brauzeriga yuborilmaydi.

Topshiriq yaratilgach o'quvchilarga bildirishnoma (🔔 va email) boradi; muddatga **24 soat** va **1 soat**
qolganda eslatma yuboriladi.

## 4. Tekshirish va baholash

Topshiriqni oching — sinf ro'yxati bo'yicha har bir o'quvchi holati: *yangi · bajarilmoqda · topshirildi ·
baholandi · qaytarildi · muddati o'tdi*.

- **Test** avtomatik baholanadi (eng yaxshi urinish, kechikish jarimasi bilan). Bahoni qo'lda o'zgartirish mumkin.
- **Laboratoriya ishi**: platforma **dastlabki bahoni** taklif qiladi — qatorlar soni, grafik to'g'riligi (R² ≥ 0,98),
  nazariy qiymatdan xatolik (≤ 5%), xulosa bor-yo'qligi. Siz ishni ko'rib (jurnal, grafik, xulosa) yakuniy baho
  (2–5 yoki 100 ballik) va izoh qo'yasiz.
- **«Qayta ishlashga qaytarish»** — izoh bilan; o'quvchi tuzatib qayta topshiradi.
- **CSV yuklab olish** — topshiriq natijalari jadvali.

Har bir baho o'zgarishi xavfsizlik jurnaliga yoziladi (kim, qachon, oldingi va yangi baho).

## 5. Statistika

**«Statistika»** bo'limi, sinfni tanlang:
- topshiriqlar bajarilishi, o'rtacha baho, testlar o'rtachasi, so'nggi 7 kun faolligi;
- **«O'quvchi × mavzu» xaritasi** — qaysi mavzu sinfda sust ekani bir qarashda ko'rinadi (qizil — sust);
- o'quvchi ismini bosing → **o'quvchi kartasi**: barcha topshiriqlar, test dinamikasi, zaif mavzular;
- **Excel (.xlsx)** — sinf jurnali: baholar va mavzular bo'yicha natijalar.

## 6. O'z savollaringiz

**«Savollarim»**: savol qo'shish (4 variant, to'g'ri javob, izoh) yoki Excel'dan import.
Yangi savol **qoralama** holatida — o'z topshiriqlaringizda darhol ishlatsangiz bo'ladi; administrator
tasdiqlagach umumiy bankka qo'shiladi. Har bir savol bo'yicha statistika: necha marta berildi, necha % to'g'ri,
qaysi noto'g'ri variant ko'p tanlandi.

### Hisoblash masalalari
Shu bo'limning pastida **«Masala qo'shish»**:
- **Oddiy** — matn, to'g'ri javob, birlik, ruxsat etilgan xatolik (%), yechim.
- **Parametrli** — matnda sonlar o'rniga `{h}`, `{m}` kabi nomlar yoziladi, har bir nom uchun oraliq beriladi
  (masalan `h`: 5 dan 45 gacha, qadam 5) va **javob formulasi**: `(2*9.8*h)**0.5`. Amallar: `+ − * / **`
  (ildiz — `**0.5`), qavslar, `pi`. Yechimda `{h}` va `{answer}` ishlatish mumkin.
  Har o'quvchiga boshqa sonlar tushadi — javobni ko'chirib olish foyda bermaydi.
- **«Namunani ko'rish»** — saqlashdan oldin o'quvchilar ko'radigan 3 ta variantni javobi bilan ko'rsatadi.

## 7. Dars ishlanmalari

**«Ishlanmalarim» → «Yuklash»**: PDF (≤ 15 MB) yoki DOCX (≤ 10 MB, makrossiz). Administrator ko'rib chiqadi:
nashr qilinsa — barcha o'qituvchilar ko'radi; rad etilsa — sababi izohda yoziladi.

## 8. O'qituvchi rejimi modellarda

Hisobingiz bilan kirganingizda model sahifalarida **kutilgan natijalar** (o'quvchilarga ko'rinmaydi) chiqadi —
darsga tayyorlanishda va tekshirishda qulay.

## 9. Profil

**Profil** sahifasida: ism, til (o'zbek/rus), yorug'/qorong'i rejim, email bildirishnomalarni yoqish/o'chirish,
parolni almashtirish, so'nggi 10 ta kirish tarixi (begona kirish bo'lsa darhol parolni almashtiring) va
hisobni o'chirish (30 kundan keyin butunlay o'chiriladi).

---

## Tez-tez beriladigan savollar

**O'quvchi kodni kiritsa «Kod topilmadi» chiqyapti.** Kod yangilangan, muddati o'tgan yoki o'chirilgan bo'lishi mumkin —
panelda sinf kodini tekshiring.

**O'quvchining jurnali saqlanmadi.** Model pastki panelida saqlash holati ko'rinadi. «Navbatda» bo'lsa — internet
qaytganda o'zi yuboriladi; o'quvchi sahifani yopmasdan internetga ulanishi kifoya.

**Testda o'quvchining interneti uzildi.** Testni qayta ochsa, qolgan joyidan davom etadi (vaqt server bo'yicha
hisoblanadi; vaqt tugasa test avtomatik yakunlanadi).

**Bitta o'quvchi ikki sinfda bo'la oladimi?** Ha (masalan, asosiy sinf va to'garak).

**Sayt rus tilida ishlaydimi?** Ha. Pastki chap burchakdagi **RU** tugmasi — barcha sahifalar, test savollari va
masalalar ruscha. Profilda tilni tanlasangiz, barcha qurilmalaringizda saqlanadi.
