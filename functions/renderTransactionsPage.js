// Transactions Functions
    function renderTransactionsPage() {
        const totalIncome = transactions.filter(t => t.type === 'income')
                            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense')
                            .reduce((sum, t) => sum + t.amount, 0);
                            
        const incomeCategories = ['เงินเดือน', 'รายได้เสริม', 'โบนัส', 'การลงทุน', 'อื่นๆ'];
        const expenseCategories = ['อาหาร', 'เดินทาง', 'บันเทิง', 'ช้อปปิ้ง', 'ค่าใช้จ่ายบ้าน', 'สุขภาพ', 'การศึกษา', 'อื่นๆ'];
        return `
            <div class="space-y-4">
                
                <!-- หัวข้อ -->
                <div>
                    <h1>บันทึกรายรับ-รายจ่าย</h1>
                    <p style="color: #6b7280; margin-top: 0.5rem;">
                        เพิ่มและจัดการรายการทางการเงินของคุณ
                    </p>
                </div>

                <!-- สรุปยอด -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card">
                        <div class="stat-value stat-positive">
                            +${formatCurrency(totalIncome)} ฿
                        </div>
                        <div class="stat-label">รายรับทั้งหมด</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-value stat-negative">
                            -${formatCurrency(totalExpense)} ฿
                        </div>
                        <div class="stat-label">รายจ่ายทั้งหมด</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-value ${totalIncome - totalExpense >= 0 ? 'stat-positive' : 'stat-negative'}">
                            ${totalIncome - totalExpense >= 0 ? '+' : ''}${formatCurrency(totalIncome - totalExpense)} ฿
                        </div>
                        <div class="stat-label">คงเหลือสุทธิ</div>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="tabs">
                    <div class="tabs-list">
                        <div class="tabs-trigger active" data-tab="add">เพิ่มรายการ</div>
                        <div class="tabs-trigger" data-tab="history">ประวัติการทำรายการ</div>
                    </div>

                    <!-- Tab: เพิ่มรายการ -->
                    <div class="tabs-content active" id="add-tab">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">เพิ่มรายการใหม่</div>
                            </div>
                            <div class="card-content">
                                <form id="transaction-form">
                                    <div class="form-row">

                                        <div class="form-group">
                                            <label class="form-label">ประเภท</label>
                                            <select class="form-select" name="type" id="transaction-type">
                                                <option value="expense">รายจ่าย</option>
                                                <option value="income">รายรับ</option>
                                            </select>
                                        </div>

                                        <div class="form-group">
                                            <label class="form-label">จำนวนเงิน (บาท)</label>
                                            <input 
                                                type="number" 
                                                class="form-input" 
                                                name="amount" 
                                                step="0.01" 
                                                placeholder="0.00" 
                                                required
                                            >
                                        </div>

                                        <div class="form-group">
                                            <label class="form-label">หมวดหมู่</label>
                                            <select 
                                                class="form-select" 
                                                name="category" 
                                                id="transaction-category" 
                                                required
                                            >
                                                <option value="">เลือกหมวดหมู่</option>
                                                ${expenseCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                            </select>
                                        </div>

                                        <div class="form-group">
                                            <label class="form-label">วันที่</label>
                                            <input 
                                                type="date" 
                                                class="form-input" 
                                                name="date" 
                                                value="${new Date().toISOString().split('T')[0]}" 
                                                required
                                            >
                                        </div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">รายละเอียด (ไม่บังคับ)</label>
                                        <textarea 
                                            class="form-textarea" 
                                            name="description" 
                                            placeholder="รายละเอียดเพิ่มเติม..."
                                        ></textarea>
                                    </div>

                                    <button type="submit" class="btn btn-primary btn-full">
                                        บันทึกรายการ
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: ประวัติการทำรายการ -->
                    <div class="tabs-content" id="history-tab">
                        <div class="card">
                            <div class="card-header">
                                <div class="card-title">ประวัติการทำรายการ</div>
                            </div>
                            <div class="card-content">
                                <div id="transactions-list">
                                    ${renderTransactionsList()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `; }