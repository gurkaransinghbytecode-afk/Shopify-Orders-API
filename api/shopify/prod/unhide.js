import fs from "fs";
import path from "path";

export default function handler(req, res) {
  // === Basic Auth (same as other endpoints) ===
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

  // === Get order_id ===
  const orderId = req.query.order_id;

  if (!orderId) {
    return res.status(400).json({ error: "Missing order_id parameter" });
  }

  // === Load hidden orders file ===
  const filePath = path.resolve("./lib/hiddenOrders.json");

  if (!fs.existsSync(filePath)) {
    return res.status(500).json({
      error: "hiddenOrders.json NOT FOUND",
    });
  }

  const hiddenData = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let hiddenList = hiddenData.hidden || [];

  // === Remove order from hidden list ===
  const updatedList = hiddenList.filter((id) => id !== orderId);

  // Save updated file
  fs.writeFileSync(
    filePath,
    JSON.stringify({ hidden: updatedList }, null, 2),
    "utf8"
  );

  return res.status(200).json({
    success: true,
    unhiddenOrder: orderId,
    totalHidden: updatedList.length,
  });
}
