require("dotenv").config();

const express = require("express");
const path = require("path");

const db = require("../database/database");
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Personal Finance Manager API is running!"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});