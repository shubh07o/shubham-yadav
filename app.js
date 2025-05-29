// Data storage
let customers = JSON.parse(localStorage.getItem('customers')) || [];
let usageRecords = JSON.parse(localStorage.getItem('usageRecords')) || [];
let bills = JSON.parse(localStorage.getItem('bills')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

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
const recordUsageBtn = document.getElementById('recordUsageBtn');
const generateBillBtn = document.getElementById('generateBillBtn');
const usageHistory = document.getElementById('usageHistory');
const billingHistory = document.getElementById('billingHistory');
const navLinks = document.querySelectorAll('.nav-links a');

// Constants
const RATE_PER_HOUR = 100; // ₹100 per hour

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            showPage(page);
        });
    });

    // Login
    loginForm.addEventListener('submit', handleLogin);
    loginBtn.addEventListener('click', () => showPage('login'));
    logoutBtn.addEventListener('click', handleLogout);

    // Customer Management
    addCustomerBtn.addEventListener('click', () => addCustomerModal.style.display = 'block');
    closeModal.addEventListener('click', () => addCustomerModal.style.display = 'none');
    addCustomerForm.addEventListener('submit', handleAddCustomer);

    // Usage Tracking
    recordUsageBtn.addEventListener('click', handleRecordUsage);
    generateBillBtn.addEventListener('click', handleGenerateBill);
}

// Authentication
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simple authentication (replace with proper auth in production)
    if (email === 'admin@example.com' && password === 'admin123') {
        currentUser = { email, name: 'Admin' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUI();
        showPage('dashboard');
    } else {
        alert('Invalid credentials');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUI();
    showPage('login');
}

// Customer Management
function handleAddCustomer(e) {
    e.preventDefault();
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;

    const customer = {
        id: Date.now().toString(),
        name,
        phone,
        address,
        createdAt: new Date().toISOString()
    };

    customers.push(customer);
    localStorage.setItem('customers', JSON.stringify(customers));
    updateUI();
    addCustomerModal.style.display = 'none';
    addCustomerForm.reset();
}

// Usage Tracking
function handleRecordUsage() {
    const customerId = customerSelect.value;
    const hours = parseFloat(document.getElementById('hours').value);

    if (!customerId || !hours) {
        alert('Please select a customer and enter hours');
        return;
    }

    const usage = {
        id: Date.now().toString(),
        customerId,
        hours,
        date: new Date().toISOString()
    };

    usageRecords.push(usage);
    localStorage.setItem('usageRecords', JSON.stringify(usageRecords));
    updateUI();
    document.getElementById('hours').value = '';
}

// Billing
function handleGenerateBill() {
    const customerId = billingCustomerSelect.value;
    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    const customer = customers.find(c => c.id === customerId);
    const customerUsage = usageRecords.filter(u => u.customerId === customerId);
    const totalHours = customerUsage.reduce((sum, u) => sum + u.hours, 0);
    const amount = totalHours * RATE_PER_HOUR;

    const bill = {
        id: Date.now().toString(),
        customerId,
        customerName: customer.name,
        totalHours,
        amount,
        date: new Date().toISOString()
    };

    bills.push(bill);
    localStorage.setItem('bills', JSON.stringify(bills));
    updateUI();
}

// UI Updates
function updateUI() {
    // Update user section
    if (currentUser) {
        userName.textContent = currentUser.name;
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
        return `
            <div class="usage-record">
                <p>Customer: ${customer ? customer.name : 'Unknown'}</p>
                <p>Hours: ${u.hours}</p>
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