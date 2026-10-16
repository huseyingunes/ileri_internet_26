const adres = "https://api.open-meteo.com/v1/forecast?latitude=39.65&longitude=27.89&current=temperature_2m,wind_speed_10m&timezone=Europe/Istanbul";
 
async function havaDurumu() {
  const yanit = await fetch(adres);
  const veri = await yanit.json();
  
  console.log(veri)
 
  console.log("Balıkesir hava durumu");
  console.log("Sıcaklık:", veri.current.temperature_2m, "°C");
  console.log("Rüzgar:", veri.current.wind_speed_10m, "km/sa");
}
 
havaDurumu();
 