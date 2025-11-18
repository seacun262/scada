const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ================== FRONTEND SERVİSİ ==================
// Artık frontend klasörü backend'in içinde: backend/frontend
const FRONTEND_DIR = path.join(__dirname, "frontend");

// frontend klasöründeki tüm statik dosyaları (html, css, js) servis et
app.use(express.static(FRONTEND_DIR));

// köke gelen istekte index.html gönder
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// ================== AUTH / KULLANICI SİSTEMİ ==================

const JWT_SECRET = "tuzla_scada_super_secret"; // production'da .env'den gelmeli

// Demo kullanıcılar (şifre: 1234)
const users = [
  {
    id: 1,
    username: "admin",
    password: bcrypt.hashSync("1234", 10),
    role: "admin",
  },
  {
    id: 2,
    username: "operator",
    password: bcrypt.hashSync("1234", 10),
    role: "operator",
  },
  {
    id: 3,
    username: "viewer",
    password: bcrypt.hashSync("1234", 10),
    role: "viewer",
  },
];

// Token doğrulama middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token yok" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token geçersiz" });
  }
}

// Login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: "Kullanıcı bulunamadı" });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: "Şifre hatalı" });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, role: user.role });
});

// Örnek korumalı endpoint
app.get("/api/secure-test", auth, (req, res) => {
  res.json({ message: "Token geçerli", user: req.user });
});

// ================== DEMO VERİ & FONKSİYONLAR ==================

const sites = [
  {
    id: 1,
    code: "SITE_01",
    name: "Tuzla Belediyesi Ana Bina",
    status: "online",
  },
  {
    id: 2,
    code: "SITE_02",
    name: "Sosyal Tesis",
    status: "online",
  },
  {
    id: 3,
    code: "SITE_03",
    name: "Garaj - Atölye",
    status: "offline",
  },
  {
    id: 4,
    code: "SITE_04",
    name: "Ay Yıldız Kültür Merkezi",
    status: "online",
  },
];

// Saatlik demo veri (günlük görünüm için)
function generateHourlyData(dateStr) {
  const rows = [];
  for (let h = 0; h < 24; h++) {
    const hourLabel = `${String(h).padStart(2, "0")}:00`;
    const endValue = 430000 + h * 70 + Math.random() * 10;
    const deltaP = 50 + Math.random() * 30; // kWh
    const deltaQind = deltaP * 0.07; // %7 endüktif
    const deltaQcap = deltaP * 0.01; // %1 kapasitif

    rows.push({
      hour: hourLabel,
      hourLabel,
      end_value: Number(endValue.toFixed(2)),
      delta_kwh: Number(deltaP.toFixed(2)),
      delta_qind_kvarh: Number(deltaQind.toFixed(2)),
      delta_qcap_kvarh: Number(deltaQcap.toFixed(2)),
    });
  }
  return rows;
}

// Günlük toplam (haftalık / aylık grafik için)
function generateDailyData(startDateStr, days) {
  const rows = [];
  const start = new Date(startDateStr);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const total = 1000 + Math.random() * 800; // 1000–1800 kWh

    rows.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
      }),
      total_kwh: Number(total.toFixed(1)),
    });
  }
  return rows;
}

// Aylık özet (seçili site için, mevcut ay + önceki ay)
function generateMonthSummary(year, month) {
  const currentBase = 80000 + Math.random() * 50000; // kWh
  const prevBase = 80000 + Math.random() * 50000; // kWh
  const costPerKwh = 3.5; // demo birim fiyat

  const currKwh = Number(currentBase.toFixed(2));
  const prevKwh = Number(prevBase.toFixed(2));
  const currCost = Number((currKwh * costPerKwh).toFixed(2));
  const prevCost = Number((prevKwh * costPerKwh).toFixed(2));

  const sum = currKwh + prevKwh;
  const currPercent =
    sum > 0 ? Number(((currKwh / sum) * 100).toFixed(0)) : 0;
  const prevPercent =
    sum > 0 ? Number(((prevKwh / sum) * 100).toFixed(0)) : 0;

  const prevDate = new Date(year, month - 2, 1); // JS ay: 0–11
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  return {
    current: {
      year,
      month,
      label: `${year}-${String(month).padStart(2, "0")}`,
      kwh_total: currKwh,
      cost_total: currCost,
      percent: currPercent,
    },
    previous: {
      year: prevYear,
      month: prevMonth,
      label: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
      kwh_total: prevKwh,
      cost_total: prevCost,
      percent: prevPercent,
    },
  };
}

