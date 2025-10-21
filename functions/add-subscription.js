// Script to add test subscriptions directly to Firestore
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Your User IDs
const testUsers = [
  {
    uid: '1utLHphrAaQ7ngIaobXJsQmSWFt2',
    email: 'sudhanyakhajuria@outlook.com'
  },
  {
    uid: 'SKO3DXXTM9ahzR6pvZJqNofMX762',
    email: 'sudhanyak357@gmail.com'
  }
];

async function addTestSubscriptions() {
  console.log('🔥 Adding test subscriptions to Firestore...\n');
  
  for (const user of testUsers) {
    try {
      const subscriptionData = {
        isActive: true,
        // Expires in 1 year
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        customerId: 'test-customer-' + user.uid,
        subscriptionId: 'test-sub-' + user.uid,
        priceId: 'test-price',
        status: 'active',
        email: user.email,
        note: '⚡ Test subscription added manually for development'
      };
      
      await db.collection('subscriptions').doc(user.uid).set(subscriptionData, { merge: true });
      
      console.log(`✅ Added subscription for: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Expires: ${new Date(subscriptionData.expiresAt).toLocaleDateString()}\n`);
    } catch (error) {
      console.error(`❌ Error adding subscription for ${user.email}:`, error.message);
    }
  }
  
  console.log('✨ Done! Your accounts now have active test subscriptions.');
  process.exit(0);
}

addTestSubscriptions().catch(console.error);
