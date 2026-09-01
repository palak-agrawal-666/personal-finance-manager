const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}

let expenses = [];
let currentBudget = 0;

let monthlyChart = null;
let categoryChart = null;


// =============================
// ELEMENTS
// =============================

const expenseTableBody =
    document.getElementById("expenseTableBody");

const expenseForm =
    document.getElementById("expenseForm");

const expenseModal =
    document.getElementById("expenseModal");

const budgetModal =
    document.getElementById("budgetModal");

const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");


// =============================
// API HELPER
// =============================

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,

        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 ||
        response.status === 403) {

        localStorage.removeItem("token");

        window.location.href =
            "/login.html";

        return null;
    }

    return response;
}


// =============================
// LOAD USER
// =============================

async function loadUser() {

    const response =
        await apiRequest("/api/auth/me");

    if (!response) return;

    const user =
        await response.json();

    document.getElementById(
        "welcomeUser"
    ).textContent =
        `Hi, ${user.name}`;
}


// =============================
// LOAD EXPENSES
// =============================

async function loadExpenses() {

    try {

        const response =
            await apiRequest("/api/expenses");

        if (!response) return;

        if (!response.ok) {
            throw new Error(
                "Failed to fetch expenses"
            );
        }

        expenses =
            await response.json();

        updateDashboard();
        renderExpenses();
        updateCharts();

    } catch (error) {

        console.error(error);

        expenseTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    Unable to load expenses.
                </td>
            </tr>
        `;
    }
}


// =============================
// LOAD BUDGET
// =============================

async function loadBudget() {

    try {

        const response =
            await apiRequest(
                "/api/budget/current"
            );

        if (!response) return;

        const data =
            await response.json();

        currentBudget =
            Number(data.amount || 0);

        updateDashboard();

    } catch (error) {

        console.error(error);
    }
}


// =============================
// DASHBOARD CALCULATIONS
// =============================

function getCurrentMonthExpenses() {

    const now = new Date();

    const month =
        now.getMonth();

    const year =
        now.getFullYear();

    return expenses.filter(expense => {

        const date =
            new Date(
                expense.expense_date
            );

        return (
            date.getMonth() === month &&
            date.getFullYear() === year
        );
    });
}


function updateDashboard() {

    const currentExpenses =
        getCurrentMonthExpenses();


    // TOTAL

    const totalSpent =
        currentExpenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );


    document.getElementById(
        "totalSpent"
    ).textContent =
        formatCurrency(totalSpent);


    // BUDGET

    document.getElementById(
        "monthlyBudget"
    ).textContent =
        formatCurrency(currentBudget);


    // REMAINING

    const remaining =
        currentBudget - totalSpent;

    document.getElementById(
        "remainingBudget"
    ).textContent =
        formatCurrency(
            Math.max(remaining, 0)
        );


    // STATUS

    const status =
        document.getElementById(
            "budgetStatus"
        );

    if (currentBudget === 0) {

        status.textContent =
            "Set a monthly budget";

    } else if (remaining < 0) {

        status.textContent =
            "Budget exceeded";

    } else {

        status.textContent =
            "Available";
    }


    // TOP CATEGORY

    const categoryTotals = {};

    currentExpenses.forEach(expense => {

        categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) +
            Number(expense.amount);
    });


    let topCategory = "—";
    let highest = 0;

    Object.entries(categoryTotals)
        .forEach(([category, amount]) => {

            if (amount > highest) {

                highest = amount;
                topCategory = category;

            }
        });


    document.getElementById(
        "topCategory"
    ).textContent = topCategory;


    // BUDGET PROGRESS

    const percentage =
        currentBudget > 0
            ? (totalSpent / currentBudget) * 100
            : 0;

    const progress =
        Math.min(percentage, 100);

    document.getElementById(
        "budgetProgress"
    ).style.width =
        `${progress}%`;

    document.getElementById(
        "budgetPercentage"
    ).textContent =
        `${Math.round(percentage)}%`;

}


// =============================
// RENDER EXPENSES
// =============================

function renderExpenses() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();

    const category =
        categoryFilter.value;


    const filtered =
        expenses.filter(expense => {

            const matchesSearch =
                !searchTerm ||
                expense.category
                    .toLowerCase()
                    .includes(searchTerm) ||
                (expense.description || "")
                    .toLowerCase()
                    .includes(searchTerm);

            const matchesCategory =
                !category ||
                expense.category === category;

            return (
                matchesSearch &&
                matchesCategory
            );
        });


    if (filtered.length === 0) {

        expenseTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-state"
                >
                    No expenses found.
                </td>
            </tr>
        `;

        return;
    }


    expenseTableBody.innerHTML =
        filtered.map(expense => `

            <tr>

                <td>
                    ${formatDate(
                        expense.expense_date
                    )}
                </td>

                <td>
                    <span class="category-badge">
                        ${escapeHtml(
                            expense.category
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        expense.description || "—"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        expense.payment_method || "—"
                    )}
                </td>

                <td class="amount-cell">
                    ${formatCurrency(
                        Number(expense.amount)
                    )}
                </td>

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


// =============================
// ADD / EDIT EXPENSE
// =============================

expenseForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const editingId =
            expenseForm.dataset.editingId;


        const expenseData = {

            amount:
                Number(
                    document.getElementById(
                        "amount"
                    ).value
                ),

            category:
                document.getElementById(
                    "category"
                ).value,

            description:
                document.getElementById(
                    "description"
                ).value.trim(),

            payment_method:
                document.getElementById(
                    "paymentMethod"
                ).value,

            expense_date:
                document.getElementById(
                    "expenseDate"
                ).value

        };


        const url =
            editingId
                ? `/api/expenses/${editingId}`
                : "/api/expenses";

        const method =
            editingId
                ? "PUT"
                : "POST";


        try {

            const response =
                await apiRequest(
                    url,
                    {
                        method,
                        body:
                            JSON.stringify(
                                expenseData
                            )
                    }
                );

            if (!response) return;

            const data =
                await response.json();

            if (!response.ok) {

                alert(data.message);

                return;
            }


            closeExpenseModal();

            await loadExpenses();

        } catch (error) {

            console.error(error);

            alert(
                "Unable to save expense."
            );
        }

    }
);


// =============================
// EDIT
// =============================

window.editExpense = function(id) {

    const expense =
        expenses.find(
            item => item.id === id
        );

    if (!expense) return;


    document.getElementById(
        "amount"
    ).value = expense.amount;

    document.getElementById(
        "category"
    ).value = expense.category;

    document.getElementById(
        "description"
    ).value =
        expense.description || "";

    document.getElementById(
        "paymentMethod"
    ).value =
        expense.payment_method || "";

    document.getElementById(
        "expenseDate"
    ).value =
        expense.expense_date;


    expenseForm.dataset.editingId =
        id;


    document.getElementById(
        "expenseModalTitle"
    ).textContent =
        "Edit expense";

    document.getElementById(
        "saveExpenseBtn"
    ).textContent =
        "Save changes";


    expenseModal.classList.remove(
        "hidden"
    );
};


// =============================
// DELETE
// =============================

window.deleteExpense = async function(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this expense?"
        );

    if (!confirmed) return;


    try {

        const response =
            await apiRequest(
                `/api/expenses/${id}`,
                {
                    method: "DELETE"
                }
            );

        if (!response) return;

        const data =
            await response.json();

        if (!response.ok) {

            alert(data.message);

            return;
        }

        await loadExpenses();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to delete expense."
        );
    }
};


// =============================
// MODAL
// =============================

function openExpenseModal() {

    expenseForm.reset();

    delete expenseForm.dataset.editingId;

    document.getElementById(
        "expenseModalTitle"
    ).textContent =
        "Add expense";

    document.getElementById(
        "saveExpenseBtn"
    ).textContent =
        "Save expense";

    document.getElementById(
        "expenseDate"
    ).value =
        new Date()
            .toISOString()
            .split("T")[0];

    expenseModal.classList.remove(
        "hidden"
    );
}


function closeExpenseModal() {

    expenseModal.classList.add(
        "hidden"
    );

    expenseForm.reset();

    delete expenseForm.dataset.editingId;
}


document.getElementById(
    "addExpenseBtn"
).addEventListener(
    "click",
    openExpenseModal
);


document.getElementById(
    "closeModalBtn"
).addEventListener(
    "click",
    closeExpenseModal
);


document.getElementById(
    "cancelExpenseBtn"
).addEventListener(
    "click",
    closeExpenseModal
);


expenseModal.addEventListener(
    "click",
    event => {

        if (
            event.target === expenseModal
        ) {
            closeExpenseModal();
        }
    }
);


// =============================
// BUDGET
// =============================

document.getElementById(
    "setBudgetBtn"
).addEventListener(
    "click",
    () => {

        document.getElementById(
            "budgetAmount"
        ).value =
            currentBudget || "";

        document.getElementById(
            "budgetMessage"
        ).textContent = "";

        budgetModal.classList.remove(
            "hidden"
        );
    }
);


document.getElementById(
    "closeBudgetModalBtn"
).addEventListener(
    "click",
    closeBudgetModal
);


document.getElementById(
    "cancelBudgetBtn"
).addEventListener(
    "click",
    closeBudgetModal
);


function closeBudgetModal() {

    budgetModal.classList.add(
        "hidden"
    );
}


document.getElementById(
    "budgetForm"
).addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const amount =
            Number(
                document.getElementById(
                    "budgetAmount"
                ).value
            );


        try {

            const response =
                await apiRequest(
                    "/api/budget",
                    {
                        method: "PUT",

                        body:
                            JSON.stringify({
                                amount
                            })
                    }
                );

            if (!response) return;

            const data =
                await response.json();

            if (!response.ok) {

                document.getElementById(
                    "budgetMessage"
                ).textContent =
                    data.message;

                return;
            }


            currentBudget =
                Number(data.amount);

            closeBudgetModal();

            updateDashboard();

        } catch (error) {

            console.error(error);

            document.getElementById(
                "budgetMessage"
            ).textContent =
                "Unable to save budget.";
        }

    }
);


// =============================
// FILTERS
// =============================

searchInput.addEventListener(
    "input",
    renderExpenses
);

categoryFilter.addEventListener(
    "change",
    renderExpenses
);


// =============================
// LOGOUT
// =============================

document.getElementById(
    "logoutBtn"
).addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "token"
        );

        window.location.href =
            "/login.html";
    }
);


// =============================
// CHARTS
// =============================

function updateCharts() {

    createMonthlyChart();

    createCategoryChart();
}


function createMonthlyChart() {

    const monthlyTotals =
        Array(12).fill(0);

    const currentYear =
        new Date().getFullYear();


    expenses.forEach(expense => {

        const date =
            new Date(
                expense.expense_date
            );

        if (
            date.getFullYear() ===
            currentYear
        ) {

            monthlyTotals[
                date.getMonth()
            ] += Number(
                expense.amount
            );
        }

    });


    if (monthlyChart) {
        monthlyChart.destroy();
    }


    const context =
        document.getElementById(
            "monthlyChart"
        ).getContext("2d");


    monthlyChart =
        new Chart(context, {

            type: "line",

            data: {

                labels: [
                    "Jan", "Feb", "Mar",
                    "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep",
                    "Oct", "Nov", "Dec"
                ],

                datasets: [{
                    data: monthlyTotals,
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.35,
                    fill: true
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {

                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback: value =>
                                `₹${value}`
                        }
                    }
                }
            }
        });
}


function createCategoryChart() {

    const totals = {};

    expenses.forEach(expense => {

        totals[expense.category] =
            (totals[expense.category] || 0) +
            Number(expense.amount);

    });


    const labels =
        Object.keys(totals);

    const values =
        Object.values(totals);


    if (categoryChart) {
        categoryChart.destroy();
    }


    const context =
        document.getElementById(
            "categoryChart"
        ).getContext("2d");


    categoryChart =
        new Chart(context, {

            type: "doughnut",

            data: {

                labels,

                datasets: [{
                    data: values
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "68%",

                plugins: {

                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
}


// =============================
// EXCEL EXPORT
// =============================

document.getElementById(
    "exportBtn"
).addEventListener(
    "click",
    exportExpenses
);


async function exportExpenses() {

    if (expenses.length === 0) {

        alert(
            "There are no expenses to export."
        );

        return;
    }


    const workbook =
        new ExcelJS.Workbook();

    const sheet =
        workbook.addWorksheet(
            "Expenses"
        );


    sheet.columns = [

        {
            header: "Date",
            key: "date",
            width: 15
        },

        {
            header: "Category",
            key: "category",
            width: 18
        },

        {
            header: "Description",
            key: "description",
            width: 30
        },

        {
            header: "Payment Method",
            key: "payment",
            width: 20
        },

        {
            header: "Amount",
            key: "amount",
            width: 15
        }

    ];


    expenses.forEach(expense => {

        sheet.addRow({

            date:
                expense.expense_date,

            category:
                expense.category,

            description:
                expense.description || "",

            payment:
                expense.payment_method || "",

            amount:
                Number(expense.amount)

        });

    });


    sheet.getRow(1).font = {
        bold: true
    };


    sheet.getColumn(
        "amount"
    ).numFmt =
        '₹#,##0.00';


    const buffer =
        await workbook.xlsx.writeBuffer();


    const blob =
        new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );


    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "personal-finance-expenses.xlsx";

    link.click();

    URL.revokeObjectURL(url);
}


// =============================
// HELPERS
// =============================

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }
    ).format(amount);
}


function formatDate(dateString) {

    return new Date(
        dateString
    ).toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =============================
// INITIALIZE
// =============================

async function initializeDashboard() {

    await loadUser();

    await loadExpenses();

    await loadBudget();
}


initializeDashboard();