// Student Result Portal - Vanilla JS
// Data model: { id, name, roll, subjects:[{name, marks}], total, percentage, grade, createdAt }

(function() {
    const STORAGE_KEY = "srp_students_v1";

    /** @type {Array} */
    let students = [];
    let editingId = null;

    // Elements
    const form = document.getElementById('student-form');
    const formTitle = document.getElementById('form-title');
    const nameInput = document.getElementById('name');
    const rollInput = document.getElementById('roll');
    const addSubjectBtn = document.getElementById('add-subject');
    const subjectRows = document.getElementById('subject-rows');
    const submitBtn = document.getElementById('submit-btn');
    const resetBtn = document.getElementById('reset-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    const tbody = document.getElementById('students-tbody');
    const emptyState = document.getElementById('empty-state');
    const exportBtn = document.getElementById('export-json');
    const importBtn = document.getElementById('import-json');
    const importFile = document.getElementById('import-file');
    const csvBtn = document.getElementById('download-csv');
    const clearAllBtn = document.getElementById('clear-all');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const pageSizeSelect = document.getElementById('page-size');
    const paginationEl = document.getElementById('pagination');
    const statsEl = document.getElementById('stats');

    // Modal elements
    const modal = document.getElementById('view-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.getElementById('close-modal');

    // Utils
    function uid() {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    }

    function load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        students = raw ? JSON.parse(raw) : [];
    }

    function computeTotals(subjects) {
        const valid = subjects.filter(s => s.name.trim() !== '' && !Number.isNaN(Number(s.marks)) && s.marks !== '');
        const total = valid.reduce((sum, s) => sum + Number(s.marks), 0);
        const max = valid.length * 100;
        const percentage = valid.length ? (total / max) * 100 : 0;
        return { total, percentage: Number(percentage.toFixed(2)) };
    }

    function computeGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    }

    function clearSubjects() {
        subjectRows.innerHTML = '';
    }

    function addSubjectRow(initial = { name: '', marks: '' }) {
        const row = document.createElement('div');
        row.className = 'subject-row';
        row.innerHTML = `
            <input type="text" class="subject-name" placeholder="Subject" value="${escapeHtml(initial.name)}" />
            <input type="number" class="subject-marks" placeholder="Marks (0-100)" min="0" max="100" value="${initial.marks}" />
            <button type="button" class="icon-btn remove-row" title="Remove">✕</button>
        `;
        row.querySelector('.remove-row').addEventListener('click', () => {
            row.remove();
        });
        subjectRows.appendChild(row);
    }

    function getSubjectsFromForm() {
        const names = subjectRows.querySelectorAll('.subject-name');
        const marks = subjectRows.querySelectorAll('.subject-marks');
        const subjects = [];
        for (let i = 0; i < names.length; i++) {
            const name = String(names[i].value || '').trim();
            const marksVal = marks[i].value;
            const num = marksVal === '' ? NaN : Number(marksVal);
            if (name !== '' || !Number.isNaN(num)) {
                const bounded = Number.isNaN(num) ? '' : Math.min(100, Math.max(0, num));
                subjects.push({ name, marks: bounded });
            }
        }
        return subjects;
    }

    function resetForm() {
        form.reset();
        clearSubjects();
        for (let i = 0; i < 3; i++) addSubjectRow();
        editingId = null;
        formTitle.textContent = 'Add Student';
        submitBtn.textContent = 'Save';
        cancelEditBtn.classList.add('hidden');
    }

    function fillForm(student) {
        nameInput.value = student.name;
        rollInput.value = student.roll;
        clearSubjects();
        if (!student.subjects || student.subjects.length === 0) {
            for (let i = 0; i < 3; i++) addSubjectRow();
        } else {
            student.subjects.forEach(s => addSubjectRow(s));
        }
        formTitle.textContent = 'Edit Student';
        submitBtn.textContent = 'Update';
        cancelEditBtn.classList.remove('hidden');
        editingId = student.id;
    }

    // Pagination state
    let currentPage = 1;

    function renderList() {
        const query = String(searchInput.value || '').toLowerCase();
        const sort = sortSelect.value;
        let data = students.filter(s =>
            s.name.toLowerCase().includes(query) || String(s.roll).toLowerCase().includes(query)
        );

        const sorters = {
            'createdAt_desc': (a, b) => b.createdAt - a.createdAt,
            'percentage_desc': (a, b) => b.percentage - a.percentage,
            'percentage_asc': (a, b) => a.percentage - b.percentage,
            'name_asc': (a, b) => a.name.localeCompare(b.name),
            'name_desc': (a, b) => b.name.localeCompare(a.name),
        };
        data.sort(sorters[sort] || sorters['createdAt_desc']);

        // Stats
        renderStats(data);

        // Pagination
        const pageSize = Number(pageSizeSelect.value || 10);
        const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const pageRows = data.slice(start, start + pageSize);

        tbody.innerHTML = '';
        if (pageRows.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }

        pageRows.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${start + idx + 1}</td>
                <td>${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.roll)}</td>
                <td>${s.total}</td>
                <td>${s.percentage}%</td>
                <td>${renderGradeBadge(s.grade)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn" data-action="view" data-id="${s.id}">View</button>
                        <button class="btn" data-action="print" data-id="${s.id}">Print</button>
                        <button class="btn" data-action="edit" data-id="${s.id}">Edit</button>
                        <button class="btn danger" data-action="delete" data-id="${s.id}">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        renderPagination(totalPages);
    }

    function renderGradeBadge(grade) {
        const cls = grade === 'A+' || grade === 'A' ? 'success' : grade === 'F' ? 'danger' : 'warn';
        return `<span class="badge ${cls}">${grade}</span>`;
    }

    function onTableClick(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        const student = students.find(s => s.id === id);
        if (!student) return;
        if (action === 'edit') {
            fillForm(student);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (action === 'delete') {
            if (confirm('Delete this student?')) {
                students = students.filter(s => s.id !== id);
                save();
                renderList();
                if (editingId === id) resetForm();
            }
        } else if (action === 'print') {
            printStudent(student);
        } else if (action === 'view') {
            openModal(student);
        }
    }

    function openModal(student) {
        const subjectsHtml = (student.subjects || []).map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(s.name || '-') }</td>
                <td>${s.marks === '' ? '-' : s.marks}</td>
            </tr>
        `).join('');
        modalBody.innerHTML = `
            <div class="grid">
                <div class="field"><span>Name</span><strong>${escapeHtml(student.name)}</strong></div>
                <div class="field"><span>Roll No.</span><strong>${escapeHtml(student.roll)}</strong></div>
            </div>
            <div style="overflow:auto; max-height: 40vh; margin-top: 8px;">
                <table style="width:100%; border-collapse: collapse;">
                    <thead>
                        <tr><th>#</th><th>Subject</th><th>Marks</th></tr>
                    </thead>
                    <tbody>${subjectsHtml || '<tr><td colspan="3">No subjects</td></tr>'}</tbody>
                </table>
            </div>
            <div class="grid" style="margin-top: 8px;">
                <div class="field"><span>Total</span><strong>${student.total}</strong></div>
                <div class="field"><span>Percentage</span><strong>${student.percentage}%</strong></div>
                <div class="field"><span>Grade</span><strong>${student.grade}</strong></div>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Event bindings
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = String(nameInput.value || '').trim();
        const roll = String(rollInput.value || '').trim();
        const subjects = getSubjectsFromForm();
        const valid = validateForm(name, roll, subjects);
        if (!valid) return;

        const { total, percentage } = computeTotals(subjects);
        const grade = computeGrade(percentage);

        if (editingId) {
            const idx = students.findIndex(s => s.id === editingId);
            if (idx !== -1) {
                students[idx] = { ...students[idx], name, roll, subjects, total, percentage, grade };
            }
        } else {
            students.push({ id: uid(), name, roll, subjects, total, percentage, grade, createdAt: Date.now() });
        }

        save();
        renderList();
        resetForm();
    });

    addSubjectBtn.addEventListener('click', () => addSubjectRow());
    resetBtn.addEventListener('click', () => resetForm());
    cancelEditBtn.addEventListener('click', () => resetForm());

    tbody.addEventListener('click', onTableClick);
    searchInput.addEventListener('input', renderList);
    sortSelect.addEventListener('change', renderList);
    pageSizeSelect.addEventListener('change', () => { currentPage = 1; renderList(); });

    // Export / Import / CSV / Clear
    exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(students, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!Array.isArray(data)) throw new Error('Invalid file');
            const normalized = data.map(s => normalizeStudent(s)).filter(Boolean);
            students = mergeByRoll(students, normalized);
            save();
            renderList();
            alert('Import successful');
        } catch (err) {
            alert('Import failed: ' + err.message);
        } finally {
            importFile.value = '';
        }
    });

    csvBtn.addEventListener('click', () => {
        const csv = toCsv(students);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'students.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    clearAllBtn.addEventListener('click', () => {
        if (!confirm('This will remove all students. Continue?')) return;
        students = [];
        save();
        renderList();
        resetForm();
    });

    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });

    // Startup
    function init() {
        load();
        resetForm();
        renderList();
        initTheme();
    }
    document.addEventListener('DOMContentLoaded', init);

    // Validation and helpers
    function validateForm(name, roll, subjects) {
        const nameError = document.getElementById('name-error');
        const rollError = document.getElementById('roll-error');
        let ok = true;
        if (!name) { nameError.classList.remove('hidden'); ok = false; } else { nameError.classList.add('hidden'); }
        if (!roll) { rollError.textContent = 'Roll number is required and must be unique.'; rollError.classList.remove('hidden'); ok = false; }
        else if (!isRollUnique(roll, editingId)) { rollError.textContent = 'This roll number already exists.'; rollError.classList.remove('hidden'); ok = false; }
        else { rollError.classList.add('hidden'); }
        if (subjects.length === 0) { alert('Please add at least one subject or marks.'); ok = false; }
        return ok;
    }

    function isRollUnique(roll, excludeId = null) {
        return students.every(s => s.roll.toLowerCase() !== roll.toLowerCase() || s.id === excludeId);
    }

    function normalizeStudent(s) {
        try {
            const name = String(s.name || '').trim();
            const roll = String(s.roll || '').trim();
            if (!name || !roll) return null;
            const subjects = Array.isArray(s.subjects) ? s.subjects.map(x => ({
                name: String(x.name || '').trim(),
                marks: typeof x.marks === 'number' ? Math.min(100, Math.max(0, x.marks)) : ''
            })) : [];
            const { total, percentage } = computeTotals(subjects);
            const grade = computeGrade(percentage);
            return {
                id: typeof s.id === 'string' && s.id ? s.id : uid(),
                name, roll, subjects, total, percentage, grade,
                createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now()
            };
        } catch { return null; }
    }

    function mergeByRoll(existing, incoming) {
        const map = new Map(existing.map(s => [s.roll.toLowerCase(), s]));
        for (const s of incoming) {
            const key = s.roll.toLowerCase();
            if (map.has(key)) {
                const prev = map.get(key);
                map.set(key, { ...prev, ...s, id: prev.id, createdAt: prev.createdAt });
            } else {
                map.set(key, s);
            }
        }
        return Array.from(map.values());
    }

    function toCsv(rows) {
        const header = ['Name','Roll','Total','Percentage','Grade','Subjects'];
        const lines = [header.join(',')];
        for (const s of rows) {
            const subjects = (s.subjects||[]).map(x => `${x.name}:${x.marks}`).join('|');
            const line = [s.name, s.roll, s.total, s.percentage, s.grade, subjects]
                .map(val => '"' + String(val).replace(/"/g,'""') + '"')
                .join(',');
            lines.push(line);
        }
        return lines.join('\n');
    }

    function printStudent(student) {
        const w = window.open('', '_blank');
        if (!w) return;
        const subjectsHtml = (student.subjects || []).map((s,i) => `<tr><td>${i+1}</td><td>${escapeHtml(s.name||'-')}</td><td>${s.marks === '' ? '-' : s.marks}</td></tr>`).join('');
        w.document.write(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Result - ${escapeHtml(student.name)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#222}
h1,h2{margin:0 0 8px}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #999;padding:6px 8px;text-align:left}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.muted{color:#666}
</style>
</head><body>
<h1>Student Result</h1>
<div class="grid">
  <div><div class="muted">Name</div><div><strong>${escapeHtml(student.name)}</strong></div></div>
  <div><div class="muted">Roll No.</div><div><strong>${escapeHtml(student.roll)}</strong></div></div>
</div>
<h2>Subjects</h2>
<table><thead><tr><th>#</th><th>Subject</th><th>Marks</th></tr></thead><tbody>${subjectsHtml}</tbody></table>
<div class="grid" style="margin-top:12px">
  <div><div class="muted">Total</div><div><strong>${student.total}</strong></div></div>
  <div><div class="muted">Percentage</div><div><strong>${student.percentage}%</strong></div></div>
  <div><div class="muted">Grade</div><div><strong>${student.grade}</strong></div></div>
</div>
<script>window.onload=() => window.print()</script>
</body></html>`);
        w.document.close();
    }

    // Pagination render
    function renderPagination(totalPages) {
        paginationEl.innerHTML = '';
        if (totalPages <= 1) return;
        const makeBtn = (label, page, disabled = false, active = false) => {
            const b = document.createElement('button');
            b.textContent = label;
            if (active) b.classList.add('active');
            if (!disabled) {
                b.addEventListener('click', () => { currentPage = page; renderList(); });
            } else {
                b.disabled = true;
            }
            return b;
        };
        paginationEl.appendChild(makeBtn('Prev', Math.max(1, currentPage - 1), currentPage === 1));
        const windowSize = 5;
        const start = Math.max(1, currentPage - Math.floor(windowSize/2));
        const end = Math.min(totalPages, start + windowSize - 1);
        for (let p = start; p <= end; p++) {
            paginationEl.appendChild(makeBtn(String(p), p, false, p === currentPage));
        }
        paginationEl.appendChild(makeBtn('Next', Math.min(totalPages, currentPage + 1), currentPage === totalPages));
    }

    // Stats render
    function renderStats(data) {
        if (!data || data.length === 0) { statsEl.textContent = ''; return; }
        const avg = (data.reduce((a,b) => a + b.percentage, 0) / data.length).toFixed(2);
        statsEl.textContent = `${data.length} students • Avg: ${avg}%`;
    }

    // Theme toggle
    function initTheme() {
        const saved = localStorage.getItem('srp_theme') || 'dark';
        setTheme(saved);
        themeToggleBtn.addEventListener('click', () => {
            const next = document.documentElement.classList.contains('light') ? 'dark' : 'light';
            setTheme(next);
        });
    }
    function setTheme(mode) {
        if (mode === 'light') document.documentElement.classList.add('light');
        else document.documentElement.classList.remove('light');
        localStorage.setItem('srp_theme', mode);
    }
})();


