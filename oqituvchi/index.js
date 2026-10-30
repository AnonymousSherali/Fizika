/* index.html sahifasining skripti (avval HTML ichida edi). */
(function () {
    var api = window.FizikaAPI, $ = function (id) { return document.getElementById(id); }, E = FA.esc;
    var view = $('view'), cache = {}, seq = 0;
    // Tez o'tishda kech kelgan javob yangi sahifa ustiga chizilmasin
    function stale(tok) { return tok !== undefined && tok !== seq; }

    function err(e) { FA.msg('msg', 'err', FA.errText(e)); }
    function ok(t) { FA.msg('msg', 'ok', t); }
    function clearMsg() { FA.msg('msg', 'info', ''); }
    function go(hash) { location.hash = hash; }

    // ---------- Marshrutlash: #sinflar, #sinf/12, #topshiriqlar, #yangi, #topshiriq/<id>, #javob/<id>, #savollar ----------
    function route() {
        clearMsg();
        var h = (location.hash || '#sinflar').slice(1).split('/');
        var tab = { sinf: 'sinflar', topshiriq: 'topshiriqlar', yangi: 'topshiriqlar', javob: 'topshiriqlar',
                    oquvchi: 'statistika' }[h[0]] || h[0];
        document.querySelectorAll('[data-route]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.route === tab)); });
        view.innerHTML = '<p class="muted">⏳ Yuklanmoqda…</p>';
        var r = { sinflar: classes, sinf: classroom, topshiriqlar: assignments, yangi: newAssignment,
                  topshiriq: assignment, javob: submission, savollar: questions, statistika: stats,
                  oquvchi: studentCard, ishlanmalar: lessonPlans }[h[0]] || classes;
        var tok = ++seq;
        Promise.resolve(r(h[1], tok)).catch(err);
    }
    document.querySelectorAll('[data-route]').forEach(function (b) { b.onclick = function () { go(b.dataset.route); }; });
    window.addEventListener('hashchange', route);

    FA.boot({ login: true, role: 'teacher', active: 'oqituvchi/index.html' }).then(function (u) {
        $('hello').textContent = '👩‍🏫 ' + u.last_name + ' ' + u.first_name;
        $('school').textContent = u.school_name || '';
        route();
    }, function () {});

    function getClasses() {
        return api.get('classrooms/?page_size=100').then(function (r) { cache.classes = r.results; return r.results; });
    }

    // ================= Sinflar =================
    function classes(_, tok) {
        return getClasses().then(function (list) {
            if (stale(tok)) return;
            view.innerHTML =
                '<div class="cards-a">' + list.map(function (c) {
                    return '<article class="acard cls-card" data-id="' + c.id + '" tabindex="0"><h3>' + E(c.name) + '</h3>' +
                        '<div class="meta">' + E(c.academic_year) + ' · ' + c.student_count + ' o\'quvchi</div>' +
                        (c.join_code ? '<div>Kod: <span class="code" style="font-size:1rem">' + E(c.join_code) + '</span></div>' :
                            '<div class="muted small">Qo\'shilish kodi o\'chirilgan</div>') + '</article>';
                }).join('') + '</div>' +
                (list.length ? '' : '<div class="empty-a">Hali sinf yo\'q — birinchisini yarating 👇</div>') +
                '<form class="panel" id="fClass" style="margin-top:var(--sp-4)"><h2>➕ Yangi sinf</h2><div class="row">' +
                '<div class="field"><label for="cName">Nomi</label><input id="cName" placeholder="10-A" required></div>' +
                '<div class="field"><label for="cGrade">Sinf</label><select id="cGrade"><option value="10">10-sinf</option><option value="11">11-sinf</option></select></div>' +
                '<button class="btn-a" style="margin-bottom:12px">Yaratish</button></div></form>';
            document.querySelectorAll('.cls-card').forEach(function (c) {
                c.onclick = function () { go('sinf/' + c.dataset.id); };
                c.onkeydown = function (e) { if (e.key === 'Enter') go('sinf/' + c.dataset.id); };
            });
            $('fClass').onsubmit = function (e) {
                e.preventDefault();
                api.post('classrooms/', { name: $('cName').value.trim(), grade: +$('cGrade').value }).then(function (c) {
                    go('sinf/' + c.id);
                }, err);
            };
        });
    }

    function classroom(id, tok) {
        return Promise.all([api.get('classrooms/' + id + '/'), api.get('classrooms/' + id + '/students/'), getClasses()])
            .then(function (res) {
                if (stale(tok)) return;
                var c = res[0], students = res[1], others = res[2].filter(function (x) { return x.id !== c.id; });
                var link = location.origin + FA.root.replace(location.origin, '') + 'kirish.html?kod=' + (c.join_code || '');
                view.innerHTML = '<p class="crumbs"><a href="#sinflar">← Sinflar</a></p>' +
                    '<div class="grid2"><div class="panel"><h2>' + E(c.name) + ' <span class="muted small">' + E(c.academic_year) + '</span></h2>' +
                    (c.join_code
                        ? '<p class="muted">O\'quvchilar shu kod bilan ro\'yxatdan o\'tadi:</p><p class="code">' + E(c.join_code) + '</p>' +
                          '<p class="muted small">' + (c.join_code_expires_at ? 'Amal qiladi: ' + FA.date(c.join_code_expires_at) : 'Muddatsiz') +
                          '<br>Havola: <code>' + E(link) + '</code></p>'
                        : '<p class="muted">Qo\'shilish kodi o\'chirilgan.</p>') +
                    '<div class="actions"><button class="btn-a small" id="codeNew">🔄 Yangi kod (7 kun)</button>' +
                    '<button class="btn-a ghost small" id="codeForever">Muddatsiz kod</button>' +
                    (c.join_code ? '<button class="btn-a ghost small" id="codeCopy">📋 Havolani nusxalash</button>' +
                        '<button class="btn-a ghost small" id="codeOff">Kodni o\'chirish</button>' : '') + '</div>' +
                    '<p class="muted small" style="margin-top:12px">O\'qituvchilar: ' + c.teachers.map(function (t) { return E(t.name); }).join(', ') + '</p>' +
                    '<form id="fTeacher" class="row"><div class="field"><label for="tLogin">Yordamchi o\'qituvchi qo\'shish</label>' +
                    '<input id="tLogin" placeholder="telefon yoki email"></div><button class="btn-a ghost small" style="margin-bottom:12px">Qo\'shish</button></form>' +
                    '<div class="actions"><a class="btn-a ghost small" href="#statistika/' + c.id + '">📊 Statistika</a>' +
                    '<button class="btn-a ghost small danger" id="archive">🗄 Sinfni arxivlash</button></div></div>' +

                    '<form class="panel" id="fImport"><h2>👥 O\'quvchilarni qo\'shish</h2>' +
                    '<p class="muted small">Har qatorga bitta o\'quvchi: <b>Familiya Ism</b>. Yoki Excel/CSV fayl (ustunlar: Familiya, Ism). ' +
                    'Login va vaqtinchalik parol avtomatik yaratiladi — keyin kartochkalarni chop etib tarqating.</p>' +
                    '<div class="field"><textarea id="imText" placeholder="Aliyev Vali&#10;Karimova Malika"></textarea></div>' +
                    '<div class="field"><input type="file" id="imFile" accept=".xlsx,.csv"></div>' +
                    '<button class="btn-a">Hisoblarni yaratish</button><div id="imResult"></div></form></div>' +

                    '<div class="panel" style="margin-top:var(--sp-4)"><h2>O\'quvchilar (' + students.length + ')</h2>' +
                    (students.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>F.I.Sh.</th><th>Login</th><th>Oxirgi kirish</th><th></th></tr></thead><tbody>' +
                        students.map(function (s, i) {
                            return '<tr><td>' + (i + 1) + '</td><td>' + E(s.last_name + ' ' + s.first_name) +
                                (s.must_change_password ? ' <span class="badge in_progress">vaqtinchalik parol</span>' : '') + '</td><td><code>' + E(s.username) +
                                '</code></td><td>' + FA.date(s.last_login) + '</td><td style="white-space:nowrap">' +
                                '<button class="btn-a ghost small" data-reset="' + s.id + '">🔑 Parol</button> ' +
                                (others.length ? '<select data-move="' + s.id + '" aria-label="Boshqa sinfga ko\'chirish"><option value="">Ko\'chirish…</option>' +
                                    others.map(function (o) { return '<option value="' + o.id + '">' + E(o.name) + '</option>'; }).join('') + '</select> ' : '') +
                                '<button class="btn-a ghost small" data-remove="' + s.id + '" aria-label="Sinfdan chiqarish">✕</button></td></tr>';
                        }).join('') + '</tbody></table></div>' : '<p class="muted">Hali o\'quvchi yo\'q.</p>') + '</div>';

                var reload = function () { classroom(id, tok); };   // tok: boshqa bo'limga o'tilgan bo'lsa chizilmaydi
                var code = function (days) {
                    api.post('classrooms/' + id + '/join-code/', { expires_days: days }).then(reload, err);
                };
                $('codeNew').onclick = function () { code(7); };
                $('codeForever').onclick = function () { code(null); };
                if ($('codeOff')) $('codeOff').onclick = function () { api.del('classrooms/' + id + '/join-code/').then(reload, err); };
                if ($('codeCopy')) $('codeCopy').onclick = function () {
                    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { ok('Havola nusxalandi'); },
                        function () { prompt('Havolani nusxalang:', link); });
                };
                $('archive').onclick = function () {
                    if (confirm('Sinf arxivga o\'tkaziladi (o\'chirilmaydi). Davom etasizmi?')) api.del('classrooms/' + id + '/').then(function () { go('sinflar'); }, err);
                };
                $('fTeacher').onsubmit = function (e) {
                    e.preventDefault();
                    api.post('classrooms/' + id + '/teachers/', { login: $('tLogin').value.trim() }).then(function () { ok('O\'qituvchi qo\'shildi'); reload(); }, err);
                };
                $('fImport').onsubmit = function (e) {
                    e.preventDefault();
                    var file = $('imFile').files[0], req;
                    if (file) {
                        var fd = new FormData(); fd.append('file', file);
                        req = api.post('classrooms/' + id + '/students/import/', fd);
                    } else {
                        var rows = $('imText').value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
                            var p = l.split(/\s+/);
                            return { last_name: p[0], first_name: p.slice(1).join(' ') || '-' };
                        });
                        if (!rows.length) { err({ message: 'O\'quvchilar ro\'yxatini kiriting' }); return; }
                        req = api.post('classrooms/' + id + '/students/import/', { students: rows });
                    }
                    // Ro'yxat yangilanadi, keyin kartochkalar ko'rsatiladi (parollar faqat shu yerda)
                    // Parollar faqat shu javobda — ro'yxatni yangilash muvaffaqiyatsiz bo'lsa ham albatta ko'rsatiladi
                    req.then(function (r) {
                        var show = function () { showCredentials(c, r.created); };
                        return classroom(id, tok).then(show, show);
                    }, err);
                };
                document.querySelectorAll('[data-reset]').forEach(function (b) {
                    b.onclick = function () {
                        if (!confirm('O\'quvchiga yangi vaqtinchalik parol beriladi. Davom etasizmi?')) return;
                        api.post('classrooms/' + id + '/students/' + b.dataset.reset + '/reset-password/').then(function (r) {
                            var s = students.filter(function (x) { return x.id === b.dataset.reset; })[0];
                            showCredentials(c, [{ last_name: s.last_name, first_name: s.first_name, username: r.username, password: r.password }]);
                        }, err);
                    };
                });
                document.querySelectorAll('[data-move]').forEach(function (sel) {
                    sel.onchange = function () {
                        if (!sel.value) return;
                        api.post('classrooms/' + id + '/students/' + sel.dataset.move + '/move/', { classroom_id: +sel.value }).then(reload, err);
                    };
                });
                document.querySelectorAll('[data-remove]').forEach(function (b) {
                    b.onclick = function () {
                        if (confirm('O\'quvchi sinfdan chiqariladi (hisobi o\'chirilmaydi).')) api.del('classrooms/' + id + '/students/' + b.dataset.remove + '/').then(reload, err);
                    };
                });
            });
    }

    // Login/parol kartochkalari — FT-1.2 (chop etish yoki PDF)
    function showCredentials(c, list) {
        var site = location.origin + FA.root.replace(location.origin, '');
        // Sinf sahifasi qayta chizilmagan bo'lsa ham (tarmoq xatosi) parollar albatta ko'rinsin
        var box = $('imResult') || (function () { var d = document.createElement('div'); d.id = 'imResult'; view.prepend(d); return d; })();
        box.innerHTML = '<div class="msg ok">✅ ' + list.length + ' ta hisob tayyor. Parollar faqat hozir ko\'rinadi — chop eting yoki saqlang.</div>' +
            '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>F.I.Sh.</th><th>Login</th><th>Parol</th></tr></thead><tbody>' +
            list.map(function (s) {
                return '<tr><td>' + E(s.last_name + ' ' + s.first_name) + '</td><td><code>' + E(s.username) + '</code></td><td><code>' + E(s.password) + '</code></td></tr>';
            }).join('') + '</tbody></table></div><div class="actions"><button type="button" class="btn-a" id="printCards">🖨️ Kartochkalarni chop etish</button></div>';
        box.scrollIntoView({ behavior: 'smooth' });
        $('printCards').onclick = function () {
            $('printArea').innerHTML = '<div class="login-cards">' + list.map(function (s) {
                return '<div class="login-card">🔬 <b>Fizika 10–11</b> · ' + E(c.name) + '<br>' + E(s.last_name + ' ' + s.first_name) +
                    '<br>Sayt: ' + E(site) + 'kirish.html<br>Login: <b>' + E(s.username) + '</b><br>Parol: <b>' + E(s.password) +
                    '</b><br><small>Birinchi kirishda parolni o\'zgartiring</small></div>';
            }).join('') + '</div>';
            document.body.classList.add('printing');
            var done = function () { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
            window.addEventListener('afterprint', done);
            window.print();
        };
        if (location.hash.indexOf('#sinf/') === 0) {
            // Ro'yxatni yangilash (kartochkalar qolsin)
            api.get('classrooms/' + c.id + '/students/').then(function () {});
        }
    }

    // ================= Topshiriqlar =================
    function assignments(_, tok) {
        return Promise.all([api.get('assignments/?page_size=100'), getClasses()]).then(function (res) {
            if (stale(tok)) return;
            var list = res[0].results, cls = {};
            res[1].forEach(function (c) { cls[c.id] = c.name; });
            view.innerHTML = '<div class="actions" style="margin-top:0;margin-bottom:var(--sp-3)"><a class="btn-a" href="#yangi">➕ Yangi topshiriq</a></div>' +
                (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topshiriq</th><th>Turi</th><th>Sinflar</th><th>Muddat</th><th>Holat</th></tr></thead><tbody>' +
                    list.map(function (a) {
                        var s = a.stats || {};
                        return '<tr class="clickable" data-id="' + a.id + '"><td><b>' + E(a.title) + '</b></td><td>' + (a.type === 'lab' ? '🔬 Lab' : '📝 Test') +
                            '</td><td>' + a.classrooms.map(function (id) { return E(cls[id] || id); }).join(', ') + '</td><td>' + (a.due_at ? FA.date(a.due_at) : '—') +
                            '</td><td><span class="stat-pill">Topshirdi <b>' + ((s.submitted || 0) + (s.graded || 0)) + '/' + (s.students || 0) +
                            '</b></span><span class="stat-pill">Baholandi <b>' + (s.graded || 0) + '</b></span></td></tr>';
                    }).join('') + '</tbody></table></div>' : '<div class="empty-a">Hali topshiriq yo\'q</div>');
            document.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.onclick = function () { go('topshiriq/' + tr.dataset.id); }; });
        });
    }

    function newAssignment(_, tok) {
        return Promise.all([getClasses(), api.get('simulations/'), api.get('quiz/topics/')]).then(function (res) {
            if (stale(tok)) return;
            var cl = res[0], sims = res[1], topics = res[2];
            if (!cl.length) { view.innerHTML = '<div class="empty-a">Avval <a href="#sinflar">sinf yarating</a></div>'; return; }
            view.innerHTML = '<p class="crumbs"><a href="#topshiriqlar">← Topshiriqlar</a></p><form class="panel" id="fA" novalidate><h2>➕ Yangi topshiriq</h2>' +
                '<div class="row"><div class="field"><label for="aType">Turi</label><select id="aType"><option value="lab">🔬 Laboratoriya ishi (model)</option><option value="test">📝 Test</option></select></div>' +
                '<div class="field" style="flex:2 1 300px"><label for="aTitle">Sarlavha</label><input id="aTitle" required placeholder="Mayatnik yordamida g ni aniqlash"></div></div>' +
                '<div class="field"><label>Sinflar</label><div class="checks">' + cl.map(function (c) {
                    return '<label><input type="checkbox" name="cls" value="' + c.id + '"> ' + E(c.name) + '</label>';
                }).join('') + '</div></div>' +
                '<div class="field"><label for="aInstr">Ko\'rsatma (ixtiyoriy)</label><textarea id="aInstr" placeholder="Masalan: 4 xil uzunlikda o\'lchang va T² ning L ga bog\'liqligini chizing"></textarea></div>' +
                '<fieldset id="labBox"><legend>Laboratoriya ishi</legend><div class="row"><div class="field" style="flex:2 1 260px"><label for="aSim">Model</label><select id="aSim">' +
                sims.map(function (s) { return '<option value="' + s.slug + '">' + E(s.icon + ' ' + s.title + ' (' + s.grade + '-sinf)') + '</option>'; }).join('') + '</select></div>' +
                '<div class="field"><label for="aRows">Kamida o\'lchov</label><input id="aRows" type="number" min="1" max="30" value="3"></div></div>' +
                '<div class="checks"><label><input type="checkbox" id="aGraph" checked> Grafik talab qilinadi (R² ≥ 0,98)</label><label><input type="checkbox" id="aConcl" checked> Xulosa talab qilinadi</label></div>' +
                '<div class="field" style="margin-top:12px"><label for="aSteps">O\'z qadamlaringiz (ixtiyoriy, har qatorga bittasi)</label><textarea id="aSteps" placeholder="Bo\'sh qoldirilsa — modelning standart topshirig\'i"></textarea></div></fieldset>' +
                '<fieldset id="testBox" hidden><legend>Test</legend><div class="field"><label>Mavzular</label><div class="checks">' + topics.map(function (t) {
                    return '<label><input type="checkbox" name="topic" value="' + E(t.key) + '"> ' + E(t.title) + ' <span class="muted small">(' + t.questions + '+' + t.problems + ')</span></label>';
                }).join('') + '</div></div><div class="row">' +
                '<div class="field"><label for="tCount">Test savollari</label><input id="tCount" type="number" min="0" max="200" value="20"></div>' +
                '<div class="field"><label for="tProb">Hisoblash masalalari</label><input id="tProb" type="number" min="0" max="60" value="2"></div>' +
                '<div class="field"><label for="tTime">Vaqt (daqiqa, bo\'sh — cheksiz)</label><input id="tTime" type="number" min="1" max="240" value="30"></div>' +
                '<div class="field"><label for="tAtt">Urinishlar</label><select id="tAtt"><option>1</option><option>2</option><option>3</option></select></div>' +
                '<div class="field"><label for="tShow">Javoblarni ko\'rsatish</label><select id="tShow"><option value="after_due">Muddatdan keyin</option><option value="immediately">Darhol</option><option value="never">Hech qachon</option></select></div></div></fieldset>' +
                '<fieldset><legend>Muddat va baholash</legend><div class="row">' +
                '<div class="field"><label for="aStart">Boshlanishi (ixtiyoriy)</label><input id="aStart" type="datetime-local"></div>' +
                '<div class="field"><label for="aDue">Muddat</label><input id="aDue" type="datetime-local"></div>' +
                '<div class="field"><label for="aScale">Baho shkalasi</label><select id="aScale"><option value="5">5 ballik (2–5)</option><option value="100">100 ballik</option></select></div></div>' +
                '<div class="row"><div class="checks" style="margin-bottom:12px"><label><input type="checkbox" id="aLate"> Kech topshirishga ruxsat</label></div>' +
                '<div class="field" style="max-width:220px"><label for="aPen">Kechikish jarimasi (%)</label><input id="aPen" type="number" min="0" max="100" value="0"></div></div></fieldset>' +
                '<button class="btn-a">Topshiriq berish</button></form>';
            var due = new Date(Date.now() + 7 * 864e5); due.setHours(23, 59, 0, 0);
            $('aDue').value = FA.toLocalInput(due.toISOString());
            $('aType').onchange = function () { $('labBox').hidden = this.value !== 'lab'; $('testBox').hidden = this.value !== 'test'; };
            $('fA').onsubmit = function (e) {
                e.preventDefault();
                var t = $('aType').value;
                var body = {
                    type: t, title: $('aTitle').value.trim(), instructions_uz: $('aInstr').value.trim(),
                    classrooms: [].map.call(document.querySelectorAll('input[name=cls]:checked'), function (x) { return +x.value; }),
                    starts_at: FA.toIso($('aStart').value), due_at: FA.toIso($('aDue').value), grading_scale: +$('aScale').value,
                    allow_late: $('aLate').checked, late_penalty_pct: +$('aPen').value || 0
                };
                if (t === 'lab') {
                    var steps = $('aSteps').value.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
                    body.simulation = $('aSim').value; body.min_rows = +$('aRows').value || 1;
                    body.require_graph = $('aGraph').checked; body.require_conclusion = $('aConcl').checked;
                    if (steps.length) body.steps = steps;
                } else {
                    body.quiz_config = {
                        topics: [].map.call(document.querySelectorAll('input[name=topic]:checked'), function (x) { return x.value; }),
                        count: +$('tCount').value || 0, problems: +$('tProb').value || 0,
                        time_limit_min: $('tTime').value ? +$('tTime').value : null
                    };
                    body.max_attempts = +$('tAtt').value; body.show_answers = $('tShow').value;
                }
                api.post('assignments/', body).then(function (a) { go('topshiriq/' + a.id); }, err);
            };
        });
    }

    function assignment(id, tok) {
        return Promise.all([api.get('assignments/' + id + '/'), api.get('assignments/' + id + '/submissions/')]).then(function (res) {
            if (stale(tok)) return;
            var a = res[0], roster = res[1];
            var cls = (cache.classes || []).filter(function (c) { return a.classrooms.indexOf(c.id) > -1; }).map(function (c) { return c.name; });
            view.innerHTML = '<p class="crumbs"><a href="#topshiriqlar">← Topshiriqlar</a></p>' +
                '<div class="panel"><h2>' + (a.type === 'lab' ? '🔬 ' : '📝 ') + E(a.title) + '</h2><div class="kv">' +
                '<b>Sinflar</b><span>' + E(cls.join(', ') || a.classrooms.join(', ')) + '</span>' +
                (a.type === 'lab' ? '<b>Model</b><span>' + E(a.simulation) + ' · kamida ' + a.min_rows + ' o\'lchov</span>'
                    : '<b>Test</b><span>' + E(a.quiz_config.topics.join(', ')) + ' · ' + a.quiz_config.count + ' savol + ' + a.quiz_config.problems +
                      ' masala · ' + (a.quiz_config.time_limit_min ? a.quiz_config.time_limit_min + ' daqiqa' : 'vaqtsiz') + ' · ' + a.max_attempts + ' urinish</span>') +
                '<b>Muddat</b><span>' + (a.due_at ? FA.date(a.due_at) : '—') + (a.allow_late ? ' (kech topshirish mumkin, jarima ' + a.late_penalty_pct + '%)' : '') + '</span>' +
                '<b>Shkala</b><span>' + a.grading_scale + ' ballik</span></div>' +
                '<div class="actions"><button class="btn-a ghost small" id="csvA">⬇️ Natijalar (CSV)</button>' +
                '<button class="btn-a ghost small danger" id="delA">O\'chirish</button></div></div>' +
                '<div class="panel"><h2>O\'quvchilar</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>O\'quvchi</th><th>Sinf</th><th>Holat</th>' +
                '<th>Topshirdi</th><th>Tavsiya</th><th>Baho</th></tr></thead><tbody>' +
                roster.map(function (r) {
                    return '<tr' + (r.submission_id ? ' class="clickable" data-sub="' + r.submission_id + '"' : '') + '><td>' + E(r.student.name) +
                        '</td><td>' + E(r.classroom) + '</td><td>' + FA.badge(r.status) + (r.is_late ? ' <span class="badge overdue">kech</span>' : '') +
                        '</td><td>' + FA.date(r.submitted_at) + '</td><td>' + (r.suggested_grade != null ? r.suggested_grade : '—') +
                        '</td><td><b>' + (r.grade != null ? r.grade : '—') + '</b></td></tr>';
                }).join('') + '</tbody></table></div><p class="muted small" style="margin-top:8px">Qatorni bosib, ishni ko\'ring va baholang.</p></div>';
            document.querySelectorAll('[data-sub]').forEach(function (tr) { tr.onclick = function () { go('javob/' + tr.dataset.sub); }; });
            $('csvA').onclick = function () {
                api.get('assignments/' + id + '/export/', { blob: true }).then(function (b) {
                    FA.download(b, 'topshiriq_' + a.title.replace(/[^\w\u0400-\u04ff]+/g, '_') + '.csv');
                }, err);
            };
            $('delA').onclick = function () {
                if (confirm('Topshiriq va barcha topshirishlar o\'chiriladi. Davom etasizmi?')) api.del('assignments/' + id + '/').then(function () { go('topshiriqlar'); }, err);
            };
        });
    }

    function submission(id, tok) {
        return api.get('submissions/' + id + '/').then(function (s) {
            return api.get('assignments/' + s.assignment + '/').then(function (a) {
                if (stale(tok)) return;
                var snap = s.lab_snapshot, body = '';
                if (snap) {
                    var an = snap.analysis || {}, fit = an.fit, d = an.derived;
                    body += '<h3>O\'lchovlar</h3><div class="tbl-wrap"><table class="tbl snap"><thead><tr><th>#</th>' +
                        snap.columns.map(function (c) { return '<th>' + E(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' +
                        snap.rows.map(function (r, i) {
                            return '<tr><td>' + (i + 1) + '</td>' + r.map(function (v) { return '<td>' + (v == null ? '—' : E(v)) + '</td>'; }).join('') + '</tr>';
                        }).join('') + '</tbody></table></div>' +
                        (fit ? '<p style="margin-top:8px">Grafik: X = <b>' + axis(snap.columns[an.x].label, an.xp) + '</b>, Y = <b>' +
                            axis(snap.columns[an.y].label, an.yp) + '</b> · qiyalik k = ' + fit.k.toPrecision(4) +
                            ' · R² = ' + fit.r2.toFixed(4) + '</p>' : '') +
                        (d && d.value != null ? '<p>Natija: <b>' + E(d.name) + ' = ' + d.value.toPrecision(4) + ' ' + E(d.unit) + '</b>' +
                            (d.error_pct != null ? ' · nazariyadan farq ' + d.error_pct.toFixed(2) + '%' : '') + '</p>' : '');
                }
                if (s.conclusion) body += '<h3>Xulosa</h3><p>' + E(s.conclusion) + '</p>';
                if (s.auto_score && s.auto_score.checks) {
                    body += '<h3>Avtomatik tekshiruv</h3><ul style="list-style:none;display:grid;gap:4px">' + s.auto_score.checks.map(function (c) {
                        return '<li>' + (c.ok ? '✅' : '❌') + ' ' + E(c.text) + '</li>';
                    }).join('') + '</ul>';
                }
                if (s.attempt_result) {
                    var tb = s.attempt_result.topic_breakdown || {};
                    body += '<h3>Test natijasi: ' + s.attempt_result.score + ' / ' + s.attempt_result.max_score + ' (' + s.attempt_result.percent + '%)</h3>' +
                        '<ul class="muted">' + Object.keys(tb).map(function (k) { return '<li>' + E(k) + ': ' + tb[k].ok + '/' + tb[k].all + '</li>'; }).join('') + '</ul>' +
                        '<p class="muted small">Urinishlar: ' + s.attempts_used + (s.auto_score && s.auto_score.late_penalty_pct ? ' · kechikish jarimasi ' + s.auto_score.late_penalty_pct + '%' : '') + '</p>';
                }
                var lo = a.grading_scale === 5 ? 2 : 0, hi = a.grading_scale === 5 ? 5 : 100;
                view.innerHTML = '<p class="crumbs"><a href="#topshiriq/' + a.id + '">← ' + E(a.title) + '</a></p>' +
                    '<div class="panel"><h2>' + E(s.student.name) + ' ' + FA.badge(s.status) + (s.is_late ? ' <span class="badge overdue">kech</span>' : '') + '</h2>' +
                    '<p class="muted">Topshirdi: ' + FA.date(s.submitted_at) + (s.suggested_grade != null ? ' · Tavsiya etilgan baho: <b>' + s.suggested_grade + '</b>' : '') + '</p>' +
                    body + '</div>' +
                    '<form class="panel" id="fG"><h2>Baholash</h2><div class="row"><div class="field" style="max-width:160px"><label for="gVal">Baho (' + lo + '–' + hi + ')</label>' +
                    '<input id="gVal" type="number" min="' + lo + '" max="' + hi + '" step="1" value="' + (s.grade != null ? s.grade : (s.suggested_grade != null ? s.suggested_grade : '')) + '"></div>' +
                    '<div class="field" style="flex:3 1 300px"><label for="gCom">Izoh</label><input id="gCom" value="' + E(s.teacher_comment) + '" placeholder="Yaxshi ish! Grafikda..."></div></div>' +
                    '<div class="actions"><button class="btn-a">✓ Baho qo\'yish</button>' +
                    (a.type === 'lab' ? '<button type="button" class="btn-a ghost" id="retBtn">↩️ Qayta topshirishga qaytarish</button>' : '') + '</div></form>';
                $('fG').onsubmit = function (e) {
                    e.preventDefault();
                    api.post('submissions/' + id + '/grade/', { grade: +$('gVal').value, comment: $('gCom').value }).then(function () {
                        ok('Baho qo\'yildi'); submission(id, tok);
                    }, err);
                };
                if ($('retBtn')) $('retBtn').onclick = function () {
                    var c = $('gCom').value.trim() || prompt('Nima uchun qaytaryapsiz? (o\'quvchi ko\'radi)');
                    if (!c) return;
                    api.post('submissions/' + id + '/return/', { comment: c }).then(function () { ok('Qaytarildi'); submission(id, tok); }, err);
                };
            });
        });
    }

    function axis(label, p) {
        var l = E(label);
        return p === 1 ? l : p === 2 ? l + '²' : p === 3 ? l + '³' : p === 0.5 ? '√(' + l + ')' : '1/' + l;
    }

    // ================= Statistika (FT-8.1 – FT-8.3) =================
    function pctColor(p) {
        if (p == null) return '';
        var c = p >= 75 ? 'var(--a-ok)' : p >= 50 ? 'var(--a-warn)' : 'var(--a-bad)';
        return ' style="background:color-mix(in srgb, ' + c + ' ' + Math.round(14 + p / 5) + '%, var(--a-bg))"';
    }
    function stats(classId, tok) {
        return getClasses().then(function (cl) {
            if (stale(tok)) return;
            if (!cl.length) { view.innerHTML = '<div class="empty-a">Avval <a href="#sinflar">sinf yarating</a></div>'; return; }
            var id = +classId || cl[0].id;
            return Promise.all([api.get('analytics/classrooms/' + id + '/'), api.get('analytics/classrooms/' + id + '/heatmap/')]).then(function (res) {
                if (stale(tok)) return;
                var d = res[0], h = res[1];
                view.innerHTML = '<div class="row" style="margin-bottom:var(--sp-3)"><div class="field" style="max-width:260px"><label for="stCls">Sinf</label>' +
                    '<select id="stCls">' + cl.map(function (c) { return '<option value="' + c.id + '"' + (c.id === id ? ' selected' : '') + '>' + E(c.name) + '</option>'; }).join('') +
                    '</select></div><button class="btn-a ghost" id="xlsx" style="margin-bottom:12px">⬇️ Sinf jurnali (Excel)</button></div>' +
                    '<div class="kpis"><div class="kpi"><b>' + d.students + '</b><span>o\'quvchi</span></div>' +
                    '<div class="kpi"><b>' + d.assignments.length + '</b><span>topshiriq</span></div>' +
                    '<div class="kpi"><b>' + (d.avg_test_percent != null ? d.avg_test_percent + '%' : '—') + '</b><span>testlarda o\'rtacha</span></div>' +
                    '<div class="kpi"><b>' + d.activity_7d.active_students + '</b><span>7 kunda faol (' + d.activity_7d.labs + ' jurnal, ' + d.activity_7d.tests + ' test)</span></div></div>' +
                    '<div class="panel"><h2>Topshiriqlar</h2>' + (d.assignments.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topshiriq</th><th>Topshirdi</th><th>Baholandi</th><th>O\'rtacha baho</th></tr></thead><tbody>' +
                    d.assignments.map(function (a) {
                        return '<tr class="clickable" data-a="' + a.id + '"><td>' + (a.type === 'lab' ? '🔬 ' : '📝 ') + E(a.title) + '</td><td>' + a.submitted + '/' + d.students +
                            '</td><td>' + a.graded + '</td><td><b>' + (a.avg_grade != null ? a.avg_grade : '—') + '</b>' + (a.scale === 100 ? ' <span class="muted small">/100</span>' : '') + '</td></tr>';
                    }).join('') + '</tbody></table></div>' : '<p class="muted">Topshiriq berilmagan</p>') + '</div>' +
                    '<div class="panel"><h2>Mavzular bo\'yicha o\'zlashtirish</h2><p class="muted small">Testlardagi to\'g\'ri javoblar ulushi (%). Qizil — qayta tushuntirish kerak.</p>' +
                    (h.topics.length ? '<div class="tbl-wrap"><table class="tbl heat"><thead><tr><th>O\'quvchi</th>' +
                        h.topics.map(function (t) { return '<th class="v">' + E(t.title) + '</th>'; }).join('') +
                        '<th>O\'rtacha baho</th><th>Topshirgan</th></tr></thead><tbody>' +
                        h.students.map(function (s) {
                            return '<tr class="clickable" data-s="' + s.id + '"><td>' + E(s.name) + '</td>' + h.topics.map(function (t) {
                                var v = s.cells[t.key];
                                return '<td class="c"' + pctColor(v) + '>' + (v != null ? v : '·') + '</td>';
                            }).join('') + '<td><b>' + (s.avg_grade != null ? s.avg_grade : '—') + '</b></td><td>' + s.submitted + '</td></tr>';
                        }).join('') + '<tr><td><b>Sinf bo\'yicha</b></td>' + h.topics.map(function (t) {
                            var x = d.topics.filter(function (y) { return y.key === t.key; })[0];
                            return '<td class="c"' + pctColor(x && x.percent) + '>' + (x && x.percent != null ? Math.round(x.percent) : '·') + '</td>';
                        }).join('') + '<td></td><td></td></tr></tbody></table></div>'
                        : '<p class="muted">Hali test natijalari yo\'q</p>') + '</div>';
                $('stCls').onchange = function () { go('statistika/' + this.value); };
                $('xlsx').onclick = function () {
                    api.get('analytics/classrooms/' + id + '/export.xlsx', { blob: true }).then(function (b) {
                        FA.download(b, 'sinf_' + d.classroom.name + '.xlsx');
                    }, err);
                };
                document.querySelectorAll('[data-a]').forEach(function (tr) { tr.onclick = function () { go('topshiriq/' + tr.dataset.a); }; });
                document.querySelectorAll('[data-s]').forEach(function (tr) { tr.onclick = function () { go('oquvchi/' + tr.dataset.s); }; });
            });
        });
    }

    function studentCard(uid, tok) {
        return api.get('analytics/students/' + uid + '/').then(function (d) {
            if (stale(tok)) return;
            view.innerHTML = '<p class="crumbs"><a href="#statistika">← Statistika</a></p>' +
                '<div class="panel"><h2>👤 ' + E(d.student.name) + ' <span class="muted small">' + E(d.student.username) + '</span></h2>' +
                '<div class="kpis"><div class="kpi"><b>' + (d.avg_grade != null ? d.avg_grade : '—') + '</b><span>o\'rtacha baho</span></div>' +
                '<div class="kpi"><b>' + d.assignments.filter(function (a) { return a.status === 'graded' || a.status === 'submitted'; }).length + '/' + d.assignments.length +
                '</b><span>topshiriq bajarilgan</span></div><div class="kpi"><b>' + d.attempts.length + '</b><span>test topshirgan</span></div>' +
                '<div class="kpi"><b>' + d.labs.reduce(function (n, l) { return n + l.count; }, 0) + '</b><span>laboratoriya jurnali</span></div></div>' +
                (d.weak_topics.length ? '<div class="msg err">⚠️ Zaif mavzular: ' + d.weak_topics.map(function (t) { return E(t.title) + ' (' + t.percent + '%)'; }).join(', ') + '</div>' : '') +
                (d.attempts.length ? '<h3>Test natijalari dinamikasi</h3><div class="spark">' + d.attempts.map(function (a) {
                    return '<i style="height:' + Math.max(3, a.percent) + '%" title="' + FA.date(a.finished_at) + ': ' + a.percent + '%"></i>';
                }).join('') + '</div>' : '') + '</div>' +
                '<div class="panel"><h2>Topshiriqlar</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topshiriq</th><th>Muddat</th><th>Holat</th><th>Baho</th></tr></thead><tbody>' +
                d.assignments.map(function (a) {
                    return '<tr><td>' + (a.type === 'lab' ? '🔬 ' : '📝 ') + E(a.title) + '</td><td>' + FA.date(a.due_at) + '</td><td>' + FA.badge(a.status) +
                        (a.is_late ? ' <span class="badge overdue">kech</span>' : '') + '</td><td><b>' + (a.grade != null ? a.grade : '—') + '</b></td></tr>';
                }).join('') + '</tbody></table></div></div>' +
                (d.topics.length ? '<div class="panel"><h2>Mavzular</h2><div class="bars" style="display:grid;gap:10px">' + d.topics.map(function (t) {
                    var c = t.percent >= 75 ? 'var(--a-ok)' : t.percent >= 50 ? 'var(--a-warn)' : 'var(--a-bad)';
                    return '<div><div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:600"><span>' + E(t.title) + '</span><span>' + t.ok + '/' + t.all +
                        ' · ' + t.percent + '%</span></div><div style="height:8px;border-radius:999px;background:var(--a-line);overflow:hidden"><i style="display:block;height:100%;width:' +
                        t.percent + '%;background:' + c + '"></i></div></div>';
                }).join('') + '</div></div>' : '');
        });
    }

    // ================= Dars ishlanmalarim (FT-7.1 – FT-7.3) =================
    function lessonPlans(_, tok) {
        return Promise.all([api.get('lesson-plans/?mine=1&page_size=100'), api.get('simulations/')]).then(function (res) {
            if (stale(tok)) return;
            var list = res[0].results, sims = res[1];
            var st = { draft: 'Qoralama', review: '⏳ Moderatsiyada', published: '✅ Nashr etilgan', rejected: '❌ Rad etilgan' };
            view.innerHTML = '<div class="panel"><h2>📚 Mening dars ishlanmalarim (' + list.length + ')</h2>' +
                '<p class="muted small">Yuklangan ishlanma administrator tekshirgach «Dars ishlanmalar» sahifasida hammaga ko\'rinadi.</p>' +
                (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sarlavha</th><th>Sinf</th><th>Holat</th><th>Yuklab olingan</th><th></th></tr></thead><tbody>' +
                    list.map(function (p) {
                        return '<tr><td>' + E(p.title) + (p.moderator_comment ? '<br><span class="muted small">💬 ' + E(p.moderator_comment) + '</span>' : '') +
                            '</td><td>' + p.grade + '</td><td>' + (st[p.status] || p.status) + '</td><td>' + p.downloads + '</td><td>' +
                            (p.status !== 'published' ? '<button class="btn-a ghost small" data-del="' + p.id + '">✕</button>' : '') + '</td></tr>';
                    }).join('') + '</tbody></table></div>' : '') + '</div>' +
                '<form class="panel" id="fLP"><h2>➕ Ishlanma yuklash</h2><div class="row">' +
                '<div class="field" style="flex:2 1 300px"><label for="lpTitle">Mavzu</label><input id="lpTitle" required placeholder="Arximed kuchi"></div>' +
                '<div class="field"><label for="lpGrade">Sinf</label><select id="lpGrade"><option value="10">10-sinf</option><option value="11">11-sinf</option></select></div></div>' +
                '<div class="row"><div class="field"><label for="lpType">Dars turi</label><input id="lpType" placeholder="Laboratoriya ishi"></div>' +
                '<div class="field"><label for="lpSim">Interaktiv model (ixtiyoriy)</label><select id="lpSim"><option value="">—</option>' +
                sims.map(function (x) { return '<option value="' + x.slug + '">' + E(x.title) + '</option>'; }).join('') + '</select></div></div>' +
                '<div class="row"><div class="field"><label for="lpPdf">PDF (≤ 15 MB, majburiy)</label><input id="lpPdf" type="file" accept=".pdf" required></div>' +
                '<div class="field"><label for="lpDocx">DOCX (≤ 10 MB, ixtiyoriy)</label><input id="lpDocx" type="file" accept=".docx"></div></div>' +
                '<button class="btn-a">Yuklash</button></form>';
            document.querySelectorAll('[data-del]').forEach(function (b) {
                b.onclick = function () {
                    if (confirm('Ishlanma o\'chirilsinmi?')) api.del('lesson-plans/' + b.dataset.del + '/').then(function () { lessonPlans(null, tok); }, err);
                };
            });
            $('fLP').onsubmit = function (e) {
                e.preventDefault();
                var fd = new FormData();
                fd.append('title_uz', $('lpTitle').value.trim());
                fd.append('grade', $('lpGrade').value);
                fd.append('lesson_type', $('lpType').value.trim());
                if ($('lpSim').value) fd.append('simulation', $('lpSim').value);
                if ($('lpPdf').files[0]) fd.append('pdf', $('lpPdf').files[0]);
                if ($('lpDocx').files[0]) fd.append('docx', $('lpDocx').files[0]);
                var btn = this.querySelector('button'); btn.disabled = true;
                api.post('lesson-plans/', fd).then(function () { ok('Yuklandi — moderatsiyaga yuborildi'); lessonPlans(null, tok); },
                    err).then(function () { btn.disabled = false; });
            };
        });
    }

    // ================= Savollarim =================
    function questions(_, tok) {
        return Promise.all([api.get('quiz/questions/?mine=1&page_size=100'), api.get('quiz/topics/'),
                            api.get('quiz/problems/?mine=1&page_size=100')]).then(function (res) {
            if (stale(tok)) return;
            var list = res[0].results, topics = res[1], probs = res[2].results;
            var st = { draft: 'Qoralama', approved: 'Tasdiqlangan', archived: 'Arxiv' };
            view.innerHTML = '<div class="panel"><h2>❓ Mening savollarim (' + list.length + ')</h2>' +
                '<p class="muted small">Siz qo\'shgan savollar administrator tasdiqlaguncha faqat sizning topshiriqlaringizda ishlatiladi.</p>' +
                (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mavzu</th><th>Savol</th><th>Holat</th><th>Statistika</th></tr></thead><tbody>' +
                    list.map(function (q) {
                        return '<tr><td>' + E(q.topic) + '</td><td>' + E(q.text_uz) + '</td><td>' + E(st[q.status] || q.status) + '</td><td>' +
                            (q.stats_total ? Math.round(q.stats_correct / q.stats_total * 100) + '% to\'g\'ri (' + q.stats_total + ')' : '—') + '</td></tr>';
                    }).join('') + '</tbody></table></div>' : '') + '</div>' +
                '<div class="grid2" style="margin-top:var(--sp-4)"><form class="panel" id="fQ"><h2>➕ Savol qo\'shish</h2>' +
                '<div class="row"><div class="field"><label for="qTopic">Mavzu</label><select id="qTopic">' + topics.map(function (t) {
                    return '<option value="' + E(t.key) + '">' + E(t.title) + '</option>'; }).join('') + '</select></div>' +
                '<div class="field"><label for="qLevel">Daraja</label><select id="qLevel"><option value="asosiy">Asosiy (1 ball)</option><option value="chuqur">Chuqur (2 ball)</option></select></div></div>' +
                '<div class="field"><label for="qText">Savol</label><textarea id="qText" required></textarea></div>' +
                ['A', 'B', 'C', 'D'].map(function (l, i) {
                    return '<div class="field"><label><input type="radio" name="qOk" value="' + i + '"' + (i === 0 ? ' checked' : '') + '> ' + l + ' variant (to\'g\'ri bo\'lsa belgilang)</label><input id="qO' + i + '" required></div>';
                }).join('') + '<div class="field"><label for="qEx">Izoh (nega to\'g\'ri)</label><input id="qEx"></div><button class="btn-a">Qo\'shish</button></form>' +
                '<form class="panel" id="fX"><h2>📥 Excel\'dan import</h2><p class="muted small">Ustunlar: <b>Mavzu | Daraja | Savol | A | B | C | D | To\'g\'ri | Izoh</b>. ' +
                'To\'g\'ri — A, B, C yoki D. Mavzu — masalan «Kepler», «Linza».</p><div class="field"><input type="file" id="xFile" accept=".xlsx" required></div>' +
                '<button class="btn-a">Yuklash</button><div id="xRes"></div></form></div>' +
                problemsHtml(probs, topics, st);
            bindProblemForm(tok);
            $('fQ').onsubmit = function (e) {
                e.preventDefault();
                api.post('quiz/questions/', {
                    topic: $('qTopic').value, level: $('qLevel').value, text_uz: $('qText').value.trim(),
                    options: [0, 1, 2, 3].map(function (i) { return { uz: $('qO' + i).value.trim() }; }),
                    correct_index: +document.querySelector('input[name=qOk]:checked').value, explanation_uz: $('qEx').value.trim()
                }).then(function () { ok('Savol qo\'shildi'); questions(null, tok); }, err);
            };
            $('fX').onsubmit = function (e) {
                e.preventDefault();
                var fd = new FormData(); fd.append('file', $('xFile').files[0]);
                api.post('quiz/questions/import/', fd).then(function (r) {
                    ok(r.created + ' ta savol qo\'shildi' + (r.errors.length ? ' · ' + r.errors.length + ' ta xato' : ''));
                    if (r.errors.length) $('xRes').innerHTML = '<ul class="muted small">' + r.errors.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>';
                    else questions(null, tok);
                }, function (e2) {
                    err(e2);
                    if (e2.body && e2.body.errors) $('xRes').innerHTML = '<ul class="muted small">' + e2.body.errors.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>';
                });
            };
        });
    }

    // ---------- Hisoblash masalalari (FT-6.2): oddiy yoki parametrlangan ----------
    // Parametrlangan: matnda {m} kabi joylar, har parametr uchun [min, max, qadam]; javob formuladan.
    // Har bir o'quvchiga boshqa sonlar tushadi — javobni ko'chirib olish foyda bermaydi.
    function problemsHtml(probs, topics, st) {
        return '<div class="panel" style="margin-top:var(--sp-4)"><h2>🧮 Mening masalalarim (' + probs.length + ')</h2>' +
            (probs.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mavzu</th><th>Masala</th><th>Javob</th><th>Holat</th><th>Statistika</th></tr></thead><tbody>' +
                probs.map(function (p) {
                    return '<tr><td>' + E(p.topic) + '</td><td>' + E(p.text_uz) + (p.params ? ' <span class="badge">🎲 parametrli</span>' : '') +
                        '</td><td>' + (p.formula ? '<code>' + E(p.formula) + '</code>' : E(p.answer)) + ' ' + E(p.unit) + '</td><td>' + E(st[p.status] || p.status) +
                        '</td><td>' + (p.stats_total ? Math.round(p.stats_correct / p.stats_total * 100) + '% to\'g\'ri (' + p.stats_total + ')' : '—') + '</td></tr>';
                }).join('') + '</tbody></table></div>' : '<p class="muted small">Hali masala qo\'shmagansiz.</p>') + '</div>' +
            '<form class="panel" id="fP" style="margin-top:var(--sp-4)"><h2>➕ Masala qo\'shish</h2>' +
            '<div class="row"><div class="field"><label for="pTopic">Mavzu</label><select id="pTopic">' + topics.map(function (t) {
                return '<option value="' + E(t.key) + '">' + E(t.title) + '</option>'; }).join('') + '</select></div>' +
            '<div class="field"><label for="pKind">Turi</label><select id="pKind"><option value="fixed">Oddiy (bitta javob)</option>' +
            '<option value="param">Parametrli (har o\'quvchiga boshqa sonlar)</option></select></div></div>' +
            '<div class="field"><label for="pText">Masala matni</label><textarea id="pText" required placeholder="Masalan: Massasi {m} kg jism {h} m balandlikdan tushdi. Yerga urilish tezligini toping."></textarea>' +
            '<small class="muted" id="pTextHint" hidden>Sonlar o\'rniga <b>{nom}</b> yozing — masalan {m}, {h}. Har bir nom uchun pastda oraliq bering.</small></div>' +
            '<div id="pParamBox" hidden><div class="field"><label>Parametrlar (min · max · qadam)</label><div id="pParams"></div>' +
            '<button type="button" class="btn-a ghost small" id="pAdd" style="width:auto">+ parametr</button></div>' +
            '<div class="field"><label for="pFormula">Javob formulasi</label><input id="pFormula" placeholder="Masalan: (2*9.8*h)**0.5" autocomplete="off">' +
            '<small class="muted">Amallar: + − * / ** (daraja; ildiz — **0.5), qavslar, <b>pi</b>. Parametr nomlari matndagidek.</small></div></div>' +
            '<div class="row"><div class="field" id="pAnsBox"><label for="pAns">To\'g\'ri javob</label><input id="pAns" inputmode="decimal" placeholder="45"></div>' +
            '<div class="field"><label for="pUnit">Birlik</label><input id="pUnit" placeholder="m/s"></div>' +
            '<div class="field"><label for="pTol">Ruxsat etilgan xatolik, %</label><input id="pTol" type="number" min="0.1" max="50" step="0.1" value="3"></div></div>' +
            '<div class="field"><label for="pSol">Yechim (ixtiyoriy)</label><textarea id="pSol" placeholder="v = √(2gh) = {answer} m/s"></textarea>' +
            '<small class="muted">Yechimda ham {nom} va <b>{answer}</b> (javob) ishlatish mumkin.</small></div>' +
            '<div id="pPrev"></div>' +
            '<div class="row" style="gap:8px"><button type="button" class="btn-a ghost" id="pPreview">👁 Namunani ko\'rish</button><button class="btn-a">Saqlash</button></div></form>';
    }

    function bindProblemForm(tok) {
        var box = $('pParams');
        function addRow(name, lo, hi, step) {
            var r = document.createElement('div');
            r.className = 'prm';
            r.style.cssText = 'display:grid;grid-template-columns:minmax(56px,80px) repeat(3,minmax(0,1fr)) auto;gap:6px;align-items:center;margin-bottom:6px';
            r.innerHTML = '<input class="pn" placeholder="nom" value="' + E(name || '') + '" aria-label="Parametr nomi">' +
                '<input class="plo" inputmode="decimal" placeholder="min" value="' + E(lo == null ? '' : lo) + '" aria-label="Eng kichik qiymat">' +
                '<input class="phi" inputmode="decimal" placeholder="max" value="' + E(hi == null ? '' : hi) + '" aria-label="Eng katta qiymat">' +
                '<input class="pst" inputmode="decimal" placeholder="qadam" value="' + E(step == null ? '' : step) + '" aria-label="Qadam">' +
                '<button type="button" class="btn-a ghost small" aria-label="Parametrni o\'chirish">✕</button>';
            r.querySelector('button').onclick = function () { r.remove(); };
            box.appendChild(r);
        }
        function kind() {
            var param = $('pKind').value === 'param';
            $('pParamBox').hidden = !param;
            $('pTextHint').hidden = !param;
            $('pAnsBox').hidden = param;
            if (param && !box.children.length) addRow('m', 1, 10, 1);
        }
        $('pKind').onchange = kind;
        $('pAdd').onclick = function () { addRow(); };
        kind();
        function num(v) { return parseFloat(String(v).replace(',', '.')); }
        function payload() {
            var d = { topic: $('pTopic').value, text_uz: $('pText').value.trim(), unit: $('pUnit').value.trim(),
                      tolerance_pct: num($('pTol').value) || 3, solution_uz: $('pSol').value.trim() };
            if ($('pKind').value === 'param') {
                d.params = {};
                box.querySelectorAll('.prm').forEach(function (r) {
                    var n = r.querySelector('.pn').value.trim();
                    if (n) d.params[n] = [num(r.querySelector('.plo').value), num(r.querySelector('.phi').value), num(r.querySelector('.pst').value)];
                });
                d.formula = $('pFormula').value.trim();
            } else {
                d.answer = num($('pAns').value);
                if (isNaN(d.answer)) d.answer = null;
            }
            return d;
        }
        function fmt(v) { return typeof v === 'number' ? (+v.toPrecision(6)).toString().replace('.', ',') : E(v); }
        $('pPreview').onclick = function () {
            api.post('quiz/problems/preview/', payload()).then(function (r) {
                $('pPrev').innerHTML = '<div class="panel" style="background:var(--a-soft)"><b>O\'quvchilar shunday ko\'radi:</b><ol>' +
                    r.samples.map(function (x) {
                        return '<li style="margin:6px 0">' + E(x.text) + '<br><span class="muted small">Javob: <b>' + fmt(x.answer) + ' ' + E(x.unit) + '</b>' +
                            (x.solution ? ' · ' + E(x.solution) : '') + '</span></li>';
                    }).join('') + '</ol></div>';
            }, function (e2) { $('pPrev').innerHTML = ''; err(e2); });
        };
        $('fP').onsubmit = function (e) {
            e.preventDefault();
            api.post('quiz/problems/', payload()).then(function () { ok('Masala qo\'shildi'); questions(null, tok); }, err);
        };
    }
})();
