let expenses = [];
let budget = null;
let chart = null;
let editingExpenseId = null;
let userId = null;

// Initialize DynamoDB and CloudWatch clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cloudwatchlogs = new AWS.CloudWatchLogs();

// Log to CloudWatch
function logToCloudWatch(message, data = {}) {
    const logGroupName = 'ExpenseTrackerLogs';
    const logStreamName = `LogStream-${new Date().toISOString().split('T')[0]}`;
    
    const params = {
        logGroupName,
        logStreamName,
        logEvents: [
            {
                message: JSON.stringify({ message, data, timestamp: new Date().toISOString() }),
                timestamp: Date.now()
            }
        ]
    };

    cloudwatchlogs.putLogEvents(params, (err) => {
        if (err) console.error('Error logging to CloudWatch:', err);
    });
}

// Get current Cognito user
async function initializeUser() {
    try {
        const user = await Amplify.Auth.currentAuthenticatedUser();
        userId = user.attributes.sub;
        await loadExpenses();
        logToCloudWatch('User initialized', { userId });
    } catch (err) {
        console.error('Error initializing user:', err);
        logToCloudWatch('Error initializing user', { error: err.message });
    }
}

async function setBudget() {
    const budgetInput = document.getElementById('budget').value;
    if (budgetInput && budgetInput > 0) {
        budget = parseFloat(budgetInput);
        document.getElementById('budget').value = '';
        enableExpenseForm();
        await saveBudget();
        updateBudgetDisplay();
        updateCategorySummary();
        updateChart();
        logToCloudWatch('Budget set', { budget });
    } else {
        alert('Please enter a valid budget amount.');
    }
}

async function saveBudget() {
    const params = {
        TableName: 'Expenses',
        Item: {
            userId: userId,
            expenseId: 'BUDGET',
            budget: budget,
            type: 'BUDGET'
        }
    };

    try {
        await dynamodb.put(params).promise();
        logToCloudWatch('Budget saved to DynamoDB', { budget });
    } catch (err) {
        console.error('Error saving budget:', err);
        logToCloudWatch('Error saving budget', { error: err.message });
    }
}

async function loadBudget() {
    const params = {
        TableName: 'Expenses',
        Key: {
            userId: userId,
            expenseId: 'BUDGET'
        }
    };

    try {
        const data = await dynamodb.get(params).promise();
        if (data.Item) {
            budget = data.Item.budget;
            enableExpenseForm();
        }
        logToCloudWatch('Budget loaded', { budget });
    } catch (err) {
        console.error('Error loading budget:', err);
        logToCloudWatch('Error loading budget', { error: err.message });
    }
}

function enableExpenseForm() {
    document.getElementById('description').disabled = false;
    document.getElementById('amount').disabled = false;
    document.getElementById('category').disabled = false;
    document.getElementById('addExpenseBtn').disabled = false;
}

function updateBudgetDisplay() {
    const totalSpent = expenses.reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
    const budgetElement = document.getElementById('budgetAmount');
    const remainingElement = document.getElementById('remainingAmount');

    budgetElement.textContent = budget !== null ? `$${budget.toFixed(2)}` : 'Not Set';
    remainingElement.textContent = budget !== null ? `$${(budget - totalSpent).toFixed(2)}` : 'N/A';
    remainingElement.className = budget !== null && (budget - totalSpent) < 0 ? 'negative' : '';
}

async function addExpense() {
    if (budget === null) {
        alert('Please set a budget before adding expenses.');
        return;
    }

    const description = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;

    if (description && amount && amount > 0) {
        const expense = {
            id: editingExpenseId || Date.now().toString(),
            description,
            amount: -parseFloat(amount),
            category,
            date: new Date().toLocaleDateString()
        };

        if (editingExpenseId) {
            await updateExpense(expense);
            editingExpenseId = null;
            document.getElementById('addExpenseBtn').textContent = 'Add Expense';
        } else {
            await saveExpense(expense);
            expenses.push(expense);
        }

        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('category').value = 'Food';
        displayExpenses();
        updateBudgetDisplay();
        updateCategorySummary();
        updateChart();
        logToCloudWatch('Expense added/updated', { expense });
    } else {
        alert('Please enter a valid description and amount.');
    }
}

async function saveExpense(expense) {
    const params = {
        TableName: 'Expenses',
        Item: {
            userId: userId,
            expenseId: expense.id,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            date: expense.date,
            type: 'EXPENSE'
        }
    };

    try {
        await dynamodb.put(params).promise();
        logToCloudWatch('Expense saved to DynamoDB', { expenseId: expense.id });
    } catch (err) {
        console.error('Error saving expense:', err);
        logToCloudWatch('Error saving expense', { error: err.message });
    }
}

