// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBNirZ0j_WkZbv-Lh2YAimspyek3_qsrOY",
    authDomain: "tubel-2922e.firebaseapp.com",
    projectId: "tubel-2922e",
    storageBucket: "tubel-2922e.appspot.com",
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
let currentCustomerDetailId = null; // Variable to store the ID of the customer currently being viewed

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
// const RATE_PER_HOUR = 100; // ₹100 per hour // Removed as calculation is per minute

// Initialize UI elements
function initializeUI() {
    console.log('Initializing UI elements...');

    // Check if we're on the customers page
    const customersPage = document.getElementById('customers');
    const dashboardPage = document.getElementById('dashboard');
    const usagePage = document.getElementById('usage');
    const billingPage = document.getElementById('billing');

    // Only proceed if we are likely on a page where these elements are needed
    if (!customersPage && !dashboardPage && !usagePage && !billingPage) {
        console.log('Not on a main content page, skipping full UI initialization.');
        return;
    }

    // Create Add Customer button if it doesn't exist (only on customers page)
    if (customersPage) {
        let addCustomerBtn = document.getElementById('addCustomerBtn');
        if (!addCustomerBtn) {
            console.log('Creating Add Customer button...');
            addCustomerBtn = document.createElement('button');
            addCustomerBtn.id = 'addCustomerBtn';
            addCustomerBtn.className = 'btn btn-primary';
            addCustomerBtn.textContent = 'Add Customer';
            customersPage.insertBefore(addCustomerBtn, customersPage.firstChild);
        }
    }

    // Create Add Customer modal if it doesn't exist
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
                overflow: auto; /* Add overflow for long content */
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
            .close, .close-payment-modal {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            .close:hover, .close-payment-modal:hover {
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

    // Add CSS for payment statuses (ensure it's added only once)
    if (!document.getElementById('paymentStatusStyles')) {
        const style = document.createElement('style');
        style.id = 'paymentStatusStyles';
        style.textContent = `
            .bill-record {
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                background-color: #f8f9fa;
            }
            .bill-record.unpaid {
                border-left: 4px solid #dc3545;
            }
             .bill-record.partial-payment {
                border-left: 4px solid #ffc107; /* Yellow/Orange for partial */
            }
            .bill-record.paid {
                border-left: 4px solid #28a745; /* Green for paid */
            }
            .btn-primary {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            .btn-primary:hover {
                background-color: #0056b3;
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

    const backToCustomersBtn = document.getElementById('backToCustomersBtn');
    if (backToCustomersBtn) {
        backToCustomersBtn.addEventListener('click', () => {
            console.log('Back to Customers button clicked');
            document.getElementById('customerDetailView').style.display = 'none';
            document.getElementById('customersList').style.display = 'block';
        });
    }

    const recordCustomerPaymentBtn = document.getElementById('recordCustomerPaymentBtn');
    if (recordCustomerPaymentBtn && db) { // Ensure db is initialized
        recordCustomerPaymentBtn.addEventListener('click', async () => {
            console.log('Record Customer Payment button clicked');

            if (!currentUser) {
                alert('You must be logged in to record payments.');
                return;
            }

            if (!currentCustomerDetailId) {
                alert('No customer selected.');
                console.error('currentCustomerDetailId is null');
                return;
            }

            const paymentAmountInput = document.getElementById('detailPaymentAmount');
            const paymentAmount = parseFloat(paymentAmountInput.value);

            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                alert('Please enter a valid payment amount.');
                paymentAmountInput.focus();
                return;
            }

            try {
                // Get the customer and their outstanding bills
                const customer = customers.find(c => c.id === currentCustomerDetailId);
                if (!customer) {
                    alert('Customer not found.');
                    return;
                }

                // Filter and sort outstanding bills by date (oldest first)
                const outstandingBills = bills
                    .filter(b => b.customerId === currentCustomerDetailId && (b.status === 'Unpaid' || b.status === 'Partial Payment'))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                let remainingPayment = paymentAmount;
                const batch = db.batch();
                let customerCredit = customer.credit || 0; // Start with existing credit
                const updatedBills = [];

                // Apply payment to outstanding bills
                for (const bill of outstandingBills) {
                    if (remainingPayment <= 0) break; // Stop if payment is fully applied

                    const amountDue = (bill.amount || 0) - (bill.paidAmount || 0);
                    const amountToApply = Math.min(remainingPayment, amountDue);

                    const newPaidAmount = (bill.paidAmount || 0) + amountToApply;
                    let newStatus = 'Partial Payment';
                    if (newPaidAmount >= (bill.amount || 0)) {
                        newStatus = 'Paid';
                    }

                    // Update bill in batch
                    const billRef = db.collection('bills').doc(bill.id);
                    batch.update(billRef, {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        lastPaymentAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update local bill copy for immediate UI refresh after batch commit
                    const localBill = bills.find(b => b.id === bill.id);
                    if(localBill) {
                        localBill.paidAmount = newPaidAmount;
                        localBill.status = newStatus;
                        localBill.lastPaymentAt = new Date().toISOString();
                    }

                    remainingPayment -= amountToApply;
                }

                // If there's remaining payment, add it as credit to the customer
                if (remainingPayment > 0) {
                    customerCredit += remainingPayment;
                    const customerRef = db.collection('customers').doc(currentCustomerDetailId);
                    batch.update(customerRef, { credit: customerCredit });

                     // Update local customer copy
                    const localCustomer = customers.find(c => c.id === currentCustomerDetailId);
                    if(localCustomer) {
                        localCustomer.credit = customerCredit;
                    }
                }

                // Commit the batch write
                await batch.commit();

                console.log('Payment processed and synced successfully.');

                // Reload data and re-show customer detail to reflect all changes
                // await loadData(); // Already updated local data directly
                showCustomerDetail(currentCustomerDetailId); // Re-show the customer detail page

                alert('Payment recorded and synced successfully!' + (customerCredit > 0 ? ` Remaining credit: ₹${customerCredit.toFixed(2)}` : ''));
                paymentAmountInput.value = ''; // Clear payment input

            } catch (error) {
                console.error('Error recording payment:', error);
                alert('Error recording payment. Please try again.' + (error.message || ''));
            }
        });
    } else if (!db) {
        console.error('Firestore is not initialized. Cannot set up recordCustomerPaymentBtn event listener.');
    }
});

// Load data from Firestore
async function loadData() {
    try {
        console.log('Loading data from Firestore...');
        
        // Check if Firestore is initialized
        if (!db) {
            console.error('Firestore not initialized when trying to load data.');
            alert('Error: Firebase not initialized properly. Please refresh the page.');
            return;
        }

        // Load customers
        const customersSnapshot = await db.collection('customers').get();
        customers = customersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure credit field exists and defaults to 0 if missing
            credit: typeof doc.data().credit === 'number' ? doc.data().credit : 0
        }));
        console.log('Customers loaded:', customers.length);

        // Load usage records
        const usageSnapshot = await db.collection('usage').get();
        usageRecords = usageSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Ensure totalMinutes field exists and defaults to 0
            totalMinutes: typeof doc.data().totalMinutes === 'number' ? doc.data().totalMinutes : 0,
            // Keep old fields with defaults for backward compatibility if necessary, but totalMinutes is preferred
            hoursDisplay: typeof doc.data().hoursDisplay === 'number' ? doc.data().hoursDisplay : (doc.data().totalMinutes ? Math.floor(doc.data().totalMinutes / 60) : 0),
            minutesDisplay: typeof doc.data().minutesDisplay === 'number' ? doc.data().minutesDisplay : (doc.data().totalMinutes ? Math.round(doc.data().totalMinutes % 60) : 0),
            // Convert Firebase Timestamp to ISO string, handling missing or invalid dates
            date: doc.data().date instanceof firebase.firestore.Timestamp ? doc.data().date.toDate().toISOString() : (typeof doc.data().date === 'string' ? doc.data().date : null)
        }));
        console.log('Usage records loaded:', usageRecords.length);

        // Load bills with payment information and handle missing fields
        const billsSnapshot = await db.collection('bills').get();
        bills = billsSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Safely get totalMinutes, handling older totalHours field if necessary
            const totalMinutes = typeof data.totalMinutes === 'number' ? data.totalMinutes : (typeof data.totalHours === 'number' ? Math.round(data.totalHours * 60) : 0);
            
            // Safely get amount, defaulting based on totalMinutes if missing
            const amount = typeof data.amount === 'number' ? data.amount : totalMinutes;

            return {
                id: doc.id,
                ...data,
                // Ensure new fields have default values if missing
                totalMinutes: totalMinutes,
                amount: amount,
                paidAmount: typeof data.paidAmount === 'number' ? data.paidAmount : 0,
                status: typeof data.status === 'string' ? data.status : 'Unpaid',
                // Convert Firebase Timestamps to ISO strings, handling missing or invalid dates
                date: data.date instanceof firebase.firestore.Timestamp ? data.date.toDate().toISOString() : (typeof data.date === 'string' ? data.date : null),
                paidAt: data.paidAt instanceof firebase.firestore.Timestamp ? data.paidAt.toDate().toISOString() : (typeof data.paidAt === 'string' ? data.paidAt : null),
                lastPaymentAt: data.lastPaymentAt instanceof firebase.firestore.Timestamp ? data.lastPaymentAt.toDate().toISOString() : (typeof data.lastPaymentAt === 'string' ? data.lastPaymentAt : null),
                // Include older 'paid' field for backward compatibility if needed, but status is preferred
                paid: typeof data.paid === 'boolean' ? data.paid : (typeof data.status === 'string' ? data.status === 'Paid' : false)
            };
        });
        console.log('Bills loaded:', bills.length);

        // Confirm data synchronization is complete
        console.log('Data synchronization with Firebase complete.');

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

    // Billing (generateBillBtn listener removed)
    // if (generateBillBtn) {
    //     generateBillBtn.addEventListener('click', handleGenerateBill);
    // } else {
    //     console.error('Generate bill button not found');
    // }
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
    console.log('Add Customer form submitted');

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

    // Save to local storage
    let localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
    const localCustomer = { id: Date.now().toString(), name };
    localCustomers.push(localCustomer);
    localStorage.setItem('customers', JSON.stringify(localCustomers));
    console.log('Customer saved to local storage:', localCustomer);

    // Save to Firebase
    try {
        const docRef = await db.collection('customers').add({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Customer added to Firestore and synced:', { id: docRef.id, name });

        // Optionally update your UI here
        updateUI();

        // Close modal and reset form
        const addCustomerModal = document.getElementById('addCustomerModal');
        if (addCustomerModal) addCustomerModal.style.display = 'none';
        const addCustomerForm = document.getElementById('addCustomerForm');
        if (addCustomerForm) addCustomerForm.reset();

        alert('Customer added and synced successfully!');
    } catch (error) {
        console.error('Error adding customer to Firestore:', error);
        alert('Error adding customer. Please try again.');
    }
}

// Usage Tracking
async function handleRecordUsage() {
    const customerSelect = document.getElementById('customerSelect');
    const hoursInput = document.getElementById('hours').value.trim();
    const minutesInput = document.getElementById('minutes').value.trim();

    const customerId = customerSelect ? customerSelect.value : null;

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

    // Convert to total minutes for calculation (1 Rupee per minute)
    const totalMinutes = (hours * 60) + minutes;
    const billAmount = totalMinutes; // 1 Rupee per minute

    try {
        // Add usage record to Firestore
        const usageDocRef = await db.collection('usage').add({
            customerId,
            hoursDisplay: hours,
            minutesDisplay: minutes,
            totalMinutes: totalMinutes, // Store total minutes in usage record too
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

        const usage = {
            id: usageDocRef.id,
            customerId,
            hoursDisplay: hours,
            minutesDisplay: minutes,
            totalMinutes: totalMinutes,
            date: new Date().toISOString()
        };

        usageRecords.push(usage);

        // Find the customer to get their name for the bill
        const customer = customers.find(c => c.id === customerId);
        const customerName = customer ? customer.name : 'Unknown Customer';

        // Automatically create a bill for this usage
        const billDocRef = await db.collection('bills').add({
            customerId,
            customerName: customerName,
            totalMinutes: totalMinutes, // Store total minutes in the bill
            amount: billAmount,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            paidAmount: 0,
            status: 'Unpaid',
            usageId: usageDocRef.id // Link the bill to the usage record
        });

        const bill = {
            id: billDocRef.id,
            customerId,
            customerName: customerName,
            totalMinutes: totalMinutes,
            amount: billAmount,
            date: new Date().toISOString(),
            paidAmount: 0,
            status: 'Unpaid',
            usageId: usageDocRef.id
        };

        bills.push(bill);

        console.log('Usage recorded and bill generated, syncing with Firebase...');

        // Update UI to reflect new usage and bill
        await loadData(); // Reload data to ensure consistency across arrays
        updateUI();

        // Clear the usage form
        if (customerSelect) customerSelect.value = '';
        document.getElementById('hours').value = '';
        document.getElementById('minutes').value = '';

        alert('Usage recorded, bill generated and synced successfully!');

    } catch (error) {
        console.error('Error recording usage or generating bill:', error);
        alert('Error recording usage or generating bill. Please try again.');
    }
}

// UI Updates
function updateUI() {
    console.log('Updating UI...');
    // Update user section
    const userNameEl = document.getElementById('userName');
    const loginBtnEl = document.getElementById('loginBtn');
    const logoutBtnEl = document.getElementById('logoutBtn');
    const loginFormEl = document.getElementById('loginForm');

    if (currentUser) {
        if (userNameEl) userNameEl.textContent = currentUser.email;
        if (loginBtnEl) loginBtnEl.style.display = 'none';
        if (logoutBtnEl) logoutBtnEl.style.display = 'block';
        if (loginFormEl) loginFormEl.style.display = 'none';
    } else {
        if (userNameEl) userNameEl.textContent = 'Guest';
        if (loginBtnEl) loginBtnEl.style.display = 'block';
        if (logoutBtnEl) logoutBtnEl.style.display = 'none';
        if (loginFormEl) loginFormEl.style.display = 'block';
    }

    // Update customer selects
    const customerSelectEl = document.getElementById('customerSelect');
    const billingCustomerSelectEl = document.getElementById('billingCustomerSelect'); // Keep this check even if billing page removed, in case element exists elsewhere

    const customerOptions = customers.map(c =>
        `<option value="${c.id}">${c.name}</option>`
    ).join('');

    if (customerSelectEl) customerSelectEl.innerHTML = '<option value="">Select Customer</option>' + customerOptions;
    // Check billingCustomerSelectEl before accessing innerHTML
    if (billingCustomerSelectEl) billingCustomerSelectEl.innerHTML = '<option value="">Select Customer</option>' + customerOptions;

    // Update customers list and make them clickable
    const customersListEl = document.getElementById('customersList');
    if (customersListEl) {
        customersListEl.innerHTML = customers.map(c => `
            <div class="customer-card" data-customer-id="${c.id}">
                <h3>${c.name}</h3>
            </div>
        `).join('');

        // Add event listeners to customer cards
        document.querySelectorAll('#customersList .customer-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const customerId = e.currentTarget.dataset.customerId;
                console.log('Customer card clicked, ID:', customerId);
                showCustomerDetail(customerId);
            });
        });
    }

    // Update usage history
    const usageHistoryEl = document.getElementById('usageHistory');
    if (usageHistoryEl) { // Add null check for usageHistoryEl
        usageHistoryEl.innerHTML = usageRecords.map(u => {
            const customer = customers.find(c => c.id === u.customerId);
            // Safely access hoursDisplay and minutesDisplay
            const hoursDisplay = u.hoursDisplay !== undefined ? u.hoursDisplay : (u.totalMinutes ? Math.floor(u.totalMinutes / 60) : 0);
            const minutesDisplay = u.minutesDisplay !== undefined ? u.minutesDisplay : (u.totalMinutes ? Math.round(u.totalMinutes % 60) : 0);
            return `
                <div class="usage-record">
                    <p>Customer: ${customer ? customer.name : 'Unknown'}</p>
                    <p class="time">Time Used: ${hoursDisplay} hours ${minutesDisplay} minutes</p>
                    <p>Date: ${u.date ? new Date(u.date).toLocaleDateString() : 'N/A'}</p>
                </div>
            `;
        }).join('');
    }

    // Update billing history with payment status, paid amount, remaining balance
    // This section might still exist if the billing page was not fully removed or if its elements are elsewhere.
    const billingHistoryEl = document.getElementById('billingHistory');
    if (billingHistoryEl) { // Add null check for billingHistoryEl
        billingHistoryEl.innerHTML = bills.map(b => {
            // Provide default values for potentially missing fields
            const totalMinutes = b.totalMinutes !== undefined ? b.totalMinutes : (b.totalHours !== undefined ? Math.round(b.totalHours * 60) : 0);
            const amount = b.amount !== undefined ? b.amount : totalMinutes;
            const paidAmount = b.paidAmount !== undefined ? b.paidAmount : 0;
            const status = b.status !== undefined ? b.status : 'Unpaid';
            const remainingBalance = amount - paidAmount;

            // Determine the CSS class based on status
            const statusClass = status.toLowerCase().replace(' ', '-');

            return `
                <div class="bill-record ${statusClass}">
                    <h3>Bill for ${b.customerName ? b.customerName : 'Unknown Customer'}</h3>
                    <p>Total Minutes: ${totalMinutes}</p>
                    <p>Total Amount: ₹${amount.toFixed(2)}</p>
                    <p>Paid Amount: ₹${paidAmount.toFixed(2)}</p>
                    <p>Remaining Balance: ₹${remainingBalance.toFixed(2)}</p>
                    <p>Status: ${status}</p>
                    ${status === 'Paid' ?
                        `<p>Paid on: ${b.lastPaymentAt ? new Date(b.lastPaymentAt).toLocaleDateString() : (b.paidAt ? new Date(b.paidAt).toLocaleDateString() : 'N/A')}</p>` : '' // Ensure no button is rendered here
                    }
                </div>
            `;
        }).join('');
    }

    // Update dashboard stats
    const totalCustomersEl = document.getElementById('totalCustomers');
    if(totalCustomersEl) totalCustomersEl.textContent = customers.length;

    const totalUsageEl = document.getElementById('totalUsage');
     if(totalUsageEl) {
        const totalUsageMinutes = usageRecords.reduce((sum, u) => sum + (u.totalMinutes || 0), 0);
        const usageHours = Math.floor(totalUsageMinutes / 60);
        const usageMinutes = totalUsageMinutes % 60;
        totalUsageEl.textContent = `${usageHours}h ${usageMinutes}m`;
    }

    const totalRevenueEl = document.getElementById('totalRevenue');
    if(totalRevenueEl) {
         // Calculate total revenue from bill amounts (safely access amount)
         const totalRevenueAmount = bills.reduce((sum, b) => sum + (b.amount !== undefined ? b.amount : 0), 0);
         totalRevenueEl.textContent = `₹${totalRevenueAmount.toFixed(2)}`;
    }

    // Update dashboard stats to include payment information
    const totalBills = bills.length;
    // Safely filter based on status
    const paidBills = bills.filter(b => (b.status !== undefined ? b.status : 'Unpaid') === 'Paid').length;
    const partialPaidBills = bills.filter(b => (b.status !== undefined ? b.status : 'Unpaid') === 'Partial Payment').length;
    const unpaidBills = totalBills - paidBills - partialPaidBills;

    // Safely calculate total paid and remaining amounts
    const totalPaidAmount = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalAmountDue = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalRemainingAmount = totalAmountDue - totalPaidAmount;

    // Add payment statistics to dashboard if elements exist
    const paymentStatsEl = document.getElementById('paymentStats');
    if (paymentStatsEl) { // Add null check for paymentStatsEl
        paymentStatsEl.innerHTML = `
            <div class="stat-card">
                <h3>Payment Statistics</h3>
                <p>Total Bills: ${totalBills}</p>
                <p>Paid Bills: ${paidBills}</p>
                <p>Partial Paid Bills: ${partialPaidBills}</p>
                <p>Unpaid Bills: ${unpaidBills}</p>
                <p>Total Collected: ₹${totalPaidAmount.toFixed(2)}</p>
                 <p>Total Remaining: ₹${totalRemainingAmount.toFixed(2)}</p>
            </div>
        `;
    }
     console.log('UI update complete.');
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

// Function to show customer detail view
function showCustomerDetail(customerId) {
    // Set the current customer ID
    currentCustomerDetailId = customerId;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        console.error('Customer not found:', customerId);
        alert('Error: Customer details not found.');
        return;
    }

    // Filter bills for this customer
    const customerBills = bills.filter(b => b.customerId === customerId);

    // Calculate total remaining balance
    const totalRemainingBalance = customerBills.reduce((sum, bill) => {
        const amount = bill.amount !== undefined ? bill.amount : 0;
        const paidAmount = bill.paidAmount !== undefined ? bill.paidAmount : 0;
        return sum + (amount - paidAmount);
    }, 0);

    // Get detail view elements and log them
    const customerDetailNameEl = document.getElementById('customerDetailName');
    const customerTotalBalanceEl = document.getElementById('customerTotalBalance');
    const customerBillsListEl = document.getElementById('customerBillsList');
    const customersListEl = document.getElementById('customersList');
    const customerDetailViewEl = document.getElementById('customerDetailView');

    console.log('customerDetailNameEl:', customerDetailNameEl);
    console.log('customerTotalBalanceEl:', customerTotalBalanceEl);
    console.log('customerBillsListEl:', customerBillsListEl);
    console.log('customersListEl:', customersListEl);
    console.log('customerDetailViewEl:', customerDetailViewEl);


    // Update detail view elements
    if (customerDetailNameEl) customerDetailNameEl.textContent = customer.name;
    if (customerTotalBalanceEl) customerTotalBalanceEl.innerHTML = `<strong>Total Remaining Balance: ₹${totalRemainingBalance.toFixed(2)}</strong>`;

    // Render customer-specific bills without individual payment buttons
    if (customerBillsListEl) {
        customerBillsListEl.innerHTML = customerBills.map(b => {
            const totalMinutes = b.totalMinutes !== undefined ? b.totalMinutes : (b.totalHours !== undefined ? Math.round(b.totalHours * 60) : 0);
            const amount = b.amount !== undefined ? b.amount : totalMinutes;
            const paidAmount = b.paidAmount !== undefined ? b.paidAmount : 0;
            const status = b.status !== undefined ? b.status : 'Unpaid';
            const remainingBalance = amount - paidAmount;
            const statusClass = status.toLowerCase().replace(' ', '-');

            return `
                <div class="bill-record ${statusClass}">
                    <h3>Bill Date: ${b.date ? new Date(b.date).toLocaleDateString() : 'N/A'}</h3>
                    <p>Total Minutes: ${totalMinutes}</p>
                    <p>Total Amount: ₹${amount.toFixed(2)}</p>
                    <p>Paid Amount: ₹${paidAmount.toFixed(2)}</p>
                    <p>Remaining Balance: ₹${remainingBalance.toFixed(2)}</p>
                    <p>Status: ${status}</p>
                    ${status === 'Paid' ?
                        `<p>Paid on: ${b.lastPaymentAt ? new Date(b.lastPaymentAt).toLocaleDateString() : (b.paidAt ? new Date(b.paidAt).toLocaleDateString() : 'N/A')}</p>` : '' // Remove button here
                    }
                </div>
            `;
        }).join('');
    }

    // Populate the bill selection dropdown (removed previously, keep this commented or remove)
    // const customerBillSelect = document.getElementById('customerBillSelect');
    // if (customerBillSelect) {
    // ... dropdown population logic ...
    // }

    // Hide customer list and show detail view
    if (customersListEl) customersListEl.style.display = 'none';
    if (customerDetailViewEl) customerDetailViewEl.style.display = 'block';

    // Also update the payment section elements if they exist
    const customerBillSelectEl = document.getElementById('customerBillSelect');
    const detailPaymentAmountEl = document.getElementById('detailPaymentAmount');
    const recordCustomerPaymentBtnEl = document.getElementById('recordCustomerPaymentBtn');

     console.log('customerBillSelectEl:', customerBillSelectEl);
     console.log('detailPaymentAmountEl:', detailPaymentAmountEl);
     console.log('recordCustomerPaymentBtnEl:', recordCustomerPaymentBtnEl);

    // If you are using the payment section, you might need to populate the dropdown here
    // if you decide to bring it back or use its elements for a different purpose.
    // For the current simplified payment approach, the dropdown is not used.

}