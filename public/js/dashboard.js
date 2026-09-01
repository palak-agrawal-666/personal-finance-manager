const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

const expenseTableBody = document.getElementById("expenseTableBody");
const expenseForm = document.getElementById("expenseForm");
const expenseModal = document.getElementById("expenseModal");

const addExpenseBtn = document.getElementById("addExpenseBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const logoutBtn = document.getElementById("logoutBtn");

const totalSpentElement = document.getElementById("totalSpent");
const monthlyBudgetElement = document.getElementById("monthlyBudget");
const remainingBudgetElement = document.getElementById("remainingBudget");
const topCategoryElement = document.getElementById("topCategory");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

let expenses = [];
let currentBudget = 0;

const setBudgetBtn = document.getElementById("setBudgetBtn");
const budgetModal = document.getElementById("budgetModal");
const closeBudgetModalBtn = document.getElementById("closeBudgetModalBtn");
const budgetForm = document.getElementById("budgetForm");
let monthlyChart;
let categoryChart;


async function loadBudget() {

    try {

        const response = await fetch("/api/budget/current", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Could not fetch budget");
        }

        const data = await response.json();

        currentBudget = Number(data.amount);

        updateDashboard();

    } catch (error) {

        console.error(error);

    }
}

// -------------------------
// FETCH EXPENSES
// -------------------------

async function loadExpenses() {
    try {
        const response = await fetch("/api/expenses", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to fetch expenses");
        }

        expenses = await response.json();

        updateDashboard();
        renderExpenses();
        updateCharts();
        loadBudget();



    } catch (error) {
        console.error(error);

        expenseTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    Unable to load expenses.
                </td>
            </tr>
        `;
    }
}


// -------------------------
// RENDER EXPENSES
// -------------------------

function renderExpenses() {

    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filteredExpenses = expenses.filter((expense) => {

        const matchesSearch =
            expense.description?.toLowerCase().includes(searchTerm) ||
            expense.category.toLowerCase().includes(searchTerm);

        const matchesCategory =
            !selectedCategory ||
            expense.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });


    if (filteredExpenses.length === 0) {
        expenseTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No expenses found.
                </td>
            </tr>
        `;
        return;
    }


    expenseTableBody.innerHTML = filteredExpenses.map((expense) => `
        <tr>

            <td>${formatDate(expense.expense_date)}</td>

            <td>${escapeHtml(expense.category)}</td>

            <td>${escapeHtml(expense.description || "—")}</td>

            <td>${escapeHtml(expense.payment_method || "—")}</td>

            <td>₹${Number(expense.amount).toFixed(2)}</td>

           <td>
    <div class="action-buttons">

        <button
            class="edit-btn"
            onclick="editExpense(${expense.id})"
        >
            Edit
        </button>

        <button
            class="delete-btn"
            onclick="deleteExpense(${expense.id})"
        >
            Delete
        </button>

    </div>
</td>

        </tr>
    `).join("");
}


// -------------------------
// UPDATE DASHBOARD
// -------------------------

function updateDashboard() {

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthExpenses = expenses.filter((expense) => {

        const date = new Date(expense.expense_date);

        return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
        );
    });


    const totalSpent = currentMonthExpenses.reduce(
        (total, expense) => total + Number(expense.amount),
        0
    );


    totalSpentElement.textContent =
        `₹${totalSpent.toFixed(2)}`;


    // Temporary budget value
    // We'll replace this with the real budget API later.
    const budget = currentBudget;

    monthlyBudgetElement.textContent =
        `₹${budget.toFixed(2)}`;


    const remaining = budget - totalSpent;

    remainingBudgetElement.textContent =
        `₹${remaining.toFixed(2)}`;


    // Find top spending category
    const categoryTotals = {};

    currentMonthExpenses.forEach((expense) => {

        const category = expense.category;

        categoryTotals[category] =
            (categoryTotals[category] || 0) +
            Number(expense.amount);
    });


    let topCategory = "—";
    let highestAmount = 0;

    for (const category in categoryTotals) {

        if (categoryTotals[category] > highestAmount) {

            highestAmount = categoryTotals[category];
            topCategory = category;

        }
    }

    topCategoryElement.textContent = topCategory;
}

