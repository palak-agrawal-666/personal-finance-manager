require("dotenv").config();

const express = require("express");
const path = require("path");

const db = require("../database/database");

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");
const budgetRoutes = require("./routes/budget");

const app = express();

const PORT = process.env.PORT || 3000;


// Middleware

app.use(express.json());


// API routes

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);


// Frontend

app.use(
    express.static(
        path.join(__dirname, "../public")
    )
);


// Root



// Start server

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});