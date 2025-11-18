const express = require("express");
const router = express.Router();

/* ---- DEMO LOKASYON LİSTESİ ---- */
const SITES = [
    { id: 1, code: "SITE_01", name: "Tuzla Belediyesi Ana Bina", status: "online" },
    { id: 2, code: "SITE_02", name: "Sosyal Tesis", status: "online" },
    { id: 3, code: "SITE_03", name: "Garaj - Atölye", status: "offline" }
];

/* RANDOM üretici */
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

/* ---- REALTIME DEMO ---- */
router.get("/:siteId/realtime", (req, res) => {
    return res.json({
        cosphi: rand(0.85, 0.99),
        pTotalKw: rand(15, 80),
        pKwh: rand(20000, 90000),
        steps: Array.from({ length: 12 }, () => Math.random() > 0.7 ? 1 : 0)
    });
});

/* ---- Saatlik Veri ---- */
router.get("/:siteId/hourly", (req, res) => {
    const rows = [];
    for (let h = 0; h < 24; h++) {
        const value = rand(0.4, 8);
        rows.push({
            hour: `${h.toString().padStart(2, "0")}:00`,
            end_value: 1000 + h * value,
            delta_kwh: value.toFixed(2),
            delta_qind_kvarh: rand(0, 2).toFixed(2),
            delta_qcap_kvarh: rand(0, 2).toFixed(2)
        });
    }
    res.json(rows);
});

/* ---- Günlük / Haftalık / Aylık Toplam ---- */
router.get("/:siteId/daily", (req, res) => {
    const { start, days } = req.query;

    const data = [];
    for (let i = 0; i < Number(days); i++) {
        data.push({
            label: `Gün ${i + 1}`,
            total_kwh: rand(60, 350)
        });
    }
    res.json(data);
});

/* ---- Aylık Karşılaştırma ---- */
router.get("/:siteId/month-summary", (req, res) => {
    const prevKwh = rand(1500, 4500);
    const currKwh = rand(1500, 4500);

    res.json({
        previous: {
            label: "Geçen Ay",
            kwh_total: prevKwh,
            cost_total: prevKwh * 3.2,
            percent: Math.round((prevKwh / 5000) * 100)
        },
        current: {
            label: "Bu Ay",
            kwh_total: currKwh,
            cost_total: currKwh * 3.2,
            percent: Math.round((currKwh / 5000) * 100)
        }
    });
});

/* ---- Lokasyon Listesi ---- */
router.get("/", (req, res) => {
    res.json(SITES);
});

module.exports = router;
