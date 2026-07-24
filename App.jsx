import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, ClipboardList, FileText, Users, ShoppingCart,
  Wallet, Stamp, Eye, Plus, X, ChevronRight, ChevronDown, BookOpen,
  ShieldCheck, AlertCircle, CheckCircle2, Circle, Clock, Trash2, RefreshCw,
} from "lucide-react";
import { SCRIPT_URL } from "./config.js";

/* ------------------------------------------------------------------
   PBJ DESA — Sistem Pengadaan Barang/Jasa Desa
   Dasar hukum: Perpres 16/2018 jo. 12/2021 jo. 12/2023, Perlem LKPP
   12/2019, Permendagri 20/2018, Kepdep I LKPP No.2/2024, Kepdep I
   LKPP No.1/2025, serta Perbup/Perwali setempat.
------------------------------------------------------------------- */

const ROLES = [
  { id: "kades", label: "Kepala Desa", desc: "Penetapan & pengesahan" },
  { id: "pka", label: "Kaur / Kasi (PKA)", desc: "Pelaksana Kegiatan Anggaran" },
  { id: "tpk", label: "TPK", desc: "Tim Pelaksana Kegiatan" },
  { id: "pengawas", label: "Pengawas", desc: "BPD / Pendamping Desa" },
];

const STAGES = [
  { key: "perencanaan", no: "01", label: "Perencanaan", icon: ClipboardList },
  { key: "persiapan", no: "02", label: "Persiapan", icon: FileText },
  { key: "pelaksanaan", no: "03", label: "Pelaksanaan", icon: ShoppingCart },
  { key: "pembayaran", no: "04", label: "Pembayaran", icon: Wallet },
  { key: "serahterima", no: "05", label: "Serah Terima", icon: Stamp },
];

const SUMBER_DANA = ["Dana Desa", "ADD", "PADesa", "Bankeu Provinsi", "Bankeu Kabupaten/Kota", "Lainnya"];
const BIDANG = ["Penyelenggaraan Pemerintahan Desa", "Pelaksanaan Pembangunan Desa", "Pembinaan Kemasyarakatan", "Pemberdayaan Masyarakat", "Penanggulangan Bencana/Mendesak"];
const METODE_PENYEDIA = ["Pembelian Langsung", "Permintaan Penawaran", "Penunjukan Langsung"];

// permission matrix: which role can edit which stage's core data
const CAN_EDIT = {
  perencanaan: ["kades", "pka"],
  persiapan: ["pka", "tpk"],
  pelaksanaan: ["tpk"],
  pembayaran: ["pka"],
  serahterima: ["kades", "pka"],
};
const CAN_APPROVE = ["kades"];

const REGS = [
  { s: "Perpres 16/2018 jo. 12/2021 jo. 12/2023", d: "Kerangka umum Pengadaan Barang/Jasa Pemerintah — rujukan pokok yang diturunkan Perlem LKPP 12/2019 untuk desa." },
  { s: "Peraturan LKPP No. 12 Tahun 2019", d: "Pedoman Pengadaan Barang/Jasa di Desa: swakelola, pengadaan melalui penyedia, TPK, dan tata cara pembelian/penawaran." },
  { s: "Permendagri No. 20 Tahun 2018", d: "Pengelolaan Keuangan Desa — dasar RAB, mekanisme pencairan, dan peran Kaur/Kasi selaku PKA." },
  { s: "Kepdep I LKPP No. 2 Tahun 2024", d: "Petunjuk teknis pelaksanaan pengadaan barang/jasa di desa yang memutakhirkan ambang batas & tata cara Perlem 12/2019." },
  { s: "Kepdep I LKPP No. 1 Tahun 2025", d: "Pembaruan lanjutan petunjuk teknis PBJ Desa, termasuk penyesuaian format dokumen dan pelaporan." },
  { s: "Peraturan Bupati/Wali Kota setempat", d: "Mengatur ambang batas nilai, format dokumen, dan kewenangan teknis PBJ Desa di wilayah kabupaten/kota masing-masing." },
];

function currency(n) {
  const v = Number(n || 0);
  return "Rp " + v.toLocaleString("id-ID");
}
function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { return new Date().toISOString().slice(0, 10); }

const emptyKegiatan = () => ({
  id: uid(),
  nama: "",
  bidang: BIDANG[1],
  tahunAnggaran: new Date().getFullYear(),
  sumberDana: SUMBER_DANA[0],
  pagu: "",
  metodePelaksanaan: "Swakelola",
  tahapSaatIni: 0,
  createdAt: today(),
  perencanaan: { masukRKPDesa: false, masukRUP: false, tanggalRUP: "", keterangan: "" },
  persiapan: { tpk: [], spesifikasi: "", hps: "", jadwalMulai: "", jadwalSelesai: "", disahkanKades: false },
  pelaksanaan: {
    swakelola: { rencanaTenagaKerja: "", rencanaMaterial: "", realisasi: "", catatan: "" },
    penyedia: { metodePengadaan: METODE_PENYEDIA[0], namaPenyedia: "", npwp: "", nilaiPenawaran: "", hasilNegosiasi: "", spkNomor: "", spkTanggal: "", spkNilai: "", masaKerja: "" },
  },
  pembayaran: { termin: [] },
  serahTerima: { bastNomor: "", bastTanggal: "", catatanAkhir: "", statusAkhir: "Belum Selesai" },
  pengawasan: [],
});

