/* E2E ssenariy (TZ 14.6): o'qituvchi sinf ochadi → o'quvchilar → topshiriq (lab + test) → o'quvchi bajaradi → baho.
   Ishga tushirish (backend/README.md):
     SITE=http://localhost:8080/ API=http://127.0.0.1:8000/api/v1/ TEACHER=+998901234500 TEACHER_PW=... \
     SHOTS=/tmp/shots node e2e/flow.js
   O'qituvchi hisobi oldindan yaratilgan va tasdiqlangan bo'lishi kerak. */
const {chromium}=require('playwright');const fs=require('fs');
const U=process.env.SITE||'http://localhost:8080/';const API=process.env.API||'http://127.0.0.1:8000/api/v1/';
const SH=process.env.SHOTS||'';if(SH)fs.mkdirSync(SH,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const errs=[];
async function ctxNew(){const c=await b.newContext({viewport:{width:1280,height:900}});
 await c.addInitScript(a=>{try{localStorage.setItem('fizika-api',a)}catch(e){}},API);
 c.on('page',p=>{p.on('pageerror',e=>errs.push(p.url()+' '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|401|404|400/.test(m.text()))errs.push(p.url()+' '+m.text())});p.on('dialog',d=>d.accept());});
 return c;}
const step=(t)=>console.log('▶',t);
// ---- O'qituvchi ----
const T=await ctxNew();const t=await T.newPage();
step('teacher login');
await t.goto(U+'kirish.html');await t.fill('#lLogin',process.env.TEACHER||'+998901234500');await t.fill('#lPass',process.env.TEACHER_PW||'Oqituvchi-2026');await t.click('#fLogin button[type=submit]');
await t.waitForURL(/oqituvchi\/index.html/);await t.waitForSelector('#fClass');
step('create class');
const CN='10-E'+Date.now()%100000;await t.fill('#cName',CN);await t.click('#fClass button');await t.waitForSelector('.crumbs');await t.waitForSelector('.code');
const code=(await t.textContent('.code')).trim();console.log('  code',code);
step('import students');
await t.fill('#imText','Aliyev Vali\nKarimova Malika');await t.click('#fImport button.btn-a');await t.waitForSelector('#imResult table');
const creds=await t.$$eval('#imResult tbody tr',rs=>rs.map(r=>[...r.querySelectorAll('code')].map(c=>c.textContent)));console.log('  creds',creds);
if(SH)await t.screenshot({path:SH+'/t_class.png',fullPage:true});
step('create lab assignment');
await t.goto(U+'oqituvchi/index.html#yangi');await t.waitForSelector('#fA');
await t.fill('#aTitle','Mayatnik: g ni aniqlash');await t.locator('.checks label',{hasText:CN}).locator('input').check();await t.selectOption('#aSim','mayatnik');
await t.click('#fA button.btn-a');await t.waitForURL(/#topshiriq\//);const labA=t.url().split('/').pop();
step('create test assignment');
await t.goto(U+'oqituvchi/index.html#yangi');await t.waitForSelector('#fA');
await t.selectOption('#aType','test');await t.fill('#aTitle','Kepler testi');await t.locator('.checks label',{hasText:CN}).locator('input').check();
await t.check('input[name=topic][value=kepler]');await t.fill('#tCount','4');await t.fill('#tProb','1');await t.selectOption('#tShow','immediately');
await t.click('#fA button.btn-a');await t.waitForURL(/#topshiriq\//);const testA=t.url().split('/').pop();
console.log('  assignments',labA,testA);
// ---- O'quvchi ----
const St=await ctxNew();const s=await St.newPage();
step('student first login → change password');
await s.goto(U+'kirish.html');await s.fill('#lLogin',creds[0][0]);await s.fill('#lPass',creds[0][1]);await s.click('#fLogin button[type=submit]');
await s.waitForURL(/profil.html\?parol=1/);await s.fill('#oldPass',creds[0][1]);await s.fill('#newPass','Oquvchi-2026');await s.click('#fPass button');
await s.waitForURL(/oquvchi\/index.html/);await s.waitForSelector('.acard');
const cards=await s.$$eval('.acard h3',h=>h.map(x=>x.textContent));console.log('  tasks',cards);
if(SH)await s.screenshot({path:SH+'/s_tasks.png',fullPage:true});
step('do lab assignment');
await s.click('.acard:has-text("Mayatnik") a.btn-a');await s.waitForURL(/mayatnik_model.html\?topshiriq=/);
await s.waitForSelector('.assign-banner');await s.waitForSelector('#subBtn');
await s.evaluate(async()=>{const sl=document.getElementById('lengthSlider');for(const L of [0.5,1,1.5,2]){sl.value=L;sl.oninput&&sl.oninput.call(sl);sl.dispatchEvent(new Event('input'));modelControls.start();await new Promise(r=>setTimeout(r,200));modelControls.pause();labLog.capture();}});
await s.waitForFunction(()=>/Saqlandi/.test(document.querySelector('.cloud-status').textContent),null,{timeout:10000});
console.log('  status',await s.textContent('.cloud-status'));
await s.fill('#subConclusion','T² ning L ga bog\'liqligi chiziqli chiqdi, qiyalikdan g ≈ 9,8 m/s² topildi.');
await s.click('#subBtn');await s.waitForSelector('.submit-box h4:has-text("Topshirildi")',{timeout:10000});
console.log('  submit:',(await s.textContent('.submit-box')).replace(/\s+/g,' ').slice(0,200));
if(SH)await s.screenshot({path:SH+'/s_lab.png',fullPage:false});
if(SH)await s.locator('.lab-log').screenshot({path:SH+'/s_lablog.png'});
step('do test assignment');
await s.goto(U+'testlar/nazorat.html?topshiriq='+testA);await s.click('#startBtn');await s.waitForSelector('.qtext');
for(let i=0;i<5;i++){const isCalc=await s.$('#calc');if(isCalc){await s.fill('#calc','11,86');await s.click('#calcBtn');}else{await s.click('.opt[data-i="0"]');}
 await s.waitForTimeout(300);const nx=await s.$('#next');if(nx){await nx.click();}}
if(SH)await s.screenshot({path:SH+'/s_test.png'});
await s.click('#fin');await s.waitForSelector('.score');
console.log('  result',(await s.textContent('.score')).replace(/\s+/g,' '));
if(SH)await s.screenshot({path:SH+'/s_result.png',fullPage:true});
// ---- O'qituvchi baholaydi ----
step('teacher grades lab');
await t.goto(U+'oqituvchi/index.html#topshiriq/'+labA);await t.waitForSelector('tr[data-sub]');
if(SH)await t.screenshot({path:SH+'/t_roster.png',fullPage:true});
await t.click('tr[data-sub]');await t.waitForSelector('#fG');
if(SH)await t.screenshot({path:SH+'/t_sub.png',fullPage:true});
await t.fill('#gVal','5');await t.fill('#gCom','Juda yaxshi!');await t.click('#fG button.btn-a');await t.waitForSelector('.msg.ok');
step('student sees grade');
await s.goto(U+'oquvchi/index.html');await s.selectOption('#filter','all');await s.waitForSelector('.grade-big');
console.log('  grades',await s.$$eval('.acard',cs=>cs.map(c=>c.querySelector('h3').textContent+': '+(c.querySelector('.grade-big')||{}).textContent)));
if(SH)await s.screenshot({path:SH+'/s_graded.png',fullPage:true});
step('account button on model page + index');
await s.goto(U+'index.html');await s.waitForTimeout(1200);console.log('  index account:',await s.$eval('.nav-links [data-account]',a=>a.hidden?'hidden':a.textContent));
console.log('errors',errs);await b.close();})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
