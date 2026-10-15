import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore,
  setLogLevel
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Suppress internal transient transport retry logs in the browser console
try {
  setLogLevel('error');
} catch {
  // best-effort
}

// CRITICAL: Initialize Firestore using the configured firestoreDatabaseId
// Use experimentalAutoDetectLongPolling instead of forcing long-polling unconditionally,
// allowing fast streaming/WebChannel while gracefully auto-adapting if proxies require long-polling.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    config.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, config.firestoreDatabaseId);
}

export const db = firestoreDb;

export const auth = getAuth(app);
export const storage = getStorage(app);

// Fail fast on storage permission or network errors instead of hanging
try {
  storage.maxUploadRetryTime = 15000;
  storage.maxOperationRetryTime = 15000;
} catch (e) {
  // best effort
}

export default app;
