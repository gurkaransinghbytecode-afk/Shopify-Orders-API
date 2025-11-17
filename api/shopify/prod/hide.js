import fs from "fs";
import path from "path";

export default function handler(req, res) {
  // === Basic Auth (same as orders endpoint) ===
  const auth = req.headers.authorization || "";
  const validUser = process.env.BASIC_USER_PROD;
  const validPass = process.env.BASIC_PASS_PROD;

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
    return res.status(401).json({ error: "Unauthorized" });
  }

  // === Get order_id parameter ===
  const orderId = req.query.order_id;

  if (!orderId) {
    return res.status(400).json({ error: "Missing order_id parameter" });
  }

  // === Path to hiddenOrders.json ===
  const filePath = path.resolve("./lib/hiddenOrders.json");

  // Create file if missing
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ hidden: [] }, null, 2), "utf8");
  }

  // Load existing hidden orders
  const hiddenData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const hiddenList = hiddenData.hidden || [];

  // Avoid duplicate entries
  if (!hiddenList.includes(orderId)) {
    hiddenList.push(orderId);

    // Save updated list
    fs.writeFileSync(
      filePath,
      JSON.stringify({ hidden: hiddenList }, null, 2),
      "utf8"
    );
  }

  return res.status(200).json({
    success: true,
    hiddenOrder: orderId,
    totalHidden: hiddenList.length,
  });
}
