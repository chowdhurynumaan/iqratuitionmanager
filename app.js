// ==================== ADMIN EMAIL CONFIGURATION ====================
// Change this to your email to be the admin
const ADMIN_EMAIL = 'chowdhurynumaan@gmail.com';

// ==================== DATA MANAGEMENT ====================

class TuitionManager {
    constructor() {
        // Initialize with default/empty values, will load async
        this.families = [];
        this.departments = []; // New: Dynamic departments
        this.departmentSchedules = []; // New: Department times and days
        this.tuitionRates = this.getDefaultRates();
        this.discounts = this.getDefaultDiscounts();
        this.academicYear = '2024-2025';
        this.nextRGNumber = 1001;
        this.payments = [];
        this.transactionCounter = 1000;
        this.userRole = 'viewer'; // Default role: 'admin', 'user', or 'viewer'
        
        // Load data asynchronously
        this.loadAllData();
    }

    async loadAllData() {
        try {
            // Wait for Firebase to be initialized
            console.log('Waiting for Firebase to be ready...');
            await this.waitForFirebase();
            console.log('Firebase is ready, loading data...');
            
            const familiesData = await this.loadData('families');
            this.families = familiesData || [];
            
            const departmentsData = await this.loadData('departments');
            this.departments = departmentsData || [];
            
            const schedulesData = await this.loadData('departmentSchedules');
            this.departmentSchedules = schedulesData || [];
            
            const ratesData = await this.loadData('tuitionRates');
            this.tuitionRates = ratesData || this.getDefaultRates();
            
            const discountsData = await this.loadData('discounts');
            this.discounts = discountsData || this.getDefaultDiscounts();
            
            const yearData = await this.loadData('academicYear');
            this.academicYear = yearData || '2024-2025';
            
            const rgData = await this.loadData('nextRGNumber');
            this.nextRGNumber = rgData || 1001;
            
            const paymentsData = await this.loadData('payments');
            this.payments = paymentsData || [];
            
            const counterData = await this.loadData('transactionCounter');
            this.transactionCounter = counterData || 1000;
            
            console.log('✓ All data loaded from Firebase');
            console.log('Initializing UI...');
            
            // Initialize UI after data loads
            this.init();
        } catch (error) {
            console.error('Failed to load data from Firebase:', error);
            console.error('Error details:', error.message);
            alert('Error: Cannot load data from Firebase.\n\nDetails: ' + error.message + '\n\nPlease check:\n1. Firebase scripts loaded in HTML\n2. Network connection\n3. Firebase project configuration');
        }
    }

