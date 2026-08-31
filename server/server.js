const express = require("express");
const db = require("../database/database");
const authRoutes = require("./routes/auth");

const app = express();

const PORT = 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Personal Finance Manager API is running!");
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});