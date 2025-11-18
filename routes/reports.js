const express = require("express");
const router = express.Router();

const SITES = [
  { id: 1, code: "SITE_01", name: "Tuzla Belediyesi Ana Bina" },
  { id: 2, code: "SITE_02", name: "Sosyal Tesis" },
  { id: 3, code: "SITE_03", name: "Garaj - Atölye" },
  { id: 4, code: "SITE_04", name: "Ay Yıldız Kültür Merkezi" }
];

function rand(min,max){return Math.random()*(max-min)+min;}

/*  GET /api/reports/monthly-sites?year=2025&month=11 */
router.get("/monthly-sites", (req, res) => {
  const now = new Date();

  const year = req.query.year ? Number(req.query.year) : now.getFullYear();
  const month = req.query.month ? Number(req.query.month) : (now.getMonth()+1);

  const rows = SITES.map((s, idx) => {
    const base = 40000 + idx*5000 + rand(-5000, 8000);
    return {
      siteId: s.id,
      code: s.code,
      name: s.name,
      year,
      month,
      kwh_total: Number(base.toFixed(1))
    };
  });

  res.json(rows);
});

module.exports = router;
