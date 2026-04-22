require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ── Connect to MongoDB ──────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ── Transaction Schema ──────────────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: String, required: true }, // "YYYY-MM-DD"
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

// ── Routes ──────────────────────────────────────────────────────

// Health check
app.get("/", (req, res) => res.json({ status: "ok", message: "CashFlow API running" }));

// GET all transactions (optional ?month=YYYY-MM filter)
app.get("/transactions", async (req, res) => {
  try {
    const { month } = req.query;
    const filter = month ? { date: { $regex: `^${month}` } } : {};
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary (totals per month)
app.get("/summary", async (req, res) => {
  try {
    const transactions = await Transaction.find();
    const summary = {};
    for (const tx of transactions) {
      const month = tx.date.slice(0, 7); // "YYYY-MM"
      if (!summary[month]) summary[month] = { income: 0, expense: 0, count: 0 };
      summary[month][tx.type] += tx.amount;
      summary[month].count += 1;
    }
    // All-time totals
    const allTime = {
      income: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      count: transactions.length,
    };
    res.json({ months: summary, allTime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create transaction
app.post("/transactions", async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: "type, amount, category, date are required" });
    }
    const tx = await Transaction.create({ type, amount, category, description, date });
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE transaction
app.delete("/transactions/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
