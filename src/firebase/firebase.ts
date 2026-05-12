import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  get,
  getDatabase,
  onValue,
  ref,
  set,
  type Database,
} from 'firebase/database'
import type { Material, Machine, TubePart } from '../types'

let app: FirebaseApp | null = null
let db: Database | null = null

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL)
}

function getDb(): Database {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is niet geconfigureerd. Vul .env met VITE_FIREBASE_* variabelen.',
    )
  }
  if (!db) {
    app = initializeApp(firebaseConfig)
    db = getDatabase(app)
  }
  return db
}

/** RTDB paden volgens ontwerp. */
export const rtdbPaths = {
  materials: 'materials',
  machines: 'machines',
  parts: 'parts',
  jobs: 'jobs',
} as const

export async function savePart(part: TubePart): Promise<void> {
  const database = getDb()
  await set(ref(database, `${rtdbPaths.parts}/${part.id}`), {
    ...part,
    updatedAt: Date.now(),
  })
}

export async function loadPart(partId: string): Promise<TubePart | null> {
  const database = getDb()
  const snap = await get(ref(database, `${rtdbPaths.parts}/${partId}`))
  return snap.val() as TubePart | null
}

export function subscribePart(
  partId: string,
  onData: (part: TubePart | null) => void,
): () => void {
  const database = getDb()
  const r = ref(database, `${rtdbPaths.parts}/${partId}`)
  return onValue(r, (snap) => {
    onData(snap.val() as TubePart | null)
  })
}

export async function saveMaterial(material: Material): Promise<void> {
  const database = getDb()
  await set(ref(database, `${rtdbPaths.materials}/${material.id}`), material)
}

export async function saveMachine(machine: Machine): Promise<void> {
  const database = getDb()
  await set(ref(database, `${rtdbPaths.machines}/${machine.id}`), machine)
}

export function subscribeMaterials(
  onData: (items: Record<string, Material>) => void,
): () => void {
  const database = getDb()
  const r = ref(database, rtdbPaths.materials)
  return onValue(r, (snap) => {
    onData((snap.val() as Record<string, Material> | null) ?? {})
  })
}
