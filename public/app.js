// Global State
let currentUser = null;
let activeMahasiswaTab = 'grades';
let activeDosenTab = 'submissions';
let allCourses = [];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  loadCourses();
  await checkAuthSession();
  loadSecurityLab();
}

// ==========================================
// AUTHENTICATION & SESSION
// ==========================================
async function checkAuthSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      renderAppForUser();
    } else {
      currentUser = null;
      showView('login');
      updateNavForGuest();
    }
  } catch (err) {
    console.error('Session check error:', err);
    showView('login');
    updateNavForGuest();
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user;
      showToast('Login berhasil! Selamat datang, ' + currentUser.name, 'success');
      renderAppForUser();
    } else {
      showToast(data.error || 'Login gagal.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan saat menghubungi server.', 'error');
  }
}

async function quickLogin(userId) {
  try {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      showToast(`Beralih ke akun: ${currentUser.name} (${currentUser.role})`, 'info');
      renderAppForUser();
    }
  } catch (err) {
    showToast('Gagal beralih akun demo.', 'error');
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  showToast('Anda telah keluar dari sistem.', 'info');
  showView('login');
  updateNavForGuest();
}

function fillCredentials(user, pass) {
  document.getElementById('login-username').value = user;
  document.getElementById('login-password').value = pass;
  showToast('Kredensial disalin ke formulir login.', 'info');
}

function fillSqlBypass() {
  document.getElementById('login-username').value = `' OR '1'='1' --`;
  document.getElementById('login-password').value = `bypass123`;
  showToast('Payload SQLi login diterapkan! Silakan klik Masuk.', 'info');
}

// ==========================================
// NAVIGATION & VIEW SWITCHING
// ==========================================
function renderAppForUser() {
  const profileWidget = document.getElementById('user-profile-widget');
  const displayName = document.getElementById('user-display-name');
  const displayRole = document.getElementById('user-display-role');

  profileWidget.classList.remove('hidden');
  displayName.textContent = currentUser.name;
  displayRole.textContent = currentUser.role.toUpperCase();

  updateNavForRole(currentUser.role);

  if (currentUser.role === 'mahasiswa') {
    showView('mahasiswa');
    renderMahasiswaDashboard();
  } else if (currentUser.role === 'dosen') {
    showView('dosen');
    renderDosenDashboard();
  } else if (currentUser.role === 'admin') {
    showView('admin');
    renderAdminDashboard();
  }
}

function updateNavForGuest() {
  document.getElementById('user-profile-widget').classList.add('hidden');
  const nav = document.getElementById('main-nav');
  nav.innerHTML = `
    <button class="nav-item active" onclick="showView('login')">🔑 Masuk</button>
  `;
}

function updateNavForRole(role) {
  const nav = document.getElementById('main-nav');
  if (role === 'mahasiswa') {
    nav.innerHTML = `
      <button class="nav-item active" onclick="showView('mahasiswa'); switchMahasiswaTab('grades');">📊 KHS & Nilai</button>
      <button class="nav-item" onclick="showView('mahasiswa'); switchMahasiswaTab('assignments');">📝 Tugas Kuliah</button>
      <button class="nav-item" onclick="showView('mahasiswa'); switchMahasiswaTab('forum');">💬 Forum Diskusi</button>
    `;
  } else if (role === 'dosen') {
    nav.innerHTML = `
      <button class="nav-item active" onclick="showView('dosen'); switchDosenTab('submissions');">📥 Nilai Tugas</button>
      <button class="nav-item" onclick="showView('dosen'); switchDosenTab('gradebook');">📊 Rekap Nilai</button>
      <button class="nav-item" onclick="showView('dosen'); switchDosenTab('search');">🔍 SQLi Lab</button>
      <button class="nav-item" onclick="showView('dosen'); switchDosenTab('forum');">💬 Forum Diskusi</button>
    `;
  } else if (role === 'admin') {
    nav.innerHTML = `
      <button class="nav-item active" onclick="showView('admin')">👥 Kelola Akun & Hak Akses</button>
    `;
  }
}

function showView(viewName) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById('view-' + viewName);
  if (target) {
    target.classList.remove('hidden');
  }
}

function goToHome() {
  if (!currentUser) {
    showView('login');
  } else {
    showView(currentUser.role);
  }
}

