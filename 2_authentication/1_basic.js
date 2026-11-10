const express = require("express");
const app = express();

const USERS = { ogrenci: "baun2026" };        // (1)

function basicAuth(req, res, next) {
  const header = req.headers.authorization || "";  // (2)
  const [tip, deger] = header.split(" ");

  if (tip !== "Basic" || !deger) {            // (3)
    res.set("WWW-Authenticate", 'Basic realm="Ders"');
    return res.status(401).send("Giriş gerekli");
  }

  const [kadi, parola] = Buffer
    .from(deger, "base64")                    // (4)
    .toString("utf8").split(":");

  if (USERS[kadi] !== parola)                 // (5)
    return res.status(401).send("Hatalı bilgiler");

  req.user = kadi;                            // (6)
  next();
}

app.get("/panel", basicAuth, (req, res) => {  // (7)
  res.send(`Hoş geldin, ${req.user}`);
});

app.listen(3000);