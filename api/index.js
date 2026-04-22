const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
}

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: String, required: true },
  },
  { timestamps: true }
);
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

app.get("/", (req, res) => res.json({ status: "ok", message: "CashFlow API running" }));

app.get("/transactions", async (req, res) => {
  await connectDB();
  const { month } = req.query;
  const filter = month ? { date: { $regex: `^${month}` } } : {};
  const data = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
  res.json(data);
});

app.post("/transactions", async (req, res) => {
  await connectDB();
  const { type, amount, category, description, date } = req.body;
  if (!type || !amount || !category || !date)
    return res.status(400).json({ error: "Missing required fields" });
  const tx = await Transaction.create({ type, amount, category, description, date });
  res.status(201).json(tx);
});

app.delete("/transactions/:id", async (req, res) => {
  await connectDB();
  const tx = await Transaction.findByIdAndDelete(req.params.id);
  if (!tx) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Deleted", id: req.params.id });
});

app.get("/summary", async (req, res) => {
  await connectDB();
  const transactions = await Transaction.find();
  const summary = {};
  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    if (!summary[month]) summary[month] = { income: 0, expense: 0, count: 0 };
    summary[month][tx.type] += tx.amount;
    summary[month].count += 1;
  }
  const allTime = {
    income: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
    expense: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    count: transactions.length,
  };
  res.json({ months: summary, allTime });
});

// Local testing
if (require.main === module) {
  app.listen(4000, () => console.log("🚀 Running on http://localhost:4000"));
}

module.exports = app;