# İleri İnternet Programlama — Yazılı Sınav Soruları ve Cevap Anahtarı (25 soru)

Önceki sınavla birebir aynı 5 soru: 1, 2, 11, 15, 18. Diğerleri aynı konulardan yeni sorular.
Zorluk: 1-3, 11-12 çok kolay · 4-6, 13-14 kolay · 7-8, 15-17 orta · 9-10, 18-19, 21 zor · 20, 22-24 çok zor · 25 kolay

## Çoktan Seçmeli
1. (Çok kolay) Alan adını IP'ye çeviren sistem — **D) DNS**
2. (Çok kolay) Kaynak silme HTTP fiili — **C) DELETE**
3. (Çok kolay) Kayıtları uzak depoya gönderen komut — **A) git push**
4. (Kolay) Belge tabanlı NoSQL veritabanı — **D) MongoDB**
5. (Kolay) HTTPS'te şifreleyen protokol — **E) TLS**
6. (Kolay) JWT'de değiştirilmediğini doğrulayan bölüm — **C) İmza**
7. (Orta) Tuz eklemenin amacı — **B) Aynı parolaların aynı özeti üretmesini engellemek**
8. (Orta) CAP'teki "P" — **E) Ağ bölünmesine dayanıklılık**
9. (Zor) Saklanabilir ama her seferinde doğrulatılır — **B) no-cache**
10. (Zor) RabbitMQ'da iletileri kuyruklara dağıtan bileşen — **A) Exchange**

## Kısa Cevap (kabul edilecek yazımlar)
11. (Çok kolay) HTML
12. (Çok kolay) git add (add)
13. (Kolay) TypeScript (TS)
14. (Kolay) Socket.IO (socketio, socket io)
15. (Orta) Atomiklik (atomik, bölünmezlik, atomicity)
16. (Orta) Bölüm (partition, bölümleme)
17. (Orta) keep-alive (keep alive, keepalive)
18. (Zor) OPTIONS
19. (Zor) Lucene (Apache Lucene)
20. (Çok zor) Çoğunluk / yeter sayı (quorum, kuorum, nisap)

## Tek Cümlelik Cevap
21. (Zor) GET'in güvenli olması — *Sunucudaki veriyi değiştirmez.*
22. (Çok zor) Oturumun ortak depoda tutulması — *Her sunucu oturuma erişebilsin diye.*
23. (Çok zor) Günlüklerin standart çıktıya yazılması — *Günlük yönetimini çalışma ortamı üstlenir.*
24. (Çok zor) Senkron çoğaltmanın bedeli — *Yazma gecikmesi artar.*

## Klasik (25, Kolay) — Redis'in önbellek olarak kullanılmasının yararları
Beklenen ana ögeler:
1. Veriyi bellekte tuttuğu için okuma/yazma çok hızlıdır (milisaniye altı).
2. Sık okunan veriler önbellekten verildiği için veritabanı yükü azalır.
3. Yanıt süreleri kısalır, kullanıcı deneyimi iyileşir.
4. TTL ile verilerin belirli süre sonra kendiliğinden silinmesi sağlanır.
5. Birden çok uygulama sunucusu ortak önbelleği kullanabilir; oturum verisi de tutulabilir.