function updateCharts() {
    const currentYear = new Date().getFullYear();

    // -------------------------
    // MONTHLY SPENDING
    // -------------------------

    const monthlyTotals = Array(12).fill(0);

    expenses.forEach((expense) => {
        const date = new Date(expense.expense_date);

        if (date.getFullYear() === currentYear) {
            monthlyTotals[date.getMonth()] += Number(expense.amount);
        }
    });

    if (monthlyChart) {
        monthlyChart.destroy();
    }

    const monthlyCtx =
        document.getElementById("monthlyChart").getContext("2d");

    monthlyChart = new Chart(monthlyCtx, {
        type: "line",

        data: {
            labels: [
                "Jan", "Feb", "Mar", "Apr",
                "May", "Jun", "Jul", "Aug",
                "Sep", "Oct", "Nov", "Dec"
            ],

            datasets: [{
                label: "Spending",
                data: monthlyTotals,
                tension: 0.3,
                fill: true
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });


    // -------------------------
    // CATEGORY SPENDING
    // -------------------------

    const categoryTotals = {};

    expenses.forEach((expense) => {
        const category = expense.category;

        categoryTotals[category] =
            (categoryTotals[category] || 0) +
            Number(expense.amount);
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    if (categoryChart) {
        categoryChart.destroy();
    }

    const categoryCtx =
        document.getElementById("categoryChart").getContext("2d");

    categoryChart = new Chart(categoryCtx, {
        type: "doughnut",

        data: {
            labels: categories,

            datasets: [{
                data: amounts
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}



// -------------------------
// ADD EXPENSE
// -------------------------

expenseForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const expenseData = {

        amount:
            document.getElementById("amount").value,

        category:
            document.getElementById("category").value,

        description:
            document.getElementById("description").value.trim(),

        payment_method:
            document.getElementById("paymentMethod").value,

        expense_date:
            document.getElementById("expenseDate").value
    };

    const editingId = expenseForm.dataset.editingId;


    try {

        const url = editingId
    ? `/api/expenses/${editingId}`
    : "/api/expenses";

const method = editingId
    ? "PUT"
    : "POST";

const response = await fetch(url, {
    method: method,

    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
    },

    body: JSON.stringify(expenseData)
});

        const data = await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


       expenseForm.reset();

delete expenseForm.dataset.editingId;

expenseModal.classList.add("hidden");

await loadExpenses();

    } catch (error) {

        console.error(error);

        alert("Unable to add expense.");
    }
});


function editExpense(id) {

    const expense = expenses.find(
        expense => expense.id === id
    );

    if (!expense) {
        return;
    }

    document.getElementById("amount").value =
        expense.amount;

    document.getElementById("category").value =
        expense.category;

    document.getElementById("description").value =
        expense.description || "";

    document.getElementById("paymentMethod").value =
        expense.payment_method || "";

    document.getElementById("expenseDate").value =
        expense.expense_date;

    expenseModal.classList.remove("hidden");

    expenseForm.dataset.editingId = id;
}

// -------------------------
// DELETE EXPENSE
// -------------------------

async function deleteExpense(id) {

    const confirmed =
        confirm("Delete this expense?");

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `/api/expenses/${id}`,
            {
                method: "DELETE",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            alert(data.message);

            return;
        }


        await loadExpenses();

    } catch (error) {

        console.error(error);

        alert("Unable to delete expense.");
    }
}


// -------------------------
// MODAL
// -------------------------

addExpenseBtn.addEventListener("click", () => {

    expenseModal.classList.remove("hidden");

});


closeModalBtn.addEventListener("click", () => {

    expenseModal.classList.add("hidden");

});


expenseModal.addEventListener("click", (event) => {

    if (event.target === expenseModal) {

        expenseModal.classList.add("hidden");

    }

});


// -------------------------
// FILTERS
// -------------------------

searchInput.addEventListener(
    "input",
    renderExpenses
);

categoryFilter.addEventListener(
    "change",
    renderExpenses
);


// -------------------------
// LOGOUT
// -------------------------

logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("token");

    window.location.href = "login.html";

});


// -------------------------
// HELPERS
// -------------------------

function formatDate(dateString) {

    const date = new Date(dateString);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// -------------------------
// INITIAL LOAD
// -------------------------

loadExpenses();


setBudgetBtn.addEventListener("click", () => {
    document.getElementById("budgetAmount").value =
        currentBudget || "";

    budgetModal.classList.remove("hidden");
});
closeBudgetModalBtn.addEventListener("click", () => {
    budgetModal.classList.add("hidden");
});
budgetForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const amount =
        Number(document.getElementById("budgetAmount").value);

    const message =
        document.getElementById("budgetMessage");

    try {

        const response = await fetch("/api/budget", {

            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                amount
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            return;
        }

        currentBudget = Number(data.amount);

        budgetModal.classList.add("hidden");

        budgetForm.reset();

        updateDashboard();

    } catch (error) {

        console.error(error);

        message.textContent =
            "Unable to update budget.";
    }
});