
const express = require('express');
const app = express();
app.use(express.json());

let kitaplar = [{ id: 1, ad: 'Sefiller' }];

app.get('/api/kitaplar', (req, res) => res.json(kitaplar));          // listele
app.get('/api/kitaplar/:id', (req, res) => {                          // tekil oku
  const k = kitaplar.find(x => x.id == req.params.id);
  k ? res.json(k) : res.status(404).json({ hata: 'Bulunamadı' });
});
app.post('/api/kitaplar', (req, res) => {                             // oluştur
  const yeni = { id: Date.now(), ...req.body };
  kitaplar.push(yeni);
  res.status(201).json(yeni);
});
app.delete('/api/kitaplar/:id', (req, res) => {                       // sil
  kitaplar = kitaplar.filter(x => x.id != req.params.id);
  res.status(204).end();
});

app.listen(3000);
