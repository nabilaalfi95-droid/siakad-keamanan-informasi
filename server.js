const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Setup database tables & seed initial synthetic data
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT, -- 'admin', 'dosen', 'mahasiswa'
      name TEXT,
      identifier TEXT, -- NIM for mahasiswa, NIDN for dosen, NIP for admin
      prodi TEXT,
      status TEXT DEFAULT 'Aktif'
    )
  `);

  // Courses table
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      name TEXT,
      sks INTEGER,
      dosen_id INTEGER,
      semester INTEGER,
      FOREIGN KEY (dosen_id) REFERENCES users(id)
    )
  `);

  // Grades table
  db.run(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      tugas REAL DEFAULT 0,
      uts REAL DEFAULT 0,
      uas REAL DEFAULT 0,
      nilai_akhir REAL DEFAULT 0,
      grade_letter TEXT DEFAULT 'E',
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Assignments / Tugas table
  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER,
      title TEXT,
      description TEXT,
      deadline TEXT,
      created_by INTEGER,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Submissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER,
      student_id INTEGER,
      file_path TEXT,
      file_name TEXT,
      notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      score REAL,
      feedback TEXT,
      graded_by INTEGER,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES users(id)
    )
  `);

  // Forum Discussions table
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      course_id INTEGER,
      author_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Forum Replies table
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER,
      content TEXT,
      author_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // Check if data is already seeded
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err || row.count > 0) return;

    console.log('🌱 Seeding synthetic campus data...');

    // 1. Seed Users (Admin, Dosen, Mahasiswa)
    const users = [
      ['admin', 'admin@cakrawala.ac.id', 'Admin2024!', 'admin', 'M. Fadli Azizi, M.Kom', 'ADM-001', 'Biro Sistem Informasi', 'Aktif'],
      ['budi.santoso', 'budi.santoso@cakrawala.ac.id', 'Dosen2024!', 'dosen', 'Dr. Ir. Budi Santoso, M.T.', '0412038501', 'Teknik Informatika', 'Aktif'],
      ['siti.aminah', 'siti.aminah@cakrawala.ac.id', 'Dosen2024!', 'dosen', 'Siti Aminah, S.Kom., M.Cs.', '0415088802', 'Sistem Informasi', 'Aktif'],
      ['dimas.pratama', 'dimas.pratama@mhs.cakrawala.ac.id', 'Mhs2024!', 'mahasiswa', 'Dimas Pratama', '220101001', 'Teknik Informatika', 'Aktif'],
      ['nabila.azzahra', 'nabila.azzahra@mhs.cakrawala.ac.id', 'Mhs2024!', 'mahasiswa', 'Nabila Azzahra Putri', '220101002', 'Teknik Informatika', 'Aktif'],
      ['reza.firmansyah', 'reza.firmansyah@mhs.cakrawala.ac.id', 'Mhs2024!', 'mahasiswa', 'Reza Firmansyah', '220101003', 'Sistem Informasi', 'Aktif']
    ];

    const stmtUser = db.prepare(`INSERT INTO users (username, email, password, role, name, identifier, prodi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    users.forEach(u => stmtUser.run(u));
    stmtUser.finalize();

    // 2. Seed Courses
    const courses = [
      ['TIF-301', 'Keamanan Sistem Informasi', 3, 2, 5],
      ['TIF-302', 'Pemrograman Web Lanjut', 3, 2, 5],
      ['SI-305', 'Tata Kelola TI & Manajemen Risiko', 3, 3, 5],
      ['SI-204', 'Basis Data Terdistribusi', 3, 3, 5]
    ];
    const stmtCourse = db.prepare(`INSERT INTO courses (code, name, sks, dosen_id, semester) VALUES (?, ?, ?, ?, ?)`);
    courses.forEach(c => stmtCourse.run(c));
    stmtCourse.finalize();

    // 3. Seed Grades (Dimas, Nabila, Reza)
    const grades = [
      [4, 1, 88, 85, 90, 87.7, 'A'],
      [4, 2, 82, 80, 84, 82.0, 'A-'],
      [4, 3, 75, 78, 80, 77.7, 'B+'],
      [5, 1, 95, 92, 94, 93.7, 'A'],
      [5, 2, 90, 88, 92, 90.0, 'A'],
      [5, 3, 85, 84, 88, 85.7, 'A'],
      [6, 1, 78, 75, 82, 78.3, 'B+'],
      [6, 3, 84, 80, 86, 83.3, 'A-'],
      [6, 4, 88, 85, 90, 87.7, 'A']
    ];
    const stmtGrade = db.prepare(`INSERT INTO grades (student_id, course_id, tugas, uts, uas, nilai_akhir, grade_letter) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    grades.forEach(g => stmtGrade.run(g));
    stmtGrade.finalize();

    // 4. Seed Assignments
    const assignments = [
      [1, 'Tugas 1: Analisis Kerentanan OWASP Top 10', 'Pelajari dan buat ringkasan mitigasi kerentanan SQL Injection & XSS pada aplikasi web akademik.', '2026-10-30', 2],
      [1, 'Tugas 2: Implementasi Role-Based Access Control', 'Buat simulasi otorisasi multi-role (Mahasiswa, Dosen, Admin) dengan session management.', '2026-11-15', 2],
      [2, 'Praktikum 3: REST API & SQLite Backend', 'Kembangkan backend REST API CRUD mahasiswa dan autentikasi token.', '2026-10-28', 2]
    ];
    const stmtAssign = db.prepare(`INSERT INTO assignments (course_id, title, description, deadline, created_by) VALUES (?, ?, ?, ?, ?)`);
    assignments.forEach(a => stmtAssign.run(a));
    stmtAssign.finalize();

    // 5. Seed Submissions
    const submissions = [
      [1, 4, '/uploads/sample_analisis_dimas.pdf', 'analisis_owasp_dimas.pdf', 'Sudah melampirkan analisa lengkap beserta tabel mitigasi.', 88, 'Analisis komprehensif, pemahaman mitigasi sangat baik.', 2],
      [1, 5, '/uploads/sample_analisis_nabila.pdf', 'tugas1_nabila_keamanan.pdf', 'Mohon masukan untuk bagian skema otorisasi pak.', 95, 'Luar biasa! Penjelasan SQLi dan Stored XSS sangat detail.', 2]
    ];
    const stmtSub = db.prepare(`INSERT INTO submissions (assignment_id, student_id, file_path, file_name, notes, score, feedback, graded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    submissions.forEach(s => stmtSub.run(s));
    stmtSub.finalize();

    // 6. Seed Forum Threads
    const threads = [
      ['Pertanyaan terkait Praktikum SQL Injection vs Prepared Statements', 'Halo teman-teman dan Pak Dosen, bagaimana cara paling tepat menangani Dynamic Query pada aplikasi multi-role tanpa mengurangi fleksibilitas search?', 1, 4],
      ['Diskusi Persiapan Evaluasi Tengah Semester (UTS)', 'Bagi yang ingin diskusi bareng materi Keamanan Sistem Informasi bab 1-4, silakan tinggalkan komentar di bawah ya.', 1, 5]
    ];
    const stmtTh = db.prepare(`INSERT INTO forum_threads (title, content, course_id, author_id) VALUES (?, ?, ?, ?)`);
    threads.forEach(t => stmtTh.run(t));
    stmtTh.finalize();

    // 7. Seed Forum Replies
    const replies = [
      [1, 'Sangat disarankan memakai Parameterized Queries atau ORM seperti Sequelize/Prisma untuk mencegah string concatenation secara langsung.', 2],
      [2, 'Ayo kak, kita jadwalkan sesi belajar bareng hari Jumat malam di Discord!', 6]
    ];
    const stmtRep = db.prepare(`INSERT INTO forum_replies (thread_id, content, author_id) VALUES (?, ?, ?)`);
    replies.forEach(r => stmtRep.run(r));
    stmtRep.finalize();

    console.log('✅ Synthetic campus data seeded successfully!');
  });
});

