/**
 * SIPADES — Backend Google Apps Script
 * -------------------------------------
 * Cara pasang:
 * 1. Buat Google Sheet baru (kosong), beri nama mis. "Data PBJ Desa".
 * 2. Menu Extensions/Ekstensi > Apps Script.
 * 3. Hapus isi default, tempel seluruh isi file ini.
 * 4. Klik Deploy > New deployment > pilih tipe "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Klik Deploy, izinkan akses saat diminta.
 * 6. Salin URL Web App yang muncul (diakhiri /exec).
 * 7. Tempel URL itu ke file src/config.js pada project React.
 *
 * Semua data kegiatan disimpan sebagai satu baris per kegiatan pada
 * sheet "Kegiatan" (dibuat otomatis), kolom: id, data (JSON), updatedAt.
 */

function doGet(e) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      try { list.push(JSON.parse(rows[i][1])); } catch (err) { /* lewati baris rusak */ }
    }
  }
  return jsonOutput({ ok: true, data: list });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getSheet();

    if (payload.action === "saveAll") {
      sheet.clearContents();
      sheet.appendRow(["id", "data", "updatedAt"]);
      const now = new Date().toISOString();
      payload.list.forEach((k) => {
        sheet.appendRow([k.id, JSON.stringify(k), now]);
      });
      return jsonOutput({ ok: true });
    }

    return jsonOutput({ ok: false, error: "Aksi tidak dikenali" });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Kegiatan");
  if (!sheet) {
    sheet = ss.insertSheet("Kegiatan");
    sheet.appendRow(["id", "data", "updatedAt"]);
  }
  return sheet;
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