async function updateExpense(expense) {
    const params = {
        TableName: 'Expenses',
        Key: {
            userId: userId,
            expenseId: expense.id
        },
        UpdateExpression: 'SET description = :desc, amount = :amt, category = :cat, #dt = :date',
        ExpressionAttributeNames: {
            '#dt': 'date'
        },
        ExpressionAttributeValues: {
            ':desc': expense.description,
            ':amt': expense.amount,
            ':cat': expense.category,
            ':date': expense.date
        }
    };

    try {
        await dynamodb.update(params).promise();
        expenses = expenses.map(exp => exp.id === expense.id ? expense : exp);
        logToCloudWatch('Expense updated in DynamoDB', { expenseId: expense.id });
    } catch (err) {
        console.error('Error updating expense:', err);
        logToCloudWatch('Error updating expense', { error: err.message });
    }
}

async function editExpense(id) {
    const expense = expenses.find(expense => expense.id === id);
    if (expense) {
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = Math.abs(expense.amount).toFixed(2);
        document.getElementById('category').value = expense.category;
        document.getElementById('addExpenseBtn').textContent = 'Update Expense';
        editingExpenseId = id;
        logToCloudWatch('Expense edit initiated', { expenseId: id });
    }
}

async function deleteExpense(id) {
    const params = {
        TableName: 'Expenses',
        Key: {
            userId: userId,
            expenseId: id
        }
    };

    try {
        await dynamodb.delete(params).promise();
        expenses = expenses.filter(expense => expense.id !== id);
        displayExpenses();
        updateBudgetDisplay();
        updateCategorySummary();
        updateChart();
        logToCloudWatch('Expense deleted from DynamoDB', { expenseId: id });
    } catch (err) {
        console.error('Error deleting expense:', err);
        logToCloudWatch('Error deleting expense', { error: err.message });
    }
}

async function loadExpenses() {
    const params = {
        TableName: 'Expenses',
        KeyConditionExpression: 'userId = :uid and begins_with(expenseId, :eid)',
        ExpressionAttributeValues: {
            ':uid': userId,
            ':eid': ''
        }
    };

    try {
        const data = await dynamodb.query(params).promise();
        expenses = data.Items.filter(item => item.type === 'EXPENSE').map(item => ({
            id: item.expenseId,
            description: item.description,
            amount: item.amount,
            category: item.category,
            date: item.date
        }));
        await loadBudget();
        displayExpenses();
        updateBudgetDisplay();
        updateCategorySummary();
        updateChart();
        logToCloudWatch('Expenses loaded', { count: expenses.length });
    } catch (err) {
        console.error('Error loading expenses:', err);
        logToCloudWatch('Error loading expenses', { error: err.message });
    }
}

function displayExpenses(filterCategory = 'all') {
    const expenseList = document.getElementById('expenseList');
    expenseList.innerHTML = '';

    const filteredExpenses = filterCategory === 'all' 
        ? expenses 
        : expenses.filter(expense => expense.category === filterCategory);

    filteredExpenses.forEach(expense => {
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `
            <div>
                <strong>${expense.description}</strong>
                <small>(${expense.category} - ${expense.date})</small>
            </div>
            <div>
                <span>$${Math.abs(expense.amount).toFixed(2)}</span>
                <button class="edit-btn" onclick="editExpense('${expense.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteExpense('${expense.id}')">Delete</button>
            </div>
        `;
        expenseList.appendChild(expenseItem);
    });
}

function updateCategorySummary() {
    const categories = [...new Set(expenses.map(expense => expense.category))];
    const tbody = document.querySelector('#categorySummary tbody');
    tbody.innerHTML = '';

    const totalSpent = expenses.reduce((sum, expense) => sum + Math.abs(expense.amount), 0);

    categories.forEach(category => {
        const categoryTotal = expenses
            .filter(expense => expense.category === category)
            .reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
        const percentage = totalSpent > 0 ? (categoryTotal / totalSpent * 100).toFixed(2) : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category}</td>
            <td>$${categoryTotal.toFixed(2)}</td>
            <td>${percentage}%</td>
        `;
        tbody.appendChild(row);
    });
}

function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const categories = ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'];
    const categoryTotals = categories.map(category => 
        expenses
            .filter(expense => expense.category === category)
            .reduce((sum, expense) => sum + Math.abs(expense.amount), 0)
    );

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Expenses by Category ($)',
                data: categoryTotals,
                backgroundColor: [
                    '#3498db',
                    '#e74c3c',
                    '#f1c40f',
                    '#2ecc71',
                    '#9b59b6'
                ],
                borderColor: [
                    '#2980b9',
                    '#c0392b',
                    '#e1b307',
                    '#27ae60',
                    '#8e44ad'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: budget !== null ? budget : undefined,
                    title: {
                        display: true,
                        text: 'Amount ($)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function exportToCSV() {
    if (expenses.length === 0) {
        alert('No expenses to export.');
        return;
    }

    const headers = ['ID', 'Description', 'Amount', 'Category', 'Date'];
    const csvRows = [
        headers.join(','),
        ...expenses.map(expense => 
            [
                expense.id,
                `"${expense.description.replace(/"/g, '""')}"`,
                Math.abs(expense.amount).toFixed(2),
                expense.category,
                expense.date
            ].join(',')
        )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'expense_tracker.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logToCloudWatch('Expenses exported to CSV', { count: expenses.length });
}

document.getElementById('categoryFilter').addEventListener('change', (e) => {
    displayExpenses(e.target.value);
});

// Initialize user and load data
initializeUser();
