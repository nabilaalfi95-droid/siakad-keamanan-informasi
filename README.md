# 🏛️ SIAKAD UNIVERSITAS CAKRAWALA DIGITAL
### Proyek Praktikum Keamanan Sistem Informasi (Semester 5)

Aplikasi Web **Portal Kampus Fiktif (Sistem Informasi Akademik / SIAKAD)** yang dirancang untuk simulasi manajemen akademik sekaligus **Laboratorium Kerentanan Keamanan Web (Web Application Security Lab)** berdasarkan standar OWASP Top 10.

---

## 📋 Ikhtisar & Pemenuhan Kebutuhan Tugas

| Kebutuhan Tugas | Implementasi dalam Aplikasi | Status |
| :--- | :--- | :---: |
| **Mahasiswa** | Masuk akun, melihat Kartu Hasil Studi (KHS) & IPK, mengunggah berkas tugas kuliah, berdiskusi di forum akademik | ✅ Terpenuhi |
| **Dosen** | Masuk akun, mereview dan memberi nilai berkas tugas mahasiswa, merekap nilai akhir perkuliahan (Tugas, UTS, UAS), berpartisipasi di forum | ✅ Terpenuhi |
| **Admin** | Masuk akun, mengelola seluruh pengguna (CRUD: Tambah akun baru, Edit data, Hapus akun, Atur status Aktif/Nonaktif, Reset kata sandi) | ✅ Terpenuhi |
| **Data Sintetis** | Seluruh data akun (NIM, NIDN, NIP, Nama, Email, Mata Kuliah, Nilai) bersifat sintetis, unik, dan tidak ada yang sama | ✅ Terpenuhi |
| **Minimal 2 Kerentanan Sengaja** | Disediakan **5 kerentanan sengaja** (SQLi, Stored XSS, IDOR, Unrestricted File Upload, No Rate Limiting) lengkap dengan panduan PoC interaktif | ✅ Terpenuhi |

---

## 👥 Daftar Akun Pengguna Sintetis

Aplikasi dilengkapi tombol **Quick Switcher Role** di bagian atas layar untuk mempermudah pengujian evaluator/dosen. Kredensial manual juga dapat digunakan:

| Peran (Role) | Nama Lengkap | NIM / NIDN / NIP | Username / Email | Kata Sandi | Program Studi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrator** | M. Fadli Azizi, M.Kom | ADM-001 | `admin` / `admin@cakrawala.ac.id` | `Admin2024!` | Biro Sistem Informasi |
| **Dosen** | Dr. Ir. Budi Santoso, M.T. | 0412038501 | `budi.santoso` / `budi.santoso@cakrawala.ac.id` | `Dosen2024!` | Teknik Informatika |
| **Dosen** | Siti Aminah, S.Kom., M.Cs. | 0415088802 | `siti.aminah` / `siti.aminah@cakrawala.ac.id` | `Dosen2024!` | Sistem Informasi |
| **Mahasiswa** | Dimas Pratama | 220101001 | `dimas.pratama` / `dimas.pratama@mhs.cakrawala.ac.id` | `Mhs2024!` | Teknik Informatika |
| **Mahasiswa** | Nabila Azzahra Putri | 220101002 | `nabila.azzahra` / `nabila.azzahra@mhs.cakrawala.ac.id` | `Mhs2024!` | Teknik Informatika |
| **Mahasiswa** | Reza Firmansyah | 220101003 | `reza.firmansyah` / `reza.firmansyah@mhs.cakrawala.ac.id` | `Mhs2024!` | Sistem Informasi |

---

## 🎯 Kerentanan Keamanan yang Dibuat Secara Sengaja

Untuk menjawab formulir Google Form, **centang minimal 2 opsi berikut** (disarankan mencentang opsi 1 dan 2):

