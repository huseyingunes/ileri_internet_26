// Firebase Admin SDK — sunucu tarafı
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const servisHesabi = JSON.parse(
  readFileSync(process.env.FIREBASE_SERVIS_HESABI ?? './servis-hesabi.json', 'utf8')
);

initializeApp({ credential: cert(servisHesabi) });

export const auth = getAuth();
export const ROLLER = ['okuyucu', 'editor', 'yonetici'];
