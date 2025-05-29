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

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // Check if Firebase is initialized
    if (!db || !auth) {
        console.error('Firebase not initialized properly');
        alert('Error: Firebase not initialized properly. Please refresh the page.');
        return;
    }

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

        // Load bills
        const billsSnapshot = await db.collection('bills').get();
        bills = billsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
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

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
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

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        console.log('Attempting to sign in...');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        console.log('Login successful:', currentUser.email);
        
        // Update UI and show dashboard
        updateUI();
        showPage('dashboard');
        
        // Show success message
        alert('Login successful!');
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Invalid credentials. Please try again.';
        
        // Provide more specific error messages
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email format.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
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

    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();

    console.log('Customer details:', { name, phone, address });

    // Validate inputs
    if (!name) {
        alert('Please enter customer name');
        return;
    }

    if (!phone) {
        alert('Please enter phone number');
        return;
    }

    if (!address) {
        alert('Please enter address');
        return;
    }

    // Validate phone number (basic validation)
    if (!/^\d{10}$/.test(phone)) {
        alert('Please enter a valid 10-digit phone number');
        return;
    }

    try {
        console.log('Adding new customer to Firestore...');
        const docRef = await db.collection('customers').add({
            name,
            phone,
            address,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const customer = {
            id: docRef.id,
            name,
            phone,
            address,
            createdAt: new Date().toISOString()
        };

        customers.push(customer);
        console.log('Customer added successfully:', customer);
        
        // Update UI
        updateUI();
        
        // Close modal and reset form
        addCustomerModal.style.display = 'none';
        addCustomerForm.reset();
        
        // Show success message
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
            <p>Phone: ${c.phone}</p>
            <p>Address: ${c.address}</p>
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

    // Update billing history
    billingHistory.innerHTML = bills.map(b => `
        <div class="bill-record">
            <h3>Bill for ${b.customerName}</h3>
            <p>Total Hours: ${b.totalHours}</p>
            <p>Amount: ₹${b.amount}</p>
            <p>Date: ${new Date(b.date).toLocaleDateString()}</p>
        </div>
    `).join('');

    // Update dashboard stats
    document.getElementById('totalCustomers').textContent = customers.length;
    const totalUsage = usageRecords.reduce((sum, u) => sum + u.hours, 0);
    document.getElementById('totalUsage').textContent = totalUsage.toFixed(1);
    const totalRevenue = bills.reduce((sum, b) => sum + b.amount, 0);
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue}`;
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    // Show selected page
    if (pageId === 'login') {
        loginForm.style.display = 'block';
    } else {
        document.getElementById(pageId).style.display = 'block';
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