// ==========================================
// FILE UPLOAD CONFIGURATION (Multer)
// ⚠️ VULNERABILITY #1: Unrestricted File Upload
// Intentionally no file extension filter or MIME verification!
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Preserve original extension or save directly
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Intentionally vulnerable: no limits, no fileFilter
const upload = multer({ storage: storage });

// Helper to get active user from cookie/session
function getAuthUser(req) {
  const userId = req.cookies.auth_user_id;
  if (!userId) return null;
  return new Promise((resolve) => {
    db.get('SELECT id, username, email, role, name, identifier, prodi, status FROM users WHERE id = ?', [userId], (err, row) => {
      resolve(row || null);
    });
  });
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// ⚠️ VULNERABILITY #2: Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / Brute Force)
// ⚠️ VULNERABILITY #3: SQL Injection on Login (Optional Bypass Payload)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan Password wajib diisi.' });
  }

  // ⚠️ SQL INJECTION VULNERABLE QUERY:
  // Concatenating user input directly into SQL statement!
  // Allows bypass with payload: ' OR '1'='1' -- 
  const rawQuery = `SELECT * FROM users WHERE (username = '${username}' OR email = '${username}') AND password = '${password}'`;

  db.get(rawQuery, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database Error: ' + err.message, queryExecuted: rawQuery });
    }

    if (!user) {
      return res.status(401).json({ error: 'Kredensial tidak valid. Akun tidak ditemukan atau sandi salah.' });
    }

    if (user.status !== 'Aktif') {
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh administrator.' });
    }

    // Set cookie session
    res.cookie('auth_user_id', user.id, { httpOnly: false, path: '/' });
    res.json({
      success: true,
      message: 'Login berhasil!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        identifier: user.identifier,
        prodi: user.prodi
      }
    });
  });
});

