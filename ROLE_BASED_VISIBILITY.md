# Role-Based Navigation Visibility

## Overview
The application now implements role-based navigation visibility, where different user roles see different portions of the interface based on their permissions.

## User Roles & Visibility

### 1. **Viewer Role**
**Access Level:** Read-Only Dashboard View

**Visible Elements:**
- ✅ Dashboard (read-only)

**Hidden Elements:**
- ❌ Sidebar navigation
- ❌ Student Data section
- ❌ Payments section
- ❌ Settings section
- ❌ Admin section

**User Experience:**
- Greeted with dashboard view only
- Cannot navigate to other sections
- Cannot perform any actions
- Perfect for reports/read-only access

---

### 2. **User Role**
**Access Level:** Full Operational Access (No Admin)

**Visible Elements:**
- ✅ Dashboard
- ✅ Student Data (register students)
- ✅ Payments (record payments)
- ✅ Settings (view tuition rates, discounts)
- ✅ Sidebar navigation
- ✅ Nav links: Dashboard, Student Data, Payments, Settings

**Hidden Elements:**
- ❌ Admin section (main nav link)
- ❌ Admin tab in Settings
- ❌ User approval management
- ❌ User role administration

**User Experience:**
- Full access to all core features
- Can manage students and payments
- Cannot manage other users or system settings
- Perfect for operational staff

---

### 3. **Admin Role**
**Access Level:** Complete System Access

**Visible Elements:**
- ✅ Dashboard
- ✅ Student Data
- ✅ Payments
- ✅ Settings (with Admin tab)
- ✅ Admin section
- ✅ Sidebar navigation
- ✅ All nav links including Admin

**Hidden Elements:**
- None (sees everything)

**User Experience:**
- Complete system access
- Can manage all aspects
- Can approve/deny users
- Can manage system settings
- Perfect for administrators

---

## Implementation Details

### HTML Structure

**Sidebar Navigation (id: mainSidebar)**
```html
<nav class="sidebar" id="mainSidebar">
    <ul class="nav-menu" id="navMenu">
        <li><a href="#" data-section="dashboard" class="nav-link active">Dashboard</a></li>
        <li><a href="#" data-section="register" class="nav-link">Student Data</a></li>
        <li><a href="#" data-section="payments" class="nav-link">Payments</a></li>
        <li><a href="#" data-section="settings" class="nav-link">Settings</a></li>
        <li><a href="#" data-section="admin" class="nav-link" id="adminNavLink">Admin</a></li>
    </ul>
</nav>
```

**Admin Tab in Settings (id: adminTabBtn)**
```html
<button class="tab-btn" data-tab="admin" id="adminTabBtn" style="display: none;">👨‍💼 Admin</button>
```

### JavaScript Function: applyRoleBasedVisibility()

**Location:** app.js (lines 753-810)

**Called During:** App initialization (init method, line 121)

**Logic:**
```javascript
applyRoleBasedVisibility() {
    // Get current user role from this.userRole
    // Controls three main elements:
    // 1. Sidebar visibility (#mainSidebar)
    // 2. Navigation link visibility (.nav-link)
    // 3. Admin tab visibility (#adminTabBtn)
    
    if (role === 'viewer') {
        // Hide sidebar completely
        // Hide all nav links
        // Force dashboard display
    } else if (role === 'user') {
        // Show sidebar
        // Show all nav links EXCEPT admin
        // Hide admin tab in Settings
    } else if (role === 'admin') {
        // Show sidebar
        // Show ALL nav links including admin
        // Show admin tab in Settings
    }
}
```

---

## How It Works

### 1. Role Determination
- User role is set during Google Authentication
- Stored in `this.userRole` property
- Possible values: 'admin', 'user', 'viewer'

### 2. Visibility Application
- Called during app initialization (line 121 in init())
- Executes after setupSectionHandlers() completes
- Modifies CSS display property for role-specific elements

### 3. Dynamic Control Points
- **Sidebar:** `document.getElementById('mainSidebar').style.display`
- **Nav Links:** `document.querySelectorAll('.nav-link').style.display`
- **Admin Tab:** `document.getElementById('adminTabBtn').style.display`

---

## Testing Checklist

### Viewer Role Test
- [ ] Sidebar is hidden
- [ ] No navigation links visible
- [ ] Dashboard displays correctly
- [ ] Cannot navigate to other sections
- [ ] Page is read-only

### User Role Test
- [ ] Sidebar is visible
- [ ] Can see Dashboard, Student Data, Payments, Settings nav links
- [ ] Admin nav link is hidden
- [ ] Admin tab in Settings is hidden
- [ ] Can navigate to all visible sections
- [ ] Can perform actions in all sections

### Admin Role Test
- [ ] Sidebar is visible
- [ ] Can see ALL nav links including Admin
- [ ] Admin tab in Settings is visible
- [ ] Can navigate to Admin section
- [ ] Can manage user approvals
- [ ] Can manage system settings

---

## Related Features

### Payment System (Implemented in Phase 1)
- Student and department-specific payments
- Cost tracking with monthly/total calculations
- Collection tracking per department
- Works across all user roles within their access level

### User Approval System
- Accessible only to Admins
- Located in Settings → Admin tab or Admin section
- Shows pending and approved users
- Allows role assignment

### Dashboard
- Visible to all roles
- Content adapts based on user role
- Shows statistics for accessible features

---

## Notes

- Sidebar ID is required for JavaScript control: `id="mainSidebar"`
- Navigation links require data-section attribute: `data-section="[section-name]"`
- Admin tab button requires ID for Settings tab: `id="adminTabBtn"`
- Function must be called during initialization after UI setup
- User role must be set before function execution

---

**Last Updated:** Latest implementation
**Status:** ✅ Implementation Complete - Ready for Testing
