import { connectDB, Transaction } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  await connectDB();

  try {
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
    return res.json({ months: summary, allTime });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