// Quick Switcher / One-Click Demo Login (very useful for grader testing)
app.post('/api/auth/switch', (req, res) => {
  const { userId } = req.body;
  db.get('SELECT id, username, email, role, name, identifier, prodi FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    res.cookie('auth_user_id', user.id, { httpOnly: false, path: '/' });
    res.json({ success: true, user });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_user_id');
  res.json({ success: true, message: 'Berhasil keluar.' });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Belum login.' });
  }
  res.json({ user });
});

// List all synthetic users for convenient login / testing
app.get('/api/auth/demo-users', (req, res) => {
  db.all('SELECT id, username, email, role, name, identifier, prodi, status, password FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users: rows });
  });
});

// ==========================================
// MAHASISWA ROUTES
// ==========================================

// ⚠️ VULNERABILITY #4: IDOR (Insecure Direct Object Reference)
// User can supply any student_id in query (?student_id=...) to inspect other students' grades!
app.get('/api/mahasiswa/grades', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  // If query parameter student_id is provided, use it without verifying ownership (IDOR vulnerability)
  const targetStudentId = req.query.student_id ? parseInt(req.query.student_id) : currentUser.id;

  const sql = `
    SELECT g.*, c.code as course_code, c.name as course_name, c.sks, c.semester, u.name as dosen_name
    FROM grades g
    JOIN courses c ON g.course_id = c.id
    JOIN users u ON c.dosen_id = u.id
    WHERE g.student_id = ?
  `;

  db.all(sql, [targetStudentId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    db.get('SELECT id, name, identifier, prodi FROM users WHERE id = ?', [targetStudentId], (err2, studentInfo) => {
      res.json({
        student: studentInfo,
        grades: rows,
        isIdorAccessed: currentUser.role === 'mahasiswa' && currentUser.id !== targetStudentId
      });
    });
  });
});

// View active courses and assignments
app.get('/api/mahasiswa/assignments', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const sql = `
    SELECT a.*, c.code as course_code, c.name as course_name, u.name as dosen_name,
           s.id as submission_id, s.file_path, s.file_name, s.score, s.feedback, s.submitted_at
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON a.created_by = u.id
    LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
    ORDER BY a.deadline ASC
  `;

  db.all(sql, [currentUser.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ assignments: rows });
  });
});

