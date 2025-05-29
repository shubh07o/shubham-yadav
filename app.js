// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBNirZ0j_WkZbv-Lh2YAimspyek3_qsrOY",
    authDomain: "tubel-2922e.firebaseapp.com",
    projectId: "tubel-2922e",
    storageBucket: "tubel-2922e.firebasestorage.app",
    messagingSenderId: "372267443690",
    appId: "1:372267443690:web:8b0fe50f675873ba2bbe93",
    measurementId: "G-4TX956NJBJ"
};

// Initialize Firebase
let db;
let auth;
let analytics;

try {
    firebase.initializeApp(firebaseConfig);
    analytics = firebase.analytics();
    auth = firebase.auth();
    db = firebase.firestore();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    alert('Error initializing Firebase. Please check console for details.');
}

// Data storage
let customers = [];
let usageRecords = [];
let bills = [];
let currentUser = null;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const addCustomerBtn = document.getElementById('addCustomerBtn');
const addCustomerModal = document.getElementById('addCustomerModal');
const closeModal = document.querySelector('.close');
const addCustomerForm = document.getElementById('addCustomerForm');
const customersList = document.getElementById('customersList');
const customerSelect = document.getElementById('customerSelect');
const billingCustomerSelect = document.getElementById('billingCustomerSelect');
const usageCustomerSelect = document.getElementById('usageCustomerSelect');
const recordUsageBtn = document.getElementById('recordUsageBtn');
const generateBillBtn = document.getElementById('generateBillBtn');
const usageHistory = document.getElementById('usageHistory');
const billingHistory = document.getElementById('billingHistory');
const navLinks = document.querySelectorAll('.nav-links a');

// Constants
const RATE_PER_HOUR = 100; // ₹100 per hour

