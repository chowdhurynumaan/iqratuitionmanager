# Firebase Permission Error - Fix Guide

## Problem
"Missing or insufficient permissions" when loading data from Firebase

## Root Cause
The new security rules require:
1. User to be authenticated (signed in with Google) ✓
2. User to exist in `userApprovals` collection with `status: 'approved'` ✗ (THIS IS MISSING)

## Solution

### Quick Fix (Do This First)

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: "schoolstream-sny5k"
3. Click "Firestore Database" 
4. Click "Collections" tab
5. Look for collection named `userApprovals`
   - If it doesn't exist, create it:
     - Click "+ Start collection"
     - Collection ID: `userApprovals`
     - Document ID: Copy your Google UID (you'll need to find this - see below)

6. In the `userApprovals` collection, you should have a document for the admin with:
   ```
   Field: email
   Value: chowdhurynumaan@gmail.com
   
   Field: status
   Value: approved
   
   Field: role
   Value: admin
   
   Field: displayName
   Value: Admin User
   ```

### How to Find Your Google UID

1. Open browser DevTools (F12)
2. Go to Console tab
3. Run this command:
   ```javascript
   firebase.auth().currentUser.uid
   ```
4. Copy the result - this is your UID
5. Use this as the Document ID in userApprovals collection

### Step-by-Step Firestore Setup

**Step 1: Create userApprovals collection**
```
Collection ID: userApprovals
First document ID: (your-google-uid-from-above)
```

**Step 2: Add these fields to the document:**
```
displayName: "Admin" (string)
email: "chowdhurynumaan@gmail.com" (string)
photoURL: "" (string - can be empty)
role: "admin" (string)
status: "approved" (string)
requestedAt: (timestamp - can be current time)
approvedAt: (timestamp - can be current time)
uid: "your-google-uid" (string)
```

**Step 3: Save and refresh the app**

### Expected Result
- App loads without permission errors
- Dashboard displays
- Admin can approve other users
- Data syncs properly

---

## Verify the Fix Worked

1. Refresh the app
2. Check browser console (F12)
3. Should see:
   ```
   ✓ Loaded families from Firebase
   ✓ Loaded students from Firebase
   ✓ Loaded payments from Firebase
   ```
   (Instead of permission denied errors)

---

## Troubleshooting

**Still getting permission errors?**

1. Make sure you signed in with Google (should see email in top right)
2. Check that `userApprovals` collection exists in Firestore
3. Verify the document UID matches `firebase.auth().currentUser.uid`
4. Make sure the status field is exactly "approved" (case-sensitive)
5. Try signing out and signing back in

**Can't find userApprovals collection?**

1. Go to Firestore Database → Collections
2. If you don't see it, it might not exist yet
3. Create it manually:
   - Click "+ Start collection"
   - Enter collection ID: `userApprovals`
   - Create first document
   - Add the fields listed above

---

## After This Works - Next Step

Once the app loads successfully, you should deploy the Cloud Function to automate this process:

See: FIRESTORE_RULES_SECURE.txt (section: "STEP 3: Set Up Cloud Functions")

The Cloud Function will automatically:
- Create userApprovals document when user signs up
- Set status to 'pending' automatically
- Set status to 'approved' and role when admin approves
- Remove access when users are rejected/revoked

This means you won't need to manually add users to Firestore anymore.

---

## Current Rules Status

**Currently Active:** FIRESTORE_RULES_CLEAN.txt
- Uses email comparison for admin check (temporary)
- Requires users to exist in userApprovals with status='approved'
- Viewers are read-only (enforced at DB level)
- Works immediately while you set up Cloud Functions

**Future Rules:** FIRESTORE_RULES_SECURE.txt
- Uses custom claims instead of email (more secure)
- Requires Cloud Function deployment
- Better for production

---

## Quick Firestore Manual Setup

If you prefer to manually create the collection in Firestore Console:

```
Collection: userApprovals
Document ID: <your-google-uid>

Fields:
- displayName: "Admin User"
- email: "chowdhurynumaan@gmail.com"
- photoURL: ""
- role: "admin"
- status: "approved"
- requestedAt: 2025-12-14T00:00:00Z
- approvedAt: 2025-12-14T00:00:00Z
- uid: "<your-google-uid>"
```

After saving, refresh the app and it should work!