// Submit assignment with file upload
// ⚠️ VULNERABLE TO UNRESTRICTED FILE UPLOAD
app.post('/api/mahasiswa/submit', upload.single('file'), async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const { assignment_id, notes } = req.body;
  if (!assignment_id || !req.file) {
    return res.status(400).json({ error: 'Berkas tugas dan ID tugas wajib dilampirkan.' });
  }

  const filePath = '/uploads/' + req.file.filename;
  const fileName = req.file.originalname;

  // Check if submission already exists
  db.get('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?', [assignment_id, currentUser.id], (err, existing) => {
    if (existing) {
      db.run(
        'UPDATE submissions SET file_path = ?, file_name = ?, notes = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [filePath, fileName, notes, existing.id],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ success: true, message: 'Tugas berhasil diperbarui!', filePath, fileName });
        }
      );
    } else {
      db.run(
        'INSERT INTO submissions (assignment_id, student_id, file_path, file_name, notes) VALUES (?, ?, ?, ?, ?)',
        [assignment_id, currentUser.id, filePath, fileName, notes],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ success: true, message: 'Tugas berhasil diunggah!', id: this.lastID, filePath, fileName });
        }
      );
    }
  });
});

// ==========================================
// DOSEN ROUTES
// ==========================================

// Get list of submissions to be graded
app.get('/api/dosen/submissions', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser || (currentUser.role !== 'dosen' && currentUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Hanya dosen atau admin yang memiliki akses.' });
  }

  const sql = `
    SELECT s.*, a.title as assignment_title, c.code as course_code, c.name as course_name,
           u.name as student_name, u.identifier as student_nim, u.prodi as student_prodi
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON s.student_id = u.id
    WHERE ? = 'admin' OR c.dosen_id = ?
    ORDER BY s.submitted_at DESC
  `;

  db.all(sql, [currentUser.role, currentUser.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ submissions: rows });
  });
});

// Give grade and feedback to submission
app.post('/api/dosen/grade-submission', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser || (currentUser.role !== 'dosen' && currentUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Hanya dosen atau admin yang berhak menilai.' });
  }

  const { submission_id, score, feedback } = req.body;
  if (!submission_id || score === undefined) {
    return res.status(400).json({ error: 'ID submission dan nilai wajib diisi.' });
  }

  db.run(
    'UPDATE submissions SET score = ?, feedback = ?, graded_by = ? WHERE id = ?',
    [parseFloat(score), feedback, currentUser.id, submission_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Nilai tugas dan catatan evaluasi berhasil disimpan!' });
    }
  );
});

// Get enrolled students & their final grades for a course
app.get('/api/dosen/course-grades', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser || (currentUser.role !== 'dosen' && currentUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const courseId = req.query.course_id;
  let sql = `
    SELECT g.*, u.name as student_name, u.identifier as student_nim, u.prodi as student_prodi,
           c.name as course_name, c.code as course_code
    FROM grades g
    JOIN users u ON g.student_id = u.id
    JOIN courses c ON g.course_id = c.id
  `;

  const params = [];
  if (courseId) {
    sql += ' WHERE g.course_id = ?';
    params.push(courseId);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ grades: rows });
  });
});

// Update student course final grades (Tugas, UTS, UAS)
app.post('/api/dosen/update-grade', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser || (currentUser.role !== 'dosen' && currentUser.role !== 'admin')) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const { grade_id, tugas, uts, uas } = req.body;
  const numTugas = parseFloat(tugas) || 0;
  const numUts = parseFloat(uts) || 0;
  const numUas = parseFloat(uas) || 0;

  // Calculate weighted final score (30% tugas, 35% uts, 35% uas)
  const nilaiAkhir = Math.round(((numTugas * 0.3) + (numUts * 0.35) + (numUas * 0.35)) * 10) / 10;
  let letter = 'E';
  if (nilaiAkhir >= 85) letter = 'A';
  else if (nilaiAkhir >= 80) letter = 'A-';
  else if (nilaiAkhir >= 75) letter = 'B+';
  else if (nilaiAkhir >= 70) letter = 'B';
  else if (nilaiAkhir >= 65) letter = 'B-';
  else if (nilaiAkhir >= 60) letter = 'C+';
  else if (nilaiAkhir >= 55) letter = 'C';
  else if (nilaiAkhir >= 40) letter = 'D';

  db.run(
    `UPDATE grades SET tugas = ?, uts = ?, uas = ?, nilai_akhir = ?, grade_letter = ? WHERE id = ?`,
    [numTugas, numUts, numUas, nilaiAkhir, letter, grade_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Nilai akhir berhasil diperbarui!', nilaiAkhir, letter });
    }
  );
});

