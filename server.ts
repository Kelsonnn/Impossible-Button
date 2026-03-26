import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const adminApp = !admin.apps.length 
  ? admin.initializeApp({ projectId: firebaseConfig.projectId })
  : admin.app();

const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/admin/submissions', async (req, res) => {
    const { password } = req.body;
    const trimmedInput = password ? password.trim() : "";
    const validPasswords = ["Kels0n2026", "kelson2026", "Kelson2026"];

    if (!validPasswords.includes(trimmedInput)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const snapshot = await db.collection('submissions').orderBy('timestamp', 'desc').get();
      const submissions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp ? {
          toDate: () => doc.data().timestamp.toDate(),
          seconds: doc.data().timestamp.seconds,
          nanoseconds: doc.data().timestamp.nanoseconds
        } : null
      }));
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
