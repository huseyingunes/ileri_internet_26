const express = require('express');
const app = express();

// Gelen application/json gövdelerini req.body nesnesine çevirir
app.use(express.json());

app.post('/api/ogrenciler', (req, res) => {
  const { ad, numara } = req.body;              // JSON gövdeden oku
  if (!ad || !numara)
    return res.status(400).json({ hata: 'ad ve numara zorunlu' });

  res.status(201).json({                        // JSON yanıt üret
    mesaj: 'Kayıt alındı',
    ogrenci: { ad, numara, kayit: new Date().toISOString() }
  });
});

app.listen(3000);
