# SIPADES — Sistem Pengadaan Barang/Jasa Desa

Aplikasi web untuk mengelola alur kerja PBJ Desa dari perencanaan sampai
serah terima, dengan peran Kepala Desa, Kaur/Kasi (PKA), TPK, dan Pengawas.

## Dasar Hukum

- Perpres No. 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah,
  sebagaimana diubah dengan Perpres No. 12 Tahun 2021 dan Perpres No. 12
  Tahun 2023.
- Peraturan LKPP No. 12 Tahun 2019 tentang Pedoman Pengadaan Barang/Jasa
  di Desa.
- Permendagri No. 20 Tahun 2018 tentang Pengelolaan Keuangan Desa.
- Keputusan Deputi I LKPP No. 2 Tahun 2024 (petunjuk teknis PBJ Desa).
- Keputusan Deputi I LKPP No. 1 Tahun 2025 (pembaruan petunjuk teknis
  PBJ Desa).
- Peraturan Bupati/Wali Kota setempat mengenai ambang batas nilai dan
  tata cara teknis PBJ Desa di wilayah masing-masing.

**Catatan penting**: ambang batas nilai (mis. batas Pembelian Langsung
vs Permintaan Penawaran), format dokumen resmi, dan kewenangan teknis
berbeda antar kabupaten/kota karena diatur lebih lanjut melalui
Perbup/Perwali. Sesuaikan pilihan pada modul "Pelaksanaan" dengan
peraturan daerah Saudara sebelum digunakan secara operasional. Aplikasi
ini adalah alat bantu administrasi, bukan pengganti kajian hukum atau
opini LKPP/APIP setempat.

## Fitur

- **Perencanaan**: RKP Desa, RUP Desa, pagu, sumber dana, metode.
- **Persiapan**: penetapan TPK, HPS, spesifikasi teknis, jadwal,
  pengesahan Kepala Desa.
- **Pelaksanaan**: jalur Swakelola (rencana tenaga kerja/material,
  realisasi) atau jalur Penyedia (metode pengadaan, penawaran,
  negosiasi, SPK).
- **Pembayaran**: termin pembayaran dengan status lunas/belum.
- **Serah Terima**: BAST dan pengesahan akhir oleh Kepala Desa.
- **Pengawasan**: catatan lintas peran di setiap kegiatan.
- **Referensi regulasi** bawaan di dalam aplikasi.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Build untuk produksi

```bash
npm run build
npm run preview   # opsional, untuk mencoba hasil build
```

Hasil build ada di folder `dist/` — unggah ke hosting statis apa pun
(Netlify, Vercel, atau server desa/kecamatan).

## Penyimpanan data — Google Sheets (bawaan)

Versi ini sudah tersambung ke **Google Sheets** lewat Google Apps
Script sebagai backend gratis, sehingga Kepala Desa, Kaur/Kasi, TPK,
dan Pengawas bisa melihat data yang sama walau membuka dari perangkat
berbeda.

### Cara memasang (sekali saja)

1. Buka [sheets.google.com](https://sheets.google.com), buat spreadsheet
   baru, beri nama mis. **"Data PBJ Desa"**.
2. Menu **Extensions/Ekstensi → Apps Script**.
3. Hapus isi editor bawaan, tempel seluruh isi file
   `google-apps-script/Code.gs` yang ada di paket ini.
4. Klik **Deploy → New deployment**, pilih tipe **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy**, izinkan akses ketika diminta oleh Google.
6. Salin URL yang muncul (diakhiri `/exec`).
7. Buka `src/config.js`, tempel URL tersebut:
   ```js
   export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCSgvqyR2nptfWIuIr11iiHnBf4ERURJqI8cJ-M2-b6-6GWG9iyY-EuC2CvYob97q1/exec";
   ```
8. Jalankan ulang `npm run dev` (atau build ulang bila sudah dideploy).

Setelah ini, setiap perubahan otomatis tersimpan ke Google Sheets
(dengan jeda ±0.8 detik agar tidak mengirim setiap ketikan huruf).
Klik ikon refresh di pojok kanan atas header untuk mengambil
perubahan terbaru yang dibuat pengguna lain — data tidak diperbarui
otomatis secara real-time, jadi biasakan klik refresh saat mulai
bekerja.

Status sambungan terlihat di header:
- **Belum tersambung** — `SCRIPT_URL` masih kosong di `src/config.js`.
- **Menyinkronkan…** — sedang mengirim/mengambil data.
- **Tersinkron ke Google Sheets** — data terbaru sudah tersimpan.
- **Gagal menyinkron** — periksa URL, koneksi internet, atau
  pengaturan akses Web App (harus "Anyone").

### Catatan keamanan

Karena akses Web App diset "Anyone", siapa pun yang memegang URL
tersebut bisa membaca/menulis data. Jangan sebarkan URL Apps Script
di luar lingkup pengurus desa yang berwenang. Untuk keamanan lebih
ketat, tambahkan token rahasia sederhana yang diperiksa di dalam
`Code.gs` sebelum memproses `doGet`/`doPost`.

### Alternatif lain

Bila ke depan volume data/pengguna bertambah, `persist`/`loadFromSheet`
pada `src/App.jsx` bisa diarahkan ke backend lain (Supabase, Firebase,
atau REST API sendiri) tanpa mengubah struktur data, karena setiap
kegiatan sudah berbentuk objek JSON datar.

## Struktur proyek

```
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx        # seluruh logika & tampilan aplikasi
```
