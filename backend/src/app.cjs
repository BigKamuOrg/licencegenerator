const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes.cjs");
const licenseRoutes = require("./modules/licenses/license.routes.cjs");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/licenses", licenseRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

module.exports = app;


