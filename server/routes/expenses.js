const express = require("express");
const db = require("../../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// CREATE EXPENSE
router.post("/", authenticateToken, (req, res) => {
    const {
        amount,
        category,
        description,
        payment_method,
        expense_date
    } = req.body;

    if (!amount || !category || !expense_date) {
        return res.status(400).json({
            message: "Amount, category and date are required"
        });
    }

    const sql = `
        INSERT INTO expenses
        (user_id, amount, category, description, payment_method, expense_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            req.user.userId,
            amount,
            category,
            description || null,
            payment_method || null,
            expense_date
        ],
        function (err) {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    message: "Could not add expense"
                });
            }

            res.status(201).json({
                message: "Expense added successfully",
                expenseId: this.lastID
            });
        }
    );
});


// GET ALL EXPENSES
router.get("/", authenticateToken, (req, res) => {
    const sql = `
        SELECT *
        FROM expenses
        WHERE user_id = ?
        ORDER BY expense_date DESC, created_at DESC
    `;

    db.all(sql, [req.user.userId], (err, expenses) => {
        if (err) {
            console.error(err.message);

            return res.status(500).json({
                message: "Could not fetch expenses"
            });
        }

        res.json(expenses);
    });
});


// UPDATE EXPENSE
router.put("/:id", authenticateToken, (req, res) => {
    const {
        amount,
        category,
        description,
        payment_method,
        expense_date
    } = req.body;

    if (!amount || !category || !expense_date) {
        return res.status(400).json({
            message: "Amount, category and date are required"
        });
    }

    const sql = `
        UPDATE expenses
        SET amount = ?,
            category = ?,
            description = ?,
            payment_method = ?,
            expense_date = ?
        WHERE id = ? AND user_id = ?
    `;

    db.run(
        sql,
        [
            amount,
            category,
            description || null,
            payment_method || null,
            expense_date,
            req.params.id,
            req.user.userId
        ],
        function (err) {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    message: "Could not update expense"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Expense not found"
                });
            }

            res.json({
                message: "Expense updated successfully"
            });
        }
    );
});


// DELETE EXPENSE
router.delete("/:id", authenticateToken, (req, res) => {
    const sql = `
        DELETE FROM expenses
        WHERE id = ? AND user_id = ?
    `;

    db.run(
        sql,
        [req.params.id, req.user.userId],
        function (err) {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    message: "Could not delete expense"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    message: "Expense not found"
                });
            }

            res.json({
                message: "Expense deleted successfully"
            });
        }
    );
});

module.exports = router;