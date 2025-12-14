// ==================== DATA MANAGEMENT ====================

class TuitionManager {
    constructor() {
        this.families = this.loadData('families') || [];
        this.tuitionRates = this.loadData('tuitionRates') || this.getDefaultRates();
        this.discounts = this.loadData('discounts') || this.getDefaultDiscounts();
        this.academicYear = this.loadData('academicYear') || '2024-2025';
        this.nextRGNumber = this.loadData('nextRGNumber') || 1001;
        this.payments = this.loadData('payments') || [];
        this.transactionCounter = this.loadData('transactionCounter') || 1000;
        this.init();
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
        this.setupEventListeners();
        this.loadTuitionRates();
        this.loadDiscounts();
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
            // Save to localStorage first (always works)
            localStorage.setItem(key, JSON.stringify(value));
            
            // Try to save to Firebase if available
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                db.collection('tuition_data').doc(key).set({
                    value: value,
                    updatedAt: new Date()
                }).catch(error => console.error('Firebase save error:', error));
            }
        } catch (error) {
            console.error('Save error:', error);
        }
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    async loadDataFromFirebase(key) {
        try {
            if (!window.firebase || !window.firebase.firestore) return null;
            const db = window.firebase.firestore();
            const doc = await db.collection('tuition_data').doc(key).get();
            if (doc.exists) {
                return doc.data().value;
            }
        } catch (error) {
            console.error('Firebase load error:', error);
        }
        return null;
    }

    async initializeFromFirebase() {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                console.log('Firebase not ready, using localStorage');
                return;
            }
            
            const keys = ['families', 'tuitionRates', 'discounts', 'academicYear', 'nextRGNumber', 'payments', 'transactionCounter'];
            
            for (const key of keys) {
                const data = await this.loadDataFromFirebase(key);
                if (data !== null) {
                    if (key === 'families') this.families = data;
                    else if (key === 'tuitionRates') this.tuitionRates = data;
                    else if (key === 'discounts') this.discounts = data;
                    else if (key === 'academicYear') this.academicYear = data;
                    else if (key === 'nextRGNumber') this.nextRGNumber = data;
                    else if (key === 'payments') this.payments = data;
                    else if (key === 'transactionCounter') this.transactionCounter = data;
                }
            }
            console.log('Firebase sync complete');
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
        return details;
    }

    getDepartmentCost(dept) {
        const rates = this.tuitionRates[dept];
        if (!rates) return 0;
        return rates.annual || rates.full || 0;
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
        familyPayments.forEach(p => totalPaid += p.amount);

        const totalDue = tuitionDetails.total;
        const remaining = Math.max(0, totalDue - totalPaid);

        return {
            rgNumber,
            familyName: family.parentName1,
            totalDue,
            totalPaid,
            remaining,
            status: remaining === 0 ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Pending'),
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
            const card = e.target.closest('.family-card');
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

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
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
            searchPayment.addEventListener('input', () => this.displayPayments());
        }
        if (paymentStatus) {
            paymentStatus.addEventListener('change', () => this.displayPayments());
        }

        // Settings
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });

        document.getElementById('saveTuitionBtn').addEventListener('click', () => this.saveTuitionRates());
        document.getElementById('saveDiscountsBtn').addEventListener('click', () => this.saveDiscountSettings());
        document.getElementById('saveYearBtn').addEventListener('click', () => this.saveYearSettings());

        // Payment Modal
        const paymentModal = document.getElementById('paymentModal');
        paymentModal.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closePaymentModal());
        });

        paymentModal.addEventListener('click', (e) => {
            if (e.target === paymentModal) {
                this.closePaymentModal();
            }
        });

        // Payment Form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handlePaymentRecord(e));
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
            this.displayPayments();
        }
    }

    switchTab(tabBtn) {
        const tabName = tabBtn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tabBtn.classList.add('active');
        document.getElementById(tabName).classList.add('active');
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

    createFamilyCard(family, index) {
        const studentsList = family.children.map((child, sn) => `
            <div class="student-item">
                <div class="student-sn">Student ${sn + 1}</div>
                <div class="student-name">${child.name}</div>
                <div class="student-meta">
                    <span>${child.gender}</span>
                    <span>${new Date(child.dob).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        // Grid layout for parents
        let parentsGrid = `<div class="parents-grid">`;
        
        parentsGrid += `
            <div class="parent-card">
                <div class="parent-label">👨 Father</div>
                <div class="parent-name">${family.parentName1}</div>
                <div class="parent-phone">${family.parentPhone1}</div>
            </div>
        `;

        if (family.parentName2) {
            parentsGrid += `
                <div class="parent-card">
                    <div class="parent-label">👩 Mother</div>
                    <div class="parent-name">${family.parentName2}</div>
                    <div class="parent-phone">${family.parentPhone2}</div>
                </div>
            `;
        } else {
            parentsGrid += `<div class="parent-card empty-parent"></div>`;
        }

        if (family.additionalName) {
            parentsGrid += `
                <div class="parent-card">
                    <div class="parent-label">📱 Contact</div>
                    <div class="parent-name">${family.additionalName}</div>
                    <div class="parent-phone">${family.additionalPhone}</div>
                </div>
            `;
        } else {
            parentsGrid += `<div class="parent-card empty-parent"></div>`;
        }

        parentsGrid += `</div>`;

        return `
            <div class="family-card" data-rg="${family.rgNumber}">
                <div class="card-header">
                    <div class="rg-badge-large">RG# ${family.rgNumber}</div>
                    <div class="card-header-actions">
                        <button class="card-edit card-action" title="Edit Family">✎</button>
                        <button class="card-payment card-action" title="Manage Payment">💳</button>
                        <button class="card-delete card-action" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="card-body">
                    ${parentsGrid}
                    <div class="students-section">
                        <h4>Students</h4>
                        <div class="student-list">
                            ${studentsList}
                        </div>
                    </div>
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

            title.textContent = `Edit Family - RG# ${rgNumber}`;
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
            title.textContent = 'Add New Family';
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
        
        const familyNameEl = document.getElementById('paymentFamilyName');
        const paymentRGEl = document.getElementById('paymentRG');
        const paymentFormEl = document.getElementById('paymentForm');
        const paymentDateEl = document.getElementById('paymentDate');
        const paymentAmountEl = document.getElementById('paymentAmount');
        const paymentMethodEl = document.getElementById('paymentMethod');
        
        if (!familyNameEl || !paymentRGEl || !paymentFormEl) return;
        
        familyNameEl.textContent = familyName;
        paymentRGEl.textContent = rgNumber;
        paymentFormEl.dataset.rgNumber = rgNumber;
        
        // Set today's date
        if (paymentDateEl) {
            paymentDateEl.valueAsDate = new Date();
        }
        
        // Reset amount and method
        if (paymentAmountEl) paymentAmountEl.value = '';
        if (paymentMethodEl) paymentMethodEl.value = '';
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Display payment history
        try {
            this.displayPaymentHistory(rgNumber);
        } catch (err) {
            console.error('Error displaying payment history:', err);
        }
    }

    displayPaymentHistory(rgNumber) {
        try {
            const historyContainer = document.getElementById('paymentHistory');
            if (!historyContainer) return;
            
            const familyPayments = this.payments.filter(p => p.rgNumber === rgNumber && p.status !== 'deleted');
            
            if (familyPayments.length === 0) {
                historyContainer.innerHTML = '<p class="no-payments">No payments recorded yet</p>';
                return;
            }

            // Calculate total paid - sum only active/latest versions (not voided or superseded)
            const totalPaid = familyPayments
                .filter(p => p.status !== 'voided' && !p.isSuperseded)
                .reduce((sum, p) => sum + parseFloat(p.amount) || 0, 0);
            
            let historyHtml = `<h4>Payment History</h4>`;
            historyHtml += `<div class="payment-summary">Total Paid: <strong>$${totalPaid.toFixed(2)}</strong></div>`;
            historyHtml += `<div class="payment-log">`;
            
            // Sort by date descending (newest first)
            familyPayments.sort((a, b) => new Date(b.editedAt || b.date) - new Date(a.editedAt || a.date));
            
            familyPayments.forEach(payment => {
                const date = new Date(payment.date).toLocaleDateString();
                const amount = parseFloat(payment.amount) || 0;
                const txnId = payment.transactionId || 'N/A';
                
                if (payment.status === 'voided') {
                    // Voided payment - show struck out
                    historyHtml += `
                        <div class="payment-entry payment-voided" data-txn-id="${txnId}">
                            <div class="payment-entry-date">${date}</div>
                            <div class="payment-entry-details">
                                <div class="payment-entry-method">${payment.method}</div>
                                <div class="payment-entry-amount"><strike>$${amount.toFixed(2)}</strike> <span class="status-badge voided">VOIDED</span></div>
                            </div>
                            <div class="payment-txn-id">TXN: ${txnId}</div>
                        </div>
                    `;
                } else if (payment.isSuperseded) {
                    // Old version - crossed out, no buttons
                    const prevAmount = parseFloat(payment.amount) || 0;
                    const editedTime = payment.editedAt ? new Date(payment.editedAt).toLocaleString() : '';
                    historyHtml += `
                        <div class="payment-entry payment-superseded" data-txn-id="${txnId}">
                            <div class="payment-entry-date">${date}</div>
                            <div class="payment-entry-details">
                                <div class="payment-entry-method">${payment.method}</div>
                                <div class="payment-entry-amount"><strike>$${prevAmount.toFixed(2)}</strike></div>
                            </div>
                            <div class="payment-txn-id">TXN: ${txnId}</div>
                        </div>
                    `;
                } else {
                    // Active/Latest version - with edit and void symbols
                    const editedBadge = payment.previousAmount ? `<span class="edit-version">EDITED</span>` : '';
                    
                    historyHtml += `
                        <div class="payment-entry payment-active clickable" data-txn-id="${txnId}" data-amount="${amount}">
                            <div class="payment-symbols">
                                <button class="btn-payment-symbol btn-payment-edit" data-txn-id="${txnId}" title="Edit payment">✎</button>
                                <button class="btn-payment-symbol btn-payment-void" data-txn-id="${txnId}" title="Void payment">✕</button>
                            </div>
                            <div class="payment-entry-date">${date}</div>
                            <div class="payment-entry-details">
                                <div class="payment-entry-method">${payment.method}</div>
                                <div class="payment-entry-amount">
                                    $${amount.toFixed(2)}
                                    ${editedBadge}
                                </div>
                            </div>
                            <div class="payment-txn-id">TXN: ${txnId}</div>
                        </div>
                    `;
                }
            });
            
            historyHtml += `</div>`;
            historyContainer.innerHTML = historyHtml;
            
            // Attach event listeners for edit and void buttons
            this.setupPaymentHistoryListeners();
        } catch (err) {
            console.error('displayPaymentHistory error:', err);
        }
    }

    setupPaymentHistoryListeners() {
        const historyContainer = document.getElementById('paymentHistory');
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

    closeFamilyModal() {
        document.getElementById('familyModal').classList.add('hidden');
        document.getElementById('familyForm').reset();
        document.getElementById('studentsContainer').innerHTML = '';
    }

    handlePaymentRecord(e) {
        e.preventDefault();

        const rgNumber = parseInt(document.getElementById('paymentForm').dataset.rgNumber);
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const date = document.getElementById('paymentDate').value;

        if (!amount || !method || !date) {
            this.showNotification('Missing Information', 'Please fill in all payment details');
            return;
        }

        const payment = {
            transactionId: this.generateTransactionId(),
            rgNumber: rgNumber,
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

        this.showNotification('Success', 'Payment recorded successfully!\n\nTransaction ID: ' + payment.transactionId);
        
        // Refresh the payment history display
        this.displayPaymentHistory(rgNumber);
        this.updateDashboard();
        
        // Reset form
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDate').valueAsDate = new Date();
    }

    closePaymentModal() {
        document.getElementById('paymentModal').classList.add('hidden');
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentHistory').innerHTML = '';
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

        const removeBtn = newInput.querySelector('.btn-remove-student');
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.target.closest('.student-input-group').remove();
        });

        container.appendChild(newInput);
    }

    handleFamilyFormSubmit(e) {
        e.preventDefault();

        const fatherName = document.getElementById('fatherName').value;
        const fatherPhone = document.getElementById('fatherPhone').value;
        const motherName = document.getElementById('motherName').value;
        const motherPhone = document.getElementById('motherPhone').value;
        const additionalName = document.getElementById('additionalName').value;
        const additionalPhone = document.getElementById('additionalPhone').value;

        const students = [];
        document.querySelectorAll('.student-input-group').forEach(group => {
            const name = group.querySelector('.studentName').value;
            const gender = group.querySelector('.studentGender').value;
            const dob = group.querySelector('.studentDOB').value;

            if (name && gender && dob) {
                students.push({ name, gender, dob, departments: [] });
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
        document.getElementById('siblingDiscount').value = this.discounts.sibling || '';
        document.getElementById('multiDeptDiscount').value = this.discounts.multiDept || '';
        document.getElementById('monthlyPremium').value = this.discounts.monthlyPremium || '';
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
        this.discounts.sibling = parseFloat(document.getElementById('siblingDiscount').value) || 0;
        this.discounts.multiDept = parseFloat(document.getElementById('multiDeptDiscount').value) || 0;
        this.discounts.monthlyPremium = parseFloat(document.getElementById('monthlyPremium').value) || 0;

        this.saveData('discounts', this.discounts);
        this.showNotification('Success', 'Discount settings saved successfully!');
    }

    saveYearSettings() {
        this.academicYear = document.getElementById('academicYear').value;
        this.saveData('academicYear', this.academicYear);
        this.showNotification('Success', 'Academic year settings saved successfully!');
    }

    updateDashboard() {
        // Update total families
        document.getElementById('totalFamilies').textContent = this.families.length;

        // Update total students
        const totalStudents = this.families.reduce((sum, f) => sum + f.children.length, 0);
        document.getElementById('totalStudents').textContent = totalStudents;

        // Update department counts
        let summerCount = 0, weekendCount = 0, eveningCount = 0, fullTimeCount = 0;
        this.families.forEach(family => {
            family.children.forEach(child => {
                if (child.departments.includes('Summer')) summerCount++;
                if (child.departments.includes('Weekend')) weekendCount++;
                if (child.departments.includes('Evening')) eveningCount++;
                if (child.departments.includes('FullTime')) fullTimeCount++;
            });
        });

        document.getElementById('summerCount').textContent = `${summerCount} Students`;
        document.getElementById('weekendCount').textContent = `${weekendCount} Students`;
        document.getElementById('eveningCount').textContent = `${eveningCount} Students`;
        document.getElementById('fullTimeCount').textContent = `${fullTimeCount} Students`;

        // Update payment stats - only count active and edited (final) amounts
        let totalDue = 0;
        let totalCollected = 0;
        
        this.families.forEach(family => {
            const tuition = this.calculateTuition(family);
            totalDue += tuition.total;
        });

        // Only count non-voided payments for collected amount
        this.payments.forEach(payment => {
            if (payment.status !== 'voided') {
                totalCollected += payment.amount;
            }
        });

        document.getElementById('pendingPayments').textContent = `$${(totalDue - totalCollected).toFixed(2)}`;
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

            if (payment.status === 'voided') {
                statusClass = 'status-voided';
                statusText = 'VOIDED';
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
                    <td class="amount">$${amount.toFixed(2)}</td>
                    <td><span class="status-label ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        paymentsList.innerHTML = html;
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

// Check if Firebase is loaded and initialize
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized');
}

const app = new TuitionManager();

// Initialize app when ready
document.addEventListener('DOMContentLoaded', async () => {
    await app.initializeFromFirebase();
    app.setupSectionHandlers();
    app.displayStudentCards();
    app.updateDashboard();
    console.log('App initialized');
});
