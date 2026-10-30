/* ============================================================
   app.js — hisob sahifalari uchun umumiy yordamchilar (api.js dan keyin)
   window.FA: esc, date, msg, boot (server/kirish tekshiruvi), nav
   ============================================================ */
(function () {
    'use strict';
    var api = window.FizikaAPI;
    var ROOT = api ? api.root : '';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Bildirishnoma havolasi faqat sayt ichidagi nisbiy yo'l bo'lishi mumkin (javascript:, //boshqa-sayt — yo'q)
    function safeUrl(u) {
        return typeof u === 'string' && /^[A-Za-z0-9_][A-Za-z0-9_\-./?=&#%]*$/.test(u) && u.indexOf('//') < 0 && !/^[a-z]+:/i.test(u);
    }

    function date(iso, withTime) {
        if (!iso) return '—';
        var d = new Date(iso);
        var p = function (n) { return ('0' + n).slice(-2); };
        var s = p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
        return withTime === false ? s : s + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /** datetime-local qiymatini ISO ga (mahalliy vaqt) */
    function toIso(local) { return local ? new Date(local).toISOString() : null; }
    function toLocalInput(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    function msg(el, type, text) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (!el) return;
        el.className = 'msg ' + (type || 'info');
        el.textContent = text || '';
    }

    function errText(e) {
        return e && e.text ? e.text() : (e && e.message) || 'Xatolik';
    }

    var STATUS = {
        new: 'Yangi', in_progress: 'Bajarilmoqda', submitted: 'Topshirildi', graded: 'Baholandi',
        returned: 'Qaytarildi', overdue: 'Muddati o\'tdi'
    };
    function badge(status) {
        return '<span class="badge ' + esc(status) + '">' + esc(STATUS[status] || status) + '</span>';
    }

    function nav(active) {
        var el = document.getElementById('appNav');
        if (!el || !api) return;
        var u = api.user();
        var links = [['index.html', '🏠 Bosh sahifa']];
        if (u && api.isTeacher()) {
            links.push(['oqituvchi/index.html', '👩‍🏫 O\'qituvchi paneli']);
        } else if (u) {
            links.push(['oquvchi/index.html', '📋 Topshiriqlarim']);
        }
        links.push(['testlar/testlar_online.html', '📝 Testlar']);
        if (u) links.push(['profil.html', '👤 Profil']);
        else links.push(['kirish.html', '👤 Kirish']);
        el.innerHTML = links.map(function (l) {
            return '<a href="' + ROOT + l[0] + '"' + (l[0] === active ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
        }).join('') + (u ? '<button type="button" id="navBell" class="bell" aria-haspopup="true" aria-expanded="false" ' +
            'title="Bildirishnomalar">🔔<span class="bell__n" id="bellN" hidden></span></button>' +
            '<button type="button" id="navLogout">Chiqish</button>' : '');
        if (u) initBell();
        var lo = document.getElementById('navLogout');
        if (lo) lo.onclick = function () { api.logout().then(function () { location.href = ROOT + 'index.html'; }); };
        var mb = document.querySelector('.app-nav .menu-btn');
        if (mb) mb.onclick = function () { document.querySelector('.app-nav').classList.toggle('open'); };
    }

    // ---------- Bildirishnomalar (FT-9.1) ----------
    var bellTimer = null;
    function initBell() {
        var btn = document.getElementById('navBell');
        if (!btn) return;
        var panel = document.getElementById('bellPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'bellPanel';
            panel.className = 'bell-panel';
            panel.hidden = true;
            document.body.appendChild(panel);
        }
        function count() {
            api.get('notifications/unread-count/').then(function (r) {
                var n = document.getElementById('bellN');
                if (!n) return;
                n.hidden = !r.count;
                n.textContent = r.count > 9 ? '9+' : r.count;
            }, function () {});
        }
        function open() {
            api.get('notifications/?page_size=15').then(function (r) {
                panel.innerHTML = '<div class="bell-panel__head"><b>Bildirishnomalar</b>' +
                    '<button type="button" class="linkish" id="bellAll">Hammasini o\'qilgan qilish</button></div>' +
                    (r.results.length ? r.results.map(function (x) {
                        return '<a class="bell-item' + (x.is_read ? '' : ' unread') + '" data-id="' + x.id + '" href="' +
                            (safeUrl(x.url) ? ROOT + esc(x.url) : '#') + '"><b>' + esc(x.title) + '</b>' +
                            (x.body ? '<span>' + esc(x.body) + '</span>' : '') + '<small>' + date(x.created_at) + '</small></a>';
                    }).join('') : '<p class="muted" style="padding:12px">Bildirishnoma yo\'q</p>');
                panel.hidden = false;
                btn.setAttribute('aria-expanded', 'true');
                panel.querySelectorAll('.bell-item').forEach(function (a) {
                    a.onclick = function () { api.post('notifications/' + a.dataset.id + '/read/').catch(function () {}); };
                });
                document.getElementById('bellAll').onclick = function () {
                    api.post('notifications/read-all/').then(function () { count(); open(); });
                };
            });
        }
        btn.onclick = function (e) {
            e.stopPropagation();
            if (panel.hidden) open(); else { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
        };
        document.addEventListener('click', function (e) {
            if (!panel.hidden && !panel.contains(e.target)) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
        });
        count();
        clearInterval(bellTimer);
        bellTimer = setInterval(count, 60000);
    }

    /**
     * Sahifani tayyorlaydi: server ishlayaptimi, kirish kerakmi, rol to'g'rimi.
     * opts: { login: true, role: 'teacher'|'student', active: 'oqituvchi/index.html' }
     */
    function boot(opts) {
        opts = opts || {};
        var main = document.querySelector('main');
        var fail = function (html) {
            if (main) main.innerHTML = '<div class="wrap"><div class="panel offline-box">' + html + '</div></div>';
            return Promise.reject(new Error('stop'));
        };
        if (!api) return fail('<h2>⚠️ Sahifa to\'liq yuklanmadi</h2><p class="muted">api.js topilmadi.</p>');
        nav(opts.active);
        return api.available().then(function (ok) {
            if (!ok) {
                return fail('<h2>📡 Server bilan aloqa yo\'q</h2><p class="muted">Bu bo\'lim server (backend) orqali ' +
                    'ishlaydi. Internetni tekshiring yoki birozdan keyin qayta urinib ko\'ring.<br>Modellar va ' +
                    'mashq testlari esa internetsiz ham ishlaydi.</p><div class="actions" style="justify-content:center">' +
                    '<a class="btn-a" href="' + ROOT + 'index.html">Bosh sahifaga</a></div>');
            }
            if (!opts.login) return api.user();
            if (!api.isLoggedIn()) {
                location.replace(api.loginUrl(location.pathname + location.search));
                return Promise.reject(new Error('stop'));
            }
            return api.refreshMe().then(function (u) {
                nav(opts.active);
                if (u.must_change_password && !/profil\.html$/.test(location.pathname)) {
                    location.replace(ROOT + 'profil.html?parol=1');
                    return Promise.reject(new Error('stop'));
                }
                if (opts.role === 'teacher' && !api.isTeacher()) {
                    location.replace(ROOT + 'oquvchi/index.html');
                    return Promise.reject(new Error('stop'));
                }
                if (opts.role === 'student' && api.isTeacher()) {
                    location.replace(ROOT + 'oqituvchi/index.html');
                    return Promise.reject(new Error('stop'));
                }
                return u;
            }, function (e) {
                if (e.status === 401) {
                    location.replace(api.loginUrl(location.pathname + location.search));
                    return Promise.reject(new Error('stop'));
                }
                return fail('<h2>⚠️ Xatolik</h2><p class="muted">' + esc(errText(e)) + '</p>');
            });
        });
    }

    function download(blob, name) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    window.FA = { esc: esc, date: date, toIso: toIso, toLocalInput: toLocalInput, msg: msg, errText: errText,
                  badge: badge, STATUS: STATUS, nav: nav, boot: boot, download: download, root: ROOT };
})();
