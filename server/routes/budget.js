const express = require("express");
const db = require("../../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();


// GET CURRENT MONTH BUDGET

router.get("/current", authenticateToken, (req, res) => {

    const now = new Date();

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    db.get(
        `
        SELECT amount
        FROM budgets
        WHERE user_id = ?
        AND month = ?
        AND year = ?
        `,
        [
            req.user.userId,
            month,
            year
        ],
        (err, budget) => {

            if (err) {
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


// CREATE / UPDATE BUDGET

router.put("/", authenticateToken, (req, res) => {

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            message: "Budget must be greater than zero"
        });
    }

    const now = new Date();

    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    db.run(
        `
        INSERT INTO budgets
        (user_id, month, year, amount)
        VALUES (?, ?, ?, ?)

        ON CONFLICT(user_id, month, year)
        DO UPDATE SET amount = excluded.amount
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
                    message: "Could not save budget"
                });
            }

            res.json({
                message: "Budget saved successfully",
                amount
            });
        }
    );

});

module.exports = router;