### 1. SQL Injection (SQLi) `[Direkomendasikan dicentang]`
- **Titik Kerentanan:**
  - Login Authentication Bypass: `POST /api/auth/login`
  - Pencarian Nilai & Mahasiswa: `GET /api/search/students?q=`
- **Penyebab:** String input pengguna digabungkan langsung (*string concatenation*) ke dalam kueri SQL SQLite tanpa parameter binding / prepared statement.
- **Langkah-langkah PoC (Proof of Concept):**
  1. Buka halaman Login SIAKAD.
  2. Masukkan Username: `' OR '1'='1' --` dan Password: `apa_saja`.
  3. Klik tombol **Masuk**. Sistem langsung berhasil membypass pengecekan password dan masuk sebagai akun pengguna pertama.
  4. Pada akun Dosen, buka tab **SQLi Lab**, masukkan payload:
     `' UNION SELECT id, username, password, email, role, null, null, null FROM users --`
  5. Seluruh data sensitif password pengguna di database akan terekstrak ke tabel hasil pencarian.
- **Rekomendasi Mitigasi:** Gunakan Parameterized Query (`db.all('SELECT * FROM users WHERE username = ?', [username])`) atau ORM modern.

---

### 2. Stored Cross-Site Scripting (Stored XSS) `[Direkomendasikan dicentang]`
- **Titik Kerentanan:**
  - Forum Diskusi Akademik: `POST /api/forum` dan `POST /api/forum/:id/reply`
- **Penyebab:** Konten pertanyaan dan balasan komentar disimpan secara mentah (*raw*) ke dalam database SQLite dan dirender langsung ke browser pengguna lain menggunakan `innerHTML` tanpa encoding karakter khusus HTML (*HTML entity escaping*).
- **Langkah-langkah PoC (Proof of Concept):**
  1. Masuk sebagai Mahasiswa (Dimas atau Nabila).
  2. Buka menu **Forum Diskusi**, lalu klik **Buat Topik Diskusi**.
  3. Pada kolom isi konten, masukkan payload:
     ```html
     <img src=x onerror="alert('Stored XSS Berhasil Ditemukan! Cookie Sesi: ' + document.cookie)">
     <b style="color:red; font-size:20px;">[DEFACED XSS: Forum Berhasil Disusupi]</b>
     ```
  4. Simpan/Terbitkan.
  5. Saat Dosen atau Mahasiswa lain membuka topik diskusi tersebut, skrip JavaScript secara otomatis tereksekusi di browser mereka.
- **Rekomendasi Mitigasi:** Terapkan sanitasi input (misal `DOMPurify`) dan gunakan `textContent` atau sanitasi template engine alih-alih `innerHTML`.

---

### 3. IDOR / Kontrol Akses Lemah (Insecure Direct Object Reference)
- **Titik Kerentanan:**
  - Endpoint KHS Mahasiswa: `GET /api/mahasiswa/grades?student_id={id}`
- **Penyebab:** Server tidak memvalidasi apakah `student_id` yang diminta pada query string sesuai dengan ID pengguna yang sedang login.
- **Langkah-langkah PoC:**
  1. Login sebagai Mahasiswa Dimas (ID: 4).
  2. Masuk ke halaman **KHS & Nilai**.
  3. Klik tombol pengujian IDOR pada antarmuka (atau panggil URL `/api/mahasiswa/grades?student_id=5`).
  4. Anda dapat melihat transkrip nilai lengkap milik Nabila Azzahra Putri (ID: 5) tanpa batas otorisasi.
- **Rekomendasi Mitigasi:** Validasi otorisasi server-side (`if (req.user.id !== targetId && req.user.role !== 'dosen') return res.status(403)`).

---

### 4. Validasi Berkas Lemah (Unrestricted File Upload)
- **Titik Kerentanan:**
  - Pengunggahan Berkas Tugas: `POST /api/mahasiswa/submit`
