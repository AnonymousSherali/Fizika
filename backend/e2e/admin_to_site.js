/*
 * Admin panel → sayt: admin panelning o'z formalari orqali ma'lumot qo'shib/o'zgartiradi va saytda
 * (mashq testi, katalog, model sahifasi, 🔔, ro'yxatdan o'tish, dars ishlanmalar, ruscha rejim) ko'rinishini tekshiradi.
 * FAQAT SINOV BAZASIDA ishlating — «ADMIN ...» yozuvlari qo'shiladi, Kepler modeli nofaol qilinadi.
 * Keyin tiklash: manage.py import_simulations && manage.py import_i18n (va «ADMIN» yozuvlarini o'chiring).
 *
 *   SITE=http://localhost:8080/ BACKEND=http://127.0.0.1:8000/ ADMIN=admin ADMIN_PW=...  *   TEACHER=+998901234500 TEACHER_PW=... node e2e/admin_to_site.js
 * (ADMIN_2FA=false bo'lgan sinov serverida; Redis keshini tozalash uchun redis-cli kerak.)
 */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');
const BACKEND=process.env.BACKEND||'http://127.0.0.1:8000/', SITE=process.env.SITE||'http://localhost:8080/';
const A=BACKEND+'admin/', API=BACKEND+'api/v1/';
const ADMIN=[process.env.ADMIN||'admin',process.env.ADMIN_PW||''], TEACHER=[process.env.TEACHER||'+998901234500',process.env.TEACHER_PW||''];
const PDF=path.join(os.tmpdir(),'fizika-e2e.pdf');
fs.writeFileSync(PDF,'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const R=[];const ok=(name,cond,info)=>{R.push([cond?'✅':'❌',name,info||'']);};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const adm=await b.newPage();
await adm.goto(A+'login/');await adm.fill('#id_username',ADMIN[0]);await adm.fill('#id_password',ADMIN[1]);
await Promise.all([adm.waitForNavigation(),adm.click('button[type=submit]')]);
async function save(){await Promise.all([adm.waitForNavigation(),adm.click('button[name=_save], input[name=_save]')]);
 const err=await adm.$('.errornote, .errorlist');if(err)throw new Error('admin form error: '+(await err.textContent()));}
const site=async(lang,login)=>{const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.addInitScript(([a,l])=>{localStorage.setItem('fizika-api',a);localStorage.setItem('fizika-lang',l);},[API,lang]);
 const p=await c.newPage();
 if(login){await p.goto(SITE+'kirish.html');await p.waitForTimeout(1000);await p.fill('#lLogin',login[0]);await p.fill('#lPass',login[1]);
   await Promise.all([p.waitForNavigation({timeout:8000}).catch(()=>{}),p.click('#fLogin button')]);}
 return p;};
const flush=async()=>{try{require('child_process').execSync('redis-cli flushdb');}catch(e){console.log("(redis-cli yo'q — katalog keshi 10 daqiqa)");}};
// Obyekt sahifasi admin qidiruvi orqali topiladi (id ga bog'lanmaslik uchun)
const changeUrl=async(model,q)=>{await adm.goto(A+model+'/?q='+encodeURIComponent(q));
  return adm.$eval('#result_list tbody tr a[href*="/change/"]',a=>a.href);};

// 1) Savol (tasdiqlangan) → mashq testi
const Q='ADMIN SINOV: Kepler qonunlari nechta?';
await adm.goto(A+'quizzes/question/add/');await adm.selectOption('[name=topic]',{label:'Kepler'});
await adm.fill('[name=text_uz]',Q);await adm.fill('[name=options]','[{"uz":"1"},{"uz":"2"},{"uz":"3"},{"uz":"4"}]');
await adm.fill('[name=correct_index]','2');await adm.fill('[name=explanation_uz]','Uchta qonun bor.');await adm.selectOption('[name=status]','approved');await save();
let p=await site('uz');await p.goto(SITE+'testlar/testlar_online.html');await p.waitForTimeout(2500);
ok('Savol qo\'shildi (holat: tasdiqlangan) → mashq testida',await p.evaluate(q=>questions.some(x=>x.q===q),Q),'testlar_online.html');
await p.context().close();

// 2) Model nomi/tavsifi + 3) topshiriq qadami + 4) kutilgan natija
const KEPLER=await changeUrl('simulations/simulation','kepler'), MAYATNIK=await changeUrl('simulations/simulation','Matematik mayatnik');
await adm.goto(KEPLER);
await adm.fill('[name=title_uz]','Kepler qonunlari (ADMIN)');await adm.fill('[name=description_uz]','ADMIN tavsifi: orbitalar.');await save();
await adm.goto(MAYATNIK);
await adm.fill('[name=tasks-0-text_uz]','ADMIN QADAMI: ipni 1 m qilib oling.');
await adm.fill('[name=expected-0-text_uz]','ADMIN KUTILGAN: g ≈ 9,8 m/s².');await save();
await flush();
p=await site('uz');await p.goto(SITE+'index.html');await p.waitForTimeout(2500);
ok('Model nomi o\'zgartirildi → bosh sahifa katalogida',(await p.textContent('.sim[href*="kepler"] .sim__title'))==='Kepler qonunlari (ADMIN)','index.html');
ok('Model tavsifi o\'zgartirildi → katalogda',(await p.textContent('.sim[href*="kepler"] .sim__desc'))==='ADMIN tavsifi: orbitalar.','index.html');
await p.goto(SITE+'modellar/mayatnik_model.html');await p.waitForTimeout(2500);
ok('Model topshiriq qadami o\'zgartirildi → model sahifasida',(await p.textContent('.task-card ol li')).includes('ADMIN QADAMI'),'mayatnik_model.html');
await p.context().close();
p=await site('uz',TEACHER);await p.goto(SITE+'modellar/mayatnik_model.html');await p.waitForTimeout(2500);
ok('Kutilgan natija o\'zgartirildi → o\'qituvchiga model sahifasida',((await p.textContent('.teacher-box').catch(()=>''))||'').includes('ADMIN KUTILGAN'),'mayatnik_model.html (o\'qituvchi)');
// 5) Bildirishnoma
await p.context().close();
const teacherId=await (async()=>{const q=await site('uz',TEACHER);const id=await q.evaluate(()=>window.FizikaAPI.user().id);await q.context().close();return id;})();
await adm.goto(A+'notifications/notification/add/');await adm.fill('[name=user]',String(teacherId));
await adm.selectOption('[name=type]','new_assignment');await adm.fill('[name=title]','ADMIN XABARI: majlis ertaga');await save();
p=await site('uz',TEACHER);await p.goto(SITE+'oqituvchi/index.html');await p.waitForTimeout(2000);
const unread=await p.evaluate(async()=>{const r=await window.FizikaAPI.get('notifications/');return (r.results||r).map(n=>n.title);});
ok('Bildirishnoma qo\'shildi → foydalanuvchining 🔔 ro\'yxatida',unread.includes('ADMIN XABARI: majlis ertaga'),'🔔 (o\'qituvchi paneli)');
await p.context().close();

// 6) Model nofaol → katalogdan yo'qoladi
await adm.goto(KEPLER);await adm.uncheck('[name=is_active]');await save();await flush();
p=await site('uz');await p.goto(SITE+'index.html');await p.waitForTimeout(2500);
ok('Model nofaol qilindi → katalogdan yashirildi',(await p.locator('.sim[href*="kepler"]').count())===0,'index.html');
await p.context().close();

// 7) Maktab → ro'yxatdan o'tish formasida
await adm.goto(A+'schools/school/add/');await adm.fill('[name=name]','ADMIN maktabi');await adm.fill('[name=number]','777');
await adm.selectOption('[name=region]','toshkent_sh');await adm.fill('[name=district]','Chilonzor');await adm.check('[name=is_verified]');await save();
p=await site('uz');await p.goto(SITE+'kirish.html');await p.waitForTimeout(1500);
await p.click('[data-tab=teacher]');await p.selectOption('#tRegion','toshkent_sh');await p.waitForTimeout(1500);
const opts=await p.$$eval('#tSchool option',os=>os.map(o=>o.textContent)).catch(()=>[]);
ok('Maktab qo\'shildi → o\'qituvchi ro\'yxatdan o\'tish formasida',opts.some(t=>t.includes('ADMIN maktabi')),'kirish.html');
await p.context().close();

// 8) Dars ishlanma (PDF, nashr etilgan)
await adm.goto(A+'content/lessonplan/add/');await adm.fill('[name=title_uz]','ADMIN ishlanmasi: Nyuton qonunlari');
await adm.selectOption('[name=grade]','10');await adm.fill('[name=lesson_type]','Yangi mavzu');await adm.setInputFiles('[name=pdf]',PDF);
await adm.selectOption('[name=status]','published');await save();
p=await site('uz');await p.goto(SITE+'dars_ishlanmalar/index.html');await p.waitForTimeout(2500);
ok('Dars ishlanma qo\'shildi (nashr) → dars ishlanmalar sahifasida',(await p.textContent('body')).includes('ADMIN ishlanmasi: Nyuton qonunlari'),'dars_ishlanmalar/');
await p.context().close();

// 9) Tarjima (rus)
await adm.goto(A+'content/translation/?q=Bosh+sahifa');const tl=await adm.$$eval('#result_list a',as=>as.map(a=>[a.textContent.trim(),a.href]));
const t=tl.find(x=>x[0]==='🏠 Bosh sahifa');
if(t){await adm.goto(t[1]);await adm.fill('[name=ru]','🏠 Главная (АДМИН)');await save();}
p=await site('ru');await p.goto(SITE+'index.html');await p.waitForTimeout(800);await p.goto(SITE+'maxfiylik.html');await p.waitForTimeout(3000);
ok('Ruscha tarjima o\'zgartirildi → saytda (ruscha rejim)',(await p.textContent('body')).includes('Главная (АДМИН)'),'barcha sahifalar');
await p.context().close();

console.log('\n'+R.map(r=>r.join(' | ')).join('\n'));await b.close();process.exit(R.every(r=>r[0]==='✅')?0:1);})().catch(e=>{console.log('XATO',e.message);console.log(R.map(r=>r.join(' | ')).join('\n'));process.exit(1)});
