# «Fizika 10–11» — administrator qo'llanmasi

Administrator platformani boshqaradi: foydalanuvchilar, maktablar, kontent moderatsiyasi, tarjimalar,
statistika va xavfsizlik. Texnik o'rnatish: [`backend/README.md`](../backend/README.md).

---

## 1. Admin panelga kirish

Manzil: `https://<sayt>/admin/`. Production'da kirish **ikki bosqichli**: login + parol + **6 xonali kod**
(Google Authenticator, Microsoft Authenticator yoki boshqa TOTP ilova).

Birinchi sozlash (server administratori bajaradi):
```bash
python manage.py createsuperuser
python manage.py admin_2fa_setup <login>          # QR-kod chiqadi — ilovada skanerlang
```
Telefon yo'qolsa: `python manage.py admin_2fa_setup <login> --reset` va qaytadan skanerlash.

> Admin parolini va telefonni hech kimga bermang. Har bir administratorga alohida hisob oching.

## 2. Foydalanuvchilar

**Foydalanuvchilar** bo'limi: qidiruv (ism, telefon, login), rol (o'quvchi / o'qituvchi / admin), maktab bo'yicha filtr.

- **O'qituvchi tasdiqlanmagan** (SMS kelmagan) — `is_verified` belgisini qo'lda qo'yish mumkin
  (shaxsini telefon orqali aniqlagandan keyin).
- **Rol o'zgartirish** xavfsizlik jurnaliga yoziladi.
- **Hisobni o'chirish so'rovi** — foydalanuvchi o'zi so'raydi; 30 kundan keyin har kecha avtomatik o'chiriladi.
  Test natijalari anonim statistika sifatida qoladi.
- **Kirish tarixi** — har bir foydalanuvchi uchun (IP, brauzer, muvaffaqiyatli/muvaffaqiyatsiz).

## 3. Maktablar va sinflar

Maktablar 14 hudud bo'yicha. Bir maktab ikki xil yozilgan bo'lsa (masalan, «12-maktab» va «12-sonli maktab»),
o'qituvchilarni bittasiga o'tkazib, ikkinchisini o'chiring. Sinflarni ko'rish, arxivlash mumkin.

## 4. Kontent moderatsiyasi

### Savollar
**Testlar → Savollar**, filtr «Holat: qoralama». O'qituvchi qo'shgan savolni tekshiring (matn, variantlar,
to'g'ri javob, izoh) → holatni **«Tasdiqlangan»** qiling — umumiy bankka qo'shiladi.
Statistika ustunida «to'g'ri %» ko'rinadi: juda past (< 15%) yoki juda baland (> 95%) savollarni qayta ko'rib chiqing.
Topshiriqda ishlatilgan savol o'chirilmaydi — **arxivlanadi**.

Masalalar: javob, birlik va ruxsat etilgan xatolik (%). **Parametrlangan masala**: `params` (masalan,
`{"m": [1, 5, 0.5]}` — 1 dan 5 gacha 0,5 qadam bilan) va `formula` (masalan, `m*9.8`); matnda `{m}`.

### Dars ishlanmalari
**Kontent → Dars ishlanmalar**, filtr «Moderatsiyada». Faylni yuklab ko'ring → **«Nashr qilish»** yoki
**«Rad etish»** (izoh majburiy — o'qituvchi sababini ko'radi). Fayllar yuklashda avtomatik tekshiriladi
(tur, hajm, makrosli DOCX rad etiladi).

### Tarjimalar
**Kontent → Tarjimalar** — saytning ruscha matnlari. O'zgartirgandan keyin saytdagi faylni yangilash:
```bash
python manage.py export_i18n
```

### Modellar
Model sahifalari o'zgarsa (yangi model, jurnal ustunlari): `python manage.py import_simulations`.
Eski jurnallar eski sxema versiyasida qoladi.

## 5. Statistika

`GET /api/v1/analytics/platform/` (admin hisobi bilan): rollar bo'yicha foydalanuvchilar, 7 va 30 kunlik
faollar, modellar bo'yicha laboratoriya jurnallari, yakunlangan testlar va topshiriqlar soni, hududlar bo'yicha taqsimot.

## 6. Xavfsizlik jurnali (audit)

**Audit → Jurnal**: kirishlar, parol o'zgarishi, hisob o'chirish, rol o'zgarishi, baho qo'yish/o'zgartirish
(oldingi va yangi qiymat), qaytarish, o'chirishlar, moderatsiya. Har bir yozuvda kim, qachon, IP.

Jurnalni **tahrirlash yoki o'chirib bo'lmaydi** (hatto administrator ham). 1 yildan eski yozuvlar har hafta
avtomatik tozalanadi.

Shikoyat bo'lsa («bahoni kimdir o'zgartirgan») — obyekt bo'yicha filtrlang va kim o'zgartirganini ko'ring.

## 7. Server ishi (texnik administrator uchun)

| Vazifa | Qanday |
|---|---|
| Holatni tekshirish | `GET /api/v1/health/` → `{"status":"ok"}` (baza va kesh) |
| Zaxira nusxa | har kecha `scripts/backup.sh` (cron), 30 kun saqlanadi |
| Tiklash | `scripts/restore.sh <fayl.dump>`; oyiga bir marta sinov bazasida tiklab ko'ring |
| Xatolar | Sentry (`SENTRY_DSN`), gunicorn loglari: `docker compose logs api` |
| Yangilash | `git pull` → `docker compose up -d --build` → `docker compose exec api python manage.py migrate` |
| Fon vazifalari | `celery` va `beat` konteynerlari: email, muddat eslatmalari, hisoblarni o'chirish, audit tozalash |

**Muhim:** server va zaxira nusxalar **O'zbekiston hududida** bo'lishi shart (O'RQ-547, 27¹-modda).

## 8. Muammolar

| Belgi | Sabab va yechim |
|---|---|
| O'qituvchilarga SMS kelmayapti | `SMS_PROVIDER=eskiz` va `SMS_API_TOKEN` to'g'riligini, Eskiz.uz balansini tekshiring |
| Email kelmayapti | `EMAIL_HOST*` sozlamalari; `celery` konteyneri ishlayaptimi |
| Muddat eslatmalari kelmayapti | `beat` konteyneri ishlayaptimi |
| Saytda «Kirish» tugmasi yo'q | API ishlamayapti: `/api/v1/health/` ni oching |
| Admin kodni qabul qilmayapti | telefon vaqti noto'g'ri (avtomatik vaqtni yoqing) yoki `admin_2fa_setup --reset` |
