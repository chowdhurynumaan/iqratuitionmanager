# Role-Based Access Control System

## Three User Roles

### 👨‍💼 Admin
- **Email**: chowdhurynumaan@gmail.com
- **Auto-approved**: Yes, on first login
- **Permissions**:
  - ✅ View all data
  - ✅ Create, edit, delete families and payments
  - ✅ Manage departments and schedules
  - ✅ Access Admin panel
  - ✅ Approve/reject user requests
  - ✅ Assign and change user roles
  - ✅ Revoke user access
  - ✅ Export/import data

### 👤 User
- **Permissions**:
  - ✅ View all data
  - ✅ Create, edit, delete families and payments
  - ✅ Manage departments and schedules
  - ❌ Cannot access Admin panel
  - ❌ Cannot approve users
  - ❌ Cannot change user roles
  - ✅ Can export/import data

### 👁️ Viewer
- **Permissions**:
  - ✅ View all data (read-only)
  - ✅ View families, students, payments
  - ✅ View departments
  - ❌ Cannot create/edit/delete
  - ❌ Cannot access Admin panel
  - ❌ Cannot export/import
  - ❌ Cannot manage users

## How to Assign Roles

### When Approving a New User:
1. Go to Settings → Admin tab
2. Find the pending user request
3. Select role from dropdown: **Viewer** (default), **User**, or **Admin**
4. Click **✓ Approve**
5. User is approved with selected role

### Change Role for Existing User:
1. Go to Settings → Admin tab
2. Find the approved user
3. Click the role dropdown to change
4. Select new role: **Viewer**, **User**, or **Admin**
5. Role changes immediately

### Revoke Access:
1. Go to Settings → Admin tab
2. Find the approved user
3. Click **Revoke**
4. User loses access on next login

## Database Structure

Each user in `userApprovals` collection has:

```
{
  uid: "firebase_uid",
  email: "user@gmail.com",
  displayName: "User Name",
  status: "pending" | "approved" | "rejected" | "revoked",
  role: "admin" | "user" | "viewer",  // Only when approved
  requestedAt: Timestamp,
  approvedAt: Timestamp,
  photoURL: "..."
}
```

## Security Rules

**Admin users** (email = chowdhurynumaan@gmail.com):
- Can read and write to `userApprovals`
- Can read and write all other collections

**User role**:
- Can read all collections
- Can write to families, payments, departments
- Cannot write to userApprovals

**Viewer role**:
- Can read all collections
- Cannot write to any collection

## Typical Setup

1. **You (Admin)**: Auto-approved on first login
2. **Staff (User)**: Approve with "User" role
   - They can manage families, payments, and departments
3. **Parents/Guardians (Viewer)**: Approve with "Viewer" role
   - They can see data but cannot modify

## User Status Flow

```
New Signup
    ↓
Pending (awaiting admin approval)
    ↓
    ├→ Approved (with role: admin/user/viewer)
    │    ├→ Can use app based on role
    │    └→ Role can be changed by admin
    │
    └→ Rejected
         └→ Cannot access app
```

## Default Role

When a new user requests access, they are automatically assigned the **Viewer** role. Admin then approves them and can upgrade the role to User or Admin if needed.

## Changing Your Own Admin Email

To use a different email as admin, edit line 3 in `app.js`:
```javascript
const ADMIN_EMAIL = 'your-email@gmail.com';
```

Then:
1. Update your Firestore document to have that email
2. Sign in with the new email
3. You'll be auto-approved as admin
