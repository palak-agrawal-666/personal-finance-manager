const express = require("express");
const db = require("../../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// =============================
// GET EXPENSES
// =============================

router.get("/", authenticateToken, (req, res) => {

    const sql = `
        SELECT
            id,
            amount,
            category,
            description,
            payment_method,
            expense_date,
            created_at
        FROM expenses
        WHERE user_id = ?
        ORDER BY expense_date DESC, created_at DESC
    `;

    db.all(
        sql,
        [req.user.userId],
        (err, expenses) => {

            if (err) {
                return res.status(500).json({
                    message: "Could not fetch expenses"
                });
            }

            res.json(expenses);
        }
    );

});


// =============================
// CREATE EXPENSE
// =============================

router.post("/", authenticateToken, (req, res) => {

    const amount = Number(req.body.amount);
    const category = req.body.category?.trim();
    const description = req.body.description?.trim() || null;
    const paymentMethod =
        req.body.payment_method?.trim() || null;
    const expenseDate = req.body.expense_date;

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !category ||
        !expenseDate
    ) {
        return res.status(400).json({
            message: "Valid amount, category and date are required"
        });
    }

    const sql = `
        INSERT INTO expenses
        (
            user_id,
            amount,
            category,
            description,
            payment_method,
            expense_date
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            req.user.userId,
            amount,
            category,
            description,
            paymentMethod,
            expenseDate
        ],
        function (err) {

            if (err) {
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


// =============================
// UPDATE EXPENSE
// =============================

router.put("/:id", authenticateToken, (req, res) => {

    const amount = Number(req.body.amount);
    const category = req.body.category?.trim();
    const description = req.body.description?.trim() || null;
    const paymentMethod =
        req.body.payment_method?.trim() || null;
    const expenseDate = req.body.expense_date;

    if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !category ||
        !expenseDate
    ) {
        return res.status(400).json({
            message: "Valid amount, category and date are required"
        });
    }

    const sql = `
        UPDATE expenses
        SET
            amount = ?,
            category = ?,
            description = ?,
            payment_method = ?,
            expense_date = ?
        WHERE id = ?
        AND user_id = ?
    `;

    db.run(
        sql,
        [
            amount,
            category,
            description,
            paymentMethod,
            expenseDate,
            req.params.id,
            req.user.userId
        ],
        function (err) {

            if (err) {
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


// =============================
// DELETE EXPENSE
// =============================

router.delete("/:id", authenticateToken, (req, res) => {

    db.run(
        `
        DELETE FROM expenses
        WHERE id = ?
        AND user_id = ?
        `,
        [
            req.params.id,
            req.user.userId
        ],
        function (err) {

            if (err) {
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