// Her bina için aylık toplam (Tüm binalar bar chart)
function generateMonthlySitesData(year, month) {
  return sites.map((site, index) => {
    const base = 50000 + index * 8000 + Math.random() * 20000;
    return {
      siteId: site.id,
      code: site.code,
      name: site.name,
      year,
      month,
      kwh_total: Number(base.toFixed(1)),
    };
  });
}

// ================== API ENDPOINTLERİ ==================

// Lokasyon listesi
app.get("/api/sites", (req, res) => {
  res.json(sites);
});

// Realtime (kartlar + kademeler)
app.get("/api/sites/:id/realtime", (req, res) => {
  const id = Number(req.params.id);
  const site = sites.find((s) => s.id === id);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const now = new Date();
  const demoSteps = [1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];

  res.json({
    siteId: site.id,
    siteCode: site.code,
    name: site.name,
    ts: now.toISOString(),
    cosphi: 0.97,
    pTotalKw: 45.2,
    pKwh: 431872.5,
    steps: demoSteps,
  });
});

// Saatlik veri (günlük)
app.get("/api/sites/:id/hourly", (req, res) => {
  const id = Number(req.params.id);
  const site = sites.find((s) => s.id === id);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const rows = generateHourlyData(date);
  res.json(rows);
});

// Günlük toplamlar (haftalık / aylık)
app.get("/api/sites/:id/daily", (req, res) => {
  const id = Number(req.params.id);
  const site = sites.find((s) => s.id === id);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const start = req.query.start || new Date().toISOString().slice(0, 10);
  const days = Number(req.query.days || 7);
  const rows = generateDailyData(start, days);
  res.json(rows);
});

// Aylık özet (donut kartlar için – seçili site)
app.get("/api/sites/:id/month-summary", (req, res) => {
  const id = Number(req.params.id);
  const site = sites.find((s) => s.id === id);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const now = new Date();
  const yearParam = req.query.year
    ? Number(req.query.year)
    : now.getFullYear();
  const monthParam = req.query.month
    ? Number(req.query.month)
    : now.getMonth() + 1;

  const summary = generateMonthSummary(yearParam, monthParam);
  res.json(summary);
});

// Her bina için aylık toplam (Tüm binalar bar chart)
app.get("/api/monthly-sites", (req, res) => {
  const now = new Date();
  const yearParam = req.query.year
    ? Number(req.query.year)
    : now.getFullYear();
  const monthParam = req.query.month
    ? Number(req.query.month)
    : now.getMonth() + 1;

  const rows = generateMonthlySitesData(yearParam, monthParam);
  res.json(rows);
});

// Alarm & Event Log (demo)
app.get("/api/alarms", (req, res) => {
  const now = new Date();
  const demo = [];

  const levels = ["CRITICAL", "WARNING", "INFO"];
  const messages = [
    "Cosφ Değeri Sınır Altında",
    "Endüktif Reaktif Ceza Riski",
    "Kapasitif Reaktif Ceza Riski",
    "Bağlantı Kesildi",
    "Kademeler Anormal Devirde",
    "Aşırı Akım",
    "Aşırı Güç Tüketimi",
    "Sayaç Hatası",
    "Cihaz Online Oldu",
    "Cihaz Offline Oldu",
  ];

  for (let i = 0; i < 40; i++) {
    const date = new Date(now - Math.random() * 7 * 24 * 3600 * 1000);
    demo.push({
      id: i + 1,
      timestamp: date.toISOString(),
      site: ["SITE_01", "SITE_02", "SITE_03", "SITE_04"][
        Math.floor(Math.random() * 4)
      ],
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    });
  }

  res.json(demo);
});

// Export endpoint (şimdilik dummy)
app.get("/api/sites/:id/hourly/export", (req, res) => {
  res
    .status(501)
    .send("Excel/PDF export henüz implement edilmedi (demo backend).");
});

// ================== SERVER ==================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("DEMO Backend API port:", PORT);
});
