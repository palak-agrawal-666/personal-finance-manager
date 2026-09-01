const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database/finance.db", (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        return;
    }

    console.log("Connected to SQLite database.");

    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error("Error creating users table:", err.message);
            return;
        }

        console.log("Users table ready.");
        db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, month, year),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`, (err) => {
    if (err) {
        console.error("Error creating budgets table:", err.message);
    } else {
        console.log("Budgets table ready.");
    }
});

        // Create expenses table
        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                payment_method TEXT,
                expense_date TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `, (err) => {
            if (err) {
                console.error("Error creating expenses table:", err.message);
            } else {
                console.log("Expenses table ready.");
            }
        });
    });
});

module.exports = db;