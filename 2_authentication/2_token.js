const express = require("express");
const app = express();
const crypto = require("crypto");
const tokens = new Map();                     // (1)

app.post("/login", express.json(), (req, res) => {
  const kadi = "bauntek"
  const parola = "2026"
  const token = crypto.randomBytes(32)
                      .toString("hex");       // (3)
  tokens.set(token, {                         // (4)
    kadi,
    olusturma: Date.now()
  });
  res.json({ token });
});

function tokenAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ")
              ? h.slice(7) : null;            // (5)

  const oturum = token && tokens.get(token);  // (6)
  if (!oturum)
    return res.status(401).json({ hata: "Token geçersiz" });

  req.user = oturum.kadi;
  req.token = token;
  next();
}

app.get("/api/profil", tokenAuth, (req, res) => {
  res.json({ kullanici: req.user });
});

app.post("/logout", tokenAuth, (req, res) => {
  tokens.delete(req.token);                   // (7)
  res.json({ mesaj: "Çıkış yapıldı" });
});

app.listen(3000);