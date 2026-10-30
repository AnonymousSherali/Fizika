/* kirish.html sahifasining skripti (avval HTML ichida edi). */
(function () {
    var api = window.FizikaAPI, $ = function (id) { return document.getElementById(id); };
    var next = new URLSearchParams(location.search).get('next');
    var pendingLogin = '';

    function show(step) {
        document.querySelectorAll('[data-step]').forEach(function (f) { f.hidden = f.dataset.step !== step; });
        document.querySelectorAll('[data-tab]').forEach(function (b) {
            b.setAttribute('aria-selected', String(b.dataset.tab === step));
        });
        FA.msg('msg', 'info', '');
        var first = document.querySelector('[data-step="' + step + '"] input');
        if (first) first.focus();
    }
    function done(user) {
        // Faqat shu saytning o'z sahifasiga qaytariladi (/\evil.com, /%09/evil.com kabi hiylalar ham rad etiladi)
        if (next) {
            try {
                var u = new URL(next, location.href);
                if (u.origin === location.origin) { location.href = u.pathname + u.search + u.hash; return; }
            } catch (e) { /* noto'g'ri manzil — e'tiborsiz */ }
        }
        location.href = FA.root + (api.isTeacher() ? 'oqituvchi/index.html' : 'oquvchi/index.html');
    }
    function fail(e) { FA.msg('msg', 'err', FA.errText(e)); }
    function busy(form, on) { form.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); }

    document.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () { show(b.dataset.tab); };
    });
    document.querySelectorAll('[data-goto]').forEach(function (a) {
        a.onclick = function (e) { e.preventDefault(); show(a.dataset.goto); };
    });

    FA.boot({ login: false }).then(function () {
        if (api.isLoggedIn()) { done(api.user()); return; }
        // Sinf kodi havolada kelsa (?kod=FZ-XXXX) — o'quvchi ro'yxatini ochamiz
        var kod = new URLSearchParams(location.search).get('kod');
        if (kod) { $('sCode').value = kod; show('student'); }
        loadRegions();
    }, function () {});

    $('fLogin').onsubmit = function (e) {
        e.preventDefault();
        var f = this; busy(f, true);
        api.login($('lLogin').value.trim(), $('lPass').value).then(done, function (err) {
            if (err.code === 'not_verified') {
                pendingLogin = $('lLogin').value.trim();
                api.post('auth/verify/resend/', { login: pendingLogin }).catch(function () {});
                $('verifyText').textContent = 'Hisobingiz hali tasdiqlanmagan. Telefon/emailingizga yangi kod yuborildi.';
                show('verify');
                return;
            }
            fail(err);
        }).then(function () { busy(f, false); });
    };

    $('fStudent').onsubmit = function (e) {
        e.preventDefault();
        var f = this; busy(f, true);
        api.post('auth/register/student/', {
            join_code: $('sCode').value.trim().toUpperCase(), first_name: $('sFirst').value.trim(),
            last_name: $('sLast').value.trim(), username: $('sUser').value.trim(), password: $('sPass').value,
            accept_privacy: $('sPriv').checked
        }).then(function (r) { api.setAuth(r); done(r.user); }, fail).then(function () { busy(f, false); });
    };

    $('fTeacher').onsubmit = function (e) {
        e.preventDefault();
        var f = this, body = {
            first_name: $('tFirst').value.trim(), last_name: $('tLast').value.trim(),
            phone: $('tPhone').value.trim(), email: $('tEmail').value.trim(), password: $('tPass').value,
            accept_privacy: $('tPriv').checked
        };
        if ($('tSchool').value) body.school_id = +$('tSchool').value;
        else body.new_school = { name: $('tSchoolName').value.trim(), region: $('tRegion').value,
                                 district: $('tDistrict').value.trim() };
        busy(f, true);
        api.post('auth/register/teacher/', body).then(function (r) {
            pendingLogin = body.phone || body.email;
            $('verifyText').textContent = 'Kod yuborildi: ' + r.verification.target + '. Uni kiriting.';
            show('verify');
        }, fail).then(function () { busy(f, false); });
    };

    $('fVerify').onsubmit = function (e) {
        e.preventDefault();
        var f = this; busy(f, true);
        api.post('auth/verify/', { login: pendingLogin, code: $('vCode').value.trim() })
            .then(function (r) { api.setAuth(r); done(r.user); }, fail).then(function () { busy(f, false); });
    };
    $('resendLink').onclick = function (e) {
        e.preventDefault();
        api.post('auth/verify/resend/', { login: pendingLogin }).then(function () {
            FA.msg('msg', 'ok', 'Yangi kod yuborildi');
        }, fail);
    };

    $('forgotLink').onclick = function (e) { e.preventDefault(); show('reset'); };
    $('fReset').onsubmit = function (e) {
        e.preventDefault();
        var f = this; busy(f, true);
        var p = $('rCodeBox').hidden
            ? api.post('auth/password/reset/', { login: $('rLogin').value.trim() }).then(function (r) {
                $('rCodeBox').hidden = false;
                $('rBtn').textContent = 'Parolni o\'zgartirish';
                FA.msg('msg', 'ok', r.detail);
            })
            : api.post('auth/password/reset/confirm/', {
                login: $('rLogin').value.trim(), code: $('rCode').value.trim(), new_password: $('rPass').value
            }).then(function (r) { api.setAuth(r); done(r.user); });
        p.catch(fail).then(function () { busy(f, false); });
    };

    // Viloyat → maktablar ro'yxati
    var REGIONS = [['toshkent_sh', 'Toshkent shahri'], ['toshkent', 'Toshkent viloyati'], ['andijon', 'Andijon viloyati'],
        ['buxoro', 'Buxoro viloyati'], ['fargona', 'Farg\'ona viloyati'], ['jizzax', 'Jizzax viloyati'],
        ['xorazm', 'Xorazm viloyati'], ['namangan', 'Namangan viloyati'], ['navoiy', 'Navoiy viloyati'],
        ['qashqadaryo', 'Qashqadaryo viloyati'], ['samarqand', 'Samarqand viloyati'], ['sirdaryo', 'Sirdaryo viloyati'],
        ['surxondaryo', 'Surxondaryo viloyati'], ['qoraqalpogiston', 'Qoraqalpog\'iston Respublikasi']];
    function loadRegions() {
        $('tRegion').innerHTML = REGIONS.map(function (r) {
            return '<option value="' + r[0] + '">' + r[1] + '</option>';
        }).join('');
        $('tRegion').onchange = loadSchools;
        $('tSchool').onchange = function () { $('newSchoolRow').hidden = !!this.value; };
        loadSchools();
    }
    // Tumanlar ro'yxati (tanlash qulay; ro'yxatda yo'q nom ham yozilishi mumkin)
    var districts = null;
    function loadDistricts() {
        var fill = function () {
            var list = (districts && districts[$('tRegion').value]) || [];
            $('tDistrictList').innerHTML = list.map(function (d) { return '<option value="' + FA.esc(d) + '">'; }).join('');
        };
        if (districts) return fill();
        api.get('schools/districts/').then(function (d) { districts = d; fill(); }, function () {});
    }
    function loadSchools() {
        loadDistricts();
        var region = $('tRegion').value;
        api.getAll('schools/?region=' + region).then(function (list) {
            // Viloyat tez almashtirilsa — eski so'rov javobi boshqa viloyat maktablarini ko'rsatmasin
            if (region !== $('tRegion').value) return;
            $('tSchool').innerHTML = '<option value="">— ro\'yxatdan tanlang —</option>' + list.map(function (s) {
                return '<option value="' + s.id + '">' + FA.esc(s.name + ' (' + s.district + ')') + '</option>';
            }).join('');
            $('newSchoolRow').hidden = false;
        }, function () {});
    }
})();
