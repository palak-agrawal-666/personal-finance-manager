const express = require("express");
const db = require("../../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// GET CURRENT MONTH'S BUDGET
router.get("/current", authenticateToken, (req, res) => {
    const now = new Date();

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const sql = `
        SELECT amount
        FROM budgets
        WHERE user_id = ?
        AND month = ?
        AND year = ?
    `;

    db.get(
        sql,
        [req.user.userId, month, year],
        (err, budget) => {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    message: "Could not fetch budget"
                });
            }

            res.json({
                amount: budget ? budget.amount : 0,
                month,
                year
            });
        }
    );
});


// SET / UPDATE CURRENT MONTH'S BUDGET
router.put("/", authenticateToken, (req, res) => {
    const amount = Number(req.body.amount);

    if (!amount || amount <= 0) {
        return res.status(400).json({
            message: "Budget must be greater than 0"
        });
    }

    const now = new Date();

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const selectSql = `
        SELECT id
        FROM budgets
        WHERE user_id = ?
        AND month = ?
        AND year = ?
    `;

    db.get(
        selectSql,
        [req.user.userId, month, year],
        (err, budget) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            // UPDATE EXISTING BUDGET
            if (budget) {

                db.run(
                    `
                    UPDATE budgets
                    SET amount = ?
                    WHERE id = ?
                    `,
                    [amount, budget.id],
                    function (err) {

                        if (err) {
                            return res.status(500).json({
                                message: "Could not update budget"
                            });
                        }

                        res.json({
                            message: "Budget updated successfully",
                            amount
                        });
                    }
                );

                return;
            }

            // CREATE NEW BUDGET
            db.run(
                `
                INSERT INTO budgets
                (user_id, month, year, amount)
                VALUES (?, ?, ?, ?)
                `,
                [
                    req.user.userId,
                    month,
                    year,
                    amount
                ],
                function (err) {

                    if (err) {
                        return res.status(500).json({
                            message: "Could not create budget"
                        });
                    }

                    res.status(201).json({
                        message: "Budget created successfully",
                        amount
                    });
                }
            );
        }
    );
});

module.exports = router;