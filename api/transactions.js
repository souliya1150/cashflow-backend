import { connectDB, Transaction } from "../lib/db.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  await connectDB();

  // GET /api/transactions?month=YYYY-MM
  if (req.method === "GET") {
    try {
      const { month } = req.query;
      const filter = month ? { date: { $regex: `^${month}` } } : {};
      const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
      return res.json(transactions);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST /api/transactions
  if (req.method === "POST") {
    try {
      const { type, amount, category, description, date } = req.body;
      if (!type || !amount || !category || !date)
        return res.status(400).json({ error: "type, amount, category, date are required" });
      const tx = await Transaction.create({ type, amount, category, description, date });
      return res.status(201).json(tx);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
