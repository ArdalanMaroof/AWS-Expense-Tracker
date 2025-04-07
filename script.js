document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let expenses = [];
    let budget = {
        monthlyLimit: 0,
        totalExpenses: 0,
        get remainingBudget() {
            return this.monthlyLimit - this.totalExpenses;
        }
    };
    let selectedExpense = null;
    let selectedIndex = -1;
    
    // DOM elements
    const budgetInput = document.getElementById('budgetInput');
    const setBudgetBtn = document.getElementById('setBudgetBtn');
    const remainingBudgetDisplay = document.getElementById('remainingBudget');
    const alertMessage = document.getElementById('alertMessage');
    
    const descriptionInput = document.getElementById('descriptionInput');
    const amountInput = document.getElementById('amountInput');
    const categoryInput = document.getElementById('categoryInput');
    const isIncomeCheckBox = document.getElementById('isIncomeCheckBox');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    
    const expenseTableBody = document.getElementById('expenseTableBody');
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    
    // Chart setup
    const ctx = document.getElementById('expenseChart').getContext('2d');
    let expenseChart = null;
    
    function initializeChart() {
        expenseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Expenses',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        tension: 0.1
                    },
                    {
                        label: 'Income',
                        data: [],
                        borderColor: 'rgb(54, 162, 235)',
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Expense and Income Trends'
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Event listeners
    setBudgetBtn.addEventListener('click', setBudget);
    addExpenseBtn.addEventListener('click', addExpense); // Fixed typo here
    saveExpenseBtn.addEventListener('click', saveExpense);
    
    // Initialize the app
    initializeChart();
    updateBudgetDisplay();
    
    // Functions
    function setBudget() {
        const newBudget = parseFloat(budgetInput.value);
        if (!isNaN(newBudget)) {
            budget.monthlyLimit = newBudget;
            budget.totalExpenses = 0; // Fixed typo here
            updateBudgetDisplay();
            updateBudgetAlert();
            budgetInput.value = '';
        } else {
            alert('Please enter a valid numeric value.');
        }
    }
    
    function addExpense() {
        try {
            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const category = categoryInput.value;
            const isIncome = isIncomeCheckBox.checked;
            const date = new Date();
            
            if (!description || isNaN(amount) || !category) {
                throw new Error('Please fill all fields with valid data');
            }
            
            const expense = {
                description,
                amount,
                category,
                date,
                isIncome
            };
            
            expenses.push(expense);
            
            // Update budget totals
            if (expense.isIncome) {
                budget.totalExpenses += expense.amount;
            } else {
                budget.totalExpenses -= expense.amount;
            }
            
            updateBudgetDisplay();
            updateBudgetAlert();
            refreshExpenseList();
            updateChart();
            
            // Clear inputs
            descriptionInput.value = '';
            amountInput.value = '';
            categoryInput.selectedIndex = 0;
            isIncomeCheckBox.checked = false;
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    function updateBudgetDisplay() {
        remainingBudgetDisplay.textContent = formatCurrency(budget.remainingBudget);
    }
    
    function updateBudgetAlert() {
        if (budget.totalExpenses > budget.monthlyLimit) {
            alertMessage.textContent = 'Warning: Budget limit exceeded!';
            alertMessage.style.color = 'red';
        } else if (budget.totalExpenses > budget.monthlyLimit * 0.8) {
            alertMessage.textContent = 'Caution: Approaching budget limit.';
            alertMessage.style.color = 'orange';
        } else {
            alertMessage.textContent = '';
        }
    }
    
    function refreshExpenseList() {
        expenseTableBody.innerHTML = '';
        
        expenses.forEach((expense, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${expense.description}</td>
                <td>${expense.category}</td>
                <td class="${expense.isIncome ? 'text-success' : 'text-danger'}">
                    ${expense.isIncome ? '+' : '-'}${formatCurrency(expense.amount)}
                </td>
                <td>${expense.date.toLocaleDateString()}</td>
            `;
            
            row.addEventListener('click', function() {
                selectExpenseForEdit(index);
            });
            
            if (selectedIndex === index) {
                row.classList.add('table-primary');
            }
            
            expenseTableBody.appendChild(row);
        });
    }
    
    function selectExpenseForEdit(index) {
        selectedIndex = index;
        selectedExpense = expenses[index];
        
        // Highlight selected row
        const rows = document.querySelectorAll('#expenseTableBody tr');
        rows.forEach(row => row.classList.remove('table-primary'));
        if (rows[index]) rows[index].classList.add('table-primary');
        
        // Populate form fields
        descriptionInput.value = selectedExpense.description;
        amountInput.value = selectedExpense.amount;
        categoryInput.value = selectedExpense.category;
        isIncomeCheckBox.checked = selectedExpense.isIncome;
    }
    
    function saveExpense() {
        if (selectedExpense === null || selectedIndex === -1) {
            alert('No expense selected to edit and save changes.');
            return;
        }
        
        try {
            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const category = categoryInput.value;
            const isIncome = isIncomeCheckBox.checked;
            
            if (!description || isNaN(amount) || !category) {
                throw new Error('Please fill all fields with valid data');
            }
            
            // First, reverse the old expense's impact on the budget
            if (selectedExpense.isIncome) {
                budget.totalExpenses -= selectedExpense.amount;
            } else {
                budget.totalExpenses += selectedExpense.amount;
            }
            
            // Update the expense
            selectedExpense.description = description;
            selectedExpense.amount = amount;
            selectedExpense.category = category;
            selectedExpense.isIncome = isIncome;
            selectedExpense.date = new Date();
            
            // Apply the new expense's impact on the budget
            if (selectedExpense.isIncome) {
                budget.totalExpenses += selectedExpense.amount;
            } else {
                budget.totalExpenses -= selectedExpense.amount;
            }
            
            // Update the array
            expenses[selectedIndex] = selectedExpense;
            
            updateBudgetDisplay();
            updateBudgetAlert();
            refreshExpenseList();
            updateChart();
            
            // Clear form
            descriptionInput.value = '';
            amountInput.value = '';
            categoryInput.selectedIndex = 0;
            isIncomeCheckBox.checked = false;
            
            // Reset selection
            selectedExpense = null;
            selectedIndex = -1;
            
            alert('Expense updated successfully!');
        } catch (error) {
            alert(`Error while saving changes: ${error.message}`);
        }
    }
    
    function updateChart() {
        if (expenses.length === 0) {
            expenseChart.data.labels = [];
            expenseChart.data.datasets[0].data = [];
            expenseChart.data.datasets[1].data = [];
            expenseChart.update();
            return;
        }
        
        // Group expenses by date
        const groupedExpenses = {};
        
        expenses.forEach(expense => {
            const dateStr = expense.date.toLocaleDateString();
            if (!groupedExpenses[dateStr]) {
                groupedExpenses[dateStr] = {
                    expenses: 0,
                    income: 0
                };
            }
            
            if (expense.isIncome) {
                groupedExpenses[dateStr].income += expense.amount;
            } else {
                groupedExpenses[dateStr].expenses += expense.amount;
            }
        });
        
        // Sort dates chronologically
        const sortedDates = Object.keys(groupedExpenses).sort((a, b) => {
            return new Date(a) - new Date(b);
        });
        
        // Prepare data for chart
        const expenseData = [];
        const incomeData = [];
        
        sortedDates.forEach(date => {
            expenseData.push(groupedExpenses[date].expenses);
            incomeData.push(groupedExpenses[date].income);
        });
        
        // Update chart
        expenseChart.data.labels = sortedDates;
        expenseChart.data.datasets[0].data = expenseData;
        expenseChart.data.datasets[1].data = incomeData;
        expenseChart.update();
    }
    
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
});