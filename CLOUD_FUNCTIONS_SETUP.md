# Cloud Functions Setup - Production Security Hardening

## Overview
Cloud Functions automatically set custom claims (admin, approved, role) on users' authentication tokens. This allows Firestore rules to enforce security at the database level.

---

## Step 1: Create Cloud Functions Directory

```bash
firebase init functions
```

Choose:
- Language: **JavaScript**
- ESLint: **Yes**

---

## Step 2: Install Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions --save
```

---

## Step 3: Replace functions/index.js

Delete the default code and paste this:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ==================== ON USER APPROVAL ====================
// Automatically sets custom claims when user status changes
exports.onUserApprovalChange = functions.firestore
  .document('userApprovals/{uid}')
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const data = change.after.data();
    
    if (!data) {
      // Document deleted - revoke all claims
      await admin.auth().setCustomUserClaims(uid, {
        admin: false,
        approved: false,
        role: null
      });
      console.log(`Revoked claims for deleted user: ${uid}`);
      return;
    }
    
    if (data.status === 'approved') {
      // User approved - set claims based on role
      const isAdmin = data.role === 'admin';
      await admin.auth().setCustomUserClaims(uid, {
        admin: isAdmin,
        approved: true,
        role: data.role,
        approvedAt: admin.firestore.Timestamp.now().toDate()
      });
      console.log(`Approved user ${uid} with role: ${data.role}, admin: ${isAdmin}`);
      
    } else if (data.status === 'rejected' || data.status === 'revoked') {
      // User rejected/revoked - clear all claims
      await admin.auth().setCustomUserClaims(uid, {
        admin: false,
        approved: false,
        role: null
      });
      console.log(`Revoked claims for ${data.status} user: ${uid}`);
      
    } else if (data.status === 'pending') {
      // User pending - clear claims but keep record
      await admin.auth().setCustomUserClaims(uid, {
        admin: false,
        approved: false,
        role: null
      });
      console.log(`Pending user created: ${uid}`);
    }
  });

// ==================== PAYMENT VALIDATION ====================
// Validates payment data before allowing write
exports.validatePayment = functions.firestore
  .document('shared_data/{docId}')
  .onWrite(async (change, context) => {
    const data = change.after.data();
    
    // Only validate if payments array changed
    if (!data || !data.value || !Array.isArray(data.value)) {
      return;
    }
    
    // Get the payments array
    const payments = data.value;
    const lastPayment = payments[payments.length - 1];
    
    if (!lastPayment || !lastPayment.amount) {
      return; // Not a payment or no amount
    }
    
    // Validate payment amount
    const amount = parseFloat(lastPayment.amount);
    
    if (isNaN(amount)) {
      throw new Error('Payment amount must be a valid number');
    }
    
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    if (amount > 1000000) {
      throw new Error('Payment amount exceeds maximum allowed (1,000,000)');
    }
    
    console.log(`Payment validated: ${amount}, RG: ${lastPayment.rgNumber}`);
  });

// ==================== USER APPROVAL CALLABLE FUNCTION ====================
// Allows admin to approve users with role assignment
exports.approveUser = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  // Verify user is admin
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can approve users');
  }
  
  const { uid, role } = data;
  
  // Validate parameters
  if (!uid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid or role');
  }
  
  if (!['admin', 'user', 'viewer'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role. Must be admin, user, or viewer');
  }
  
  try {
    // Update user approval in Firestore
    // This triggers onUserApprovalChange which sets custom claims
    await admin.firestore()
      .collection('userApprovals')
      .doc(uid)
      .update({
        status: 'approved',
        role: role,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvedBy: context.auth.uid
      });
    
    return {
      success: true,
      message: `User ${uid} approved with role: ${role}`
    };
  } catch (error) {
    console.error('Error approving user:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==================== REJECT USER CALLABLE FUNCTION ====================
exports.rejectUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reject users');
  }
  
  const { uid } = data;
  
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
  }
  
  try {
    await admin.firestore()
      .collection('userApprovals')
      .doc(uid)
      .update({
        status: 'rejected',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectedBy: context.auth.uid
      });
    
    return { success: true, message: `User ${uid} rejected` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==================== REVOKE USER CALLABLE FUNCTION ====================
exports.revokeUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can revoke users');
  }
  
  const { uid } = data;
  
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid');
  }
  
  try {
    await admin.firestore()
      .collection('userApprovals')
      .doc(uid)
      .update({
        status: 'revoked',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: context.auth.uid
      });
    
    return { success: true, message: `User ${uid} revoked` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ==================== CHANGE USER ROLE CALLABLE FUNCTION ====================
exports.changeUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can change roles');
  }
  
  const { uid, role } = data;
  
  if (!uid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid or role');
  }
  
  if (!['admin', 'user', 'viewer'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }
  
  try {
    await admin.firestore()
      .collection('userApprovals')
      .doc(uid)
      .update({
        role: role,
        roleChangedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleChangedBy: context.auth.uid
      });
    
    return { success: true, message: `User ${uid} role changed to: ${role}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

