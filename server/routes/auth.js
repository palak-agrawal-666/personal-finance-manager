const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../database/database");

const router = express.Router();

router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        // 2. Check if email already exists
        db.get(
            "SELECT id FROM users WHERE email = ?",
            [email],
            async (err, user) => {
                if (err) {
                    console.error("Database error:", err.message);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (user) {
                    return res.status(409).json({
                        message: "Email already registered"
                    });
                }

                // 3. Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // 4. Insert user into database
                db.run(
                    `INSERT INTO users (name, email, password)
                     VALUES (?, ?, ?)`,
                    [name, email, hashedPassword],
                    function (err) {
                        if (err) {
                            console.error("Insert error:", err.message);

                            return res.status(500).json({
                                message: "Could not register user"
                            });
                        }

                        res.status(201).json({
                            message: "User registered successfully",
                            userId: this.lastID
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Something went wrong"
        });
    }
});

module.exports = router;