// ⚠️ VULNERABILITY #5: SQL INJECTION on Student & Grade Search!
// Allows SQLi payload: ' UNION SELECT id, username, password, email, role, null, null, null FROM users --
app.get('/api/search/students', (req, res) => {
  const keyword = req.query.q || '';

  // Intentionally vulnerable string concatenation:
  const rawQuery = `
    SELECT u.id, u.name, u.identifier, u.prodi, u.email, g.nilai_akhir, g.grade_letter, c.name as course_name
    FROM users u
    LEFT JOIN grades g ON u.id = g.student_id
    LEFT JOIN courses c ON g.course_id = c.id
    WHERE u.role = 'mahasiswa' AND (u.name LIKE '%${keyword}%' OR u.identifier LIKE '%${keyword}%')
  `;

  db.all(rawQuery, (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Database error: ' + err.message,
        executedQuery: rawQuery,
        hint: 'Kueri SQL dieksekusi langsung tanpa sanitasi/parameterized statement.'
      });
    }
    res.json({ results: rows, executedQuery: rawQuery });
  });
});

// ==========================================
// FORUM DISKUSI ROUTES
// ⚠️ VULNERABILITY #6: STORED XSS (Cross-Site Scripting)
// Inputs are stored directly without HTML entity encoding and delivered to frontend.
// ==========================================
app.get('/api/forum', (req, res) => {
  const sql = `
    SELECT t.*, u.name as author_name, u.role as author_role, u.identifier as author_identifier,
           c.name as course_name, c.code as course_code,
           (SELECT COUNT(*) FROM forum_replies r WHERE r.thread_id = t.id) as reply_count
    FROM forum_threads t
    JOIN users u ON t.author_id = u.id
    JOIN courses c ON t.course_id = c.id
    ORDER BY t.created_at DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ threads: rows });
  });
});

app.get('/api/forum/:id', (req, res) => {
  const threadId = req.params.id;

  const sqlThread = `
    SELECT t.*, u.name as author_name, u.role as author_role, u.identifier as author_identifier,
           c.name as course_name, c.code as course_code
    FROM forum_threads t
    JOIN users u ON t.author_id = u.id
    JOIN courses c ON t.course_id = c.id
    WHERE t.id = ?
  `;

  const sqlReplies = `
    SELECT r.*, u.name as author_name, u.role as author_role, u.identifier as author_identifier
    FROM forum_replies r
    JOIN users u ON r.author_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  `;

  db.get(sqlThread, [threadId], (err, thread) => {
    if (err || !thread) return res.status(404).json({ error: 'Thread tidak ditemukan.' });

    db.all(sqlReplies, [threadId], (err2, replies) => {
      res.json({ thread, replies: replies || [] });
    });
  });
});

// Post new discussion thread (Stored XSS vulnerable)
app.post('/api/forum', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const { title, content, course_id } = req.body;
  if (!title || !content || !course_id) {
    return res.status(400).json({ error: 'Judul, konten, dan mata kuliah wajib diisi.' });
  }

  // Raw content inserted into database
  db.run(
    'INSERT INTO forum_threads (title, content, course_id, author_id) VALUES (?, ?, ?, ?)',
    [title, content, course_id, currentUser.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID, message: 'Thread diskusi berhasil dibuat!' });
    }
  );
});

// Reply to forum thread (Stored XSS vulnerable)
app.post('/api/forum/:id/reply', async (req, res) => {
  const currentUser = await getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const threadId = req.params.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Komentar tidak boleh kosong.' });

  db.run(
    'INSERT INTO forum_replies (thread_id, content, author_id) VALUES (?, ?, ?)',
    [threadId, content, currentUser.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Komentar berhasil dipublikasikan!' });
    }
  );
});

// ==========================================
// ADMIN ROUTES (User Management CRUD)
// ==========================================

// Middleware check admin
async function requireAdmin(req, res, next) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses terbatas untuk Administrator.' });
  }
  next();
}

// Get all users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, name, identifier, prodi, status FROM users ORDER BY id ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users: rows });
  });
});

// Add new user
app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, email, password, role, name, identifier, prodi } = req.body;
  if (!username || !email || !password || !role || !name) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }

  db.run(
    'INSERT INTO users (username, email, password, role, name, identifier, prodi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [username, email, password, role, name, identifier || '-', prodi || '-', 'Aktif'],
    function (err) {
      if (err) return res.status(400).json({ error: 'Gagal menambah user: ' + err.message });
      res.json({ success: true, message: 'Akun pengguna berhasil ditambahkan!', id: this.lastID });
    }
  );
});

// Edit user
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { name, email, role, identifier, prodi, status, password } = req.body;
  const userId = req.params.id;

  let sql = 'UPDATE users SET name = ?, email = ?, role = ?, identifier = ?, prodi = ?, status = ?';
  const params = [name, email, role, identifier, prodi, status];

  if (password) {
    sql += ', password = ?';
    params.push(password);
  }

  sql += ' WHERE id = ?';
  params.push(userId);

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Data akun berhasil diperbarui!' });
  });
});

// Delete user
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Akun berhasil dihapus.' });
  });
});

// Admin stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total_users FROM users', (err, u) => {
      db.get('SELECT COUNT(*) as total_mhs FROM users WHERE role="mahasiswa"', (err2, m) => {
        db.get('SELECT COUNT(*) as total_dosen FROM users WHERE role="dosen"', (err3, d) => {
          db.get('SELECT COUNT(*) as total_submissions FROM submissions', (err4, s) => {
            db.get('SELECT COUNT(*) as total_threads FROM forum_threads', (err5, t) => {
              res.json({
                stats: {
                  users: u ? u.total_users : 0,
                  mahasiswa: m ? m.total_mhs : 0,
                  dosen: d ? d.total_dosen : 0,
                  submissions: s ? s.total_submissions : 0,
                  threads: t ? t.total_threads : 0
                }
              });
            });
          });
        });
      });
    });
  });
});

// Courses list
app.get('/api/courses', (req, res) => {
  db.all('SELECT c.*, u.name as dosen_name FROM courses c JOIN users u ON c.dosen_id = u.id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ courses: rows });
  });
});

// ==========================================
// SECURITY LAB / VULNERABILITY EXPLOIT GUIDE API
// Provides interactive PoC explanation for the college assignment
// ==========================================
app.get('/api/security-lab/vulnerabilities', (req, res) => {
  res.json({
    selectedVulnerabilities: [
      {
        id: 'sqli',
        name: 'SQL Injection (SQLi)',
        status: 'Active & Exploit Ready',
        severity: 'High / Critical',
        impactedEndpoints: [
          'POST /api/auth/login (Auth Bypass)',
          'GET /api/search/students?q= (Data Extraction)'
        ],
        description: 'Input parameter dievaluasi langsung ke dalam kueri SQL SQLite tanpa sanitasi atau parameterized binding.',
        pocStepByStep: [
          '1. Buka halaman Login Portal SIAKAD.',
          '2. Masukkan Username: `\' OR \'1\'=\'1\' --` dan Password sembarang.',
          '3. Klik tombol Masuk, kueri akan membypass autentikasi dan login ke akun pertama di database.',
          '4. Atau uji pada fitur Pencarian Mahasiswa: masukkan query `\' UNION SELECT id, username, password, email, role, null, null, null FROM users --` untuk mengekstrak seluruh data password pengguna lain.'
        ],
        mitigation: 'Gunakan Parameterized Queries (`db.all("SELECT ... WHERE user = ?", [user])`) atau ORM modern.'
      },
      {
        id: 'stored-xss',
        name: 'Stored Cross-Site Scripting (Stored XSS)',
        status: 'Active & Exploit Ready',
        severity: 'High',
        impactedEndpoints: [
          'POST /api/forum (Pembuatan Thread)',
          'POST /api/forum/:id/reply (Komentar Diskusi)'
        ],
        description: 'Teks postingan atau komentar forum disimpan secara mentah ke basis data dan dirender langsung ke DOM browser pengguna lain via innerHTML tanpa escaping HTML entities.',
        pocStepByStep: [
          '1. Masuk sebagai Mahasiswa (contoh: Dimas atau Nabila).',
          '2. Buka menu Forum Diskusi.',
          '3. Buat thread baru atau kirim komentar dengan payload: `<img src=x onerror="alert(\'Stored XSS Ditemukan! Cookie: \' + document.cookie)">` atau `<b style="color:red;font-size:20px;">[DEFACED XSS]</b>`.',
          '4. Simpan. Saat Dosen atau Mahasiswa lain membuka halaman diskusi, skrip JavaScript berbahaya langsung tereksekusi di browser mereka.'
        ],
        mitigation: 'Lakukan sanitasi input (DOMPurify) dan gunakan `textContent` / text escaping alih-alih `innerHTML` saat merender data ke antarmuka.'
      },
      {
        id: 'idor',
        name: 'IDOR / Kontrol Akses Lemah',
        status: 'Active & Exploit Ready',
        severity: 'Medium / High',
        impactedEndpoints: [
          'GET /api/mahasiswa/grades?student_id={id}',
          'GET /uploads/{filename}'
        ],
        description: 'Endpoint transkrip nilai mahasiswa tidak memvalidasi apakah student_id yang diminta sesuai dengan ID sesi mahasiswa yang sedang login.',
        pocStepByStep: [
          '1. Login sebagai Mahasiswa Dimas (ID: 4).',
          '2. Akses nilai Dimas di menu "Transkrip Nilai".',
          '3. Buka tab pengujian atau request API `/api/mahasiswa/grades?student_id=5` (ID milik Nabila Azzahra).',
          '4. Server mengembalikan seluruh rincian nilai tugas, UTS, UAS, dan IPK milik Nabila tanpa pembatasan hak akses.'
        ],
        mitigation: 'Implementasikan Server-Side Authorization: pastikan `targetStudentId === session.userId` atau periksa apakah user memiliki role Dosen/Admin.'
      },
      {
        id: 'file-upload',
        name: 'Validasi Berkas Lemah (Unrestricted File Upload)',
        status: 'Active & Exploit Ready',
        severity: 'High',
        impactedEndpoints: [
          'POST /api/mahasiswa/submit'
        ],
        description: 'Fitur pengumpulan tugas menerima semua ekstensi berkas (.html, .svg, .php, .js) tanpa whitelist ekstensi, tanpa validasi MIME type, dan dapat diakses langsung secara publik via URL.',
        pocStepByStep: [
          '1. Buat file `poc.html` berisi `<h1>Website Hacked via File Upload</h1><script>alert("XSS via File Upload")</script>`.',
          '2. Buka menu Tugas Mahasiswa, lalu unggah berkas `poc.html` tersebut.',
          '3. Buka tautan berkas di tab baru (/uploads/...). Skrip HTML/JS akan dieksekusi langsung dalam konteks domain portal kampus.'
        ],
        mitigation: 'Validasi MIME type berkas, gunakan ekstensi whitelist (.pdf, .docx, .zip), simpan berkas di luar public directory atau layani dengan header `Content-Disposition: attachment`.'
      },
      {
        id: 'no-rate-limit',
        name: 'Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / Brute Force)',
        status: 'Active & Exploit Ready',
        severity: 'Medium',
        impactedEndpoints: [
          'POST /api/auth/login'
        ],
        description: 'Tidak ada batasan jumlah percobaan login yang gagal (rate-limiting) atau captcha, sehingga penyerang dapat menjalankan wordlist automated attack secara leluasa.',
        pocStepByStep: [
          '1. Lakukan request berulang kali ke endpoint `/api/auth/login` dengan password salah.',
          '2. Server terus merespons tanpa penundaan (delay), tanpa lockout akun, dan tanpa captcha.'
        ],
        mitigation: 'Gunakan middleware `express-rate-limit`, implementasikan exponential backoff delay, serta proteksi captcha setelah 3x percobaan gagal.'
      }
    ]
  });
});

// Fallback to SPA index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Netlify/Serverless or start server locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏛️  PORTAL AKADEMIK UNIVERSITAS CAKRAWALA DIGITAL (SIAKAD)`);
    console.log(`🚀  Server berjalan di: http://localhost:${PORT}`);
    console.log(`🛡️  Security Lab & Intentional Vulnerabilities Active`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