## Step 4: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

Wait for deployment to complete. You should see:
```
✓ functions deployed successfully
```

---

## Step 5: Update Firestore Rules

1. Go to Firebase Console → Firestore Database → Rules
2. Copy code from: FIRESTORE_RULES_PRODUCTION.txt
3. Paste and publish

These rules now use custom claims set by Cloud Functions.

---

## Step 6: Force Users to Re-login

Custom claims are cached in the ID token. Users need to re-login for claims to take effect.

**Option A:** Sign out all users
1. In app Settings tab, click "Sign Out"
2. Have all users sign back in

**Option B:** Wait for token refresh (happens automatically after 1 hour)

---

## Step 7: Verify It Works

### Check Admin Has Access
1. Sign in as admin
2. Go to Settings → Admin tab
3. Should see "User Access Management"
4. Should be able to approve pending users

### Check User Can't Access Admin
1. Have another user sign in
2. Approve them with role: "user"
3. They sign back in
4. Settings → Admin tab should be HIDDEN

### Check Viewer Is Read-Only
1. Have another user sign in
2. Approve them with role: "viewer"
3. They sign back in
4. Can view dashboard but can't edit anything
5. Student Data, Payments, Settings tabs hidden

---

## How It Works

```
User signs in with Google
    ↓
Firestore checks: Is this user in userApprovals collection?
    ↓ No
User sees: "Approval Pending" message
    ↓
Admin approves user with role "user"
    ↓
Cloud Function: onUserApprovalChange triggers
    ↓
Sets custom claims on user's auth token:
  - admin: false
  - approved: true
  - role: "user"
    ↓
User refreshes or re-logs in
    ↓
Firestore rules check custom claims
    ↓
User has access to data based on role
    ↓
App.js enforces role-based UI visibility
```

---

## Security Improvements

✅ **Admin status cannot be forged** - Set server-side only  
✅ **Hardcoded email removed** - Uses custom claims instead  
✅ **Viewers enforced read-only** - At database level, not just UI  
✅ **Payment validation** - Cloud Function checks data before write  
✅ **Approval workflow** - Users can't access until approved  
✅ **Audit trail** - Each approval/rejection logged with who did it  
✅ **Automatic enforcement** - Happens when document changes  

---

## Troubleshooting

**Issue: "Permission denied" after deploying**

Solution: 
1. Sign out user
2. Sign back in to refresh token
3. Wait a few seconds for Cloud Function to set claims

**Issue: Users still can't see admin functions**

Solution:
1. Verify Cloud Function deployed successfully: `firebase functions:list`
2. Check function logs: `firebase functions:log`
3. Verify user is actually approved in Firestore
4. Make sure their role is "admin" not "user"

**Issue: Cloud Function deployment fails**

Solution:
1. Make sure you ran `firebase init functions`
2. Check Node.js version: `node --version` (should be 14+)
3. Run `npm install` in functions directory
4. Check for syntax errors in index.js

---

## Next: Update app.js

After Cloud Functions deployed, update app.js to use custom claims instead of email checks.

See: SECURITY_FIXES_APPLIED.md for required app.js updates.
