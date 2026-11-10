import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, setPersistence, inMemoryPersistence,
  GoogleAuthProvider, GithubAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signOut,
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { firebaseAyar } from './firebase-ayar.js';

const $ = (s, kok = document) => kok.querySelector(s);
const $$ = (s, kok = document) => [...kok.querySelectorAll(s)];

/* =========================================================
   1. BIÇAK GEÇİŞİ
   ========================================================= */

const kart = $('#kart');
const SURE = 1000;
const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
let durum = location.hash === '#kayit' ? 'kayit' : 'giris';
let hareketli = false;

const satirlar = d => $$(`.bant__sayfa[data-sayfa="${d}"] .satir > *`);
const panel = d => $(`#panel-${d}`);

function bitir(animasyon, el, son) {
  animasyon.finished
    .then(() => { el.style.transform = son; animasyon.cancel(); })
    .catch(() => {});
}

// Eski satırlar maskenin üstünden çıkar
function satirlariCikar(d) {
  satirlar(d).forEach((el, i) => {
    const a = el.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-115%)' }],
      { duration: azHareket ? 0 : 340, delay: azHareket ? 0 : 80 + i * 35,
        easing: 'cubic-bezier(.55,0,.85,.25)', fill: 'forwards' }
    );
    bitir(a, el, 'translateY(115%)');
  });
}

// Yeni satırlar maskenin altından yükselir
function satirlariGetir(d, gecikme) {
  satirlar(d).forEach((el, i) => {
    const a = el.animate(
      [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }],
      { duration: azHareket ? 0 : 680, delay: azHareket ? 0 : gecikme + i * 70,
        easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }
    );
    bitir(a, el, 'none');
  });
}

// Açılan formun elemanları sırayla, bulanıklıktan netleşerek yükselir
function formuGetir(d, gecikme) {
  if (azHareket) return;
  $$('.yuksel', panel(d)).forEach((el, i) => {
    el.animate(
      [
        { transform: 'translateY(18px)', filter: 'blur(6px)', clipPath: 'inset(-30% -4% 100% -4%)' },
        { transform: 'translateY(0)', filter: 'blur(0)', clipPath: 'inset(-30% -4% -30% -4%)' },
      ],
      { duration: 620, delay: gecikme + i * 55, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }
    );
  });
}

function panelleriAyarla() {
  panel('giris').inert = durum !== 'giris';
  panel('kayit').inert = durum !== 'kayit';
}

function gec(yeni) {
  if (yeni === durum || hareketli) return;
  const eski = durum;
  durum = yeni;
  hareketli = true;
  mesaj(eski, '');

  kart.classList.add('hareket');
  kart.dataset.durum = yeni;              // --kaydir geçişi başlar (CSS)
  panelleriAyarla();                       // paneller bandın karanlığı altında yer değiştirir

  satirlariCikar(eski);
  satirlariGetir(yeni, 470);
  formuGetir(yeni, yeni === 'kayit' ? 470 : 420);

  history.replaceState(null, '', `#${yeni}`);
  setTimeout(() => {
    kart.classList.remove('hareket');
    hareketli = false;
    $('input:not([type=checkbox])', panel(yeni))?.focus({ preventScroll: true });
  }, azHareket ? 0 : SURE);
}

// Başlangıç durumu (animasyonsuz)
kart.dataset.durum = durum;
panelleriAyarla();
satirlar(durum === 'giris' ? 'kayit' : 'giris').forEach(el => (el.style.transform = 'translateY(115%)'));
satirlariGetir(durum, 250);
formuGetir(durum, 150);

$$('[data-git]').forEach(b => (b.onclick = () => gec(b.dataset.git)));

// Parolayı göster / gizle
$$('.alan__goz').forEach(b => {
  b.onclick = () => {
    const girdi = b.parentElement.querySelector('input');
    const goster = girdi.type === 'password';
    girdi.type = goster ? 'text' : 'password';
    b.setAttribute('aria-pressed', goster);
    b.setAttribute('aria-label', goster ? 'Parolayı gizle' : 'Parolayı göster');
  };
});

/* =========================================================
   2. DOĞRULAMA
   ========================================================= */

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function alanHatasi(girdi, metin) {
  const alan = girdi.closest('.alan');
  const not = $('.alan__not', alan);
  alan.classList.toggle('hatali', !!metin);
  not.textContent = metin || not.dataset.ipucu || '';
  return !metin;
}

