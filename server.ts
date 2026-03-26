import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
console.log(`Initializing Firebase Admin for project: ${firebaseConfig.projectId}`);
const adminApp = !admin.apps.length 
  ? admin.initializeApp({ projectId: firebaseConfig.projectId })
  : admin.app();

console.log(`Using Firestore database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
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
      console.warn(`Unauthorized access attempt with password: "${trimmedInput}"`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      console.log('Fetching submissions from Firestore collection "submissions"...');
      const snapshot = await db.collection('submissions').orderBy('timestamp', 'desc').get();
      console.log(`Successfully fetched ${snapshot.size} submissions.`);
      
      const submissions = snapshot.docs.map(doc => {
        const data = doc.data();
        // Extract timestamp fields manually to ensure they are JSON-serializable
        const ts = data.timestamp;
        return {
          id: doc.id,
          ...data,
          timestamp: ts ? {
            seconds: ts.seconds,
            nanoseconds: ts.nanoseconds
          } : null
        };
      });
      res.json(submissions);
    } catch (error) {
      console.error('CRITICAL: Error fetching submissions from Firestore:', error);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : String(error),
        code: (error as any).code
      });
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
