/* Sahifa chizilishidan oldin qorong'i rejimni qo'yadi (oq «miltillash» bo'lmasin). <head> ichida, sinxron yuklanadi.
   Avval har sahifada inline <script> edi — CSP (script-src 'self') uchun alohida faylga chiqarildi. */
try {
    if (localStorage.getItem('fizika-theme') === 'dark') document.documentElement.classList.add('dark');
} catch (e) { /* xotira yopiq — yorug' rejim */ }