    waitForFirebase() {
        return new Promise((resolve, reject) => {
            const maxWait = 10000; // 10 seconds max wait
            const startTime = Date.now();
            
            const checkFirebase = () => {
                // Check if firebase is loaded and has been initialized
                if (window.firebase && typeof window.firebase.firestore === 'function') {
                    try {
                        const db = window.firebase.firestore();
                        if (db) {
                            console.log('✓ Firebase Firestore is ready');
                            resolve();
                            return;
                        }
                    } catch (e) {
                        // Firebase not ready yet
                    }
                }
                
                if (Date.now() - startTime > maxWait) {
                    reject(new Error('Firebase initialization timeout - Firestore not available'));
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            checkFirebase();
        });
    }

    // Generate unique transaction ID like VIN (universally unique across all families/students)
    generateTransactionId() {
        this.transactionCounter++;
        this.saveData('transactionCounter', this.transactionCounter);
        const timestamp = Date.now().toString(36).toUpperCase();
        const counter = this.transactionCounter.toString(36).toUpperCase();
        return `TXN-${timestamp}-${counter}`;
    }

    init() {
        // Verify XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            console.error('⚠ XLSX library not loaded. Excel export/import will not work.');
        } else {
            console.log('✓ XLSX library loaded successfully');
        }

        this.setupEventListeners();
        this.setupSectionHandlers();
        this.applyRoleBasedVisibility();
        this.loadTuitionRates();
        this.loadDiscounts();
        this.displayStudentCards();
        this.displayStudentsTable();
        this.displayDepartments();
        this.displaySchedules();
        this.updateDashboard();
        this.setupModalHandlers();
    }

    // ==================== MODAL NOTIFICATIONS ====================

    showNotification(title, message) {
        document.getElementById('notificationTitle').textContent = title;
        document.getElementById('notificationMessage').textContent = message;
        document.getElementById('notificationModal').classList.remove('hidden');
    }

    showConfirmation(title, message, onYes) {
        document.getElementById('confirmationTitle').textContent = title;
        document.getElementById('confirmationMessage').textContent = message;
        const modal = document.getElementById('confirmationModal');
        modal.classList.remove('hidden');
        
        const yesBtn = document.getElementById('confirmationYesBtn');
        const noBtn = document.getElementById('confirmationNoBtn');
        
        const handleYes = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            onYes();
        };
        
        const handleNo = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
        };
        
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    }

    showInputModal(title, message, defaultValue = '', onSubmit) {
        document.getElementById('inputModalTitle').textContent = title;
        document.getElementById('inputModalMessage').textContent = message;
        const input = document.getElementById('inputModalInput');
        input.value = defaultValue;
        
        const modal = document.getElementById('inputModal');
        modal.classList.remove('hidden');
        input.focus();
        
        const okBtn = document.getElementById('inputModalOkBtn');
        const cancelBtn = document.getElementById('inputModalCancelBtn');
        
        const handleOk = () => {
            const value = input.value;
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleEnter);
            onSubmit(value);
        };
        
        const handleCancel = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleEnter);
            onSubmit(null);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                handleOk();
            }
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleEnter);
    }

    setupModalHandlers() {
        document.getElementById('notificationOkBtn').addEventListener('click', () => {
            document.getElementById('notificationModal').classList.add('hidden');
        });
        
        // Close modals on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const notifModal = document.getElementById('notificationModal');
                const confirmModal = document.getElementById('confirmationModal');
                const inputModal = document.getElementById('inputModal');
                if (!notifModal.classList.contains('hidden')) {
                    notifModal.classList.add('hidden');
                }
                if (!confirmModal.classList.contains('hidden')) {
                    confirmModal.classList.add('hidden');
                }
                if (!inputModal.classList.contains('hidden')) {
                    inputModal.classList.add('hidden');
                }
            }
        });
    }

    clearAllPayments() {
        this.payments = [];
        this.saveData('payments', this.payments);
        this.updateDashboard();
        this.displayStudentCards();
        this.showNotification('Success', 'All payment records have been cleared');
    }

    // ==================== DATA PERSISTENCE ====================

    saveData(key, value) {
        try {
            // Save ONLY to Firebase - no local storage fallback
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                db.collection('shared_data').doc(key).set({
                    value: value,
                    updatedAt: new Date(),
                    updatedBy: window.location.hostname
                }).catch(error => {
                    console.error('Firebase write error:', error);
                    throw error; // Don't silently fail
                });
            } else {
                console.error('Firebase not initialized - cannot save data');
                throw new Error('Firebase required for data persistence');
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    }

    loadData(key) {
        // Load ONLY from Firebase - no local storage fallback
        if (!window.firebase) {
            return Promise.reject(new Error('Firebase SDK not loaded'));
        }
        
        try {
            const db = window.firebase.firestore();
            return new Promise((resolve, reject) => {
                db.collection('shared_data').doc(key).get()
                    .then(doc => {
                        if (doc.exists && doc.data().value !== undefined) {
                            console.log(`✓ Loaded ${key} from Firebase`);
                            resolve(doc.data().value);
                        } else {
                            console.log(`- No data for ${key} in Firebase (will use defaults)`);
                            resolve(null); // No data in Firebase, return null
                        }
                    })
                    .catch(error => {
                        console.error(`Firebase read error for ${key}:`, error);
                        reject(error);
                    });
            });
        } catch (error) {
            console.error('Error getting Firestore instance:', error);
            return Promise.reject(error);
        }
    }

    async loadDataFromFirebase(key) {
        try {
            if (!window.firebase || !window.firebase.firestore) return null;
            const db = window.firebase.firestore();
            const doc = await db.collection('shared_data').doc(key).get();
            if (doc.exists) {
                return doc.data().value;
            }
        } catch (error) {
            console.warn('Firebase load error:', error);
        }
        return null;
    }

    async initializeFromFirebase() {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                console.error('Firebase is REQUIRED - not available!');
                throw new Error('Firebase must be initialized');
            }
            
            const db = window.firebase.firestore();
            const keys = ['families', 'tuitionRates', 'discounts', 'academicYear', 'nextRGNumber', 'payments', 'transactionCounter'];
            
            console.log('Loading data from shared Firebase...');
            for (const key of keys) {
                try {
                    const doc = await db.collection('shared_data').doc(key).get();
                    if (doc.exists) {
                        const data = doc.data().value;
                        if (key === 'families') this.families = data;
                        else if (key === 'tuitionRates') this.tuitionRates = data;
                        else if (key === 'discounts') this.discounts = data;
                        else if (key === 'academicYear') this.academicYear = data;
                        else if (key === 'nextRGNumber') this.nextRGNumber = data;
                        else if (key === 'payments') this.payments = data;
                        else if (key === 'transactionCounter') this.transactionCounter = data;
                    }
                } catch (e) {
                    console.warn(`Error loading ${key}:`, e);
                }
            }
            console.log('✓ Shared data loaded from Firebase');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    // ==================== DEFAULTS ====================

    getDefaultRates() {
        return {
            Summer: { full: 0, monthly: 0 },
            Weekend: { annual: 0, monthly: 0 },
            Evening: { annual: 0, monthly: 0 },
            FullTime: { annual: 0, monthly: 0 }
        };
    }

    getDefaultDiscounts() {
        return {
            sibling: 0,
            multiDept: 0,
            monthlyPremium: 0
        };
    }

    // ==================== REGISTRATION LOGIC ====================

    registerFamily(formData) {
        const family = {
            rgNumber: this.nextRGNumber,
            parentName1: formData.parentName1,
            parentPhone1: formData.parentPhone1,
            parentName2: formData.parentName2 || '',
            parentPhone2: formData.parentPhone2 || '',
            children: formData.children,
            registeredDate: new Date().toISOString(),
            status: 'Active'
        };

        this.families.push(family);
        this.nextRGNumber++;
        
        this.saveData('families', this.families);
        this.saveData('nextRGNumber', this.nextRGNumber);

        return family;
    }

    // ==================== TUITION CALCULATION ====================

    calculateTuition(family) {
        let total = 0;
        const details = {
            subtotal: 0,
            siblingDiscount: 0,
            multiDeptDiscount: 0,
            monthlyPremium: 0,
            total: 0,
            breakdown: []
        };

        family.children.forEach((child, childIndex) => {
            let childTotal = 0;
            const childBreakdown = { name: child.name, departments: [] };

            // Calculate per department cost
            child.departments.forEach(dept => {
                let deptCost = this.getDepartmentCost(dept);
                childBreakdown.departments.push({ name: dept, cost: deptCost });
                childTotal += deptCost;
                console.log(`[Tuition] Child: ${child.name}, Dept: ${dept}, Cost: ${deptCost}`);
            });

            // Apply sibling discount (2nd and subsequent children)
            if (childIndex > 0) {
                const siblingDiscountAmount = childTotal * (this.discounts.sibling / 100);
                details.siblingDiscount += siblingDiscountAmount;
                childTotal -= siblingDiscountAmount;
            }

            // Apply multi-department discount if child has 2+ departments
            if (child.departments.length > 1) {
                const multiDeptDiscountAmount = childTotal * (this.discounts.multiDept / 100);
                details.multiDeptDiscount += multiDeptDiscountAmount;
                childTotal -= multiDeptDiscountAmount;
            }

            details.subtotal += childTotal;
            details.breakdown.push(childBreakdown);
        });

        details.total = details.subtotal;
        console.log(`[Tuition] Final totalDue: ${details.total}`);
        return details;
    }

    getDepartmentCost(dept) {
        // Look up department by name in this.departments array
        const department = this.departments.find(d => d.name === dept);
        if (!department) return 0;
        return department.fullAmount || 0;
    }

    // ==================== PAYMENT MANAGEMENT ====================

    recordPayment(payment) {
        const newPayment = {
            id: Date.now(),
            rgNumber: payment.rgNumber,
            familyName: payment.familyName,
            amount: parseFloat(payment.amount),
            method: payment.method,
            date: payment.date,
            notes: payment.notes || '',
            timestamp: new Date().toISOString()
        };

        this.payments.push(newPayment);
        this.saveData('payments', this.payments);

        return newPayment;
    }

    getFamilyPaymentStatus(rgNumber) {
        const family = this.families.find(f => f.rgNumber === rgNumber);
        if (!family) return null;

        const tuitionDetails = this.calculateTuition(family);
        const familyPayments = this.payments.filter(p => p.rgNumber === rgNumber);
        
        let totalPaid = 0;
        // Only count active payments (not voided or superseded)
        familyPayments.forEach(p => {
            if (p.status !== 'voided' && !p.isSuperseded) {
                totalPaid += p.amount;
            }
        });

        const totalDue = tuitionDetails.total;
        const remaining = Math.max(0, totalDue - totalPaid);

        // Debug log
        console.log(`Family ${rgNumber}: totalDue=${totalDue}, totalPaid=${totalPaid}, children:`, family.children);

        // Determine status: if totalDue is 0, no departments assigned yet
        let status;
        if (totalDue === 0) {
            status = 'Not Enrolled'; // No departments assigned
        } else if (remaining === 0) {
            status = 'Paid'; // Has tuition and fully paid
        } else if (totalPaid > 0) {
            status = 'Partial'; // Has tuition and partially paid
        } else {
            status = 'Pending'; // Has tuition but nothing paid yet
        }

        return {
            rgNumber,
            familyName: family.parentName1,
            totalDue,
            totalPaid,
            remaining,
            status,
            payments: familyPayments
        };
    }

    // ==================== TUITION SETTINGS ====================

    setupEventListeners() {
        // Add Family button
        const addCardBtn = document.getElementById('addCardBtn');
        if (addCardBtn) {
            addCardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openFamilyModal();
            });
        }

        // Card click delegation - attach once to document
        const self = this;
        document.addEventListener('click', function(e) {
            const card = e.target.closest('.family-card-compact, .family-card');
            if (!card) return;
            
            const rgNumber = parseInt(card.dataset.rg);
            
            // Handle edit button
            if (e.target.closest('.card-edit')) {
                e.stopPropagation();
                self.openFamilyModal(rgNumber);
                return;
            }
            
            // Handle payment button
            if (e.target.closest('.card-payment')) {
                e.stopPropagation();
                e.preventDefault();
                const family = self.families.find(f => f.rgNumber === rgNumber);
                if (family) {
                    self.openPaymentModalForFamily(rgNumber, family.parentName1);
                }
                return;
            }
            
            // Handle delete button
            if (e.target.closest('.card-delete')) {
                e.stopPropagation();
                self.showDeleteConfirmModal(rgNumber);
                return;
            }
        });

        // Family Form submission
        document.getElementById('familyForm').addEventListener('submit', (e) => this.handleFamilyFormSubmit(e));

        // Add student button
        document.getElementById('addStudentBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.addStudentInput();
        });

        // Family Modal - close button listeners
        const familyModal = document.getElementById('familyModal');
        familyModal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeFamilyModal());
        });

        familyModal.addEventListener('click', (e) => {
            if (e.target === familyModal) {
                this.closeFamilyModal();
            }
        });

        // Payment Search/Filter
        const searchPayment = document.getElementById('searchPayment');
        const paymentStatus = document.getElementById('paymentStatus');
        if (searchPayment) {
            searchPayment.addEventListener('input', () => this.displayPaymentsList());
        }
        if (paymentStatus) {
            paymentStatus.addEventListener('change', () => this.displayPaymentsList());
        }

        // Settings
        const tabBtns = document.querySelectorAll('.tab-btn');
        console.log('Found', tabBtns.length, 'tab buttons');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab) {
                console.log('Attaching listener to tab:', btn.dataset.tab);
                btn.addEventListener('click', (e) => {
                    console.log('Tab clicked:', btn.dataset.tab);
                    e.preventDefault();
                    this.switchTab(btn);
                });
            }
        });

        // Sign Out Button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to sign out?')) {
                    handleSignOut();
                }
            });
        }

        document.getElementById('saveTuitionBtn')?.addEventListener('click', () => this.saveTuitionRates());
        document.getElementById('saveDiscountsBtn')?.addEventListener('click', () => this.saveDiscountSettings());
        document.getElementById('saveYearBtn')?.addEventListener('click', () => this.saveYearSettings());

        // Export/Import
        document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => this.downloadTemplate());
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importFromExcel(e));

        // Department Management
        const addDeptBtn = document.getElementById('addDepartmentBtn');
        if (addDeptBtn) {
            addDeptBtn.addEventListener('click', () => this.openDepartmentModal());
        }

        const saveDeptBtn = document.getElementById('saveDepartmentBtn');
        if (saveDeptBtn) {
            saveDeptBtn.addEventListener('click', () => this.saveDepartment());
        }

        const cancelDeptBtn = document.getElementById('cancelDepartmentBtn');
        if (cancelDeptBtn) {
            cancelDeptBtn.addEventListener('click', () => {
                document.getElementById('departmentModal').classList.add('hidden');
            });
        }

        // View Toggle for Student Data
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const view = btn.dataset.view;
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
                const viewContent = document.getElementById(view + 'View');
                if (viewContent) viewContent.classList.add('active');
                
                if (view === 'table') {
                    this.displayStudentsTable();
                } else {
                    this.displayStudentCards();
                }
            });
        });

        // Search Students
        const searchInput = document.getElementById('searchStudents');
        console.log('Search input element:', searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                console.log('Search input event triggered, query:', query);
                this.filterStudents(query);
            });
            console.log('Search event listener attached');
        } else {
            console.warn('Search input element not found');
        }

        // Modal close buttons for department modal
        document.querySelectorAll('#departmentModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('departmentModal').classList.add('hidden');
            });
        });

        // Payment Modal
        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) {
            paymentModal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
                btn.addEventListener('click', () => this.closePaymentModal());
            });

            paymentModal.addEventListener('click', (e) => {
                if (e.target === paymentModal) {
                    this.closePaymentModal();
                }
            });
        }

        // Payment Form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentRecord(e));
        }

        // Payment Form: Student selection change
        const paymentStudentSelect = document.getElementById('paymentStudent');
        if (paymentStudentSelect) {
            paymentStudentSelect.addEventListener('change', (e) => this.populatePaymentDepartments(e.target.value));
        }

        // Hamburger menu toggle for mobile
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navMenu = document.getElementById('navMenu');
        if (hamburgerBtn && navMenu) {
            hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navMenu.classList.toggle('active');
                hamburgerBtn.classList.toggle('active');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.sidebar')) {
                    navMenu.classList.remove('active');
                    hamburgerBtn.classList.remove('active');
                }
            });
        }

        // Initial display
        this.displayStudentCards();
    }

    switchSection(sectionName) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        document.getElementById(sectionName).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        if (sectionName === 'register') {
            this.displayStudentCards();
        } else if (sectionName === 'payments') {
            this.displayPaymentsList();
        }
    }

    setupSectionHandlers() {
        // Navigation click handlers
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
                // Close hamburger menu on mobile
                const navMenu = document.getElementById('navMenu');
                const hamburger = document.getElementById('hamburgerBtn');
                if (navMenu && hamburger) {
                    navMenu.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            });
        });
    }

    applyRoleBasedVisibility() {
        const role = this.userRole;
        const sidebar = document.getElementById('mainSidebar');
        const adminTabBtn = document.getElementById('adminTabBtn');
        
        if (role === 'viewer') {
            // Viewers see ONLY dashboard - hide entire sidebar
            if (sidebar) sidebar.style.display = 'none';
            
            // Hide all nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.style.display = 'none';
            });
            
            // Show only dashboard
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const dashboard = document.getElementById('dashboard');
            if (dashboard) dashboard.classList.add('active');
            
        } else if (role === 'user') {
            // Users see everything except admin tab
            if (sidebar) sidebar.style.display = '';
            
            // Show all nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.style.display = '';
            });
            
            // Hide admin tab in Settings
            if (adminTabBtn) adminTabBtn.style.display = 'none';
            
        } else if (role === 'admin') {
            // Admins see everything
            if (sidebar) sidebar.style.display = '';
            
            // Show all nav links
            document.querySelectorAll('.nav-link').forEach(link => {
                link.style.display = '';
            });
            
            // Show admin tab in Settings
            if (adminTabBtn) adminTabBtn.style.display = '';
        }
    }

    switchTab(tabBtn) {
        console.log('switchTab called with:', tabBtn);
        if (!tabBtn || !tabBtn.dataset.tab) {
            console.log('No tab or data-tab found');
            return;
        }
        
        const tabName = tabBtn.dataset.tab;
        console.log('Switching to tab:', tabName);
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tabBtn.classList.add('active');
        const tabContent = document.getElementById(tabName);
        console.log('Tab content element:', tabContent);
        if (tabContent) {
            tabContent.classList.add('active');
            console.log('Tab activated:', tabName);
            
            // Load admin data if admin tab
            if (tabName === 'admin') {
                this.loadAdminPanel();
            }
        } else {
            console.log('Tab content not found for:', tabName);
        }
    }

    // ==================== ADMIN FUNCTIONS ====================

    async loadAdminPanel() {
        // Security check: only admin can load this
        const user = firebase.auth().currentUser;
        if (!user || user.email !== ADMIN_EMAIL) {
            console.error('Unauthorized: only admin can access this');
            this.showNotification('Error', 'Unauthorized access');
            return;
        }
        
        try {
            const db = firebase.firestore();
            
            // Fetch pending approvals
            const pendingSnap = await db.collection('userApprovals')
                .where('status', '==', 'pending')
                .orderBy('requestedAt', 'desc')
                .get();
            
            // Fetch approved users
            const approvedSnap = await db.collection('userApprovals')
                .where('status', '==', 'approved')
                .orderBy('requestedAt', 'desc')
                .get();
            
            const pendingContainer = document.getElementById('adminPendingContainer');
            const pendingList = document.getElementById('pendingUsersList');
            const approvedContainer = document.getElementById('adminApprovedContainer');
            const approvedList = document.getElementById('approvedUsersList');
            
            // Show pending requests
            if (pendingSnap.size > 0) {
                pendingContainer.style.display = 'block';
                pendingList.innerHTML = '';
                
                pendingSnap.forEach(doc => {
                    const user = doc.data();
                    const requestDate = user.requestedAt ? new Date(user.requestedAt.toDate()).toLocaleDateString() : 'Unknown';
                    
                    const userDiv = document.createElement('div');
                    userDiv.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; background: #fffbeb;';
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.style.flex = '1';
                    
                    const nameP = document.createElement('p');
                    nameP.textContent = user.displayName || 'Unknown';
                    nameP.style.cssText = 'margin: 0 0 4px 0; font-weight: 600; color: #111827;';
                    
                    const emailP = document.createElement('p');
                    emailP.textContent = user.email;
                    emailP.style.cssText = 'margin: 0 0 4px 0; font-size: 13px; color: #6b7280;';
                    
                    const dateP = document.createElement('p');
                    dateP.textContent = 'Requested: ' + requestDate;
                    dateP.style.cssText = 'margin: 0; font-size: 12px; color: #9ca3af;';
                    
                    infoDiv.appendChild(nameP);
                    infoDiv.appendChild(emailP);
                    infoDiv.appendChild(dateP);
                    
                    const roleSelect = document.createElement('select');
                    roleSelect.id = 'role-' + doc.id;
                    roleSelect.className = 'form-input';
                    roleSelect.style.cssText = 'padding: 6px 10px; font-size: 12px; width: 120px;';
                    roleSelect.innerHTML = '<option value="viewer" selected>Viewer</option><option value="user">User</option><option value="admin">Admin</option>';
                    
                    const buttonsDiv = document.createElement('div');
                    buttonsDiv.style.cssText = 'display: flex; gap: 8px;';
                    
                    const approveBtn = document.createElement('button');
                    approveBtn.className = 'btn-primary';
                    approveBtn.textContent = '✓ Approve';
                    approveBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
                    approveBtn.onclick = () => app.approveUser(doc.id, user.email);
                    
                    const rejectBtn = document.createElement('button');
                    rejectBtn.className = 'btn-danger';
                    rejectBtn.textContent = '✕ Reject';
                    rejectBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
                    rejectBtn.onclick = () => app.rejectUser(doc.id, user.email);
                    
                    buttonsDiv.appendChild(approveBtn);
                    buttonsDiv.appendChild(rejectBtn);
                    
                    userDiv.appendChild(infoDiv);
                    userDiv.appendChild(roleSelect);
                    userDiv.appendChild(buttonsDiv);
                    
                    pendingList.appendChild(userDiv);
                });
            } else {
                pendingContainer.style.display = 'none';
            }
            
            // Show approved users
            if (approvedSnap.size > 0) {
                approvedList.innerHTML = '';
                approvedSnap.forEach(doc => {
                    const user = doc.data();
                    const userRole = user.role || 'viewer';
                    const approvalDate = user.approvedAt ? new Date(user.approvedAt.toDate()).toLocaleDateString() : user.requestedAt ? new Date(user.requestedAt.toDate()).toLocaleDateString() : 'Unknown';
                    const roleColors = { admin: '#fee2e2', user: '#dbeafe', viewer: '#f0fdf4' };
                    
                    const userDiv = document.createElement('div');
                    userDiv.style.cssText = `border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; background: ${roleColors[userRole]};`;
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.style.flex = '1';
                    
                    const nameP = document.createElement('p');
                    nameP.textContent = user.displayName || 'Unknown';
                    nameP.style.cssText = 'margin: 0 0 4px 0; font-weight: 600; color: #111827;';
                    
                    const emailP = document.createElement('p');
                    emailP.textContent = user.email;
                    emailP.style.cssText = 'margin: 0 0 4px 0; font-size: 13px; color: #6b7280;';
                    
                    const dateP = document.createElement('p');
                    dateP.textContent = 'Approved: ' + approvalDate;
                    dateP.style.cssText = 'margin: 0; font-size: 12px; color: #9ca3af;';
                    
                    infoDiv.appendChild(nameP);
                    infoDiv.appendChild(emailP);
                    infoDiv.appendChild(dateP);
                    
                    const roleSelect = document.createElement('select');
                    roleSelect.id = 'role-' + doc.id;
                    roleSelect.className = 'form-input';
                    roleSelect.style.cssText = 'padding: 6px 10px; font-size: 12px; width: 120px;';
                    
                    const viewerOpt = document.createElement('option');
                    viewerOpt.value = 'viewer';
                    viewerOpt.textContent = 'Viewer';
                    if (userRole === 'viewer') viewerOpt.selected = true;
                    
                    const userOpt = document.createElement('option');
                    userOpt.value = 'user';
                    userOpt.textContent = 'User';
                    if (userRole === 'user') userOpt.selected = true;
                    
                    const adminOpt = document.createElement('option');
                    adminOpt.value = 'admin';
                    adminOpt.textContent = 'Admin';
                    if (userRole === 'admin') adminOpt.selected = true;
                    
                    roleSelect.appendChild(viewerOpt);
                    roleSelect.appendChild(userOpt);
                    roleSelect.appendChild(adminOpt);
                    roleSelect.onchange = () => app.changeUserRole(doc.id, roleSelect.value);
                    
                    const revokeBtn = document.createElement('button');
                    revokeBtn.className = 'btn-danger';
                    revokeBtn.textContent = 'Revoke';
                    revokeBtn.style.cssText = 'padding: 8px 16px; font-size: 13px;';
                    revokeBtn.onclick = () => app.revokeUser(doc.id, user.email);
                    
                    userDiv.appendChild(infoDiv);
                    userDiv.appendChild(roleSelect);
                    userDiv.appendChild(revokeBtn);
                    
                    approvedList.appendChild(userDiv);
                });
            } else {
                approvedList.innerHTML = '';
                const noUsersP = document.createElement('p');
                noUsersP.textContent = 'No approved users yet';
                noUsersP.style.cssText = 'color: #9ca3af; font-size: 13px;';
                approvedList.appendChild(noUsersP);
            }
        } catch (error) {
            console.error('Error loading admin panel:', error);
        }
    }

    async approveUser(uid, email) {
        // Security check: only admin can approve users
        const user = firebase.auth().currentUser;
        if (!user || user.email !== ADMIN_EMAIL) {
            console.error('Unauthorized: only admin can approve users');
            this.showNotification('Error', 'Unauthorized');
            return;
        }
        
        try {
            // Get selected role from dropdown
            const roleSelect = document.getElementById(`role-${uid}`);
            const selectedRole = roleSelect ? roleSelect.value : 'viewer';
            
            const db = firebase.firestore();
            await db.collection('userApprovals').doc(uid).update({
                status: 'approved',
                role: selectedRole,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User approved:', email, 'with role:', selectedRole);
            this.showNotification('Success', `${email} approved as ${selectedRole}`);
            this.loadAdminPanel();
        } catch (error) {
            console.error('Error approving user:', error);
            this.showNotification('Error', 'Failed to approve user');
        }
    }

    async changeUserRole(uid, newRole) {
        // Security check: only admin can change roles
        const user = firebase.auth().currentUser;
        if (!user || user.email !== ADMIN_EMAIL) {
            console.error('Unauthorized: only admin can change roles');
            this.showNotification('Error', 'Unauthorized');
            return;
        }
        
        try {
            const db = firebase.firestore();
            await db.collection('userApprovals').doc(uid).update({
                role: newRole
            });
            console.log('User role changed to:', newRole);
            this.showNotification('Success', `Role changed to ${newRole}`);
            this.loadAdminPanel();
        } catch (error) {
            console.error('Error changing user role:', error);
            this.showNotification('Error', 'Failed to change role');
        }
    }

    async rejectUser(uid, email) {
        // Security check: only admin can reject users
        const user = firebase.auth().currentUser;
        if (!user || user.email !== ADMIN_EMAIL) {
            console.error('Unauthorized: only admin can reject users');
            this.showNotification('Error', 'Unauthorized');
            return;
        }
        
        if (!confirm(`Are you sure you want to reject ${email}?`)) return;
        
        try {
            const db = firebase.firestore();
            await db.collection('userApprovals').doc(uid).update({
                status: 'rejected',
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User rejected:', email);
            this.showNotification('Success', `${email} has been rejected`);
            this.loadAdminPanel();
        } catch (error) {
            console.error('Error rejecting user:', error);
            this.showNotification('Error', 'Failed to reject user');
        }
    }

    async revokeUser(uid, email) {
        // Security check: only admin can revoke users
        const user = firebase.auth().currentUser;
        if (!user || user.email !== ADMIN_EMAIL) {
            console.error('Unauthorized: only admin can revoke users');
            this.showNotification('Error', 'Unauthorized');
            return;
        }
        
        if (!confirm(`Are you sure you want to revoke access for ${email}?`)) return;
        
        try {
            const db = firebase.firestore();
            await db.collection('userApprovals').doc(uid).update({
                status: 'revoked',
                revokedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User revoked:', email);
            this.showNotification('Success', `${email} access has been revoked`);
            this.loadAdminPanel();
        } catch (error) {
            console.error('Error revoking user:', error);
            this.showNotification('Error', 'Failed to revoke user');
        }
    }
    // ==================== STUDENT CARD MANAGEMENT ====================

    displayStudentCards() {
        const container = document.getElementById('studentCardsContainer');
        
        if (this.families.length === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        this.families.forEach((family, index) => {
            html += this.createFamilyCard(family, index);
        });

        container.innerHTML = html;
    }

    filterStudents(query) {
        console.log('Filter called with query:', query);
        const cards = document.querySelectorAll('.family-card-compact');
        const rows = document.querySelectorAll('.student-row-data');
        console.log('Found cards:', cards.length, 'rows:', rows.length);
        let visibleCount = 0;

        // Filter cards
        cards.forEach(card => {
            const rgNumber = card.dataset.rg;
            const family = this.families.find(f => f.rgNumber === parseInt(rgNumber));
            if (!family) return;

            const matchesQuery = 
                rgNumber.toLowerCase().includes(query) ||
                family.parentName1.toLowerCase().includes(query) ||
                family.parentName2.toLowerCase().includes(query) ||
                family.children.some(c => c.name.toLowerCase().includes(query));

            if (matchesQuery) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Filter table rows
        rows.forEach(row => {
            const rgNumber = row.dataset.rg;
            const studentName = row.dataset.student;
            const familyName = row.dataset.family;

            const matchesQuery =
                rgNumber.toLowerCase().includes(query) ||
                studentName.toLowerCase().includes(query) ||
                familyName.toLowerCase().includes(query);

            if (matchesQuery) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Show/hide empty state based on active view
        const isTableViewActive = document.getElementById('tableView').classList.contains('active');
        const isCardsViewActive = document.getElementById('cardsView').classList.contains('active');
        
        if (isTableViewActive) {
            const visibleRows = document.querySelectorAll('.student-row-data:not([style*="display: none"])');
            let emptyMessage = document.querySelector('.empty-state-no-results');
            
            if (visibleRows.length === 0 && query) {
                if (!emptyMessage) {
                    emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-state empty-state-no-results';
                    emptyMessage.style.textAlign = 'center';
                    emptyMessage.style.padding = '30px';
                    emptyMessage.style.gridColumn = '1/-1';
                    document.getElementById('studentsTableBody').appendChild(emptyMessage);
                }
                emptyMessage.textContent = 'No students found matching "' + query + '"';
                emptyMessage.style.display = '';
            } else if (emptyMessage) {
                emptyMessage.style.display = 'none';
            }
        }
        
        if (isCardsViewActive) {
            const visibleCards = document.querySelectorAll('.family-card-compact:not([style*="display: none"])');
            let emptyMessage = document.querySelector('.empty-state-no-results');
            
            if (visibleCards.length === 0 && query) {
                if (!emptyMessage) {
                    emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-state empty-state-no-results';
                    emptyMessage.style.textAlign = 'center';
                    emptyMessage.style.padding = '30px';
                    emptyMessage.style.gridColumn = '1/-1';
                    document.getElementById('studentCardsContainer').appendChild(emptyMessage);
                }
                emptyMessage.textContent = 'No families found matching "' + query + '"';
                emptyMessage.style.display = '';
            } else if (emptyMessage) {
                emptyMessage.style.display = 'none';
            }
        }
    }

    createFamilyCard(family, index) {
        const studentsList = family.children.map((child, sn) => {
            const dob = new Date(child.dob).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
            return `
                <div class="student-row">
                    <div class="student-name-compact">${child.name}</div>
                    <div class="student-meta-compact">
                        <span>${child.gender.substring(0, 1)}</span>
                        <span>${dob}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="family-card-compact" data-rg="${family.rgNumber}" data-family-name="${family.parentName1.replace(/"/g, '&quot;')}">
                <div class="card-header-compact">
                    <div class="card-id">ID: ${family.rgNumber}</div>
                    <div class="card-actions">
                        <button class="btn-icon card-edit" title="Edit">✎</button>
                        <button class="btn-icon card-payment" title="Payment">💳</button>
                        <button class="btn-icon btn-danger card-delete" title="Delete">🗑</button>
                    </div>
                </div>
                
                <div class="parents-compact">
                    <div class="parent-box father">
                        <div class="parent-icon">👨</div>
                        <div class="parent-info">
                            <div class="parent-name-compact">${family.parentName1}</div>
                            <div class="parent-id-compact">${family.parentPhone1}</div>
                        </div>
                    </div>
                    <div class="parent-box mother">
                        <div class="parent-icon">👩</div>
                        <div class="parent-info">
                            <div class="parent-name-compact">${family.parentName2 || 'N/A'}</div>
                            <div class="parent-id-compact">${family.parentPhone2 || ''}</div>
                        </div>
                    </div>
                </div>
                
                <div class="students-list-compact">
                    ${studentsList}
                </div>
            </div>
        `;
    }

    openFamilyModal(rgNumber = null) {
        const modal = document.getElementById('familyModal');
        const form = document.getElementById('familyForm');
        const title = document.getElementById('modalTitle');

        if (rgNumber) {
            // Edit mode
            const family = this.families.find(f => f.rgNumber === rgNumber);
            if (!family) return;

            title.innerHTML = `<span class="modal-title-main">Edit Family</span><span class="modal-title-id">ID: ${rgNumber}</span>`;
            document.getElementById('fatherName').value = family.parentName1;
            document.getElementById('fatherPhone').value = family.parentPhone1;
            document.getElementById('motherName').value = family.parentName2 || '';
            document.getElementById('motherPhone').value = family.parentPhone2 || '';
            document.getElementById('additionalName').value = family.additionalName || '';
            document.getElementById('additionalPhone').value = family.additionalPhone || '';

            document.getElementById('studentsContainer').innerHTML = '';
            family.children.forEach(child => {
                this.addStudentInput(child);
            });

            form.dataset.rgNumber = rgNumber;
        } else {
            // Add mode
            title.innerHTML = '<span class="modal-title-main">Add New Family</span>';
            form.reset();
            document.getElementById('studentsContainer').innerHTML = '';
            this.addStudentInput();
            delete form.dataset.rgNumber;
        }

        modal.classList.remove('hidden');
    }

    closeFamilyModal() {
        document.getElementById('familyModal').classList.add('hidden');
        document.getElementById('familyForm').reset();
        document.getElementById('studentsContainer').innerHTML = '';
    }

    openPaymentModalForFamily(rgNumber, familyName) {
        const modal = document.getElementById('paymentModal');
        if (!modal) return;
        
        const paymentRGEl = document.getElementById('paymentRG');
        const paymentFormEl = document.getElementById('paymentForm');
        const paymentDateEl = document.getElementById('paymentDate');
        const paymentAmountEl = document.getElementById('paymentAmount');
        const paymentMethodEl = document.getElementById('paymentMethod');
        const paymentStudentEl = document.getElementById('paymentStudent');
        const paymentDeptEl = document.getElementById('paymentDepartment');
        
        if (!paymentRGEl || !paymentFormEl) return;
        
        // Set RG number
        paymentRGEl.value = rgNumber;
        paymentFormEl.dataset.rgNumber = rgNumber;
        
        // Update modal header with family name
        const headerEl = modal.querySelector('.payment-card-header h2');
        if (headerEl) {
            headerEl.textContent = 'Record Payment - ' + familyName + ' (RG# ' + rgNumber + ')';
        }
        
        // Set today's date
        if (paymentDateEl) {
            paymentDateEl.valueAsDate = new Date();
        }
        
        // Reset amount and method
        if (paymentAmountEl) paymentAmountEl.value = '';
        if (paymentMethodEl) paymentMethodEl.value = '';
        
        // Populate students list
        this.populatePaymentStudents(rgNumber);
        
        // Reset department list
        if (paymentDeptEl) {
            paymentDeptEl.innerHTML = '<option value="">Select Department</option>';
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Display payment history
        try {
            this.displayPaymentHistory(rgNumber);
        } catch (err) {
            console.error('Error displaying payment history:', err);
        }
    }

    populatePaymentStudents(rgNumber) {
        const family = this.families.find(f => f.rgNumber === rgNumber);
        const studentSelect = document.getElementById('paymentStudent');
        
        if (!studentSelect || !family) return;
        
        studentSelect.innerHTML = '<option value="">Select Student</option>';
        
        family.children.forEach(child => {
            const option = document.createElement('option');
            option.value = child.name;
            option.textContent = child.name;
            studentSelect.appendChild(option);
        });
    }

    populatePaymentDepartments(studentName) {
        const paymentFormEl = document.getElementById('paymentForm');
        const rgNumber = parseInt(paymentFormEl.dataset.rgNumber);
        const family = this.families.find(f => f.rgNumber === rgNumber);
        const deptSelect = document.getElementById('paymentDepartment');
        
        if (!deptSelect || !family) return;
        
        deptSelect.innerHTML = '<option value="">Select Department</option>';
        
        // Find the student's departments
        const student = family.children.find(c => c.name === studentName);
        if (student && student.departments) {
            student.departments.forEach(deptName => {
                const dept = this.departments.find(d => d.name === deptName);
                if (dept) {
                    const option = document.createElement('option');
                    option.value = deptName;
                    const monthlyAmount = this.calculateMonthlyAmount(dept.fullAmount, dept.startDate, dept.endDate);
                    option.textContent = `${deptName} - $${monthlyAmount.toFixed(2)}/month`;
                    deptSelect.appendChild(option);
                }
            });
        }
    }

    displayPaymentHistory(rgNumber) {
        try {
            const breakdownPanel = document.getElementById('paymentBreakdownContent');
            const historyPanel = document.getElementById('paymentHistoryContent');
            
            if (!breakdownPanel || !historyPanel) return;
            
            const family = this.families.find(f => f.rgNumber === rgNumber);
            if (!family) return;

            // Get tuition breakdown
            const breakdown = this.calculateTuitionBreakdown(rgNumber);
            const totalDue = breakdown.totalDue;
            const totalPaid = breakdown.totalPaid;
            const totalRemaining = Math.max(0, totalDue - totalPaid);

            // ==================== BREAKDOWN PANEL ====================
            let breakdownHtml = '';
            
            // Summary stats
            breakdownHtml += `
                <div class="summary-stats">
                    <div class="stat-box">
                        <span class="label">Total Due</span>
                        <span class="value">$${totalDue.toFixed(2)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="label">Total Paid</span>
                        <span class="value">$${totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="label">Remaining</span>
                        <span class="value">$${totalRemaining.toFixed(2)}</span>
                    </div>
                </div>
            `;
            
            // Children breakdown scroll area
            breakdownHtml += `<div class="breakdown-scroll">`;
            
            if (breakdown.children.length > 0) {
                breakdown.children.forEach(child => {
                    const childRemaining = Math.max(0, child.totalDue - child.totalPaid);
                    
                    breakdownHtml += `
                        <div class="breakdown-item">
                            <div class="breakdown-item-header">${child.name}</div>
                            <div class="breakdown-item-summary">
                                <div class="summary-cell">
                                    <span class="label">Due</span>
                                    <span class="value">$${child.totalDue.toFixed(2)}</span>
                                </div>
                                <div class="summary-cell">
                                    <span class="label">Paid</span>
                                    <span class="value">$${child.totalPaid.toFixed(2)}</span>
                                </div>
                                <div class="summary-cell">
                                    <span class="label">Rem</span>
                                    <span class="value">$${childRemaining.toFixed(2)}</span>
                                </div>
                            </div>
                    `;
                    
                    // Departments for this child
                    if (child.departments.length > 0) {
                        breakdownHtml += `<div class="sub-items">`;
                        child.departments.forEach(dept => {
                            const deptRemaining = Math.max(0, dept.due);
                            
                            breakdownHtml += `
                                <div class="sub-item">
                                    <div class="sub-item-name">${dept.name}</div>
                                    <div class="sub-item-costs">
                                        <div class="cost-cell">
                                            <span class="label">Full</span>
                                            <span class="value">$${dept.amount.toFixed(2)}</span>
                                        </div>
                                        <div class="cost-cell">
                                            <span class="label">Paid</span>
                                            <span class="value">$${dept.paid.toFixed(2)}</span>
                                        </div>
                                        <div class="cost-cell due-amount">
                                            <span class="label">Due</span>
                                            <span class="value">$${deptRemaining.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        });
                        breakdownHtml += `</div>`;
                    }
                    
                    breakdownHtml += `</div>`;
                });
            }
            
            breakdownHtml += `</div>`;
            breakdownPanel.innerHTML = breakdownHtml;

            // ==================== HISTORY PANEL ====================
            const familyPayments = this.payments.filter(p => p.rgNumber === rgNumber && p.status !== 'deleted');
            
            let historyHtml = '';
            
            if (familyPayments.length === 0) {
                historyHtml = '<p style="text-align: center; padding: 12px; font-size: 12px; color: #9ca3af; font-style: italic;">No payments recorded yet</p>';
            } else {
                // Sort by date descending (newest first)
                familyPayments.sort((a, b) => new Date(b.editedAt || b.date) - new Date(a.editedAt || a.date));
                
                familyPayments.forEach(payment => {
                    const date = new Date(payment.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                    const amount = parseFloat(payment.amount) || 0;
                    const txnId = payment.transactionId || 'N/A';
                    
                    let entryClass = 'history-entry';
                    let statusText = '';
                    let amountDisplay = `$${amount.toFixed(2)}`;
                    
                    if (payment.status === 'voided') {
                        entryClass += ' voided';
                        statusText = '<span style="font-size: 8px; text-transform: uppercase; font-weight: 600; color: #ef4444;">VOIDED</span>';
                        amountDisplay = `<strike>$${amount.toFixed(2)}</strike>`;
                    } else if (payment.isSuperseded) {
                        entryClass += ' voided';
                        statusText = '<span style="font-size: 8px; text-transform: uppercase; font-weight: 600; color: #fbbf24;">EDITED</span>';
                        amountDisplay = `<strike>$${amount.toFixed(2)}</strike>`;
                    } else {
                        entryClass += ' active';
                        const editBadge = payment.previousAmount ? ' <span style="background: #fef08a; color: #92400e; padding: 1px 3px; border-radius: 2px; font-size: 8px; font-weight: 600;">E</span>' : '';
                        amountDisplay = `$${amount.toFixed(2)}${editBadge}`;
                    }
                    
                    historyHtml += `
                        <div class="${entryClass}" data-txn-id="${txnId}">
                            <div class="history-entry-date">${date}</div>
                            <div class="history-entry-details">
                                <div class="history-detail-row">
                                    <span class="detail-label">Student:</span>
                                    <span class="detail-value">${payment.studentName || 'N/A'}</span>
                                </div>
                                <div class="history-detail-row">
                                    <span class="detail-label">Department:</span>
                                    <span class="detail-value">${payment.departmentName || 'N/A'}</span>
                                </div>
                                <div class="history-detail-row">
                                    <span class="detail-label">${payment.method}</span>
                                </div>
                            </div>
                            <div class="history-entry-amount paid">${amountDisplay}</div>
                            <div class="history-entry-actions">
                                ${payment.status === 'voided' || payment.isSuperseded ? statusText : `
                                    <button class="history-btn btn-payment-edit" data-txn-id="${txnId}" title="Edit">✎</button>
                                    <button class="history-btn btn-payment-void" data-txn-id="${txnId}" title="Void">✕</button>
                                `}
                            </div>
                        </div>
                    `;
                });
            }
            
            historyPanel.innerHTML = historyHtml;
            this.setupPaymentHistoryListeners();
        } catch (err) {
            console.error('displayPaymentHistory error:', err);
        }
    }

    calculateTuitionBreakdown(rgNumber) {
        const family = this.families.find(f => f.rgNumber === rgNumber);
        if (!family) return { children: [], totalDue: 0, totalPaid: 0 };

        const breakdown = {
            children: [],
            totalDue: 0,
            totalPaid: 0
        };

        // First pass: calculate all departments for each student and total due
        family.children.forEach(child => {
            const childBreakdown = {
                name: child.name,
                departments: [],
                totalDue: 0,
                totalPaid: 0,
                remaining: 0
            };

            (child.departments || []).forEach(deptName => {
                const dept = this.departments.find(d => d.name === deptName);
                if (dept) {
                    // Find payments specifically for this student in this department
                    const studentDeptPayments = this.payments.filter(p => 
                        p.rgNumber === rgNumber && 
                        p.studentName === child.name && 
                        p.departmentName === deptName &&
                        p.status !== 'voided' && 
                        !p.isSuperseded
                    );
                    const paidAmount = studentDeptPayments.reduce((sum, p) => sum + parseFloat(p.amount) || 0, 0);

                    childBreakdown.departments.push({
                        name: deptName,
                        amount: dept.fullAmount,
                        paid: paidAmount,
                        due: Math.max(0, dept.fullAmount - paidAmount)
                    });
                    childBreakdown.totalDue += dept.fullAmount;
                    childBreakdown.totalPaid += paidAmount;
                }
            });

            breakdown.children.push(childBreakdown);
            breakdown.totalDue += childBreakdown.totalDue;
            breakdown.totalPaid += childBreakdown.totalPaid;
        });

        breakdown.children.forEach(childBreakdown => {
            childBreakdown.remaining = Math.max(0, childBreakdown.totalDue - childBreakdown.totalPaid);
        });

        return breakdown;
    }

    setupPaymentHistoryListeners() {
        const historyContainer = document.getElementById('paymentHistoryContent');
        if (!historyContainer) return;
        const self = this;

        // Edit button click
        historyContainer.querySelectorAll('.btn-payment-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const txnId = this.dataset.txnId;
                self.editPaymentTransaction(txnId);
            });
        });

        // Void button click
        historyContainer.querySelectorAll('.btn-payment-void').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const txnId = this.dataset.txnId;
                self.showConfirmation('Void Transaction', 'Are you sure you want to void this transaction?\n\nTransaction ID: ' + txnId, () => {
                    self.voidPaymentTransaction(txnId);
                });
            });
        });
    }

    editPaymentTransaction(txnId) {
        // Find the LATEST version of this transaction (the one without isSuperseded flag)
        const originalPayment = this.payments.filter(p => p.transactionId === txnId && !p.isSuperseded).pop();
        if (!originalPayment) {
            this.showNotification('Error', 'Transaction not found or already superseded');
            return;
        }

        const self = this;
        const message = 'Original Amount: $' + originalPayment.amount.toFixed(2) + '\nTransaction ID: ' + txnId;
        
        this.showInputModal('Edit Payment Amount', message, originalPayment.amount.toString(), (newAmount) => {
            if (newAmount === null) return;

            const parsedAmount = parseFloat(newAmount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                self.showNotification('Invalid Amount', 'Please enter a valid amount');
                return;
            }

            if (parsedAmount === originalPayment.amount) {
                self.showNotification('No Change', 'Amount unchanged');
                return;
            }

            // Mark the current version as superseded
            originalPayment.isSuperseded = true;
            originalPayment.supersededBy = self.generateUniqueVersion();

            // Create new row with SAME transaction ID but different version
            const newVersion = {
                transactionId: originalPayment.transactionId, // SAME ID
                rgNumber: originalPayment.rgNumber,
                amount: parsedAmount,
                method: originalPayment.method,
                date: originalPayment.date,
                status: 'active',
                previousAmount: originalPayment.amount,
                editedAt: new Date().toISOString(),
                versionMarker: originalPayment.supersededBy // unique version marker
            };

            self.payments.push(newVersion);
            self.saveData('payments', self.payments);

            self.showNotification('Success', 'Payment edited successfully!\n\nTransaction ID: ' + txnId);
            self.displayPaymentHistory(originalPayment.rgNumber);
            self.updateDashboard();
        });
    }

    generateUniqueVersion() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    voidPaymentTransaction(txnId) {
        // Find the LATEST version of this transaction (the one without isSuperseded flag)
        const payment = this.payments.filter(p => p.transactionId === txnId && !p.isSuperseded).pop();
        if (!payment) {
            this.showNotification('Error', 'Transaction not found or already superseded');
            return;
        }

        payment.status = 'voided';
        this.saveData('payments', this.payments);

        this.showNotification('Success', 'Transaction voided successfully!\n\nTransaction ID: ' + txnId);
        this.displayPaymentHistory(payment.rgNumber);
        this.updateDashboard();
    }

    handlePaymentRecord(e) {
        e.preventDefault();

        const rgNumber = parseInt(document.getElementById('paymentForm').dataset.rgNumber);
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const date = document.getElementById('paymentDate').value;
        const studentName = document.getElementById('paymentStudent').value;
        const departmentName = document.getElementById('paymentDepartment').value;

        if (!amount || !method || !date || !studentName || !departmentName) {
            this.showNotification('Missing Information', 'Please fill in all payment details including Student and Department');
            return;
        }

        const payment = {
            transactionId: this.generateTransactionId(),
            rgNumber: rgNumber,
            studentName: studentName,
            departmentName: departmentName,
            amount: amount,
            method: method,
            date: date,
            status: 'active', // Can be: active, edited, voided
            originalAmount: null, // For edited transactions
            editedFrom: null, // Transaction ID if this is an edit of another
            timestamp: new Date().toISOString()
        };

        this.payments.push(payment);
        this.saveData('payments', this.payments);

        this.showNotification('Success', 'Payment recorded successfully!\n\nStudent: ' + studentName + '\nDepartment: ' + departmentName + '\nAmount: $' + amount.toFixed(2) + '\n\nTransaction ID: ' + payment.transactionId);
        
        // Refresh the payment history display and breakdown
        this.displayPaymentHistory(rgNumber);
        
        // Refresh the family cards and dashboard
        this.displayStudentCards();
        this.displayStudentsTable();
        this.updateDashboard();
        
        // Reset form
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDate').valueAsDate = new Date();
        
        // Close payment modal
        this.closePaymentModal();
    }

    closePaymentModal() {
        document.getElementById('paymentModal').classList.add('hidden');
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentBreakdownContent').innerHTML = '';
        document.getElementById('paymentHistoryContent').innerHTML = '';
    }

    addStudentInput(student = null) {
        const template = document.getElementById('studentInputTemplate');
        const container = document.getElementById('studentsContainer');
        const newInput = template.content.cloneNode(true);

        if (student) {
            newInput.querySelector('.studentName').value = student.name;
            newInput.querySelector('.studentGender').value = student.gender;
            newInput.querySelector('.studentDOB').value = student.dob;
        }

        // Populate department checkboxes (limit to total number of departments available)
        const deptCheckboxesContainer = newInput.querySelector('.dept-checkboxes');
        deptCheckboxesContainer.innerHTML = '';
        
        this.departments.forEach((dept, idx) => {
            const checkbox = document.createElement('label');
            checkbox.className = 'dept-checkbox';
            const isSelected = student && student.departments && student.departments.includes(dept.name);
            checkbox.innerHTML = `
                <input type="checkbox" class="studentDept" value="${dept.name}" ${isSelected ? 'checked' : ''}>
                <span>${dept.name}</span>
            `;
            deptCheckboxesContainer.appendChild(checkbox);
        });

        // Add empty state if no departments
        if (this.departments.length === 0) {
            deptCheckboxesContainer.innerHTML = '<p class="hint">No departments configured yet. Add departments in Settings.</p>';
        }

        const removeBtn = newInput.querySelector('.btn-remove-student');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.target.closest('.student-input-group').remove();
        });

        container.appendChild(newInput);
    }

    handleFamilyFormSubmit(e) {
        e.preventDefault();

        const fatherName = document.getElementById('fatherName').value.trim();
        const fatherPhone = document.getElementById('fatherPhone').value.trim();
        const motherName = document.getElementById('motherName').value.trim();
        const motherPhone = document.getElementById('motherPhone').value.trim();
        const additionalName = document.getElementById('additionalName').value.trim();
        const additionalPhone = document.getElementById('additionalPhone').value.trim();

        // Validate required fields
        if (!fatherName) {
            this.showNotification('Missing Information', 'Father/Guardian name is required');
            return;
        }

        if (!fatherPhone) {
            this.showNotification('Missing Information', 'Father/Guardian phone is required');
            return;
        }

        // Validate phone format (basic: at least 10 digits)
        const phoneRegex = /^[\d\s\-\+\(\)]+$/.test(fatherPhone) && fatherPhone.replace(/\D/g, '').length >= 10;
        if (!phoneRegex) {
            this.showNotification('Invalid Phone', 'Father/Guardian phone must be valid (at least 10 digits)');
            return;
        }

        if (motherPhone && (!/^[\d\s\-\+\(\)]+$/.test(motherPhone) || motherPhone.replace(/\D/g, '').length < 10)) {
            this.showNotification('Invalid Phone', 'Mother/Guardian phone must be valid (at least 10 digits)');
            return;
        }

        if (additionalPhone && (!/^[\d\s\-\+\(\)]+$/.test(additionalPhone) || additionalPhone.replace(/\D/g, '').length < 10)) {
            this.showNotification('Invalid Phone', 'Additional contact phone must be valid (at least 10 digits)');
            return;
        }

        const students = [];
        document.querySelectorAll('.student-input-group').forEach(group => {
            const name = group.querySelector('.studentName').value.trim();
            const gender = group.querySelector('.studentGender').value;
            const dob = group.querySelector('.studentDOB').value;

            if (name && gender && dob) {
                // Get selected departments from checkboxes
                const selectedDepts = [];
                group.querySelectorAll('.studentDept:checked').forEach(checkbox => {
                    selectedDepts.push(checkbox.value);
                });

                if (selectedDepts.length === 0) {
                    this.showNotification('Missing Department', `${name} must be assigned at least one department`);
                    return;
                }

                students.push({ name, gender, dob, departments: selectedDepts });
            }
        });

        if (students.length === 0) {
            this.showNotification('Missing Student', 'Please add at least one student');
            return;
        }

        const rgNumber = parseInt(document.getElementById('familyForm').dataset.rgNumber);

        if (rgNumber) {
            // Update existing family
            const familyIndex = this.families.findIndex(f => f.rgNumber === rgNumber);
            if (familyIndex >= 0) {
                this.families[familyIndex].parentName1 = fatherName;
                this.families[familyIndex].parentPhone1 = fatherPhone;
                this.families[familyIndex].parentName2 = motherName;
                this.families[familyIndex].parentPhone2 = motherPhone;
                this.families[familyIndex].additionalName = additionalName;
                this.families[familyIndex].additionalPhone = additionalPhone;
                this.families[familyIndex].children = students;
            }
        } else {
            // Create new family
            const family = {
                rgNumber: this.nextRGNumber,
                parentName1: fatherName,
                parentPhone1: fatherPhone,
                parentName2: motherName,
                parentPhone2: motherPhone,
                additionalName: additionalName,
                additionalPhone: additionalPhone,
                children: students,
                registeredDate: new Date().toISOString(),
                status: 'Active'
            };

            this.families.push(family);
            this.nextRGNumber++;
        }

        this.saveData('families', this.families);
        this.saveData('nextRGNumber', this.nextRGNumber);

        this.closeFamilyModal();
        this.displayStudentCards();
        this.updateDashboard();
    }

    showDeleteConfirmModal(rgNumber) {
        const family = this.families.find(f => f.rgNumber === rgNumber);
        if (!family) return;

        // Create a modal for confirmation
        const modalHTML = `
            <div class="delete-confirm-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
                <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-width: 400px;">
                    <h3 style="margin-top: 0; color: #1f2937;">Delete Family</h3>
                    <p style="color: #6b7280; margin: 15px 0;">Are you sure you want to delete this family?</p>
                    <p style="color: #1f2937; font-weight: 600; margin: 15px 0;"><strong>${family.parentName1}</strong> (RG# ${rgNumber})</p>
                    <p style="color: #ef4444; font-size: 12px; margin: 15px 0;">This action cannot be undone.</p>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                        <button class="cancel-delete-btn" style="padding: 10px 20px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancel</button>
                        <button class="confirm-delete-btn" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Delete</button>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing delete modal
        const existing = document.querySelector('.delete-confirm-modal');
        if (existing) existing.remove();

        // Add the modal to the page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const self = this;
        
        // Handle cancel
        document.querySelector('.cancel-delete-btn').addEventListener('click', () => {
            document.querySelector('.delete-confirm-modal').remove();
        });

        // Handle confirm delete
        document.querySelector('.confirm-delete-btn').addEventListener('click', () => {
            document.querySelector('.delete-confirm-modal').remove();
            self.deleteFamily(rgNumber);
        });
    }

    deleteFamily(rgNumber) {
        this.families = this.families.filter(f => f.rgNumber !== rgNumber);
        this.saveData('families', this.families);
        this.displayStudentCards();
        this.updateDashboard();
    }

    loadTuitionRates() {
        Object.entries(this.tuitionRates).forEach(([dept, rates]) => {
            Object.entries(rates).forEach(([type, rate]) => {
                const input = document.querySelector(`input[data-dept="${dept}"][data-type="${type}"]`);
                if (input) input.value = rate || '';
            });
        });
    }

    loadDiscounts() {
        const siblingEl = document.getElementById('siblingDiscount');
        if (siblingEl) siblingEl.value = this.discounts.sibling || '';
        
        const multiDeptEl = document.getElementById('multiDeptDiscount');
        if (multiDeptEl) multiDeptEl.value = this.discounts.multiDept || '';
        
        const premiumEl = document.getElementById('monthlyPremium');
        if (premiumEl) premiumEl.value = this.discounts.monthlyPremium || '';
    }

    saveTuitionRates() {
        document.querySelectorAll('.deptRate').forEach(input => {
            const dept = input.dataset.dept;
            const type = input.dataset.type;
            const value = parseFloat(input.value) || 0;
            
            if (!this.tuitionRates[dept]) {
                this.tuitionRates[dept] = {};
            }
            this.tuitionRates[dept][type] = value;
        });

        this.saveData('tuitionRates', this.tuitionRates);
        this.showNotification('Success', 'Tuition rates saved successfully!');
    }

    saveDiscountSettings() {
        const siblingEl = document.getElementById('siblingDiscount');
        const multiDeptEl = document.getElementById('multiDeptDiscount');
        const premiumEl = document.getElementById('monthlyPremium');
        
        if (siblingEl) this.discounts.sibling = parseFloat(siblingEl.value) || 0;
        if (multiDeptEl) this.discounts.multiDept = parseFloat(multiDeptEl.value) || 0;
        if (premiumEl) this.discounts.monthlyPremium = parseFloat(premiumEl.value) || 0;

        this.saveData('discounts', this.discounts);
        this.showNotification('Success', 'Discount settings saved successfully!');
    }

    saveYearSettings() {
        const yearEl = document.getElementById('academicYear');
        if (yearEl) {
            this.academicYear = yearEl.value;
            this.saveData('academicYear', this.academicYear);
            this.showNotification('Success', 'Academic year settings saved successfully!');
        }
    }

    updateDashboard() {
        // Update total families
        const totalFamilies = this.families.length;
        document.getElementById('totalFamilies').textContent = totalFamilies;
        
        // Update user ID range
        if (totalFamilies > 0) {
            const firstId = this.families[0].rgNumber;
            const lastId = this.families[totalFamilies - 1].rgNumber;
            const dashboardUserIds = document.getElementById('dashboardUserIds');
            if (dashboardUserIds) {
                dashboardUserIds.textContent = `(IDs: ${firstId} - ${lastId})`;
            }
        }

        // Update total students
        const totalStudents = this.families.reduce((sum, f) => sum + f.children.length, 0);
        document.getElementById('totalStudents').textContent = totalStudents;

        // Update department enrollment counts
        const deptEnrollment = {};
        this.departments.forEach(dept => {
            deptEnrollment[dept.name] = 0;
        });
        
        this.families.forEach(family => {
            family.children.forEach(child => {
                child.departments.forEach(deptName => {
                    if (deptEnrollment.hasOwnProperty(deptName)) {
                        deptEnrollment[deptName]++;
                    }
                });
            });
        });
        
        this.displayDashboardDepartments(deptEnrollment);

        // Update payment stats - only count active and edited (final) amounts
        let totalDue = 0;
        let totalCollected = 0;
        
        this.families.forEach(family => {
            const tuition = this.calculateTuition(family);
            totalDue += tuition.total;
        });

        // Only count non-voided and non-superseded payments for collected amount
        this.payments.forEach(payment => {
            if (payment.status !== 'voided' && !payment.isSuperseded) {
                totalCollected += payment.amount;
            }
        });

        const pending = Math.max(0, totalDue - totalCollected);
        document.getElementById('pendingPayments').textContent = `$${pending.toFixed(2)}`;
        document.getElementById('totalCollected').textContent = `$${totalCollected.toFixed(2)}`;
        
        // Also update the payments list view
        this.displayPaymentsList();
    }

    displayPaymentsList() {
        const paymentsList = document.getElementById('paymentsList');
        if (!paymentsList) return;

        if (this.payments.length === 0) {
            paymentsList.innerHTML = '<p class="empty-state">No payment records</p>';
            return;
        }

        let html = '<div class="payments-table">';
        html += '<table class="payments-transaction-table">';
        html += `
            <thead>
                <tr>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Family (RG#)</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
        `;

        // Sort by date descending
        const sortedPayments = [...this.payments].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedPayments.forEach(payment => {
            const family = this.families.find(f => f.rgNumber === payment.rgNumber);
            const familyName = family ? family.parentName1 : 'Unknown';
            const date = new Date(payment.date).toLocaleDateString();
            const amount = parseFloat(payment.amount) || 0;
            const txnId = payment.transactionId || 'N/A';

            let statusClass = 'status-active';
            let statusText = 'ACTIVE';
            let amountDisplay = amount.toFixed(2);

            if (payment.status === 'voided') {
                statusClass = 'status-voided';
                statusText = 'VOIDED';
                amountDisplay = `<strike>${amount.toFixed(2)}</strike>`;
            } else if (payment.isSuperseded) {
                statusClass = 'status-edited';
                statusText = 'SUPERSEDED';
                amountDisplay = `<strike>${amount.toFixed(2)}</strike>`;
            } else if (payment.status === 'edited') {
                statusClass = 'status-edited';
                statusText = 'EDITED';
            }

            html += `
                <tr class="${statusClass}">
                    <td class="txn-id"><code>${txnId}</code></td>
                    <td>${date}</td>
                    <td>${familyName} (${payment.rgNumber})</td>
                    <td>${payment.method}</td>
                    <td class="amount">$${amountDisplay}</td>
                    <td><span class="status-label ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        paymentsList.innerHTML = html;
    }

    // ==================== DEPARTMENT MANAGEMENT ====================

    // Calculate number of months between two dates
    calculateMonthsDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return Math.max(1, months); // At least 1 month
    }

    // Calculate monthly amount based on full amount and duration
    calculateMonthlyAmount(fullAmount, startDate, endDate) {
        const months = this.calculateMonthsDuration(startDate, endDate);
        return fullAmount / months;
    }

    displayDashboardDepartments(deptEnrollment) {
        const container = document.getElementById('dashboardDeptCards');
        if (!container) return;

        if (this.departments.length === 0) {
            container.innerHTML = '<p class="empty-state" style="text-align: center; padding: 20px;">No departments configured yet. Go to Settings to add departments.</p>';
            return;
        }

        let html = '';
        this.departments.forEach(dept => {
            const enrollment = deptEnrollment[dept.name] || 0;
            const daysLeft = Math.ceil((new Date(dept.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const isExpired = daysLeft < 0;
            
            // Calculate monthly and one-time costs
            const monthlyAmount = this.calculateMonthlyAmount(dept.fullAmount, dept.startDate, dept.endDate);
            const monthsDuration = this.calculateMonthsDuration(dept.startDate, dept.endDate);
            
            // Calculate total collected for this department
            const totalCollected = this.payments
                .filter(p => p.departmentName === dept.name && p.status !== 'voided' && !p.isSuperseded)
                .reduce((sum, p) => sum + parseFloat(p.amount) || 0, 0);
            
            html += `
                <div class="dept-card">
                    <h4>${dept.name}</h4>
                    <p class="dept-dates">${new Date(dept.startDate).toLocaleDateString()} - ${new Date(dept.endDate).toLocaleDateString()}</p>
                    <div class="dept-costs">
                        <div class="cost-item">
                            <span class="cost-label">Monthly:</span>
                            <span class="cost-value">$${monthlyAmount.toFixed(2)}</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">Duration:</span>
                            <span class="cost-value">${monthsDuration} months</span>
                        </div>
                        <div class="cost-item">
                            <span class="cost-label">Total Cost:</span>
                            <span class="cost-value">$${dept.fullAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="dept-stats">
                        <div class="stat-item">
                            <span class="stat-label">Collected:</span>
                            <span class="stat-value">$${totalCollected.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Enrolled:</span>
                            <span class="stat-value">${enrollment} students</span>
                        </div>
                    </div>
                    ${isExpired ? '<p class="dept-expired">EXPIRED</p>' : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    displayDepartments() {
        const grid = document.getElementById('departmentsGrid');
        if (!grid) return;

        if (this.departments.length === 0) {
            grid.innerHTML = '<p class="empty-state">No departments configured. Click "Add Department" to get started.</p>';
            return;
        }

        let html = '';
        this.departments.forEach((dept, index) => {
            const isExpired = new Date(dept.endDate) < new Date();
            const statusClass = isExpired ? 'expired' : 'available';
            const statusText = isExpired ? 'EXPIRED' : 'ACTIVE';
            const daysLeft = Math.ceil((new Date(dept.endDate) - new Date()) / (1000 * 60 * 60 * 24));
            const monthlyAmount = this.calculateMonthlyAmount(dept.fullAmount, dept.startDate, dept.endDate);
            const months = this.calculateMonthsDuration(dept.startDate, dept.endDate);
            
            // Get schedule for this department
            const schedule = this.departmentSchedules.find(s => s.departmentName === dept.name);
            const daysPerWeek = schedule?.days?.length || 0;
            
            // Calculate session days if schedule is set
            let sessionDaysLine = '';
            if (daysPerWeek > 0 && daysLeft > 0) {
                const sessionDaysLeft = Math.ceil(daysLeft * (daysPerWeek / 7));
                sessionDaysLine = `<div class="detail-row"><span class="label">Session Days Left:</span><span class="value">${sessionDaysLeft} days (${daysPerWeek}/week)</span></div>`;
            }

            // Build schedule info line
            let scheduleInfo = '';
            if (schedule?.startTime && schedule?.endTime) {
                scheduleInfo = `<div class="detail-row"><span class="label">Time:</span><span class="value">${schedule.startTime} - ${schedule.endTime}</span></div>`;
            }
            
            // Build days info line
            let daysInfo = '';
            if (schedule?.days && schedule.days.length > 0) {
                const dayLabels = schedule.days.map(d => d.substring(0, 3)).join(', ');
                daysInfo = `<div class="detail-row"><span class="label">Days:</span><span class="value">${dayLabels}</span></div>`;
            }
            
            html += `
                <div class="department-card ${statusClass}">
                    <div class="dept-header">
                        <div class="dept-title">
                            <h4>${dept.name}</h4>
                            <span class="dept-status ${statusClass}">${statusText}</span>
                        </div>
                        <button class="btn-icon" onclick="app.editDepartment(${index})" title="Edit">✎</button>
                    </div>
                    <div class="dept-details">
                        <div class="detail-row">
                            <span class="label">Full Amount (Pay All At Once):</span>
                            <span class="value">$${parseFloat(dept.fullAmount).toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Monthly Payment Option:</span>
                            <span class="value">$${monthlyAmount.toFixed(2)} × ${months} months</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Dates:</span>
                            <span class="value">${new Date(dept.startDate).toLocaleDateString()} - ${new Date(dept.endDate).toLocaleDateString()}</span>
                        </div>
                        ${daysInfo}
                        ${scheduleInfo}
                        ${daysLeft > 0 ? `<div class="detail-row"><span class="label">Calendar Days Left:</span><span class="value">${daysLeft} days</span></div>` : ''}
                        ${sessionDaysLine}
                    </div>
                    ${dept.notes ? `<p class="dept-description">${dept.notes}</p>` : ''}
                    <button class="btn-danger" onclick="app.deleteDepartment(${index})">Delete</button>
                </div>
            `;
        });

        grid.innerHTML = html;
    }

    openDepartmentModal(editIndex = null) {
        const modal = document.getElementById('departmentModal');
        if (!modal) return;

        const title = document.getElementById('departmentModalTitle');
        const form = document.getElementById('departmentForm');
        const btn = document.getElementById('saveDepartmentBtn');

        if (editIndex !== null) {
            title.textContent = 'Edit Department';
            const dept = this.departments[editIndex];
            const schedule = this.departmentSchedules.find(s => s.departmentName === dept.name) || {};
            
            document.getElementById('departmentName').value = dept.name;
            document.getElementById('departmentStartDate').value = dept.startDate;
            document.getElementById('departmentEndDate').value = dept.endDate;
            document.getElementById('departmentCost').value = dept.fullAmount;
            document.getElementById('departmentMonthlyCost').value = (dept.fullAmount / 12).toFixed(2);
            
            // Load schedule
            document.querySelectorAll('.dayCheckbox').forEach(cb => {
                cb.checked = schedule.days?.includes(cb.value) || false;
            });
            document.getElementById('departmentScheduleStartTime').value = schedule.startTime || '';
            document.getElementById('departmentScheduleEndTime').value = schedule.endTime || '';
            
            document.getElementById('departmentFullDiscount').value = dept.fullPaymentDiscount || '';
            document.getElementById('departmentFullDiscountType').value = dept.fullPaymentDiscountType || 'percent';
            document.getElementById('departmentSiblingDiscount').value = dept.siblingDiscount || '';
            document.getElementById('departmentSiblingDiscountType').value = dept.siblingDiscountType || 'percent';
            document.getElementById('departmentNotes').value = dept.notes || '';
            btn.textContent = 'Update Department';
            btn.dataset.editIndex = editIndex;
        } else {
            title.textContent = 'Add New Department';
            form.reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('departmentStartDate').value = today;
            document.getElementById('departmentEndDate').value = today;
            document.getElementById('departmentFullDiscountType').value = 'percent';
            document.getElementById('departmentSiblingDiscountType').value = 'percent';
            document.querySelectorAll('.dayCheckbox').forEach(cb => cb.checked = false);
            btn.textContent = 'Add Department';
            delete btn.dataset.editIndex;
        }

        // Setup calculation listeners
        this.setupDeptCostCalculation();
        modal.classList.remove('hidden');
    }

    setupDeptCostCalculation() {
        const monthlyCostInput = document.getElementById('departmentMonthlyCost');
        const annualCostInput = document.getElementById('departmentCost');

        const updateAnnual = () => {
            const monthly = parseFloat(monthlyCostInput.value) || 0;
            if (monthly > 0) {
                annualCostInput.value = (monthly * 12).toFixed(2);
            }
        };

        const updateMonthly = () => {
            const annual = parseFloat(annualCostInput.value) || 0;
            if (annual > 0) {
                monthlyCostInput.value = (annual / 12).toFixed(2);
            }
        };

        monthlyCostInput.addEventListener('input', updateAnnual);
        annualCostInput.addEventListener('input', updateMonthly);
    }

    saveDepartment() {
        const form = document.getElementById('departmentForm');
        const name = document.getElementById('departmentName').value;
        const startDate = document.getElementById('departmentStartDate').value;
        const endDate = document.getElementById('departmentEndDate').value;
        const monthlyAmount = parseFloat(document.getElementById('departmentMonthlyCost').value) || 0;
        const annualAmount = parseFloat(document.getElementById('departmentCost').value) || 0;
        const fullPaymentDiscount = parseFloat(document.getElementById('departmentFullDiscount').value) || 0;
        const fullPaymentDiscountType = document.getElementById('departmentFullDiscountType').value;
        const siblingDiscount = parseFloat(document.getElementById('departmentSiblingDiscount').value) || 0;
        const siblingDiscountType = document.getElementById('departmentSiblingDiscountType').value;
        const notes = document.getElementById('departmentNotes').value;

        // Get selected days
        const selectedDays = [];
        document.querySelectorAll('.dayCheckbox:checked').forEach(cb => {
            selectedDays.push(cb.value);
        });
        const scheduleStartTime = document.getElementById('departmentScheduleStartTime').value;
        const scheduleEndTime = document.getElementById('departmentScheduleEndTime').value;

        if (!name || !startDate || !endDate) {
            this.showNotification('Missing Information', 'Please fill in Department Name and Dates');
            return;
        }

        if (monthlyAmount <= 0 && annualAmount <= 0) {
            this.showNotification('Missing Cost', 'Please enter either Monthly or Annual cost');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            this.showNotification('Invalid Dates', 'End date must be after start date');
            return;
        }

        // Use annual amount if provided, otherwise calculate from monthly
        const fullAmount = annualAmount > 0 ? annualAmount : (monthlyAmount * 12);

        if (fullAmount <= 0) {
            this.showNotification('Invalid Amount', 'Cost must be greater than $0.00');
            return;
        }

        const dept = {
            name,
            startDate,
            endDate,
            fullAmount,
            fullPaymentDiscount: fullPaymentDiscount > 0 ? fullPaymentDiscount : null,
            fullPaymentDiscountType,
            siblingDiscount: siblingDiscount > 0 ? siblingDiscount : null,
            siblingDiscountType,
            notes: notes || null
        };

        const btn = document.getElementById('saveDepartmentBtn');
        const editIndex = btn.dataset.editIndex;

        if (editIndex !== undefined) {
            // Update existing
            this.departments[parseInt(editIndex)] = dept;
        } else {
            // Add new
            this.departments.push(dept);
        }

        // Save schedule if days/times are set
        if (selectedDays.length > 0 && scheduleStartTime && scheduleEndTime) {
            const scheduleData = {
                departmentName: name,
                days: selectedDays,
                startTime: scheduleStartTime,
                endTime: scheduleEndTime
            };

            const existingScheduleIndex = this.departmentSchedules.findIndex(s => s.departmentName === name);
            if (existingScheduleIndex >= 0) {
                this.departmentSchedules[existingScheduleIndex] = scheduleData;
            } else {
                this.departmentSchedules.push(scheduleData);
            }
            this.saveData('departmentSchedules', this.departmentSchedules);
        }

        this.saveData('departments', this.departments);
        this.displayDepartments();
        this.displaySchedules();
        document.getElementById('departmentModal').classList.add('hidden');
        this.showNotification('Success', `Department ${editIndex !== undefined ? 'updated' : 'added'} successfully`);
        this.updateDashboard();
    }

    editDepartment(index) {
        this.openDepartmentModal(index);
    }

    deleteDepartment(index) {
        this.showConfirmation(
            'Delete Department',
            'Are you sure you want to delete this department? Students currently enrolled will retain this department.',
            () => {
                this.departments.splice(index, 1);
                this.saveData('departments', this.departments);
                this.displayDepartments();
                this.showNotification('Success', 'Department deleted');
            }
        );
    }

    // ==================== DEPARTMENT SCHEDULES ====================

    displaySchedules() {
        const listContainer = document.getElementById('schedulesList');
        const noMsg = document.getElementById('noSchedulesMsg');
        
        if (!listContainer) return;

        if (this.departments.length === 0) {
            listContainer.innerHTML = '';
            if (noMsg) noMsg.style.display = 'block';
            return;
        }

        if (noMsg) noMsg.style.display = 'none';

        let html = '';
        this.departments.forEach((dept, idx) => {
            const schedule = this.departmentSchedules.find(s => s.departmentName === dept.name);
            const days = schedule?.days || [];
            const startTime = schedule?.startTime || '';
            const endTime = schedule?.endTime || '';
            const daysText = days.length > 0 ? days.join(', ') : 'Not set';
            const timeText = (startTime && endTime) ? `${startTime} - ${endTime}` : 'Not set';

            html += `
                <div class="schedule-card">
                    <div class="schedule-header">
                        <h4>${dept.name}</h4>
                        <button class="btn-icon" onclick="app.openScheduleEditor('${dept.name}')" title="Edit Schedule">✎</button>
                    </div>
                    <div class="schedule-details">
                        <div class="detail-row">
                            <span class="label">Days:</span>
                            <span class="value">${daysText}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Time:</span>
                            <span class="value">${timeText}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    }

    openScheduleEditor(departmentName) {
        const schedule = this.departmentSchedules.find(s => s.departmentName === departmentName) || {
            departmentName,
            days: [],
            startTime: '',
            endTime: ''
        };

        // Create a temporary modal for schedule editing
        const modalHTML = `
            <div id="scheduleEditorModal" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 500px;">
                    <button class="modal-close">&times;</button>
                    <h3>Edit Schedule: ${departmentName}</h3>
                    <form id="scheduleForm">
                        <div class="form-group">
                            <label>Days of Week</label>
                            <div class="days-checkboxes">
                                ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                    .map(day => `
                                        <label class="day-checkbox">
                                            <input type="checkbox" value="${day}" class="dayCheckbox" ${schedule.days.includes(day) ? 'checked' : ''}>
                                            <span>${day.substring(0, 3)}</span>
                                        </label>
                                    `)
                                    .join('')}
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Time</label>
                                <input type="time" id="scheduleStartTime" value="${schedule.startTime || ''}">
                            </div>
                            <div class="form-group">
                                <label>End Time</label>
                                <input type="time" id="scheduleEndTime" value="${schedule.endTime || ''}">
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-primary" onclick="app.saveSchedule('${departmentName}')">Save Schedule</button>
                            <button type="button" class="btn-secondary" onclick="app.closeScheduleEditor()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('scheduleEditorModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add close button handler
        document.querySelector('#scheduleEditorModal .modal-close').addEventListener('click', () => {
            this.closeScheduleEditor();
        });
    }

    saveSchedule(departmentName) {
        const form = document.getElementById('scheduleForm');
        if (!form) return;

        const selectedDays = [];
        form.querySelectorAll('.dayCheckbox:checked').forEach(checkbox => {
            selectedDays.push(checkbox.value);
        });

        const startTime = document.getElementById('scheduleStartTime').value;
        const endTime = document.getElementById('scheduleEndTime').value;

        if (selectedDays.length === 0) {
            this.showNotification('Please select', 'Select at least one day');
            return;
        }

        if (!startTime || !endTime) {
            this.showNotification('Please set', 'Set both start and end times');
            return;
        }

        // Find and update or create schedule
        const existingIndex = this.departmentSchedules.findIndex(s => s.departmentName === departmentName);
        const scheduleData = {
            departmentName,
            days: selectedDays,
            startTime,
            endTime
        };

        if (existingIndex >= 0) {
            this.departmentSchedules[existingIndex] = scheduleData;
        } else {
            this.departmentSchedules.push(scheduleData);
        }

        this.saveData('departmentSchedules', this.departmentSchedules);
        this.displaySchedules();
        this.closeScheduleEditor();
        this.showNotification('Success', `Schedule for ${departmentName} saved`);
    }

    closeScheduleEditor() {
        const modal = document.getElementById('scheduleEditorModal');
        if (modal) modal.remove();
    }

    displayStudentsTable() {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;

        if (this.families.length === 0) {
            tbody.innerHTML = '<div class="empty-state">No students recorded</div>';
            return;
        }

        let html = '';
        this.families.forEach(family => {
            family.children.forEach((student, idx) => {
                const status = this.getFamilyPaymentStatus(family.rgNumber);
                const paymentStatus = status ? status.status : 'Unknown';
                
                html += `
                    <div class="student-row student-row-data" data-rg="${family.rgNumber}" data-student="${student.name}" data-family="${family.parentName1}">
                        <div class="student-cell" data-label="Family (RG#)"><strong>${family.rgNumber}</strong></div>
                        <div class="student-cell" data-label="Student Name">${student.name}</div>
                        <div class="student-cell" data-label="Father Name">${family.parentName1}</div>
                        <div class="student-cell" data-label="Mother Name">${family.parentName2 || 'N/A'}</div>
                        <div class="student-cell" data-label="Status"><span class="status-badge ${paymentStatus.toLowerCase().replace(' ', '-')}">${paymentStatus}</span></div>
                        <div class="student-cell student-actions" data-label="Actions">
                            <button class="btn-icon" onclick="app.openFamilyModal(${family.rgNumber})" title="Edit Family">✎</button>
                            <button class="btn-icon" onclick="app.openPaymentModalForFamily(${family.rgNumber}, '${family.parentName1}')" title="Record Payment">💳</button>
                        </div>
                    </div>
                `;
            });
        });

        tbody.innerHTML = html;
    }

    updateStudentDepartment(rgNumber, studentIndex, dept) {
        const family = this.families.find(f => f.rgNumber === rgNumber);
        if (!family) return;

        if (!family.children[studentIndex].departments) {
            family.children[studentIndex].departments = [];
        }

        if (dept && !family.children[studentIndex].departments.includes(dept)) {
            family.children[studentIndex].departments.push(dept);
        }

        this.saveData('families', this.families);
        this.displayStudentsTable();
        this.updateDashboard();
        this.showNotification('Success', `${family.children[studentIndex].name} updated`);
    }

    // ==================== EXPORT/IMPORT ====================

    downloadTemplate() {
        if (typeof XLSX === 'undefined') {
            this.showNotification('Error', 'Excel library not loaded. Please refresh the page.');
            return;
        }

        const template = [
            {
                'RG#': '1001',
                'Father Name': 'Ahmed Khan',
                'Father Phone': '555-1234',
                'Mother Name': 'Fatima Khan',
                'Mother Phone': '555-5678',
                'Additional Contact': '',
                'Additional Phone': '',
                'Student Name': 'Afiya',
                'Gender': 'Female',
                'DOB': '2010-05-15',
                'Departments': 'Weekend'
            },
            {
                'RG#': '1001',
                'Father Name': 'Ahmed Khan',
                'Father Phone': '555-1234',
                'Mother Name': 'Fatima Khan',
                'Mother Phone': '555-5678',
                'Additional Contact': '',
                'Additional Phone': '',
                'Student Name': 'Ibrahim',
                'Gender': 'Male',
                'DOB': '2012-03-20',
                'Departments': 'Weekend,Evening'
            },
            {
                'RG#': '',
                'Father Name': '',
                'Father Phone': '',
                'Mother Name': '',
                'Mother Phone': '',
                'Additional Contact': '',
                'Additional Phone': '',
                'Student Name': '',
                'Gender': '',
                'DOB': '',
                'Departments': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Families');
        
        // Set column widths
        ws['!cols'] = [
            {wch: 8},   // RG#
            {wch: 20},  // Father Name
            {wch: 15},  // Father Phone
            {wch: 20},  // Mother Name
            {wch: 15},  // Mother Phone
            {wch: 20},  // Additional
            {wch: 15},  // Additional Phone
            {wch: 20},  // Student Name
            {wch: 12},  // Gender
            {wch: 15},  // DOB (YYYY-MM-DD)
            {wch: 30}   // Departments (comma-separated)
        ];
        
        XLSX.writeFile(wb, 'IQRA_Families_Template.xlsx');
        this.showNotification('Template Downloaded', 'One row per student. Same RG# = same family. Fill and import.');
    }

    exportToExcel() {
        if (typeof XLSX === 'undefined') {
            this.showNotification('Error', 'Excel library not loaded. Please refresh the page.');
            return;
        }

        if (this.families.length === 0) {
            this.showNotification('No Data', 'Please add families first');
            return;
        }

        // Prepare data
        const data = [];
        this.families.forEach(family => {
            family.children.forEach((student, idx) => {
                const row = {
                    'RG#': family.rgNumber,
                    'Father Name': family.parentName1 || '',
                    'Father Phone': family.parentPhone1 || '',
                    'Mother Name': family.parentName2 || '',
                    'Mother Phone': family.parentPhone2 || '',
                    'Additional Contact': family.additionalName || '',
                    'Additional Phone': family.additionalPhone || '',
                    'Student Name': student.name || '',
                    'Gender': student.gender || '',
                    'DOB': student.dob || '',
                    'Departments': (student.departments || []).join(', ')
                };
                data.push(row);
            });
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Families');
        
        ws['!cols'] = [
            {wch: 8},
            {wch: 20},
            {wch: 15},
            {wch: 20},
            {wch: 15},
            {wch: 20},
            {wch: 15},
            {wch: 20},
            {wch: 12},
            {wch: 15},
            {wch: 30}
        ];

        XLSX.writeFile(wb, `IQRA_Families_${new Date().toISOString().split('T')[0]}.xlsx`);
        this.showNotification('Success', 'Data exported to Excel');
    }

    importFromExcel(event) {
        if (typeof XLSX === 'undefined') {
            this.showNotification('Error', 'Excel library not loaded. Please refresh the page.');
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    this.showNotification('Empty File', 'The Excel file is empty');
                    return;
                }

                // Group by RG#/Family
                const familyMap = new Map();
                jsonData.forEach(row => {
                    const rgNum = parseInt(row['RG#']) || this.nextRGNumber;
                    if (!familyMap.has(rgNum)) {
                        familyMap.set(rgNum, {
                            rgNumber: rgNum,
                            parentName1: row['Father Name'] || '',
                            parentPhone1: row['Father Phone'] || '',
                            parentName2: row['Mother Name'] || '',
                            parentPhone2: row['Mother Phone'] || '',
                            additionalName: row['Additional Contact'] || '',
                            additionalPhone: row['Additional Phone'] || '',
                            children: [],
                            registeredDate: new Date().toISOString(),
                            status: 'Active'
                        });
                    }

                    if (row['Student Name']) {
                        const family = familyMap.get(rgNum);
                        const deptString = row['Departments'] || '';
                        const departments = deptString
                            .split(',')
                            .map(d => d.trim())
                            .filter(d => d.length > 0);

                        family.children.push({
                            name: row['Student Name'],
                            gender: row['Gender'] || 'Male',
                            dob: row['DOB'] || '',
                            departments: departments
                        });
                    }
                });

                // Import families
                let importedCount = 0;
                familyMap.forEach(family => {
                    if (family.children.length === 0) {
                        this.showNotification('Invalid Data', 'Each family must have at least one student');
                        return;
                    }

                    // Update or add
                    const existingIndex = this.families.findIndex(f => f.rgNumber === family.rgNumber);
                    if (existingIndex >= 0) {
                        this.families[existingIndex] = family;
                    } else {
                        this.families.push(family);
                        this.nextRGNumber = Math.max(this.nextRGNumber, family.rgNumber + 1);
                    }
                    importedCount++;
                });

                this.saveData('families', this.families);
                this.saveData('nextRGNumber', this.nextRGNumber);
                this.displayStudentCards();
                this.displayStudentsTable();
                this.updateDashboard();

                this.showNotification('Import Successful', `Imported ${importedCount} families`);
                
                // Reset file input
                document.getElementById('importFile').value = '';
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('Import Error', 'Failed to import file: ' + error.message);
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

// ==================== INITIALIZATION ====================

// Initialize Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAOjEXK35Gy4f9m5ItVhB3nk9B_nNwfc5U",
    authDomain: "schoolstream-sny5k.firebaseapp.com",
    projectId: "schoolstream-sny5k",
    storageBucket: "schoolstream-sny5k.firebasestorage.app",
    messagingSenderId: "954372453883",
    appId: "1:954372453883:web:b2c708ef761f460725075e"
};

// Firebase MUST be loaded before app can run
if (typeof firebase === 'undefined') {
    console.error('CRITICAL: Firebase SDK not loaded. Check script tags in HTML.');
} else {
    try {
        // Check if already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✓ Firebase initialized with config');
        } else {
            console.log('✓ Firebase already initialized');
        }
        
        // Verify Firestore is available
        const db = firebase.firestore();
        console.log('✓ Firestore is available');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

let app;

// ==================== GOOGLE AUTHENTICATION ====================

// Check authentication status
firebase.auth().onAuthStateChanged(async (user) => {
    const loginModal = document.getElementById('loginModal');
    const appContainer = document.getElementById('appContainer');
    const loginStatusDiv = document.getElementById('loginStatus');
    const adminTabBtn = document.getElementById('adminTabBtn');
    
    if (user) {
        // User is signed in - check approval status and role
        console.log('✓ User authenticated:', user.email);
        
        // Check if user is admin
        const isAdmin = user.email === ADMIN_EMAIL;
        console.log('Is admin:', isAdmin);
        
        // Show admin tab if admin
        if (adminTabBtn && isAdmin) {
            adminTabBtn.style.display = 'block';
        }
        
        // If admin, auto-approve with admin role
        if (isAdmin) {
            try {
                const db = firebase.firestore();
                const userDoc = await db.collection('userApprovals').doc(user.uid).get();
                
                if (!userDoc.exists || userDoc.data().status !== 'approved' || userDoc.data().role !== 'admin') {
                    await db.collection('userApprovals').doc(user.uid).set({
                        email: user.email,
                        displayName: user.displayName || 'Admin',
                        photoURL: user.photoURL || '',
                        status: 'approved',
                        role: 'admin',
                        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        uid: user.uid
                    }, { merge: true });
                    console.log('Admin auto-approved with admin role');
                }
                
                // Show app for admin
                if (loginModal) loginModal.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                
                if (!app) {
                    console.log('Creating app instance for admin...');
                    app = new TuitionManager();
                    app.userRole = 'admin';
                    await app.loadAllData();
                }
            } catch (error) {
                console.error('Error setting up admin:', error);
            }
            return;
        }
        
        try {
            const db = firebase.firestore();
            const userDoc = await db.collection('userApprovals').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // New user - create approval request with viewer role
                console.log('New user, creating approval request...');
                await db.collection('userApprovals').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || 'Unknown',
                    photoURL: user.photoURL || '',
                    status: 'pending',
                    role: 'viewer',
                    requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    uid: user.uid
                });
                
                // Show pending message
                if (loginModal) {
                    loginModal.style.display = 'flex';
                    if (loginStatusDiv) {
                        loginStatusDiv.innerHTML = `
                            <div style="text-align: center; padding: 20px; background: #fef3c7; border-radius: 8px; color: #92400e;">
                                <p style="margin: 0 0 10px 0; font-weight: 600;">⏳ Approval Pending</p>
                                <p style="margin: 0; font-size: 13px;">Your request for access has been submitted. The administrator will review it shortly. Please check back soon.</p>
                            </div>
                        `;
                        loginStatusDiv.style.display = 'block';
                    }
                }
                if (appContainer) appContainer.style.display = 'none';
                return;
            }
            
            const userData = userDoc.data();
            
            if (userData.status === 'approved') {
                // User approved - show app
                console.log('User approved with role:', userData.role);
                if (loginModal) loginModal.style.display = 'none';
                if (appContainer) appContainer.style.display = 'flex';
                
                // Initialize app if not already done
                if (!app) {
                    console.log('Creating app instance...');
                    app = new TuitionManager();
                    app.userRole = userData.role || 'viewer';
                    await app.loadAllData();
                }
            } else if (userData.status === 'pending') {
                // Pending approval
                console.log('User approval pending');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                    if (loginStatusDiv) {
                        loginStatusDiv.innerHTML = `
                            <div style="text-align: center; padding: 20px; background: #fef3c7; border-radius: 8px; color: #92400e;">
                                <p style="margin: 0 0 10px 0; font-weight: 600;">⏳ Approval Pending</p>
                                <p style="margin: 0; font-size: 13px;">Your request for access has been submitted. The administrator will review it shortly. Please check back soon.</p>
                            </div>
                        `;
                        loginStatusDiv.style.display = 'block';
                    }
                }
                if (appContainer) appContainer.style.display = 'none';
            } else if (userData.status === 'rejected') {
                // Request rejected
                console.log('User request rejected');
                if (loginModal) {
                    loginModal.style.display = 'flex';
                    if (loginStatusDiv) {
                        loginStatusDiv.innerHTML = `
                            <div style="text-align: center; padding: 20px; background: #fee2e2; border-radius: 8px; color: #991b1b;">
                                <p style="margin: 0 0 10px 0; font-weight: 600;">❌ Access Denied</p>
                                <p style="margin: 0; font-size: 13px;">Your request for access was rejected by the administrator. Please contact support if you believe this is a mistake.</p>
                            </div>
                        `;
                        loginStatusDiv.style.display = 'block';
                    }
                }
                if (appContainer) appContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking user approval status:', error);
            // On error, show app (fallback for existing approved users)
            if (loginModal) loginModal.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';
            
            if (!app) {
                app = new TuitionManager();
                await app.loadAllData();
            }
        }
    } else {
        // User is signed out
        console.log('User not authenticated, showing login');
        if (loginModal) loginModal.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (loginStatusDiv) loginStatusDiv.style.display = 'none';
    }
});

// Google Sign-In Button Handler
document.addEventListener('DOMContentLoaded', async () => {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await firebase.auth().signInWithPopup(provider);
                console.log('✓ Google sign-in successful');
            } catch (error) {
                console.error('Sign-in error:', error);
                const errorDiv = document.getElementById('loginError');
                if (errorDiv) {
                    errorDiv.textContent = `Sign-in failed: ${error.message}`;
                    errorDiv.style.display = 'block';
                }
            }
        });
    }
});

// Sign out handler (call this from settings when user clicks logout)
function handleSignOut() {
    firebase.auth().signOut().then(() => {
        console.log('✓ User signed out');
    }).catch(error => {
        console.error('Sign-out error:', error);
    });
}