// ==========================================
// MAHASISWA DASHBOARD
// ==========================================
async function renderMahasiswaDashboard() {
  document.getElementById('mhs-name').textContent = currentUser.name;
  document.getElementById('mhs-meta').textContent = `NIM: ${currentUser.identifier} | Program Studi: ${currentUser.prodi}`;

  loadMahasiswaGrades();
  loadMahasiswaAssignments();
  loadForumThreads('mhs-forum-list');
}

function switchMahasiswaTab(tabName) {
  activeMahasiswaTab = tabName;
  document.querySelectorAll('#view-mahasiswa .tab-btn').forEach((btn, idx) => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('#view-mahasiswa .tab-content').forEach(c => c.classList.add('hidden'));

  const activeContent = document.getElementById('mhs-tab-' + tabName);
  if (activeContent) activeContent.classList.remove('hidden');

  // Activate matching button
  const buttons = document.querySelectorAll('#view-mahasiswa .tab-btn');
  if (tabName === 'grades' && buttons[0]) buttons[0].classList.add('active');
  if (tabName === 'assignments' && buttons[1]) buttons[1].classList.add('active');
  if (tabName === 'forum' && buttons[2]) buttons[2].classList.add('active');
}

// ⚠️ VULNERABLE TO IDOR: Can fetch grades of any student_id
async function fetchGradesWithIdor(studentId) {
  loadMahasiswaGrades(studentId);
}

async function loadMahasiswaGrades(customStudentId = null) {
  try {
    const url = customStudentId ? `/api/mahasiswa/grades?student_id=${customStudentId}` : '/api/mahasiswa/grades';
    const res = await fetch(url);
    const data = await res.json();

    const tbody = document.getElementById('mhs-grades-body');
    const idorAlert = document.getElementById('idor-alert-banner');

    if (data.isIdorAccessed) {
      idorAlert.classList.remove('hidden');
      idorAlert.innerHTML = `🚨 <strong>IDOR Exploit Terdeteksi:</strong> Anda (ID: ${currentUser.id}) sedang melihat data nilai mahasiswa lain: <strong>${data.student ? data.student.name : 'Unknown'}</strong> (NIM: ${data.student ? data.student.identifier : '-'})!`;
    } else {
      idorAlert.classList.add('hidden');
    }

    if (!data.grades || data.grades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Belum ada nilai yang diinputkan.</td></tr>`;
      return;
    }

    let totalBobot = 0;
    let totalSks = 0;

    tbody.innerHTML = data.grades.map(g => {
      const bobotAngka = getBobotGrade(g.grade_letter);
      totalBobot += bobotAngka * g.sks;
      totalSks += g.sks;

      return `
        <tr>
          <td><strong>${g.course_code}</strong></td>
          <td>${g.course_name}</td>
          <td>${g.sks}</td>
          <td>${g.dosen_name}</td>
          <td>${g.tugas}</td>
          <td>${g.uts}</td>
          <td>${g.uas}</td>
          <td><strong>${g.nilai_akhir}</strong></td>
          <td><span class="grade-badge grade-${g.grade_letter.replace('+', '').replace('-', '')}">${g.grade_letter}</span></td>
        </tr>
      `;
    }).join('');

    const ipk = totalSks > 0 ? (totalBobot / totalSks).toFixed(2) : '0.00';
    document.getElementById('mhs-ipk').textContent = ipk;
  } catch (err) {
    console.error('Error loading grades:', err);
  }
}

function getBobotGrade(letter) {
  if (letter === 'A') return 4.0;
  if (letter === 'A-') return 3.75;
  if (letter === 'B+') return 3.5;
  if (letter === 'B') return 3.0;
  if (letter === 'B-') return 2.75;
  if (letter === 'C+') return 2.5;
  if (letter === 'C') return 2.0;
  if (letter === 'D') return 1.0;
  return 0.0;
}

async function loadMahasiswaAssignments() {
  try {
    const res = await fetch('/api/mahasiswa/assignments');
    const data = await res.json();
    const container = document.getElementById('mhs-assignments-list');

    if (!data.assignments || data.assignments.length === 0) {
      container.innerHTML = `<p class="text-muted">Tidak ada tugas aktif.</p>`;
      return;
    }

    container.innerHTML = data.assignments.map(a => {
      const isSubmitted = !!a.submission_id;
      const isGraded = a.score !== null && a.score !== undefined;

      return `
        <div class="assignment-card">
          <div>
            <span class="assignment-badge">${a.course_code} - ${a.course_name}</span>
            <h4>${a.title}</h4>
            <p>${a.description}</p>
            <div class="assignment-meta">
              <span>👤 Dosen: ${a.dosen_name}</span>
              <span>📅 Tenggat: <strong>${a.deadline}</strong></span>
              ${isSubmitted ? `<span>📎 Berkas Anda: <a href="${a.file_path}" target="_blank" style="color:var(--primary);font-weight:600;">${a.file_name}</a></span>` : ''}
              ${isGraded ? `<span style="color:#065f46;font-weight:700;">⭐ Nilai: ${a.score} | Catatan: "${a.feedback || '-'}"</span>` : ''}
            </div>
          </div>
          <div>
            ${isSubmitted ? 
              `<button class="btn-secondary btn-block" onclick="openUploadModal(${a.id}, '${escapeHtml(a.title)}')">🔄 Perbarui Berkas Tugas</button>` : 
              `<button class="btn-primary btn-block" onclick="openUploadModal(${a.id}, '${escapeHtml(a.title)}')">📤 Unggah Jawaban Tugas</button>`
            }
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading assignments:', err);
  }
}

// ==========================================
// UPLOAD TUGAS (UNRESTRICTED FILE UPLOAD)
// ==========================================
function openUploadModal(assignmentId, title) {
  document.getElementById('upload-assignment-id').value = assignmentId;
  document.getElementById('upload-assignment-title').value = title;
  document.getElementById('upload-notes-input').value = '';
  document.getElementById('upload-file-input').value = '';
  document.getElementById('modal-upload').classList.remove('hidden');
}

async function handleUploadSubmit(e) {
  e.preventDefault();
  const assignmentId = document.getElementById('upload-assignment-id').value;
  const notes = document.getElementById('upload-notes-input').value;
  const fileInput = document.getElementById('upload-file-input');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Pilih berkas terlebih dahulu.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('assignment_id', assignmentId);
  formData.append('notes', notes);
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/mahasiswa/submit', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Tugas berhasil diunggah! Berkas: ' + data.fileName, 'success');
      closeModal('modal-upload');
      loadMahasiswaAssignments();
    } else {
      showToast(data.error || 'Gagal mengunggah berkas.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan saat mengunggah.', 'error');
  }
}