function dogrula(form) {
  let gecerli = true;
  for (const girdi of $$('.alan input', form)) {
    const d = girdi.value.trim();
    let hata = '';
    if (girdi.name === 'ad' && d.length < 2) hata = 'Adınızı ve soyadınızı yazın.';
    if (girdi.name === 'eposta' && !EPOSTA.test(d)) hata = d ? 'Geçerli bir e-posta adresi yazın.' : 'E-posta adresi gerekli.';
    if (girdi.name === 'parola') {
      if (!girdi.value) hata = 'Parola gerekli.';
      else if (form.id === 'kayit-formu' && girdi.value.length < 8) hata = 'Parola en az 8 karakter olmalı.';
    }
    if (!alanHatasi(girdi, hata) && gecerli) { gecerli = false; girdi.focus(); }
  }
  return gecerli;
}

$$('.alan input').forEach(g => g.addEventListener('input', () => {
  if (g.closest('.alan').classList.contains('hatali')) alanHatasi(g, '');
}));

/* =========================================================
   3. FIREBASE
   ========================================================= */

const auth = getAuth(initializeApp(firebaseAyar));
auth.languageCode = 'tr';
await setPersistence(auth, inMemoryPersistence); // oturumu sunucu çerezi tutar

function mesaj(d, metin, hata = false) {
  const el = $('.mesaj', panel(d));
  el.textContent = metin;
  el.className = 'mesaj ' + (hata ? 'hata' : 'bilgi');
}

const HATALAR = {
  'auth/account-exists-with-different-credential':
    'Bu e-posta başka bir yöntemle kayıtlı. İlk kullandığınız yöntemle giriş yapın.',
  'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var.',
  'auth/invalid-credential': 'E-posta ya da parola hatalı.',
  'auth/weak-password': 'Parola çok zayıf.',
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.',
  'auth/popup-blocked': 'Tarayıcı açılır pencereyi engelledi.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
  'auth/network-request-failed': 'Bağlantı hatası. İnternetinizi kontrol edin.',
};
const hataMetni = e => HATALAR[e.code] ?? e.message;

async function mesgul(form, is) {
  const dugmeler = $$('button', form);
  dugmeler.forEach(b => (b.disabled = true));
  try { await is(); } finally { dugmeler.forEach(b => (b.disabled = false)); }
}

async function sunucuyaBildir(kullanici) {
  const idToken = await kullanici.getIdToken(true);
  const yanit = await fetch('/api/oturum/ac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, hatirla: $('#g-hatirla').checked }),
  });
  await signOut(auth);
  if (!yanit.ok) throw new Error((await yanit.json()).hata);
  location.href = '/';
}

// Google / GitHub (iki panelde de)
$$('[data-saglayici]').forEach(b => {
  b.onclick = () => mesgul(b.form, async () => {
    try {
      let saglayici;
      if (b.dataset.saglayici === 'google') {
        saglayici = new GoogleAuthProvider();
      } else {
        saglayici = new GithubAuthProvider();
        saglayici.addScope('user:email');
      }
      const { user } = await signInWithPopup(auth, saglayici);
      await sunucuyaBildir(user);
    } catch (e) { mesaj(durum, hataMetni(e), true); }
  });
});

// E-posta ile giriş
$('#giris-formu').onsubmit = ev => {
  ev.preventDefault();
  const form = ev.target;
  if (!dogrula(form)) return;
  mesgul(form, async () => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, $('#g-eposta').value.trim(), $('#g-parola').value);
      if (!user.emailVerified) {
        await sendEmailVerification(user);
        await signOut(auth);
        return mesaj('giris', 'E-postanız henüz doğrulanmamış. Doğrulama bağlantısını yeniden gönderdik.', true);
      }
      await sunucuyaBildir(user);
    } catch (e) { mesaj('giris', hataMetni(e), true); }
  });
};

// Kayıt
$('#kayit-formu').onsubmit = ev => {
  ev.preventDefault();
  const form = ev.target;
  if (!dogrula(form)) return;
  mesgul(form, async () => {
    try {
      const eposta = $('#k-eposta').value.trim();
      const { user } = await createUserWithEmailAndPassword(auth, eposta, $('#k-parola').value);
      await updateProfile(user, { displayName: $('#k-ad').value.trim() });
      await sendEmailVerification(user);
      await signOut(auth);
      form.reset();
      $('#g-eposta').value = eposta;
      gec('giris');
      setTimeout(() => mesaj('giris', 'Hesabın oluşturuldu. E-postana gelen bağlantıyla doğruladıktan sonra giriş yapabilirsin.'), 450);
    } catch (e) { mesaj('kayit', hataMetni(e), true); }
  });
};

// Parolamı unuttum
$('#unuttum').onclick = async () => {
  const girdi = $('#g-eposta');
  if (!EPOSTA.test(girdi.value.trim())) {
    alanHatasi(girdi, 'Önce e-posta adresinizi yazın.');
    return girdi.focus();
  }
  try {
    await sendPasswordResetEmail(auth, girdi.value.trim());
    mesaj('giris', 'Parola sıfırlama bağlantısı e-postanıza gönderildi.');
  } catch (e) { mesaj('giris', hataMetni(e), true); }
};