- **Penyebab:** Middleware unggah berkas (Multer) tidak memiliki filter ekstensi (*extension whitelist*) maupun verifikasi MIME type, dan berkas disimpan di direktori publik `/uploads/`.
- **Langkah-langkah PoC:**
  1. Buat berkas `exploit.html` berisi skrip:
     ```html
     <h1>Hacked via File Upload</h1>
     <script>alert('Payload file upload berhasil tereksekusi!');</script>
     ```
  2. Buka menu **Tugas Kuliah**, klik **Unggah Jawaban Tugas**, dan pilih berkas `exploit.html`.
  3. Buka tautan berkas yang berhasil diunggah (`/uploads/...exploit.html`). Browser akan mengeksekusi berkas tersebut dalam konteks domain kampus.
- **Rekomendasi Mitigasi:** Terapkan whitelist ekstensi berkas (`.pdf`, `.docx`, `.zip`), periksa magic number berkas, dan sajikan berkas dengan header `Content-Disposition: attachment`.

---

### 5. Percobaan Sandi Tanpa Pembatasan (No Rate Limiting / Brute Force)
- **Titik Kerentanan:**
  - Endpoint Autentikasi: `POST /api/auth/login`
- **Penyebab:** Tidak ada mekanisme pembatasan frekuensi percobaan (*rate limiting*), penundaan (*exponential delay*), maupun captcha.
- **Langkah-langkah PoC:**
  1. Penyerang dapat mengirimkan ribuan request login dengan kamus kata sandi secara berulang tanpa mengalami pemblokiran IP atau penguncian akun.
- **Rekomendasi Mitigasi:** Gunakan middleware `express-rate-limit` dan terapkan account lockout setelah 5x percobaan gagal berturut-turut.

---

## 🛠️ Panduan Instalasi & Menjalankan Lokal

Pastikan Anda telah menginstal **Node.js** (v18 ke atas disarankan).

1. **Buka Terminal / Command Prompt di folder proyek:**
   ```bash
   cd "e:\KULIAH NABILA\KULIAH SMT5\KEAMANAN SISTEM INFORMASI\PROJECT\07"
   ```

2. **Instal Dependensi:**
   ```bash
   npm install
   ```

3. **Jalankan Aplikasi:**
   ```bash
   npm start
   ```

4. **Akses di Browser:**
   Buka alamat berikut di browser:
   ```
   http://localhost:3000
   ```

---

## 🌐 Panduan Upload ke GitHub & Deployment URL

Untuk mengisi formulir tugas:
1. **Link repo Github untuk (publik akses):**
   - Buat repositori baru di GitHub (misal: `siakad-cakrawala-security`). Pastikan visibilitas diatur ke **Public**.
   - Jalankan perintah berikut di folder proyek:
     ```bash
     git init
     git add .
     git commit -m "feat: complete academic portal with intentional security vulnerabilities"
     git branch -M main
     git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO.git
     git push -u origin main
     ```
   - Salin URL repositori publik tersebut ke formulir Google Form.

2. **Link URL (Hosting Online):**
   - Aplikasi ini 100% siap di-deploy secara gratis di platform seperti **Render**, **Railway**, atau **Glitch**:
     - **Render.com:**
       1. Buat akun di [Render.com](https://render.com)
       2. Klik **New +** -> **Web Service** -> Hubungkan repositori GitHub Anda.
       3. Build Command: `npm install`
       4. Start Command: `npm start`
       5. Salin tautan domain yang diberikan (contoh: `https://siakad-cakrawala.onrender.com`).
     - Atau jika diizinkan untuk evaluasi lokal / ngrok: jalankan `npx localtunnel --port 3000` atau `ngrok http 3000`.

3. **Pilihan Kerentanan pada Google Form:**
   Centang opsi berikut pada Google Form:
   - ☑️ **SQL injection**
   - ☑️ **Stored XSS**
   - *(Opsional jika ingin mencentang lebih: IDOR / kontrol akses lemah, Validasi berkas lemah, Percobaan sandi tanpa pembatasan)*
