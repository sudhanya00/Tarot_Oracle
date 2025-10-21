// Quick script to add test subscriptions to Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./google-services.json');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: serviceAccount.project_info.project_id,
    clientEmail: `firebase-adminsdk@${serviceAccount.project_info.project_id}.iam.gserviceaccount.com`,
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "dummy-key" // You'll need to get this from Firebase Console
  })
});

const db = admin.firestore();

// User IDs from your Firebase Auth export
const testUserIds = [
  '1utLHphrAaQ7ngIaobXJsQmSWFt2', // sudhanyakhajuria@outlook.com
  'SKO3DXXTM9ahzR6pvZJqNofMX762'  // sudhanyak357@gmail.com
];

async function addTestSubscriptions() {
  console.log('Adding test subscriptions...');
  
  for (const uid of testUserIds) {
    try {
      await db.collection('subscriptions').doc(uid).set({
        isActive: true,
        // Expires in 1 year (for testing)
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        customerId: 'test-customer',
        subscriptionId: 'test-subscription',
        priceId: 'test-price',
        status: 'active',
        note: 'Test subscription added manually'
      }, { merge: true });
      
      console.log(`✅ Added subscription for user: ${uid}`);
    } catch (error) {
      console.error(`❌ Error adding subscription for ${uid}:`, error.message);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

addTestSubscriptions();
