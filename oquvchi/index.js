/* index.html sahifasining skripti (avval HTML ichida edi). */
(function () {
    var api = window.FizikaAPI, $ = function (id) { return document.getElementById(id); };
    var tasks = [], me = null;

    document.querySelectorAll('[data-tab]').forEach(function (b) {
        b.onclick = function () {
            document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
            document.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.dataset.pane !== b.dataset.tab; });
            if (b.dataset.tab === 'labs') loadLabs();
            if (b.dataset.tab === 'tests') loadTests();
        };
    });

    FA.boot({ login: true, role: 'student', active: 'oquvchi/index.html' }).then(function (u) {
        me = u;
        $('hello').textContent = '📋 Salom, ' + u.first_name + '!';
        loadClasses();
        loadTasks();
    }, function () {});

    function loadClasses() {
        api.get('classrooms/').then(function (r) {
            $('classes').textContent = r.results.length
                ? 'Sinflaringiz: ' + r.results.map(function (c) { return c.name + (c.school_name ? ' (' + c.school_name + ')' : ''); }).join(', ')
                : 'Siz hali hech qaysi sinfga qo\'shilmagansiz — pastda o\'qituvchi bergan kodni kiriting.';
        });
    }

    function loadTasks() {
        api.get('assignments/?page_size=100').then(function (r) { tasks = r.results; renderTasks(); },
            function (e) { FA.msg('msg', 'err', FA.errText(e)); });
    }

    function action(t) {
        if (t.type === 'lab') {
            if (t.my_status === 'graded' || t.my_status === 'submitted') {
                return '<a class="btn-a ghost small" href="../' + FA.esc(t.simulation_page) + '?topshiriq=' + t.id + '">Ko\'rish</a>';
            }
            if (t.my_status === 'overdue') return '';
            return '<a class="btn-a small" href="../' + FA.esc(t.simulation_page) + '?topshiriq=' + t.id + '">▶ Bajarish</a>';
        }
        if (t.attempts_left > 0 && t.my_status !== 'overdue') {
            return '<a class="btn-a small" href="../testlar/nazorat.html?topshiriq=' + t.id + '">▶ Testni boshlash</a>';
        }
        return '';
    }

    function renderTasks() {
        var f = $('filter').value;
        var list = tasks.filter(function (t) {
            var done = t.my_status === 'graded' || t.my_status === 'submitted';
            return f === 'all' || (f === 'done' ? done : !done);
        });
        if (!list.length) {
            $('tasks').innerHTML = '<div class="empty-a" style="grid-column:1/-1">' +
                (f === 'active' ? '🎉 Bajarilishi kerak bo\'lgan topshiriq yo\'q' : 'Topshiriqlar yo\'q') + '</div>';
            return;
        }
        $('tasks').innerHTML = list.map(function (t) {
            var due = t.due_at ? 'Muddat: ' + FA.date(t.due_at) : 'Muddatsiz';
            var g = t.my_grade ? '<div><span class="grade-big">' + t.my_grade.grade + '</span>' +
                (t.my_grade.comment ? '<p class="muted small">💬 ' + FA.esc(t.my_grade.comment) + '</p>' : '') + '</div>' : '';
            var extra = t.type === 'test' ? ' · urinish: ' + t.attempts_left + '/' + t.max_attempts : '';
            return '<article class="acard">' +
                '<div class="meta">' + FA.badge(t.my_status) + '<span>' + (t.type === 'lab' ? '🔬 Laboratoriya' : '📝 Test') + '</span></div>' +
                '<h3>' + FA.esc(t.title) + '</h3>' +
                '<div class="meta">' + FA.esc(due) + extra + ' · ' + FA.esc(t.teacher_name) + '</div>' +
                (t.instructions ? '<p class="muted small">' + FA.esc(t.instructions) + '</p>' : '') + g +
                '<div class="actions">' + action(t) + '</div></article>';
        }).join('');
    }
    $('filter').onchange = renderTasks;

    function loadLabs() {
        api.get('labs/?page_size=50').then(function (r) {
            $('labs').innerHTML = r.results.map(function (l) {
                var d = l.analysis && l.analysis.derived;
                var res = d && d.value != null ? FA.esc(d.name) + ' = ' + d.value.toPrecision(4) + ' ' + FA.esc(d.unit) +
                    (d.error_pct != null ? ' (xatolik ' + d.error_pct.toFixed(1) + '%)' : '') : '—';
                return '<tr><td>' + FA.date(l.updated_at) + '</td><td>' + FA.esc(l.simulation_title) + '</td><td>' +
                    l.rows_count + '</td><td>' + res + '</td><td><button class="btn-a ghost small" data-csv="' + l.id +
                    '" data-name="' + FA.esc(l.simulation) + '">⬇️ CSV</button></td></tr>';
            }).join('') || '<tr><td colspan="5" class="muted">Hali jurnal yo\'q. Modelni oching va <kbd>S</kbd> bilan o\'lchov yozing — u avtomatik saqlanadi.</td></tr>';
            document.querySelectorAll('[data-csv]').forEach(function (b) {
                b.onclick = function () {
                    api.get('labs/' + b.dataset.csv + '/export/', { blob: true }).then(function (blob) {
                        FA.download(blob, b.dataset.name + '_jurnal.csv');
                    });
                };
            });
        });
    }

    function loadMyStats() {
        api.get('analytics/students/' + me.id + '/').then(function (d) {
            if (!d.topics.length) { $('myStats').innerHTML = ''; return; }
            $('myStats').innerHTML = '<div class="panel" style="margin-bottom:var(--sp-4)"><h2>📈 Mavzular bo\'yicha natijam</h2>' +
                (d.weak_topics.length ? '<div class="msg err">Takrorlash kerak: ' + d.weak_topics.map(function (t) {
                    return FA.esc(t.title) + ' (' + t.percent + '%)'; }).join(', ') + ' — tegishli modelni oching va mashq testini yeching.</div>' : '') +
                '<div style="display:grid;gap:10px">' + d.topics.map(function (t) {
                    var c = t.percent >= 75 ? 'var(--a-ok)' : t.percent >= 50 ? 'var(--a-warn)' : 'var(--a-bad)';
                    return '<div><div style="display:flex;justify-content:space-between;font-size:0.88rem;font-weight:600"><span>' + FA.esc(t.title) +
                        '</span><span>' + t.percent + '%</span></div><div style="height:8px;border-radius:999px;background:var(--a-line);overflow:hidden">' +
                        '<i style="display:block;height:100%;width:' + t.percent + '%;background:' + c + '"></i></div></div>';
                }).join('') + '</div></div>';
        }, function () {});
    }

    function loadTests() {
        loadMyStats();
        api.get('quiz/attempts/?page_size=50').then(function (r) {
            $('tests').innerHTML = r.results.map(function (a) {
                return '<tr><td>' + FA.date(a.finished_at) + '</td><td>' + a.score + ' / ' + a.max_score + ' (' +
                    a.percent + '%)</td><td><b>' + (a.grade || '—') + '</b></td><td><a class="btn-a ghost small" ' +
                    'href="../testlar/nazorat.html?natija=' + a.id + '">Ko\'rish</a></td></tr>';
            }).join('') || '<tr><td colspan="4" class="muted">Hali test topshirilmagan</td></tr>';
        });
    }

    $('fJoin').onsubmit = function (e) {
        e.preventDefault();
        api.post('classrooms/join/', { code: $('jCode').value.trim().toUpperCase() }).then(function (r) {
            FA.msg('msg', 'ok', r.name + ' sinfiga qo\'shildingiz');
            $('jCode').value = '';
            loadClasses(); loadTasks();
        }, function (err) { FA.msg('msg', 'err', FA.errText(err)); });
    };
})();
