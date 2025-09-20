    function renderTransactionsList() {
        if (transactions.length === 0) return '<p class="text-center py-8" style="color: #6b7280;">ยังไม่มีรายการ</p>';
        return transactions.map(t => `
            <div class="transaction-item" data-id="${t.id}">
                <div class="transaction-info">
                    <div class="transaction-category">
                        <span class="badge ${t.type === 'income' ? 'badge-primary' : 'badge-secondary'}">
                            ${t.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                        </span>
                        <span style="margin-left: 0.5rem; font-weight: 500;">${t.category}</span>
                    </div>
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-date">${formatDate(t.date)}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="transaction-amount ${t.type === 'income' ? 'stat-positive' : 'stat-negative'}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)} ฿
                    </div>
                    <button class="btn btn-danger btn-small delete-transaction-btn">ลบ</button>
                </div>
            </div>`).join('');
    }