/* profil.html sahifasining skripti (avval HTML ichida edi). */
(function () {
    var api = window.FizikaAPI, $ = function (id) { return document.getElementById(id); };
    FA.boot({ login: true, active: 'profil.html' }).then(function (u) {
        var roles = { student: 'O\'quvchi', teacher: 'O\'qituvchi', school_admin: 'Maktab administratori', admin: 'Administrator' };
        $('who').textContent = (roles[u.role] || u.role) + ' · login: ' + u.username + (u.school_name ? ' · ' + u.school_name : '');
        $('pFirst').value = u.first_name; $('pLast').value = u.last_name;
        $('pLang').value = u.language; $('pTheme').value = u.theme; $('pMail').checked = u.notify_email;
        if (!u.email) { $('pMail').disabled = true; $('pMail').parentNode.title = 'Profilingizda email yo\'q'; }
        if (u.must_change_password || /parol=1/.test(location.search)) {
            $('passTitle').textContent = '🔑 Avval parolingizni o\'zgartiring';
            FA.msg('msg', 'info', 'Siz o\'qituvchi bergan vaqtinchalik parol bilan kirdingiz. Xavfsizlik uchun o\'zingizning parolingizni o\'rnating.');
            $('oldPass').focus();
        }
        api.get('me/logins/').then(function (rows) {
            $('logins').innerHTML = rows.map(function (r) {
                return '<tr><td>' + FA.date(r.created_at) + '</td><td>' + FA.esc(r.ip || '—') + '</td><td class="small">' +
                    FA.esc((r.user_agent || '').slice(0, 70)) + '</td></tr>';
            }).join('') || '<tr><td colspan="3" class="muted">Ma\'lumot yo\'q</td></tr>';
        });
    }, function () {});

    $('fProfile').onsubmit = function (e) {
        e.preventDefault();
        api.patch('me/', { first_name: $('pFirst').value.trim(), last_name: $('pLast').value.trim(),
                           language: $('pLang').value, theme: $('pTheme').value, notify_email: $('pMail').checked }).then(function (u) {
            try {
                localStorage.setItem('fizika-lang', u.language);
                localStorage.setItem('fizika-theme', u.theme);
            } catch (e2) {}
            api.refreshMe();
            FA.msg('msg', 'ok', 'Saqlandi. Til o\'zgargan bo\'lsa sahifani yangilang.');
        }, function (err) { FA.msg('msg', 'err', FA.errText(err)); });
    };

    $('fPass').onsubmit = function (e) {
        e.preventDefault();
        api.post('auth/password/change/', { old_password: $('oldPass').value, new_password: $('newPass').value })
            .then(function (r) {
                api.setAuth(r);
                $('oldPass').value = $('newPass').value = '';
                FA.msg('msg', 'ok', 'Parol o\'zgartirildi');
                if (/parol=1/.test(location.search)) {
                    setTimeout(function () {
                        location.href = FA.root + (api.isTeacher() ? 'oqituvchi/index.html' : 'oquvchi/index.html');
                    }, 900);
                }
            }, function (err) { FA.msg('msg', 'err', FA.errText(err)); });
    };

    $('delBtn').onclick = function () {
        if (!confirm('Hisobingizni o\'chirishni tasdiqlaysizmi? Bu amalni o\'zingiz bekor qila olmaysiz.')) return;
        api.del('me/').then(function () {
            api.logout().then(function () { location.href = FA.root + 'index.html'; });
        }, function (err) { FA.msg('msg', 'err', FA.errText(err)); });
    };
})();
