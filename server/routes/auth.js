const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../database/database");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "development_secret";

// REGISTER
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        db.get(
            "SELECT id FROM users WHERE email = ?",
            [email],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (user) {
                    return res.status(409).json({
                        message: "Email already registered"
                    });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                db.run(
                    `INSERT INTO users (name, email, password)
                     VALUES (?, ?, ?)`,
                    [name, email, hashedPassword],
                    function (err) {
                        if (err) {
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
        console.error(error);

        res.status(500).json({
            message: "Something went wrong"
        });
    }
});


// LOGIN
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {
            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "1d"
                }
            );

            res.json({
                message: "Login successful",
                token
            });
        }
    );
});

module.exports = router;