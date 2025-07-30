
    // NEW: Import Firebase SDK modules
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import {
        getAuth,
        onAuthStateChanged,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut
    } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
    import {
        getFirestore,
        collection,
        doc,
        setDoc,
        getDoc,
        addDoc,
        getDocs,
        deleteDoc,
        updateDoc,
        query,
        orderBy
    } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

    // NEW: Firebase configuration
    const firebaseConfig = {
        // PASTE YOUR FIREBASE CONFIG OBJECT HERE
        apiKey: "AIzaSyB-TPLb6yQWN4vhdGvbY6om4b2i-nnI9bo",
        authDomain: "finance-75e75.firebaseapp.com",
        projectId: "finance-75e75",
        storageBucket: "finance-75e75.firebasestorage.app",
        messagingSenderId: "166742508134",
        appId: "1:166742508134:web:1fcffc3bb11401999063a7",
        measurementId: "G-LXEYR1MWPP"
    };

    // NEW: Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // MODIFIED: Global State
    let currentUser = null;
    let currentPage = 'dashboard';
    let transactions = []; // Will be loaded from Firebase
    let goals = []; // Will be loaded from Firebase

    // --- Utility Functions (No changes needed here) ---
    function formatCurrency(amount) {
        return new Intl.NumberFormat('th-TH').format(amount);
    }
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('th-TH');
    }

    function calculateMonthsLeft(deadline) {
        const today = new Date();
        const deadlineDate = new Date(deadline);

        today.setHours(0, 0, 0, 0);
        deadlineDate.setHours(0, 0, 0, 0);

        const msPerDay = 1000 * 60 * 60 * 24;
        const totalDays = Math.floor((deadlineDate - today) / msPerDay);

        if (totalDays < 0) {
            return { months: 0, weeks: 0, days: 0, isExpired: true };
        }

        const weeks = Math.floor(totalDays / 7);
        const days = totalDays % 7;

        let months = null;
        if (totalDays >= 30) {
            months = (deadlineDate.getFullYear() - today.getFullYear()) * 12 +
                    (deadlineDate.getMonth() - today.getMonth());
            if (deadlineDate.getDate() < today.getDate()) {
                months--;
            }
        }

        return {
            months,
            weeks,
            days,
            isExpired: false
        };
    }



    function getProgressBadge(progress, timeLeft) {
        if (progress >= 100) {
            return '<span class="badge badge-success">สำเร็จแล้ว</span>';
        }

        if (timeLeft.isExpired) {
            return '<span class="badge badge-dark">สิ้นสุดแล้ว</span>';
        }

        if (timeLeft.months !== null && timeLeft.months <= 1) {
            return '<span class="badge badge-danger">ใกล้หมดเวลา</span>';
        }

        if (progress >= 75) {
            return '<span class="badge badge-primary">เกือบถึงเป้า</span>';
        }

        if (progress >= 50) {
            return '<span class="badge badge-secondary">กำลังดำเนินการ</span>';
        }

        return '<span class="badge badge-outline">เริ่มต้น</span>';
    }

    // MODIFIED: Auth Functions
    function initAuthPage() {
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabName = tab.getAttribute('data-tab');
                loginForm.classList.toggle('active', tabName === 'login');
                registerForm.classList.toggle('active', tabName === 'register');
            });
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged will handle UI changes
            } catch (error) {
                alert(`เข้าสู่ระบบล้มเหลว: ${error.message}`);
            }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = registerForm.name.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;

            if (password !== confirmPassword) {
                alert('รหัสผ่านไม่ตรงกัน');
                return;
            }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // NEW: Save user name to Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email
                });
                // onAuthStateChanged will handle UI changes
            } catch (error) {
                alert(`สมัครสมาชิก ล้มเหลว: ${error.message}`);
            }
        });
    }

    // MODIFIED: Show Main App Logic
    async function showMainApp(user) {
        document.getElementById('auth-page').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';

        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            currentUser = { uid: user.uid, ...userDoc.data() };
        } else {
             currentUser = { uid: user.uid, name: 'ผู้ใช้งาน', email: user.email };
        }

        document.getElementById('user-name').textContent = `สวัสดี, ${currentUser.name}`;
        document.getElementById('user-email').textContent = currentUser.email;

        // Fetch user's data
        await loadData();

        initNavigation();
        renderCurrentPage();
    }
    
    // NEW: Function to load all user data from Firestore
    async function loadData() {
        if (!currentUser) return;

        // Load transactions
        const transQuery = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("date", "desc"));
        const transSnapshot = await getDocs(transQuery);
        transactions = transSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Load goals
        const goalsQuery = query(collection(db, "users", currentUser.uid, "goals"), orderBy("deadline", "asc"));
        const goalsSnapshot = await getDocs(goalsQuery);
        goals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }


    // MODIFIED: Logout function
    async function logout() {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle UI changes
        } catch (error) {
            alert(`ออกจากระบบล้มเหลว: ${error.message}`);
        }
    }
    
    function showAuthPage() {
        currentUser = null;
        transactions = [];
        goals = [];
        document.getElementById('auth-page').style.display = 'flex'; // Use flex for centering
        document.getElementById('main-app').style.display = 'none';
        initAuthPage();
    }
    
    // NEW: Firebase Auth State Observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            showMainApp(user);
        } else {
            // User is signed out
            showAuthPage();
        }
    });


    // --- Navigation Functions (Mostly unchanged) ---
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const logoutBtn = document.getElementById('logout-btn');

        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                });
            }
        });
        
        // Ensure logout listener is only added once
        logoutBtn.onclick = (e) => {
             e.preventDefault();
             logout();
        };
    }
    
    function setCurrentPage(page) {
        currentPage = page;
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
        renderCurrentPage();
    }
    
    // MODIFIED: renderCurrentPage to handle async data
    async function renderCurrentPage() {
        const contentArea = document.getElementById('content-area');
        
        // Reload data just in case it's stale
        await loadData();
        
        switch (currentPage) {
            case 'dashboard':
                contentArea.innerHTML = renderDashboard();
                break;
            case 'transactions':
                contentArea.innerHTML = renderTransactionsPage();
                initTransactionsPage();
                break;
            case 'goals':
                contentArea.innerHTML = renderGoalsPage();
                initGoalsPage();
                break;
            case 'progress':
                contentArea.innerHTML = renderProgressPage();
                initProgressPage();
                break;
            default:
                contentArea.innerHTML = renderDashboard();
        }
    }


    // --- Page Rendering Functions (No changes needed in these functions) ---
    // The render... functions like renderDashboard, renderTransactionsPage, etc.
    // should work as they are because they read from the global `transactions` and `goals` arrays,
    // which are now populated from Firebase.
    // I am including all of them here for completeness.
    
    // Dashboard Functions
    function renderDashboard() {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIncome - totalExpense;

        return `
            <div class="space-y-4">
                <div>
                    <h1>สวัสดี! ยินดีต้อนรับสู่แดชบอร์ดการเงิน</h1>
                    <p style="color: #6b7280; margin-top: 0.5rem;">ภาพรวมสถานะการเงินของคุณ</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(balance)} ฿</div>
                        <div class="stat-label">ยอดคงเหลือ</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value stat-positive">+${formatCurrency(totalIncome)} ฿</div>
                        <div class="stat-label">รายรับทั้งหมด</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value stat-negative">-${formatCurrency(totalExpense)} ฿</div>
                        <div class="stat-label">รายจ่ายทั้งหมด</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header"><div class="card-title">🎯 เป้าหมายการออม</div></div>
                    <div class="card-content">
                        ${goals.length > 0 ? `
                            <div class="mt-2 space-y-3">
                                ${goals.map(goal => {
                                    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                                    const timeLeft = calculateMonthsLeft(goal.deadline); // ✅ ถูกต้อง อยู่ใน map()

                                    return `
                                        <div class="goal-item">
                                            <div class="flex justify-between items-center">
                                                <span style="font-weight: 500;">${goal.title}</span>
                                                <span style="font-size: 0.85rem;">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)} ฿</span>
                                            </div>
                                            <div class="progress-bar small-bar">
                                                <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                                            </div>
                                            <div class="flex justify-between" style="font-size: 0.75rem; color: #6b7280;">
                                                <span>${progress.toFixed(1)}%</span>
                                                ${getProgressBadge(progress, timeLeft)} <!-- ✅ ใช้ timeLeft -->
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `<p class="text-center text-gray-500">ยังไม่มีเป้าหมาย</p>`}
                    </div>
                </div>
            </div>`;
    }



    // Transactions Functions
    function renderTransactionsPage() {
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const incomeCategories = ['เงินเดือน', 'รายได้เสริม', 'โบนัส', 'การลงทุน', 'อื่นๆ'];
        const expenseCategories = ['อาหาร', 'เดินทาง', 'บันเทิง', 'ช้อปปิ้ง', 'ค่าใช้จ่ายบ้าน', 'สุขภาพ', 'การศึกษา', 'อื่นๆ'];

        return `
            <div class="space-y-4">
                <div><h1>บันทึกรายรับ-รายจ่าย</h1><p style="color: #6b7280; margin-top: 0.5rem;">เพิ่มและจัดการรายการทางการเงินของคุณ</p></div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card"><div class="stat-value stat-positive">+${formatCurrency(totalIncome)} ฿</div><div class="stat-label">รายรับทั้งหมด</div></div>
                    <div class="stat-card"><div class="stat-value stat-negative">-${formatCurrency(totalExpense)} ฿</div><div class="stat-label">รายจ่ายทั้งหมด</div></div>
                    <div class="stat-card"><div class="stat-value ${totalIncome - totalExpense >= 0 ? 'stat-positive' : 'stat-negative'}">${totalIncome - totalExpense >= 0 ? '+' : ''}${formatCurrency(totalIncome - totalExpense)} ฿</div><div class="stat-label">คงเหลือสุทธิ</div></div>
                </div>
                <div class="tabs">
                    <div class="tabs-list"><div class="tabs-trigger active" data-tab="add">เพิ่มรายการ</div><div class="tabs-trigger" data-tab="history">ประวัติการทำรายการ</div></div>
                    <div class="tabs-content active" id="add-tab">
                        <div class="card"><div class="card-header"><div class="card-title">เพิ่มรายการใหม่</div></div><div class="card-content">
                            <form id="transaction-form">
                                <div class="form-row"><div class="form-group"><label class="form-label">ประเภท</label><select class="form-select" name="type" id="transaction-type"><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select></div><div class="form-group"><label class="form-label">จำนวนเงิน (บาท)</label><input type="number" class="form-input" name="amount" step="0.01" placeholder="0.00" required></div><div class="form-group"><label class="form-label">หมวดหมู่</label><select class="form-select" name="category" id="transaction-category" required><option value="">เลือกหมวดหมู่</option>${expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">วันที่</label><input type="date" class="form-input" name="date" value="${new Date().toISOString().split('T')[0]}" required></div></div>
                                <div class="form-group"><label class="form-label">รายละเอียด (ไม่บังคับ)</label><textarea class="form-textarea" name="description" placeholder="รายละเอียดเพิ่มเติม..."></textarea></div>
                                <button type="submit" class="btn btn-primary btn-full">บันทึกรายการ</button>
                            </form>
                        </div></div>
                    </div>
                    <div class="tabs-content" id="history-tab"><div class="card"><div class="card-header"><div class="card-title">ประวัติการทำรายการ</div></div><div class="card-content"><div id="transactions-list">${renderTransactionsList()}</div></div></div></div>
                </div>
            </div>`;
    }

    function renderTransactionsList() {
        if (transactions.length === 0) return '<p class="text-center py-8" style="color: #6b7280;">ยังไม่มีรายการ</p>';
        return transactions.map(t => `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-info"><div class="transaction-category"><span class="badge ${t.type === 'income' ? 'badge-primary' : 'badge-secondary'}">${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</span><span style="margin-left: 0.5rem; font-weight: 500;">${t.category}</span></div><div class="transaction-description">${t.description}</div><div class="transaction-date">${formatDate(t.date)}</div></div>
                <div class="flex items-center gap-2"><div class="transaction-amount ${t.type === 'income' ? 'stat-positive' : 'stat-negative'}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)} ฿</div><button class="btn btn-danger btn-small delete-transaction-btn">ลบ</button></div>
            </div>`).join('');
    }

    // MODIFIED: Transaction Page Initialization
    function initTransactionsPage() {
        const contentArea = document.getElementById('content-area');
        const form = document.getElementById('transaction-form');
        
        // Tab switching logic
        contentArea.querySelectorAll('.tabs-trigger').forEach(trigger => {
            trigger.addEventListener('click', () => {
                const tabName = trigger.getAttribute('data-tab');
                contentArea.querySelectorAll('.tabs-trigger').forEach(t => t.classList.remove('active'));
                trigger.classList.add('active');
                contentArea.querySelectorAll('.tabs-content').forEach(c => c.classList.remove('active'));
                contentArea.querySelector(`#${tabName}-tab`).classList.add('active');
            });
        });

        // Category select logic
        const typeSelect = document.getElementById('transaction-type');
        const categorySelect = document.getElementById('transaction-category');
        const incomeCategories = ['เงินเดือน', 'รายได้เสริม', 'โบนัส', 'การลงทุน', 'อื่นๆ'];
        const expenseCategories = ['อาหาร', 'เดินทาง', 'บันเทิง', 'ช้อปปิ้ง', 'ค่าใช้จ่ายบ้าน', 'สุขภาพ', 'การศึกษา', 'อื่นๆ'];
        typeSelect.addEventListener('change', () => {
            const type = typeSelect.value;
            const categories = type === 'income' ? incomeCategories : expenseCategories;
            categorySelect.innerHTML = '<option value="">เลือกหมวดหมู่</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newTransaction = {
                type: form.type.value,
                amount: parseFloat(form.amount.value),
                category: form.category.value,
                description: form.description.value || '',
                date: form.date.value
            };
            try {
                await addDoc(collection(db, "users", currentUser.uid, "transactions"), newTransaction);
                form.reset();
                form.date.value = new Date().toISOString().split('T')[0];
                alert('บันทึกสำเร็จ!');
                await renderCurrentPage(); // Refresh the page
            } catch (error) {
                alert(`เกิดข้อผิดพลาด: ${error.message}`);
            }
        });

        // Delete button listener
        document.getElementById('transactions-list').addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-transaction-btn')) {
                const item = e.target.closest('.transaction-item');
                const id = item.dataset.id;
                if (confirm('คุณต้องการลบรายการนี้หรือไม่?')) {
                    try {
                        await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
                        await renderCurrentPage();
                    } catch (error) {
                         alert(`เกิดข้อผิดพลาด: ${error.message}`);
                    }
                }
            }
        });
    }

    // --- Goals Functions (structure similar to transactions) ---
    function renderGoalsPage() {
         const totalGoals = goals.length;
         const completedGoals = goals.filter(g => (g.currentAmount / g.targetAmount) * 100 >= 100).length;
         const totalSavings = goals.reduce((sum, g) => sum + g.currentAmount, 0);

        return `
             <div class="space-y-4">
                 <div class="flex justify-between items-center">
                     <div><h1>เป้าหมายการออม</h1><p style="color: #6b7280; margin-top: 0.5rem;">กำหนดและติดตามเป้าหมายการเงินของคุณ</p></div>
                     <button class="btn btn-primary" id="toggle-goal-form-btn"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 0.5rem;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>เพิ่มเป้าหมาย</button>
                 </div>
                 <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card"><div class="stat-value">${totalGoals} เป้าหมาย</div><div class="stat-label">เป้าหมายทั้งหมด</div></div>
                    <div class="stat-card"><div class="stat-value stat-positive">${completedGoals} เป้าหมาย</div><div class="stat-label">เป้าหมายที่สำเร็จ</div></div>
                    <div class="stat-card"><div class="stat-value">${formatCurrency(totalSavings)} ฿</div><div class="stat-label">เงินออมรวม</div></div>
                 </div>
                 <div class="card" id="goal-form-card" style="display: none;">
                     <div class="card-header"><div class="card-title">เพิ่มเป้าหมายใหม่</div></div>
                     <div class="card-content">
                         <form id="goal-form">
                             <div class="form-row"><div class="form-group"><label class="form-label">ชื่อเป้าหมาย</label><input type="text" class="form-input" name="title" placeholder="เช่น ซื้อบ้าน, เที่ยวญี่ปุ่น" required></div><div class="form-group"><label class="form-label">จำนวนเงินเป้าหมาย (บาท)</label><input type="number" class="form-input" name="targetAmount" placeholder="0" required></div><div class="form-group"><label class="form-label">หมวดหมู่</label><select class="form-select" name="category" required><option value="">เลือกหมวดหมู่</option><option value="ซื้อบ้าน">ซื้อบ้าน</option><option value="ซื้อรถ">ซื้อรถ</option><option value="ท่องเที่ยว">ท่องเที่ยว</option><option value="เกษียณ">เกษียณ</option><option value="การศึกษา">การศึกษา</option><option value="ฉุกเฉิน">ฉุกเฉิน</option><option value="อื่นๆ">อื่นๆ</option></select></div><div class="form-group"><label class="form-label">วันที่เป้าหมาย</label><input type="date" class="form-input" name="deadline" required></div></div>
                             <div class="form-group"><label class="form-label">รายละเอียด (ไม่บังคับ)</label><textarea class="form-textarea" name="description" placeholder="รายละเอียดเป้าหมาย..."></textarea></div>
                             <div class="flex gap-2"><button type="submit" class="btn btn-primary">สร้างเป้าหมาย</button><button type="button" class="btn btn-outline" id="cancel-goal-form-btn">ยกเลิก</button></div>
                         </form>
                     </div>
                 </div>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="goals-list-container">
                     ${renderGoalsList()}
                 </div>
             </div>`;
    }

    // ...existing code...
    function renderGoalsList() {
        if (goals.length === 0) {
            return `<div class="card" style="grid-column: 1 / -1;">
                <div class="card-content text-center py-8">
                    <p style="color: #6b7280;">ยังไม่มีเป้าหมาย</p>
                </div>
            </div>`;
        }

        return goals.map(goal => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const timeLeft = calculateMonthsLeft(goal.deadline);
            const remainingAmount = goal.targetAmount - goal.currentAmount;

            let timeLeftText = '';
            let savePerText = '';
            let monthlyTarget = 0, weeklyTarget = 0, dailyTarget = 0;

            // เช็กว่าหมดเวลาแล้วหรือยัง
            const isExpired = timeLeft.days === 0 && progress < 100;

            if (!isExpired) {
                if (timeLeft.months !== null) {
                    const totalWeeks = timeLeft.months * 4 + timeLeft.weeks;
                    const totalDays = timeLeft.months * 30 + timeLeft.weeks * 7 + timeLeft.days;

                    monthlyTarget = remainingAmount > 0 ? remainingAmount / timeLeft.months : 0;
                    weeklyTarget = totalWeeks > 0 && remainingAmount > 0 ? remainingAmount / totalWeeks : 0;
                    dailyTarget = totalDays > 0 && remainingAmount > 0 ? remainingAmount / totalDays : 0;

                    timeLeftText = `${timeLeft.months} เดือน<br>${timeLeft.weeks} สัปดาห์<br>${timeLeft.days} วัน`;
                    savePerText = `${formatCurrency(monthlyTarget)} ฿/เดือน<br>${formatCurrency(weeklyTarget)} ฿/สัปดาห์<br>${formatCurrency(dailyTarget)} ฿/วัน`;
                } else {
                    const totalDays = timeLeft.weeks * 7 + timeLeft.days;
                    weeklyTarget = timeLeft.weeks > 0 && remainingAmount > 0 ? remainingAmount / timeLeft.weeks : 0;
                    dailyTarget = totalDays > 0 && remainingAmount > 0 ? remainingAmount / totalDays : 0;

                    timeLeftText = `${timeLeft.weeks} สัปดาห์<br>${timeLeft.days} วัน`;
                    savePerText = `${formatCurrency(weeklyTarget)} ฿/สัปดาห์<br>${formatCurrency(dailyTarget)} ฿/วัน`;
                }
            } else {
                timeLeftText = `<span class="text-red-600">หมดเวลาตามกำหนด</span>`;
                savePerText = `<span class="text-gray-500">-</span>`;
            }

            return `
                <div class="goal-card" data-id="${goal.id}">
                    <div class="goal-header">
                        <div>
                            <div class="goal-title">${goal.title}</div>
                            <div class="goal-category">${goal.category}</div>
                        </div>
                        <div class="goal-actions">
                            ${getProgressBadge(progress, timeLeft)}
                            <button class="btn btn-danger btn-small delete-goal-btn">ลบ</button>
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-progress-text">
                            <span>ความคืบหน้า</span>
                            <span>${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)} ฿</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                        </div>
                        <div class="goal-progress-details">
                            <span>${progress.toFixed(1)}%</span>
                            <span>เหลือ ${formatCurrency(remainingAmount)} ฿</span>
                        </div>
                    </div>
                    <div class="goal-stats">
                        <div>
                            <div class="goal-stat-label">เวลาเหลือ</div>
                            <div>${timeLeftText}</div>
                        </div>
                        <div>
                            <div class="goal-stat-label">ออมต่อช่วงเวลา</div>
                            <div>${savePerText}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mb-4">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #6b7280;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span style="font-size: 0.875rem; color: #6b7280;">ถึง ${formatDate(goal.deadline)}</span>
                    </div>
                    ${goal.description ? `<p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">${goal.description}</p>` : ''}
                    <div class="flex gap-2">
                        <input type="number" class="form-input update-amount-input" placeholder="อัปเดตยอดเงินออม" style="flex: 1;">
                        <button class="btn btn-primary btn-small update-goal-btn">อัปเดต</button>
                    </div>
                </div>`;
        }).join('');
    }


    function initGoalsPage() {
        const formCard = document.getElementById('goal-form-card');
        const form = document.getElementById('goal-form');
        const goalsListContainer = document.getElementById('goals-list-container');
        
        document.getElementById('toggle-goal-form-btn').addEventListener('click', () => formCard.style.display = 'block');
        document.getElementById('cancel-goal-form-btn').addEventListener('click', () => formCard.style.display = 'none');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newGoal = {
                title: form.title.value,
                targetAmount: parseFloat(form.targetAmount.value),
                currentAmount: 0,
                deadline: form.deadline.value,
                category: form.category.value,
                description: form.description.value || '',
            };
            try {
                await addDoc(collection(db, "users", currentUser.uid, "goals"), newGoal);
                form.reset();
                formCard.style.display = 'none';
                alert('สร้างเป้าหมายสำเร็จ!');
                await renderCurrentPage();
            } catch (error) {
                alert(`เกิดข้อผิดพลาด: ${error.message}`);
            }
        });

        goalsListContainer.addEventListener('click', async (e) => {
            const goalCard = e.target.closest('.goal-card');
            if (!goalCard) return;
            const id = goalCard.dataset.id;
            
            if (e.target.classList.contains('update-goal-btn')) {
                const input = goalCard.querySelector('.update-amount-input');
                const amount = parseFloat(input.value);
                if (isNaN(amount) || amount <= 0) {
                    alert('กรุณากรอกจำนวนเงินที่ถูกต้อง');
                    return;
                }
                const goalToUpdate = goals.find(g => g.id === id);
                const newCurrentAmount = goalToUpdate.currentAmount + amount;

                try {
                    await updateDoc(doc(db, "users", currentUser.uid, "goals", id), { currentAmount: newCurrentAmount });
                    input.value = '';
                    alert('อัปเดตจำนวนเงินสำเร็จ!');
                    await renderCurrentPage();
                } catch(error) {
                    alert(`เกิดข้อผิดพลาด: ${error.message}`);
                }
            }
            
            if (e.target.classList.contains('delete-goal-btn')) {
                if (confirm('คุณต้องการลบเป้าหมายนี้หรือไม่?')) {
                    try {
                        await deleteDoc(doc(db, "users", currentUser.uid, "goals", id));
                        await renderCurrentPage();
                    } catch (error) {
                         alert(`เกิดข้อผิดพลาด: ${error.message}`);
                    }
                }
            }
        });
    }


    // --- Progress Functions ---
    // These should also work correctly as they depend on the global arrays.
    function renderProgressPage() {
        // ... (The renderProgressPage function code from your original file goes here. No changes needed.)
        // ... I'll omit it for brevity, but you should keep it.
        return `<div class="space-y-4"><div><h1>ติดตามความคืบหน้า</h1></div><div class="card"><div class="card-header"><div class="card-title">แนวโน้มรายรับ-รายจ่าย</div></div><div class="card-content"><div class="chart-container"><canvas id="income-expense-chart"></canvas></div></div></div><div class="card"><div class="card-header"><div class="card-title">การใช้จ่ายตามหมวดหมู่</div></div><div class="card-content"><div class="chart-container"><canvas id="expense-category-chart"></canvas></div></div></div></div>`;
    }

    function initProgressPage() {
        setTimeout(() => {
            initIncomeExpenseChart();
            initExpenseCategoryChart();
        }, 100);
    }

    function initIncomeExpenseChart() {
        const ctx = document.getElementById('income-expense-chart');
        if (!ctx) return;
        
        const monthlyData = {};
        transactions.forEach(t => {
            const month = new Date(t.date).toLocaleString('th-TH', { month: 'short', year: '2-digit' });
            if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
            if (t.type === 'income') monthlyData[month].income += t.amount;
            else monthlyData[month].expense += t.amount;
        });

        const labels = Object.keys(monthlyData).reverse();
        const incomeData = labels.map(label => monthlyData[label].income);
        const expenseData = labels.map(label => monthlyData[label].expense);
        
        new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: [ { label: 'รายรับ', data: incomeData, borderColor: '#10b981', fill: false }, { label: 'รายจ่าย', data: expenseData, borderColor: '#ef4444', fill: false } ] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    function initExpenseCategoryChart() {
         const ctx = document.getElementById('expense-category-chart');
         if (!ctx) return;

         const expenseByCategory = {};
         transactions.filter(t => t.type === 'expense').forEach(t => {
             expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
         });

         const categories = Object.keys(expenseByCategory);
         const amounts = Object.values(expenseByCategory);
         const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

         new Chart(ctx, {
             type: 'pie',
             data: { labels: categories, datasets: [{ data: amounts, backgroundColor: colors.slice(0, categories.length) }] },
             options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
         });
    }