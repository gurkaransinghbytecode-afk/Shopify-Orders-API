import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    // === Basic Auth ===
    const auth = req.headers.authorization || "";
    const validUser = process.env.BASIC_USER_TEST;
    const validPass = process.env.BASIC_PASS_TEST;

    if (!auth.startsWith("Basic ")) {
      res
        .status(401)
        .setHeader("WWW-Authenticate", "Basic")
        .json({ error: "Unauthorized" });
      return;
    }

    const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
    const [user, pass] = decoded.split(":");

    if (user !== validUser || pass !== validPass) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // === Load Dummy TEST Orders ===
    const filePath = path.resolve("./lib/mockOrders.json");

    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        error: "mockOrders.json NOT FOUND. Create /lib/mockOrders.json",
        checked: filePath,
      });
    }

    const fileData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const orders = fileData.orders || fileData;

    // === Optional ?days= filter ===
    if (req.query.days) {
      const days = parseInt(req.query.days);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const filtered = orders.filter(
        (o) => new Date(o.created_at || o.date) >= cutoff
      );

      return res.status(200).json({
        filteredDays: days,
        orders: filtered,
      });
    }

    res.status(200).json({
      orders,
    });
  } catch (error) {
    console.error("Test API error:", error.message);
    res.status(500).json({
      error: "Failed to load test orders",
      details: error.message,
    });
  }
}
