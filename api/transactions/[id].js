import { connectDB, Transaction } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  await connectDB();

  const { id } = req.query;

  // DELETE /api/transactions/[id]
  if (req.method === "DELETE") {
    try {
      const tx = await Transaction.findByIdAndDelete(id);
      if (!tx) return res.status(404).json({ error: "Not found" });
      return res.json({ message: "Deleted", id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