// Initialize UI elements
function initializeUI() {
    console.log('Initializing UI elements...');

    // Check if we're on the customers page
    const customersPage = document.getElementById('customers');
    if (!customersPage) {
        console.error('Customers page not found');
        return;
    }

    // Create Add Customer button if it doesn't exist
    let addCustomerBtn = document.getElementById('addCustomerBtn');
    if (!addCustomerBtn) {
        console.log('Creating Add Customer button...');
        addCustomerBtn = document.createElement('button');
        addCustomerBtn.id = 'addCustomerBtn';
        addCustomerBtn.className = 'btn btn-primary';
        addCustomerBtn.textContent = 'Add Customer';
        customersPage.insertBefore(addCustomerBtn, customersPage.firstChild);
    }

    // Create modal if it doesn't exist
    let addCustomerModal = document.getElementById('addCustomerModal');
    if (!addCustomerModal) {
        console.log('Creating Add Customer modal...');
        addCustomerModal = document.createElement('div');
        addCustomerModal.id = 'addCustomerModal';
        addCustomerModal.className = 'modal';
        addCustomerModal.style.display = 'none';
        addCustomerModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add New Customer</h2>
                <form id="addCustomerForm">
                    <div class="form-group">
                        <label for="customerName">Name:</label>
                        <input type="text" id="customerName" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Customer</button>
                </form>
            </div>
        `;
        document.body.appendChild(addCustomerModal);
    }

    // Add CSS for modal if not already present
    if (!document.getElementById('modalStyles')) {
        const style = document.createElement('style');
        style.id = 'modalStyles';
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.4);
            }
            .modal-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                max-width: 500px;
                border-radius: 5px;
            }
            .close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            .close:hover {
                color: black;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
            }
            .form-group input,
            .form-group textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    console.log('UI elements initialized');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Check if Firebase is initialized
    if (!db || !auth) {
        console.error('Firebase not initialized properly');
        alert('Error: Firebase not initialized properly. Please refresh the page.');
        return;
    }

    // Initialize UI elements
    initializeUI();

    // Check auth state
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        if (user) {
            currentUser = user;
            updateUI();
            showPage('dashboard');
        } else {
            currentUser = null;
            updateUI();
            showPage('login');
        }
    });

    // Load data from Firestore
    loadData();
    setupEventListeners();

    // Add input validation for hours and minutes
    const hoursInput = document.getElementById('hours');
    const minutesInput = document.getElementById('minutes');

    hoursInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    minutesInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (parseInt(e.target.value) > 59) {
            e.target.value = '59';
        }
    });

    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
    }
});

// Load data from Firestore
async function loadData() {
    try {
        console.log('Loading data from Firestore...');
        
        // Load customers
        const customersSnapshot = await db.collection('customers').get();
        customers = customersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Customers loaded:', customers.length);

        // Load usage records
        const usageSnapshot = await db.collection('usage').get();
        usageRecords = usageSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log('Usage records loaded:', usageRecords.length);

        // Load bills with payment information
        const billsSnapshot = await db.collection('bills').get();
        bills = billsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            paid: doc.data().paid || false,
            paidAt: doc.data().paidAt ? doc.data().paidAt.toDate().toISOString() : null
        }));
        console.log('Bills loaded:', bills.length);

        updateUI();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please check console for details.');
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            console.log('Navigating to page:', page);
            showPage(page);
        });
    });

    // Login and Sign Up
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        
        // Add sign up button if it doesn't exist
        if (!document.getElementById('signUpBtn')) {
            const signUpBtn = document.createElement('button');
            signUpBtn.id = 'signUpBtn';
            signUpBtn.type = 'button';
            signUpBtn.textContent = 'Sign Up';
            signUpBtn.className = 'btn btn-secondary';
            signUpBtn.style.marginLeft = '10px';
            signUpBtn.addEventListener('click', handleSignUp);
            loginForm.appendChild(signUpBtn);
        }
    } else {
        console.error('Login form not found');
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => showPage('login'));
    } else {
        console.error('Login button not found');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.error('Logout button not found');
    }

    // Customer Management
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', () => {
            console.log('Opening add customer modal');
            addCustomerModal.style.display = 'block';
        });
    } else {
        console.error('Add customer button not found');
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            console.log('Closing modal');
            addCustomerModal.style.display = 'none';
        });
    } else {
        console.error('Close modal button not found');
    }

    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
    } else {
        console.error('Add customer form not found');
    }

    // Usage Tracking
    if (recordUsageBtn) {
        recordUsageBtn.addEventListener('click', handleRecordUsage);
    } else {
        console.error('Record usage button not found');
    }

    if (generateBillBtn) {
        generateBillBtn.addEventListener('click', handleGenerateBill);
    } else {
        console.error('Generate bill button not found');
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    console.log('Handling login...');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    console.log('Login attempt for email:', email);
    console.log('Password length:', password.length);

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        console.log('Attempting to sign in with Firebase...');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        console.log('Login successful:', currentUser.email);
        
        // Update UI and show dashboard
        updateUI();
        showPage('dashboard');
        
        // Show success message
        alert('Login successful!');
    } catch (error) {
        console.error('Login error details:', {
            code: error.code,
            message: error.message,
            fullError: error
        });
        
        let errorMessage = 'Invalid credentials. Please try again.';
        
        // Provide more specific error messages
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email. Please sign up first.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format. Please enter a valid email.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled. Please contact support.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            default:
                errorMessage = `Login error: ${error.message}`;
        }
        
        alert(errorMessage);
    }
}

// Add a function to create a new user
async function handleSignUp(e) {
    e.preventDefault();
    console.log('Handling sign up...');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    console.log('Sign up attempt for email:', email);
    console.log('Password length:', password.length);

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        console.log('Attempting to create new user...');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        console.log('Sign up successful:', currentUser.email);
        
        // Update UI and show dashboard
        updateUI();
        showPage('dashboard');
        
        // Show success message
        alert('Account created successfully!');
    } catch (error) {
        console.error('Sign up error details:', {
            code: error.code,
            message: error.message,
            fullError: error
        });
        
        let errorMessage = 'Error creating account. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists. Please login instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format. Please enter a valid email.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password.';
                break;
            default:
                errorMessage = `Sign up error: ${error.message}`;
        }
        
        alert(errorMessage);
    }
}

async function handleLogout() {
    try {
        console.log('Attempting to log out...');
        await auth.signOut();
        currentUser = null;
        console.log('Logout successful');
        
        // Update UI and show login page
        updateUI();
        showPage('login');
        
        // Show success message
        alert('Logged out successfully!');
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
    }
}

// Customer Management
async function handleAddCustomer(e) {
    e.preventDefault();
    console.log('Handling customer addition...');
    const customerNameInput = document.getElementById('customerName');
    if (!customerNameInput) {
        alert('Name input not found');
        return;
    }
    const name = customerNameInput.value.trim();
    if (!name) {
        alert('Please enter customer name');
        customerNameInput.focus();
        return;
    }
    try {
        console.log('Adding new customer to Firestore...');
        const docRef = await db.collection('customers').add({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const customer = {
            id: docRef.id,
            name,
            createdAt: new Date().toISOString()
        };
        customers.push(customer);
        console.log('Customer added successfully:', customer);
        updateUI();
        const addCustomerModal = document.getElementById('addCustomerModal');
        if (addCustomerModal) {
            addCustomerModal.style.display = 'none';
        }
        if (addCustomerForm) {
            addCustomerForm.reset();
        }
        alert('Customer added successfully!');
    } catch (error) {
        console.error('Error adding customer:', error);
        alert('Error adding customer. Please try again.');
    }
}

// Usage Tracking
async function handleRecordUsage() {
    const customerId = customerSelect.value;
    const hoursInput = document.getElementById('hours').value.trim();
    const minutesInput = document.getElementById('minutes').value.trim();

    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    // Validate hours and minutes
    const hours = parseInt(hoursInput) || 0;
    const minutes = parseInt(minutesInput) || 0;

    if (hours === 0 && minutes === 0) {
        alert('Please enter usage time');
        return;
    }

    if (minutes >= 60) {
        alert('Minutes cannot be 60 or more');
        return;
    }

    // Convert to decimal hours for storage
    const totalHours = hours + (minutes / 60);

    try {
        const docRef = await db.collection('usage').add({
            customerId,
            hours: totalHours,
            hoursDisplay: hours,
            minutesDisplay: minutes,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        const usage = {
            id: docRef.id,
            customerId,
            hours: totalHours,
            hoursDisplay: hours,
            minutesDisplay: minutes,
            date: new Date().toISOString()
        };

        usageRecords.push(usage);
        updateUI();
        document.getElementById('hours').value = '';
        document.getElementById('minutes').value = '';
    } catch (error) {
        console.error('Error recording usage:', error);
        alert('Error recording usage. Please try again.');
    }
}

// Billing
async function handleGenerateBill() {
    const customerId = billingCustomerSelect.value;
    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    try {
        const customer = customers.find(c => c.id === customerId);
        const customerUsage = usageRecords.filter(u => u.customerId === customerId);
        
        if (customerUsage.length === 0) {
            alert('No usage records found for this customer');
            return;
        }

        const totalHours = customerUsage.reduce((sum, u) => sum + u.hours, 0);
        const amount = totalHours * RATE_PER_HOUR;

        console.log('Generating bill for customer:', customer.name);
        console.log('Total hours:', totalHours);
        console.log('Amount:', amount);

        const docRef = await db.collection('bills').add({
            customerId,
            customerName: customer.name,
            totalHours,
            amount,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        const bill = {
            id: docRef.id,
            customerId,
            customerName: customer.name,
            totalHours,
            amount,
            date: new Date().toISOString()
        };

        bills.push(bill);
        console.log('Bill generated successfully:', bill);
        updateUI();
    } catch (error) {
        console.error('Error generating bill:', error);
        alert('Error generating bill. Please try again.');
    }
}

// Add payment handling function
async function handlePayment(billId) {
    try {
        console.log('Processing payment for bill:', billId);
        
        // Find the bill
        const bill = bills.find(b => b.id === billId);
        if (!bill) {
            alert('Bill not found');
            return;
        }

        // Check if already paid
        if (bill.paid) {
            alert('This bill has already been paid');
            return;
        }

        // Update bill in Firestore
        await db.collection('bills').doc(billId).update({
            paid: true,
            paidAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update local bill data
        bill.paid = true;
        bill.paidAt = new Date().toISOString();

        console.log('Payment processed successfully');
        updateUI();
        alert('Payment recorded successfully!');
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Error processing payment. Please try again.');
    }
}

// UI Updates
function updateUI() {
    // Update user section
    if (currentUser) {
        userName.textContent = currentUser.email;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        loginForm.style.display = 'none';
    } else {
        userName.textContent = 'Guest';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        loginForm.style.display = 'block';
    }

    // Update customer selects
    const customerOptions = customers.map(c => 
        `<option value="${c.id}">${c.name}</option>`
    ).join('');
    customerSelect.innerHTML = '<option value="">Select Customer</option>' + customerOptions;
    billingCustomerSelect.innerHTML = '<option value="">Select Customer</option>' + customerOptions;

    // Update customers list
    customersList.innerHTML = customers.map(c => `
        <div class="customer-card">
            <h3>${c.name}</h3>
        </div>
    `).join('');

    // Update usage history
    usageHistory.innerHTML = usageRecords.map(u => {
        const customer = customers.find(c => c.id === u.customerId);
        const hoursDisplay = u.hoursDisplay !== undefined ? u.hoursDisplay : Math.floor(u.hours);
        const minutesDisplay = u.minutesDisplay !== undefined ? u.minutesDisplay : Math.round((u.hours % 1) * 60);
        return `
            <div class="usage-record">
                <p>Customer: ${customer ? customer.name : 'Unknown'}</p>
                <p class="time">Time Used: ${hoursDisplay} hours ${minutesDisplay} minutes</p>
                <p>Date: ${new Date(u.date).toLocaleDateString()}</p>
            </div>
        `;
    }).join('');

    // Update billing history with payment status and button
    billingHistory.innerHTML = bills.map(b => `
        <div class="bill-record ${b.paid ? 'paid' : 'unpaid'}">
            <h3>Bill for ${b.customerName}</h3>
            <p>Total Hours: ${b.totalHours.toFixed(1)}</p>
            <p>Amount: ₹${b.amount}</p>
            <p>Date: ${new Date(b.date).toLocaleDateString()}</p>
            <p>Status: ${b.paid ? 'Paid' : 'Unpaid'}</p>
            ${b.paid ? 
                `<p>Paid on: ${new Date(b.paidAt).toLocaleDateString()}</p>` :
                `<button onclick="handlePayment('${b.id}')" class="btn btn-success">Mark as Paid</button>`
            }
        </div>
    `).join('');

    // Add CSS for payment status
    if (!document.getElementById('paymentStyles')) {
        const style = document.createElement('style');
        style.id = 'paymentStyles';
        style.textContent = `
            .bill-record {
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                background-color: #f8f9fa;
            }
            .bill-record.paid {
                border-left: 4px solid #28a745;
            }
            .bill-record.unpaid {
                border-left: 4px solid #dc3545;
            }
            .btn-success {
                background-color: #28a745;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            .btn-success:hover {
                background-color: #218838;
            }
        `;
        document.head.appendChild(style);
    }

    // Update dashboard stats
    document.getElementById('totalCustomers').textContent = customers.length;
    const totalUsage = usageRecords.reduce((sum, u) => sum + u.hours, 0);
    document.getElementById('totalUsage').textContent = totalUsage.toFixed(1);
    const totalRevenue = bills.reduce((sum, b) => sum + b.amount, 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue}`;

    // Update dashboard stats to include payment information
    const totalBills = bills.length;
    const paidBills = bills.filter(b => b.paid).length;
    const unpaidBills = totalBills - paidBills;
    const totalPaidAmount = bills.filter(b => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const totalUnpaidAmount = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

    // Add payment statistics to dashboard if elements exist
    const paymentStats = document.getElementById('paymentStats');
    if (paymentStats) {
        paymentStats.innerHTML = `
            <div class="stat-card">
                <h3>Payment Statistics</h3>
                <p>Total Bills: ${totalBills}</p>
                <p>Paid Bills: ${paidBills}</p>
                <p>Unpaid Bills: ${unpaidBills}</p>
                <p>Total Paid: ₹${totalPaidAmount}</p>
                <p>Total Unpaid: ₹${totalUnpaidAmount}</p>
            </div>
        `;
    }
}

function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // Show selected page
    if (pageId === 'login') {
        loginForm.style.display = 'block';
    } else {
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'block';
            // Initialize UI elements if showing customers page
            if (pageId === 'customers') {
                initializeUI();
            }
        } else {
            console.error('Page not found:', pageId);
        }
    }

    // Update active nav link
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
}

// Usage Tracking
async function handleAddUsage() {
    const customerId = usageCustomerSelect.value;
    const hours = parseFloat(usageHoursInput.value);
    const minutes = parseInt(usageMinutesInput.value);

    // Input validation
    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    if (isNaN(hours) || hours < 0) {
        alert('Please enter a valid number of hours');
        return;
    }

    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
        alert('Please enter a valid number of minutes (0-59)');
        return;
    }

    const totalHours = hours + (minutes / 60);

    try {
        console.log('Adding usage record for customer:', customerId);
        console.log('Total hours:', totalHours);

        const docRef = await db.collection('usage').add({
            customerId,
            hours: totalHours,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        const usage = {
            id: docRef.id,
            customerId,
            hours: totalHours,
            date: new Date().toISOString()
        };

        usageRecords.push(usage);
        console.log('Usage record added successfully:', usage);
        updateUI();
        usageHoursInput.value = '';
        usageMinutesInput.value = '';
    } catch (error) {
        console.error('Error adding usage record:', error);
        alert('Error adding usage record. Please try again.');
    }
}
