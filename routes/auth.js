const express = require("express");
const router = express.Router();

// Basit demo kullanıcıları
const USERS = [
    { username: "admin", password: "1234", role: "admin" },
    { username: "operator", password: "1234", role: "operator" },
    { username: "viewer", password: "1234", role: "viewer" }
];

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    const user = USERS.find(u => u.username === username && u.password === password);

    if (!user)
        return res.status(401).json({ error: "Kullanıcı bulunamadı" });

    return res.json({
        success: true,
        role: user.role
    });
});

module.exports = router;