function SyncBadge({ status }) {
  const map = {
    unconfigured: { text: "Belum tersambung ke Google Sheets", cls: "text-[#F3DED8]" },
    idle: { text: "", cls: "" },
    saving: { text: "Menyinkronkan…", cls: "text-[#F3E6C8]" },
    saved: { text: "Tersinkron ke Google Sheets", cls: "text-[#DEEAE1]" },
    error: { text: "Gagal menyinkron — periksa koneksi", cls: "text-[#F3DED8]" },
  };
  const s = map[status] || map.idle;
  if (!s.text) return null;
  return <span className={`text-[11px] hidden sm:inline ${s.cls}`}>{s.text}</span>;
}

function StatusPill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-[#EDEAE1] text-[#5B6570]",
    gold: "bg-[#F3E6C8] text-[#8A6115]",
    forest: "bg-[#DEEAE1] text-[#2C5A41]",
    clay: "bg-[#F3DED8] text-[#9C4127]",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${tones[tone]}`}>{children}</span>;
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5B6570] mb-1">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full rounded-md border border-[#D8D2C4] bg-white px-3 py-2 text-sm text-[#16324F] focus:outline-none focus:ring-2 focus:ring-[#B8863B]/50 focus:border-[#B8863B] disabled:bg-[#F1EFE8] disabled:text-[#8B8578]";

export default function PBJDesaApp() {
  const [role, setRole] = useState("kades");
  const [kegiatanList, setKegiatanList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | detail | regulasi
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState(SCRIPT_URL ? "idle" : "unconfigured"); // idle | saving | saved | error | unconfigured
  const saveTimer = useRef(null);

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadFromSheet = useCallback(async () => {
    if (!SCRIPT_URL) { setLoading(false); return; }
    try {
      setSyncStatus("saving");
      const res = await fetch(SCRIPT_URL);
      const json = await res.json();
      if (json.ok) setKegiatanList(json.data || []);
      setSyncStatus("saved");
    } catch (e) {
      console.error("Gagal memuat dari Google Sheets:", e);
      setSyncStatus("error");
    }
    setLoading(false);
  }, []);

  // Simpan ke Google Sheets, dengan debounce agar tidak mengirim
  // request di setiap ketikan huruf.
  const persist = useCallback((list) => {
    if (!SCRIPT_URL) { setSyncStatus("unconfigured"); return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari CORS preflight di Apps Script
          body: JSON.stringify({ action: "saveAll", list }),
        });
        setSyncStatus("saved");
      } catch (e) {
        console.error("Gagal menyimpan ke Google Sheets:", e);
        setSyncStatus("error");
      }
    }, 800);
  }, []);

  useEffect(() => { loadFromSheet(); }, [loadFromSheet]);

  const updateList = (updater) => {
    setKegiatanList((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  };

  const addKegiatan = (data) => {
    updateList((prev) => [...prev, data]);
    notify("Kegiatan baru ditambahkan ke Rencana Pengadaan.");
  };
  const deleteKegiatan = (id) => {
    updateList((prev) => prev.filter((k) => k.id !== id));
    setView("dashboard"); setSelectedId(null);
    notify("Kegiatan dihapus.");
  };
  const patchKegiatan = (id, patch) => {
    updateList((prev) => prev.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  };

  const selected = kegiatanList.find((k) => k.id === selectedId) || null;
  const canEdit = (stage) => CAN_EDIT[stage]?.includes(role);
  const canApprove = CAN_APPROVE.includes(role);

  const totals = kegiatanList.reduce(
    (acc, k) => {
      acc.pagu += Number(k.pagu || 0);
      acc.byStage[k.tahapSaatIni] = (acc.byStage[k.tahapSaatIni] || 0) + 1;
      return acc;
    },
    { pagu: 0, byStage: {} }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F3EC] font-[Inter]">
        <div className="text-[#5B6570] text-sm">Memuat data pengadaan desa…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16324F]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        .font-display { font-family: 'Source Serif 4', Georgia, serif; }
        .font-mono-tab { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#16324F] text-[#F6F3EC] px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-[#B8863B] flex items-center justify-center font-display text-[#B8863B] text-sm">PD</div>
          <div>
            <div className="font-display text-lg leading-tight">SIPADES</div>
            <div className="text-[10px] uppercase tracking-widest text-[#B8863B]">Sistem Pengadaan Barang/Jasa Desa</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SyncBadge status={syncStatus} />
          <button onClick={loadFromSheet} title="Sinkronkan dari Google Sheets" className="p-1.5 rounded-md hover:bg-white/10">
            <RefreshCw size={15} />
          </button>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-[#0F2438] border border-[#2C4A66] text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#B8863B]/60"
          >
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar nav */}
        <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#E1DCCC] bg-[#F6F3EC] min-h-[calc(100vh-57px)] py-6 px-3 gap-1">
          <button onClick={() => { setView("dashboard"); setSelectedId(null); }}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${view === "dashboard" ? "bg-[#16324F] text-white" : "text-[#3A4652] hover:bg-[#EDEAE1]"}`}>
            <LayoutDashboard size={16} /> Dasbor
          </button>
          <button onClick={() => setView("regulasi")}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${view === "regulasi" ? "bg-[#16324F] text-white" : "text-[#3A4652] hover:bg-[#EDEAE1]"}`}>
            <BookOpen size={16} /> Dasar Hukum
          </button>
          <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#8B8578]">Kegiatan</div>
          <div className="overflow-y-auto max-h-[50vh] flex flex-col gap-0.5">
            {kegiatanList.map((k) => (
              <button key={k.id} onClick={() => { setSelectedId(k.id); setView("detail"); }}
                className={`text-left rounded-md px-3 py-2 text-xs ${selectedId === k.id && view === "detail" ? "bg-[#EFE3C4] text-[#16324F] font-semibold" : "text-[#5B6570] hover:bg-[#EDEAE1]"}`}>
                {k.nama || "(tanpa nama)"}
              </button>
            ))}
            {kegiatanList.length === 0 && <div className="px-3 text-xs text-[#8B8578] italic">Belum ada kegiatan</div>}
          </div>
          <button onClick={() => setShowNew(true)} className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[#8A6115] hover:bg-[#F3E6C8]">
            <Plus size={16} /> Kegiatan Baru
          </button>
        </nav>

        {/* Main content */}
        <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl">
          {view === "dashboard" && (
            <Dashboard kegiatanList={kegiatanList} totals={totals} onOpen={(id) => { setSelectedId(id); setView("detail"); }} role={role} onNew={() => setShowNew(true)} />
          )}
          {view === "regulasi" && <Regulasi />}
          {view === "detail" && selected && (
            <KegiatanDetail
              k={selected}
              role={role}
              canEdit={canEdit}
              canApprove={canApprove}
              onPatch={(patch) => patchKegiatan(selected.id, patch)}
              onDelete={() => deleteKegiatan(selected.id)}
              notify={notify}
            />
          )}
        </main>
      </div>

      {showNew && <NewKegiatanModal onClose={() => setShowNew(false)} onCreate={(data) => { addKegiatan(data); setShowNew(false); }} />}

      {toast && (
        <div className="fixed bottom-5 right-5 bg-[#16324F] text-white text-sm px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 size={16} className="text-[#B8863B]" /> {toast}
        </div>
      )}

      <p className="text-center text-[10px] text-[#8B8578] pb-4">
        {SCRIPT_URL
          ? "Data disinkronkan ke Google Sheets — klik ikon refresh di kanan atas untuk mengambil perubahan dari pengguna lain."
          : "Belum tersambung ke Google Sheets. Lengkapi SCRIPT_URL pada src/config.js sesuai README untuk mengaktifkan sinkronisasi bersama."}
      </p>
    </div>
  );
}

function Dashboard({ kegiatanList, totals, onOpen, role, onNew }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl">Dasbor Pengadaan</h1>
          <p className="text-sm text-[#5B6570]">Ringkasan seluruh kegiatan PBJ Desa tahun berjalan.</p>
        </div>
        <button onClick={onNew} className="hidden md:flex items-center gap-1.5 bg-[#16324F] text-white text-sm px-3.5 py-2 rounded-md hover:bg-[#0F2438]">
          <Plus size={15} /> Kegiatan Baru
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <SummaryCard label="Total Kegiatan" value={kegiatanList.length} />
        <SummaryCard label="Total Pagu" value={currency(totals.pagu)} mono />
        <SummaryCard label="Selesai" value={kegiatanList.filter((k) => k.tahapSaatIni >= 5).length} tone="forest" />
        <SummaryCard label="Berjalan" value={kegiatanList.filter((k) => k.tahapSaatIni < 5).length} tone="gold" />
      </div>

      <div className="bg-white rounded-lg border border-[#E1DCCC] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1EFE8] text-left text-xs uppercase tracking-wide text-[#5B6570]">
              <th className="px-4 py-2.5 font-semibold">Kegiatan</th>
              <th className="px-4 py-2.5 font-semibold">Metode</th>
              <th className="px-4 py-2.5 font-semibold">Pagu</th>
              <th className="px-4 py-2.5 font-semibold">Tahap</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {kegiatanList.map((k) => (
              <tr key={k.id} className="border-t border-[#EDEAE1] hover:bg-[#FAF8F3] cursor-pointer" onClick={() => onOpen(k.id)}>
                <td className="px-4 py-3">
                  <div className="font-medium">{k.nama || "(tanpa nama)"}</div>
                  <div className="text-xs text-[#8B8578]">{k.bidang}</div>
                </td>
                <td className="px-4 py-3 text-[#5B6570]">{k.metodePelaksanaan}</td>
                <td className="px-4 py-3 font-mono-tab">{currency(k.pagu)}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={k.tahapSaatIni >= 5 ? "forest" : "gold"}>
                    {k.tahapSaatIni >= 5 ? "Selesai" : `${STAGES[k.tahapSaatIni]?.no} ${STAGES[k.tahapSaatIni]?.label}`}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-right"><ChevronRight size={16} className="text-[#8B8578] inline" /></td>
              </tr>
            ))}
            {kegiatanList.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[#8B8578] text-sm">
                Belum ada kegiatan. Mulai dengan menambahkan Rencana Umum Pengadaan (RUP) Desa.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone, mono }) {
  const tones = { forest: "text-[#2C5A41]", gold: "text-[#8A6115]", default: "text-[#16324F]" };
  return (
    <div className="bg-white rounded-lg border border-[#E1DCCC] px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-wide text-[#8B8578] font-semibold mb-1">{label}</div>
      <div className={`text-xl font-display ${tones[tone] || tones.default} ${mono ? "font-mono-tab text-lg" : ""}`}>{value}</div>
    </div>
  );
}

function Regulasi() {
  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Dasar Hukum</h1>
      <p className="text-sm text-[#5B6570] mb-6">Kerangka regulasi yang menjadi rujukan alur kerja aplikasi ini.</p>
      <div className="space-y-3">
        {REGS.map((r, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#E1DCCC] px-4 py-3.5 flex gap-3">
            <div className="font-mono-tab text-[#B8863B] text-sm pt-0.5">{String(i + 1).padStart(2, "0")}</div>
            <div>
              <div className="font-semibold text-sm">{r.s}</div>
              <div className="text-sm text-[#5B6570] mt-0.5">{r.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-start gap-2 text-xs text-[#8B8578] bg-[#F1EFE8] rounded-md px-3.5 py-3">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        Sesuaikan ambang batas nilai, format dokumen, dan kewenangan teknis dengan Peraturan Bupati/Wali Kota yang berlaku di daerah Saudara, karena ketentuan tersebut bersifat lokal dan dapat berbeda antar kabupaten/kota.
      </div>
    </div>
  );
}

/* ---------------- Kegiatan Detail with stage ledger ---------------- */
function KegiatanDetail({ k, role, canEdit, canApprove, onPatch, onDelete, notify }) {
  const [tab, setTab] = useState(STAGES[Math.min(k.tahapSaatIni, 4)].key);
  const [confirmDel, setConfirmDel] = useState(false);

  const advance = () => {
    const next = Math.min(k.tahapSaatIni + 1, 5);
    onPatch({ tahapSaatIni: next });
    notify(next >= 5 ? "Kegiatan ditandai selesai." : `Tahap dimajukan ke ${STAGES[next].label}.`);
    if (next < 5) setTab(STAGES[next].key);
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs text-[#8B8578] mb-1">{k.bidang} · TA {k.tahunAnggaran} · {k.sumberDana}</div>
          <h1 className="font-display text-2xl">{k.nama || "(tanpa nama)"}</h1>
        </div>
        <button onClick={() => setConfirmDel(true)} className="text-[#9C4127] hover:bg-[#F3DED8] rounded-md p-2"><Trash2 size={16} /></button>
      </div>
      <div className="text-sm font-mono-tab text-[#5B6570] mb-6">Pagu: {currency(k.pagu)} · Metode: {k.metodePelaksanaan}</div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Ledger rail — signature element */}
        <ol className="flex md:flex-col gap-0 md:w-44 shrink-0 overflow-x-auto md:overflow-visible">
          {STAGES.map((s, i) => {
            const state = i < k.tahapSaatIni ? "done" : i === k.tahapSaatIni ? "active" : "todo";
            return (
              <li key={s.key} className="relative flex md:flex-col items-center md:items-stretch shrink-0">
                <button onClick={() => setTab(s.key)} className={`flex md:flex-row items-center gap-2 rounded-md px-3 py-2.5 w-full text-left ${tab === s.key ? "bg-white shadow-sm border border-[#E1DCCC]" : ""}`}>
                  <span className={`font-mono-tab text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0
                    ${state === "done" ? "bg-[#2C5A41] border-[#2C5A41] text-white" : state === "active" ? "border-[#B8863B] text-[#B8863B]" : "border-[#D8D2C4] text-[#B8B2A0]"}`}>
                    {state === "done" ? <CheckCircle2 size={13} /> : s.no}
                  </span>
                  <span className={`text-sm ${state === "todo" ? "text-[#B8B2A0]" : "text-[#16324F] font-medium"}`}>{s.label}</span>
                </button>
                {i < STAGES.length - 1 && <div className="hidden md:block w-px h-3 bg-[#E1DCCC] ml-6" />}
              </li>
            );
          })}
          <li className="mt-2 px-3">
            <StatusPill tone={k.tahapSaatIni >= 5 ? "forest" : "gold"}>{k.tahapSaatIni >= 5 ? "Selesai" : "Berjalan"}</StatusPill>
          </li>
        </ol>

        {/* Panel content */}
        <div className="flex-1 bg-white rounded-lg border border-[#E1DCCC] p-5 min-h-[360px]">
          {tab === "perencanaan" && <PerencanaanPanel k={k} editable={canEdit("perencanaan")} onPatch={onPatch} />}
          {tab === "persiapan" && <PersiapanPanel k={k} editable={canEdit("persiapan")} canApprove={canApprove} onPatch={onPatch} />}
          {tab === "pelaksanaan" && <PelaksanaanPanel k={k} editable={canEdit("pelaksanaan")} onPatch={onPatch} />}
          {tab === "pembayaran" && <PembayaranPanel k={k} editable={canEdit("pembayaran")} onPatch={onPatch} />}
          {tab === "serahterima" && <SerahTerimaPanel k={k} editable={canEdit("serahterima")} canApprove={canApprove} onPatch={onPatch} />}

          <PengawasanBox k={k} role={role} onPatch={onPatch} />

          <div className="mt-6 pt-4 border-t border-[#EDEAE1] flex justify-end">
            {k.tahapSaatIni < 5 && (
              <button onClick={advance} className="flex items-center gap-1.5 bg-[#16324F] text-white text-sm px-4 py-2 rounded-md hover:bg-[#0F2438]">
                Lanjutkan ke tahap berikutnya <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full">
            <div className="font-semibold mb-1">Hapus kegiatan ini?</div>
            <div className="text-sm text-[#5B6570] mb-4">Seluruh data perencanaan hingga serah terima akan dihapus permanen.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(false)} className="px-3 py-1.5 text-sm rounded-md border border-[#D8D2C4]">Batal</button>
              <button onClick={onDelete} className="px-3 py-1.5 text-sm rounded-md bg-[#9C4127] text-white">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ title, editable }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-lg">{title}</h2>
      {!editable && <StatusPill><Eye size={11} /> Lihat saja untuk peran Anda</StatusPill>}
    </div>
  );
}

function PerencanaanPanel({ k, editable, onPatch }) {
  const p = k.perencanaan;
  const set = (patch) => onPatch({ perencanaan: { ...p, ...patch } });
  return (
    <div>
      <PanelHeader title="01 · Perencanaan" editable={editable} />
      <div className="grid md:grid-cols-2 gap-x-6">
        <Field label="Nama Kegiatan">
          <input disabled={!editable} className={inputCls} value={k.nama} onChange={(e) => onPatch({ nama: e.target.value })} placeholder="mis. Pembangunan Rabat Beton Jalan Dusun" />
        </Field>
        <Field label="Pagu Anggaran (Rp)">
          <input disabled={!editable} type="number" className={inputCls} value={k.pagu} onChange={(e) => onPatch({ pagu: e.target.value })} />
        </Field>
        <Field label="Bidang">
          <select disabled={!editable} className={inputCls} value={k.bidang} onChange={(e) => onPatch({ bidang: e.target.value })}>
            {BIDANG.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Sumber Dana">
          <select disabled={!editable} className={inputCls} value={k.sumberDana} onChange={(e) => onPatch({ sumberDana: e.target.value })}>
            {SUMBER_DANA.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Metode Pelaksanaan">
          <select disabled={!editable} className={inputCls} value={k.metodePelaksanaan} onChange={(e) => onPatch({ metodePelaksanaan: e.target.value })}>
            <option>Swakelola</option><option>Penyedia</option>
          </select>
        </Field>
        <Field label="Tanggal Masuk RUP Desa">
          <input disabled={!editable} type="date" className={inputCls} value={p.tanggalRUP} onChange={(e) => set({ tanggalRUP: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm"><input disabled={!editable} type="checkbox" checked={p.masukRKPDesa} onChange={(e) => set({ masukRKPDesa: e.target.checked })} /> Termuat dalam RKP Desa</label>
        <label className="flex items-center gap-2 text-sm"><input disabled={!editable} type="checkbox" checked={p.masukRUP} onChange={(e) => set({ masukRUP: e.target.checked })} /> Termuat dalam RUP Desa</label>
      </div>
      <Field label="Keterangan">
        <textarea disabled={!editable} className={inputCls} rows={2} value={p.keterangan} onChange={(e) => set({ keterangan: e.target.value })} />
      </Field>
    </div>
  );
}

function PersiapanPanel({ k, editable, canApprove, onPatch }) {
  const p = k.persiapan;
  const set = (patch) => onPatch({ persiapan: { ...p, ...patch } });
  const addTPK = () => set({ tpk: [...p.tpk, { nama: "", jabatan: "" }] });
  const setTPK = (i, field, val) => { const arr = [...p.tpk]; arr[i] = { ...arr[i], [field]: val }; set({ tpk: arr }); };
  const rmTPK = (i) => set({ tpk: p.tpk.filter((_, idx) => idx !== i) });
  return (
    <div>
      <PanelHeader title="02 · Persiapan" editable={editable} />
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#5B6570]">Tim Pelaksana Kegiatan (TPK)</span>
          {editable && <button onClick={addTPK} className="text-xs text-[#8A6115] flex items-center gap-1"><Plus size={12} /> Tambah</button>}
        </div>
        <div className="space-y-2">
          {p.tpk.map((t, i) => (
            <div key={i} className="flex gap-2">
              <input disabled={!editable} className={inputCls} placeholder="Nama" value={t.nama} onChange={(e) => setTPK(i, "nama", e.target.value)} />
              <input disabled={!editable} className={inputCls} placeholder="Jabatan dalam TPK" value={t.jabatan} onChange={(e) => setTPK(i, "jabatan", e.target.value)} />
              {editable && <button onClick={() => rmTPK(i)} className="text-[#9C4127] px-2"><X size={16} /></button>}
            </div>
          ))}
          {p.tpk.length === 0 && <div className="text-xs text-[#8B8578] italic">Belum ada anggota TPK ditetapkan.</div>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-x-6">
        <Field label="HPS (Harga Perkiraan Sendiri)">
          <input disabled={!editable} type="number" className={inputCls} value={p.hps} onChange={(e) => set({ hps: e.target.value })} />
        </Field>
        <Field label="Jadwal Mulai">
          <input disabled={!editable} type="date" className={inputCls} value={p.jadwalMulai} onChange={(e) => set({ jadwalMulai: e.target.value })} />
        </Field>
        <Field label="Jadwal Selesai">
          <input disabled={!editable} type="date" className={inputCls} value={p.jadwalSelesai} onChange={(e) => set({ jadwalSelesai: e.target.value })} />
        </Field>
      </div>
      <Field label="Spesifikasi Teknis / RAB">
        <textarea disabled={!editable} className={inputCls} rows={3} value={p.spesifikasi} onChange={(e) => set({ spesifikasi: e.target.value })} />
      </Field>
      <ApprovalRow label="Disahkan Kepala Desa (penetapan TPK & spesifikasi)" checked={p.disahkanKades} canApprove={canApprove} onToggle={(v) => set({ disahkanKades: v })} />
    </div>
  );
}

function PelaksanaanPanel({ k, editable, onPatch }) {
  const isSwakelola = k.metodePelaksanaan === "Swakelola";
  const sw = k.pelaksanaan.swakelola, pn = k.pelaksanaan.penyedia;
  const setSw = (patch) => onPatch({ pelaksanaan: { ...k.pelaksanaan, swakelola: { ...sw, ...patch } } });
  const setPn = (patch) => onPatch({ pelaksanaan: { ...k.pelaksanaan, penyedia: { ...pn, ...patch } } });
  return (
    <div>
      <PanelHeader title="03 · Pelaksanaan" editable={editable} />
      {isSwakelola ? (
        <div>
          <div className="text-xs text-[#8B8578] mb-3">Dilaksanakan oleh TPK secara swakelola sesuai Perlem LKPP 12/2019.</div>
          <Field label="Rencana Penggunaan Tenaga Kerja"><textarea disabled={!editable} className={inputCls} rows={2} value={sw.rencanaTenagaKerja} onChange={(e) => setSw({ rencanaTenagaKerja: e.target.value })} /></Field>
          <Field label="Rencana Kebutuhan Material/Bahan"><textarea disabled={!editable} className={inputCls} rows={2} value={sw.rencanaMaterial} onChange={(e) => setSw({ rencanaMaterial: e.target.value })} /></Field>
          <Field label="Realisasi Pelaksanaan"><textarea disabled={!editable} className={inputCls} rows={2} value={sw.realisasi} onChange={(e) => setSw({ realisasi: e.target.value })} /></Field>
          <Field label="Catatan TPK"><textarea disabled={!editable} className={inputCls} rows={2} value={sw.catatan} onChange={(e) => setSw({ catatan: e.target.value })} /></Field>
        </div>
      ) : (
        <div>
          <div className="text-xs text-[#8B8578] mb-3">Pengadaan melalui penyedia — pilih metode sesuai ambang batas pada Perlem 12/2019 & Perbup/Perwali setempat.</div>
          <div className="grid md:grid-cols-2 gap-x-6">
            <Field label="Metode Pengadaan">
              <select disabled={!editable} className={inputCls} value={pn.metodePengadaan} onChange={(e) => setPn({ metodePengadaan: e.target.value })}>
                {METODE_PENYEDIA.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Nama Penyedia"><input disabled={!editable} className={inputCls} value={pn.namaPenyedia} onChange={(e) => setPn({ namaPenyedia: e.target.value })} /></Field>
            <Field label="NPWP Penyedia"><input disabled={!editable} className={inputCls} value={pn.npwp} onChange={(e) => setPn({ npwp: e.target.value })} /></Field>
            <Field label="Nilai Penawaran (Rp)"><input disabled={!editable} type="number" className={inputCls} value={pn.nilaiPenawaran} onChange={(e) => setPn({ nilaiPenawaran: e.target.value })} /></Field>
            <Field label="Hasil Negosiasi (Rp)"><input disabled={!editable} type="number" className={inputCls} value={pn.hasilNegosiasi} onChange={(e) => setPn({ hasilNegosiasi: e.target.value })} /></Field>
            <Field label="Masa Kerja"><input disabled={!editable} className={inputCls} placeholder="mis. 30 hari kalender" value={pn.masaKerja} onChange={(e) => setPn({ masaKerja: e.target.value })} /></Field>
          </div>
          <div className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-[#5B6570]">Surat Perjanjian Kerja (SPK)</div>
          <div className="grid md:grid-cols-3 gap-x-6">
            <Field label="Nomor SPK"><input disabled={!editable} className={inputCls} value={pn.spkNomor} onChange={(e) => setPn({ spkNomor: e.target.value })} /></Field>
            <Field label="Tanggal SPK"><input disabled={!editable} type="date" className={inputCls} value={pn.spkTanggal} onChange={(e) => setPn({ spkTanggal: e.target.value })} /></Field>
            <Field label="Nilai SPK (Rp)"><input disabled={!editable} type="number" className={inputCls} value={pn.spkNilai} onChange={(e) => setPn({ spkNilai: e.target.value })} /></Field>
          </div>
        </div>
      )}
    </div>
  );
}

function PembayaranPanel({ k, editable, onPatch }) {
  const pay = k.pembayaran;
  const set = (patch) => onPatch({ pembayaran: { ...pay, ...patch } });
  const addTermin = () => set({ termin: [...pay.termin, { no: pay.termin.length + 1, uraian: "", jumlah: "", tanggal: "", status: "Belum" }] });
  const setTermin = (i, field, val) => { const arr = [...pay.termin]; arr[i] = { ...arr[i], [field]: val }; set({ termin: arr }); };
  const rmTermin = (i) => set({ termin: pay.termin.filter((_, idx) => idx !== i) });
  return (
    <div>
      <PanelHeader title="04 · Pembayaran" editable={editable} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#5B6570]">Termin Pembayaran</span>
        {editable && <button onClick={addTermin} className="text-xs text-[#8A6115] flex items-center gap-1"><Plus size={12} /> Tambah Termin</button>}
      </div>
      <div className="space-y-2">
        {pay.termin.map((t, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center bg-[#FAF8F3] rounded-md p-2">
            <input disabled={!editable} className={`${inputCls} col-span-4`} placeholder="Uraian" value={t.uraian} onChange={(e) => setTermin(i, "uraian", e.target.value)} />
            <input disabled={!editable} type="number" className={`${inputCls} col-span-3`} placeholder="Jumlah" value={t.jumlah} onChange={(e) => setTermin(i, "jumlah", e.target.value)} />
            <input disabled={!editable} type="date" className={`${inputCls} col-span-2`} value={t.tanggal} onChange={(e) => setTermin(i, "tanggal", e.target.value)} />
            <select disabled={!editable} className={`${inputCls} col-span-2`} value={t.status} onChange={(e) => setTermin(i, "status", e.target.value)}>
              <option>Belum</option><option>Lunas</option>
            </select>
            {editable && <button onClick={() => rmTermin(i)} className="col-span-1 text-[#9C4127]"><X size={16} /></button>}
          </div>
        ))}
        {pay.termin.length === 0 && <div className="text-xs text-[#8B8578] italic">Belum ada termin pembayaran.</div>}
      </div>
    </div>
  );
}

function SerahTerimaPanel({ k, editable, canApprove, onPatch }) {
  const st = k.serahTerima;
  const set = (patch) => onPatch({ serahTerima: { ...st, ...patch } });
  return (
    <div>
      <PanelHeader title="05 · Serah Terima" editable={editable} />
      <div className="grid md:grid-cols-2 gap-x-6">
        <Field label="Nomor BAST"><input disabled={!editable} className={inputCls} value={st.bastNomor} onChange={(e) => set({ bastNomor: e.target.value })} /></Field>
        <Field label="Tanggal BAST"><input disabled={!editable} type="date" className={inputCls} value={st.bastTanggal} onChange={(e) => set({ bastTanggal: e.target.value })} /></Field>
      </div>
      <Field label="Catatan Akhir"><textarea disabled={!editable} className={inputCls} rows={2} value={st.catatanAkhir} onChange={(e) => set({ catatanAkhir: e.target.value })} /></Field>
      <ApprovalRow label="Disahkan Kepala Desa (Berita Acara Serah Terima)" checked={st.statusAkhir === "Selesai"} canApprove={canApprove} onToggle={(v) => set({ statusAkhir: v ? "Selesai" : "Belum Selesai" })} />
    </div>
  );
}

function ApprovalRow({ label, checked, canApprove, onToggle }) {
  return (
    <div className="mt-4 flex items-center justify-between bg-[#F1EFE8] rounded-md px-3.5 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Stamp size={16} className={checked ? "text-[#8A6115]" : "text-[#B8B2A0]"} />
        {label}
      </div>
      {checked ? (
        <StatusPill tone="forest"><CheckCircle2 size={11} /> Disahkan</StatusPill>
      ) : canApprove ? (
        <button onClick={() => onToggle(true)} className="text-xs bg-[#B8863B] text-white px-3 py-1.5 rounded-md hover:bg-[#96701F]">Sahkan</button>
      ) : (
        <StatusPill tone="clay">Menunggu Kades</StatusPill>
      )}
    </div>
  );
}

function PengawasanBox({ k, role, onPatch }) {
  const [note, setNote] = useState("");
  const add = () => {
    if (!note.trim()) return;
    onPatch({ pengawasan: [...k.pengawasan, { tanggal: today(), oleh: ROLES.find((r) => r.id === role)?.label, isi: note }] });
    setNote("");
  };
  return (
    <div className="mt-6 pt-4 border-t border-[#EDEAE1]">
      <div className="flex items-center gap-2 mb-2"><ShieldCheck size={15} className="text-[#5B6570]" /><span className="text-xs font-semibold uppercase tracking-wide text-[#5B6570]">Catatan Pengawasan</span></div>
      <div className="space-y-2 mb-2 max-h-32 overflow-y-auto">
        {k.pengawasan.map((c, i) => (
          <div key={i} className="text-sm bg-[#FAF8F3] rounded-md px-3 py-2">
            <span className="text-xs text-[#8B8578]">{c.tanggal} · {c.oleh}</span>
            <div>{c.isi}</div>
          </div>
        ))}
        {k.pengawasan.length === 0 && <div className="text-xs text-[#8B8578] italic">Belum ada catatan.</div>}
      </div>
      <div className="flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tambahkan catatan pengawasan…" className={inputCls} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="px-3 py-2 text-sm rounded-md bg-[#16324F] text-white shrink-0">Kirim</button>
      </div>
    </div>
  );
}

function NewKegiatanModal({ onClose, onCreate }) {
  const [form, setForm] = useState(emptyKegiatan());
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Kegiatan Baru</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <Field label="Nama Kegiatan">
          <input autoFocus className={inputCls} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="mis. Pengadaan Alat Posyandu" />
        </Field>
        <Field label="Bidang">
          <select className={inputCls} value={form.bidang} onChange={(e) => setForm({ ...form, bidang: e.target.value })}>
            {BIDANG.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tahun Anggaran">
            <input type="number" className={inputCls} value={form.tahunAnggaran} onChange={(e) => setForm({ ...form, tahunAnggaran: e.target.value })} />
          </Field>
          <Field label="Sumber Dana">
            <select className={inputCls} value={form.sumberDana} onChange={(e) => setForm({ ...form, sumberDana: e.target.value })}>
              {SUMBER_DANA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Pagu Anggaran (Rp)">
          <input type="number" className={inputCls} value={form.pagu} onChange={(e) => setForm({ ...form, pagu: e.target.value })} />
        </Field>
        <Field label="Metode Pelaksanaan">
          <select className={inputCls} value={form.metodePelaksanaan} onChange={(e) => setForm({ ...form, metodePelaksanaan: e.target.value })}>
            <option>Swakelola</option><option>Penyedia</option>
          </select>
        </Field>
        <button
          disabled={!form.nama.trim()}
          onClick={() => onCreate(form)}
          className="w-full mt-2 bg-[#16324F] text-white text-sm py-2.5 rounded-md disabled:opacity-40"
        >
          Simpan ke Rencana Pengadaan
        </button>
      </div>
    </div>
  );
}