// ==========================================
// DOSEN DASHBOARD
// ==========================================
async function renderDosenDashboard() {
  document.getElementById('dosen-name').textContent = currentUser.name;
  document.getElementById('dosen-meta').textContent = `NIDN: ${currentUser.identifier} | Program Studi: ${currentUser.prodi}`;

  loadDosenSubmissions();
  loadDosenGradebook();
  loadForumThreads('dosen-forum-list');
  executeSqliSearch('');
}

function switchDosenTab(tabName) {
  activeDosenTab = tabName;
  document.querySelectorAll('#view-dosen .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#view-dosen .tab-content').forEach(c => c.classList.add('hidden'));

  const activeContent = document.getElementById('dosen-tab-' + tabName);
  if (activeContent) activeContent.classList.remove('hidden');

  const buttons = document.querySelectorAll('#view-dosen .tab-btn');
  if (tabName === 'submissions' && buttons[0]) buttons[0].classList.add('active');
  if (tabName === 'gradebook' && buttons[1]) buttons[1].classList.add('active');
  if (tabName === 'search' && buttons[2]) buttons[2].classList.add('active');
  if (tabName === 'forum' && buttons[3]) buttons[3].classList.add('active');
}

async function loadDosenSubmissions() {
  try {
    const res = await fetch('/api/dosen/submissions');
    const data = await res.json();
    const tbody = document.getElementById('dosen-submissions-body');

    if (!data.submissions || data.submissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Belum ada tugas yang dikumpulkan mahasiswa.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.submissions.map(s => {
      const isGraded = s.score !== null && s.score !== undefined;
      return `
        <tr>
          <td>
            <strong>${s.student_name}</strong><br>
            <small class="text-muted">NIM: ${s.student_nim}</small>
          </td>
          <td>
            <strong>${s.course_code}</strong><br>
            <small>${s.assignment_title}</small>
          </td>
          <td>
            <a href="${s.file_path}" target="_blank" style="color:var(--primary);font-weight:600;">
              📄 ${s.file_name}
            </a>
          </td>
          <td><small>${s.notes || '-'}</small></td>
          <td><small>${formatDate(s.submitted_at)}</small></td>
          <td><strong>${isGraded ? s.score : '-'}</strong></td>
          <td>
            <span class="status-badge ${isGraded ? 'status-graded' : 'status-pending'}">
              ${isGraded ? 'Dinilai' : 'Menunggu Nilai'}
            </span>
          </td>
          <td>
            <button class="btn-xs" onclick="openGradeModal(${s.id}, '${escapeHtml(s.student_name)}', '${escapeHtml(s.student_nim)}', '${escapeHtml(s.file_name)}', '${s.file_path}', ${s.score || 'null'}, '${escapeHtml(s.feedback || '')}')">
              ✏️ Beri Nilai
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading submissions:', err);
  }
}

function openGradeModal(submissionId, studentName, studentNim, fileName, filePath, currentScore, feedback) {
  document.getElementById('grade-submission-id').value = submissionId;
  document.getElementById('grade-student-info').value = `${studentName} (NIM: ${studentNim})`;
  document.getElementById('grade-file-link-wrap').innerHTML = `<a href="${filePath}" target="_blank" style="color:var(--primary);font-weight:600;">📄 Buka Berkas: ${fileName}</a>`;
  document.getElementById('grade-score-input').value = currentScore !== null ? currentScore : '';
  document.getElementById('grade-feedback-input').value = feedback || '';
  document.getElementById('modal-grade').classList.remove('hidden');
}

async function handleGradeSubmit(e) {
  e.preventDefault();
  const submissionId = document.getElementById('grade-submission-id').value;
  const score = document.getElementById('grade-score-input').value;
  const feedback = document.getElementById('grade-feedback-input').value;

  try {
    const res = await fetch('/api/dosen/grade-submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, score, feedback })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Nilai dan feedback berhasil disimpan!', 'success');
      closeModal('modal-grade');
      loadDosenSubmissions();
    } else {
      showToast(data.error || 'Gagal menyimpan nilai.', 'error');
    }
  } catch (err) {
    showToast('Kesalahan jaringan.', 'error');
  }
}

async function loadDosenGradebook() {
  try {
    const res = await fetch('/api/dosen/course-grades');
    const data = await res.json();
    const tbody = document.getElementById('dosen-gradebook-body');

    if (!data.grades || data.grades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Tidak ada data nilai mahasiswa.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.grades.map(g => {
      return `
        <tr>
          <td><strong>${g.student_nim}</strong></td>
          <td>${g.student_name}</td>
          <td>${g.course_name} (${g.course_code})</td>
          <td><input type="number" id="tugas-${g.id}" value="${g.tugas}" min="0" max="100" style="width:70px;"></td>
          <td><input type="number" id="uts-${g.id}" value="${g.uts}" min="0" max="100" style="width:70px;"></td>
          <td><input type="number" id="uas-${g.id}" value="${g.uas}" min="0" max="100" style="width:70px;"></td>
          <td id="akhir-${g.id}"><strong>${g.nilai_akhir}</strong></td>
          <td id="huruf-${g.id}"><span class="grade-badge grade-${g.grade_letter.replace('+', '').replace('-', '')}">${g.grade_letter}</span></td>
          <td>
            <button class="btn-xs" onclick="saveCourseGrade(${g.id})">💾 Simpan</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading gradebook:', err);
  }
}

async function saveCourseGrade(gradeId) {
  const tugas = document.getElementById(`tugas-${gradeId}`).value;
  const uts = document.getElementById(`uts-${gradeId}`).value;
  const uas = document.getElementById(`uas-${gradeId}`).value;

  try {
    const res = await fetch('/api/dosen/update-grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade_id: gradeId, tugas, uts, uas })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById(`akhir-${gradeId}`).innerHTML = `<strong>${data.nilaiAkhir}</strong>`;
      document.getElementById(`huruf-${gradeId}`).innerHTML = `<span class="grade-badge grade-${data.letter.replace('+', '').replace('-', '')}">${data.letter}</span>`;
      showToast('Nilai mahasiswa berhasil diperbarui!', 'success');
    } else {
      showToast(data.error || 'Gagal menyimpan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan.', 'error');
  }
}

// ==========================================
// SQL INJECTION SEARCH PLAYGROUND
// ==========================================
function applySqliPayload(payload) {
  document.getElementById('sqli-search-input').value = payload;
  executeSqliSearch();
}

async function executeSqliSearch() {
  const keyword = document.getElementById('sqli-search-input').value;
  try {
    const res = await fetch(`/api/search/students?q=${encodeURIComponent(keyword)}`);
    const data = await res.json();

    document.getElementById('sqli-debug-query').textContent = data.executedQuery || 'SELECT...';

    const tbody = document.getElementById('sqli-results-body');
    if (!data.results || data.results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Data tidak ditemukan untuk kueri tersebut.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.results.map(r => {
      return `
        <tr>
          <td>${r.id !== undefined ? r.id : '-'}</td>
          <td><strong>${r.name || '-'}</strong></td>
          <td>${r.identifier || '-'}</td>
          <td>${r.prodi || '-'}</td>
          <td>${r.email || '-'}</td>
          <td>${r.nilai_akhir !== null && r.nilai_akhir !== undefined ? r.nilai_akhir : '-'}</td>
          <td>${r.grade_letter || '-'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('SQLi search error:', err);
  }
}

// ==========================================
// ADMIN DASHBOARD (CRUD AKUN)
// ==========================================
async function renderAdminDashboard() {
  loadAdminStats();
  loadAdminUsers();
}

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.stats) {
      document.getElementById('admin-stat-users').textContent = data.stats.users;
      document.getElementById('admin-stat-mhs').textContent = data.stats.mahasiswa;
      document.getElementById('admin-stat-dosen').textContent = data.stats.dosen;
      document.getElementById('admin-stat-sub').textContent = data.stats.submissions;
    }
  } catch (err) {
    console.error('Admin stats error:', err);
  }
}

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    const tbody = document.getElementById('admin-users-body');

    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Tidak ada akun pengguna.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.users.map(u => {
      const roleBadgeClass = u.role === 'admin' ? 'pill-admin' : u.role === 'dosen' ? 'pill-dosen' : 'pill-mhs';
      const statusClass = u.status === 'Aktif' ? 'status-active' : 'status-inactive';

      return `
        <tr>
          <td>${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td><span class="role-pill ${roleBadgeClass}">${u.role}</span></td>
          <td>${u.identifier || '-'}</td>
          <td>${u.prodi || '-'}</td>
          <td>
            ${u.email}<br>
            <small class="text-muted">@${u.username}</small>
          </td>
          <td><span class="status-badge ${statusClass}">${u.status}</span></td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn-xs" onclick="openEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">✏️ Ubah</button>
              <button class="btn-xs btn-xs-danger" onclick="deleteUser(${u.id}, '${escapeHtml(u.name)}')">🗑️ Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Admin load users error:', err);
  }
}

function openAddUserModal() {
  document.getElementById('modal-user-title').textContent = 'Tambah Akun Pengguna Baru';
  document.getElementById('user-form-id').value = '';
  document.getElementById('user-form-name').value = '';
  document.getElementById('user-form-role').value = 'mahasiswa';
  document.getElementById('user-form-identifier').value = '';
  document.getElementById('user-form-username').value = '';
  document.getElementById('user-form-email').value = '';
  document.getElementById('user-form-prodi').value = 'Teknik Informatika';
  document.getElementById('user-form-password').value = 'Kampus2024!';
  document.getElementById('user-form-password').required = true;
  document.getElementById('user-form-username').readOnly = false;
  document.getElementById('modal-user').classList.remove('hidden');
}

function openEditUserModal(user) {
  document.getElementById('modal-user-title').textContent = 'Edit Data Akun: ' + user.name;
  document.getElementById('user-form-id').value = user.id;
  document.getElementById('user-form-name').value = user.name;
  document.getElementById('user-form-role').value = user.role;
  document.getElementById('user-form-identifier').value = user.identifier || '';
  document.getElementById('user-form-username').value = user.username;
  document.getElementById('user-form-username').readOnly = true;
  document.getElementById('user-form-email').value = user.email;
  document.getElementById('user-form-prodi').value = user.prodi || '';
  document.getElementById('user-form-password').value = '';
  document.getElementById('user-form-password').required = false;
  document.getElementById('user-form-status').value = user.status;
  document.getElementById('modal-user').classList.remove('hidden');
}

async function handleUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('user-form-id').value;
  const name = document.getElementById('user-form-name').value;
  const role = document.getElementById('user-form-role').value;
  const identifier = document.getElementById('user-form-identifier').value;
  const username = document.getElementById('user-form-username').value;
  const email = document.getElementById('user-form-email').value;
  const prodi = document.getElementById('user-form-prodi').value;
  const password = document.getElementById('user-form-password').value;
  const status = document.getElementById('user-form-status').value;

  const isEdit = !!id;
  const url = isEdit ? `/api/admin/users/${id}` : '/api/admin/users';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, identifier, username, email, prodi, password, status })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Data akun tersimpan!', 'success');
      closeModal('modal-user');
      loadAdminUsers();
      loadAdminStats();
    } else {
      showToast(data.error || 'Gagal menyimpan akun.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Yakin ingin menghapus akun "${name}"?`)) return;
  try {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showToast('Akun berhasil dihapus.', 'info');
      loadAdminUsers();
      loadAdminStats();
    } else {
      showToast(data.error || 'Gagal menghapus.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan.', 'error');
  }
}

// ==========================================
// FORUM DISKUSI (STORED XSS VULNERABLE)
// ==========================================
async function loadForumThreads(containerId) {
  try {
    const res = await fetch('/api/forum');
    const data = await res.json();
    const container = document.getElementById(containerId);

    if (!data.threads || data.threads.length === 0) {
      container.innerHTML = `<p class="text-muted">Belum ada diskusi.</p>`;
      return;
    }

    // ⚠️ INTENTIONALLY VULNERABLE: We render the title and snippet using innerHTML
    // This demonstrates Stored XSS whenever an evaluator opens the forum!
    container.innerHTML = data.threads.map(t => {
      return `
        <div class="thread-item" onclick="openThreadDetail(${t.id})">
          <div class="thread-header-row">
            <span class="thread-course-tag">${t.course_code} - ${t.course_name}</span>
            <span class="text-muted" style="font-size:0.75rem;">${formatDate(t.created_at)}</span>
          </div>
          <!-- ⚠️ Raw innerHTML injection for Stored XSS demonstration -->
          <div class="thread-title">${t.title}</div>
          <div class="thread-snippet">${t.content.length > 120 ? t.content.substring(0, 120) + '...' : t.content}</div>
          <div class="thread-footer">
            <span>👤 Oleh: <strong>${t.author_name}</strong> (${t.author_role})</span>
            <span>💬 ${t.reply_count || 0} Tanggapan</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading forum:', err);
  }
}

async function openThreadDetail(threadId) {
  try {
    const res = await fetch(`/api/forum/${threadId}`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Gagal memuat thread.', 'error');
      return;
    }

    const t = data.thread;
    document.getElementById('forum-detail-title').textContent = t.title;
    document.getElementById('forum-detail-author').textContent = `${t.author_name} (${t.author_role})`;
    document.getElementById('forum-detail-course').textContent = `${t.course_code} - ${t.course_name}`;
    document.getElementById('forum-detail-date').textContent = formatDate(t.created_at);

    // ⚠️ Stored XSS trigger: raw innerHTML assignment of user-controlled content
    document.getElementById('forum-detail-content').innerHTML = t.content;

    document.getElementById('reply-thread-id').value = t.id;
    document.getElementById('reply-content-input').value = '';

    const repliesList = document.getElementById('forum-detail-replies');
    if (!data.replies || data.replies.length === 0) {
      repliesList.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">Belum ada tanggapan untuk diskusi ini.</p>`;
    } else {
      // ⚠️ Stored XSS in replies as well:
      repliesList.innerHTML = data.replies.map(r => `
        <div class="reply-card">
          <div class="reply-header">
            <strong>${r.author_name} (${r.author_role})</strong>
            <span>${formatDate(r.created_at)}</span>
          </div>
          <div class="reply-content">${r.content}</div>
        </div>
      `).join('');
    }

    document.getElementById('modal-forum-detail').classList.remove('hidden');
  } catch (err) {
    console.error('Thread detail error:', err);
  }
}

function openNewThreadModal() {
  const select = document.getElementById('thread-course-select');
  select.innerHTML = '<option value="">Pilih Mata Kuliah...</option>' + 
    allCourses.map(c => `<option value="${c.id}">${c.code} - ${c.name}</option>`).join('');

  document.getElementById('thread-title-input').value = '';
  document.getElementById('thread-content-input').value = '';
  document.getElementById('modal-thread').classList.remove('hidden');
}

function insertXssPayload() {
  document.getElementById('thread-title-input').value = `Uji Coba Stored XSS pada Judul <script>alert(1)</script>`;
  document.getElementById('thread-content-input').value = `<img src=x onerror="alert('Stored XSS Ditemukan! Cookie Sesi: ' + document.cookie)">\n<p style="color:red;font-weight:bold;">Teks ini disisipkan melalui tag HTML tanpa sanitasi.</p>`;
  showToast('Payload Stored XSS disisipkan.', 'info');
}

function insertReplyXss() {
  document.getElementById('reply-content-input').value = `<b style="color:purple;font-size:16px;">[XSS di Tanggapan]</b> <img src=x onerror="console.log('XSS Triggered in Reply')">`;
}

async function handleThreadSubmit(e) {
  e.preventDefault();
  const course_id = document.getElementById('thread-course-select').value;
  const title = document.getElementById('thread-title-input').value;
  const content = document.getElementById('thread-content-input').value;

  try {
    const res = await fetch('/api/forum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id, title, content })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Topik diskusi berhasil dipublikasikan!', 'success');
      closeModal('modal-thread');
      if (currentUser.role === 'mahasiswa') loadForumThreads('mhs-forum-list');
      if (currentUser.role === 'dosen') loadForumThreads('dosen-forum-list');
    } else {
      showToast(data.error || 'Gagal membuat thread.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function handleReplySubmit(e) {
  e.preventDefault();
  const threadId = document.getElementById('reply-thread-id').value;
  const content = document.getElementById('reply-content-input').value;

  try {
    const res = await fetch(`/api/forum/${threadId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Tanggapan berhasil dikirim!', 'success');
      openThreadDetail(threadId); // Refresh modal
    } else {
      showToast(data.error || 'Gagal mengirim komentar.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

// ==========================================
// SECURITY LAB & POC GUIDE
// ==========================================
async function loadSecurityLab() {
  try {
    const res = await fetch('/api/security-lab/vulnerabilities');
    const data = await res.json();
    const container = document.getElementById('vuln-cards-container');

    if (!data.selectedVulnerabilities) return;

    container.innerHTML = data.selectedVulnerabilities.map(v => {
      return `
        <div class="vuln-card">
          <div class="vuln-card-header">
            <div class="vuln-title-wrap">
              <span class="vuln-name">${v.name}</span>
              <span class="severity-tag severity-${v.severity.includes('High') ? 'High' : 'Medium'}">${v.severity}</span>
            </div>
            <span style="font-size:0.8rem;color:#059669;font-weight:700;">🟢 ${v.status}</span>
          </div>
          <p class="vuln-desc">${v.description}</p>

          <div class="vuln-section-title">📍 Titik / Endpoint Rentan:</div>
          <ul style="margin-bottom:14px;padding-left:20px;font-size:0.85rem;color:#475569;">
            ${v.impactedEndpoints.map(ep => `<li><code>${ep}</code></li>`).join('')}
          </ul>

          <div class="vuln-section-title">⚡ Langkah-langkah Pengujian (Proof of Concept - PoC):</div>
          <ol class="poc-steps-list">
            ${v.pocStepByStep.map(step => `<li>${step}</li>`).join('')}
          </ol>

          <div class="mitigation-box">
            <strong>🛡️ Mitigasi & Rekomendasi Perbaikan:</strong><br>
            ${v.mitigation}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading security lab:', err);
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
async function loadCourses() {
  try {
    const res = await fetch('/api/courses');
    const data = await res.json();
    allCourses = data.courses || [];
  } catch (err) {
    console.error('Error loading courses:', err);
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
