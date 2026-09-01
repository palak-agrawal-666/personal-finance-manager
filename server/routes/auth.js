const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../database/database");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;


// =============================
// REGISTER
// =============================

router.post("/register", async (req, res) => {

    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters"
        });
    }

    try {

        db.get(
            "SELECT id FROM users WHERE email = ?",
            [email],
            async (err, existingUser) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                if (existingUser) {
                    return res.status(409).json({
                        message: "Email is already registered"
                    });
                }

                const hashedPassword =
                    await bcrypt.hash(password, 10);

                db.run(
                    `
                    INSERT INTO users
                    (name, email, password)
                    VALUES (?, ?, ?)
                    `,
                    [name, email, hashedPassword],
                    function (err) {

                        if (err) {
                            return res.status(500).json({
                                message: "Could not create account"
                            });
                        }

                        res.status(201).json({
                            message: "Account created successfully",
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


// =============================
// LOGIN
// =============================

router.post("/login", (req, res) => {

    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    db.get(
        `
        SELECT id, name, email, password
        FROM users
        WHERE email = ?
        `,
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

            const passwordMatches =
                await bcrypt.compare(password, user.password);

            if (!passwordMatches) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    name: user.name,
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


// =============================
// CURRENT USER
// =============================

router.get("/me", authenticateToken, (req, res) => {

    res.json({
        id: req.user.userId,
        name: req.user.name,
        email: req.user.email
    });

});


module.exports = router;