import axios from "axios";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", "Basic");
    return res.status(401).json({ error: "Unauthorized" });
  }
  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");
  if (
    user !== process.env.BASIC_USER_PROD ||
    pass !== process.env.BASIC_PASS_PROD
  )
    return res.status(401).json({ error: "Unauthorized" });

  const orderId = req.query.order_id;
  if (!orderId) return res.status(400).json({ error: "Missing order_id" });

  const numericId = orderId.startsWith("SF") ? orderId.slice(2) : orderId;

  try {
    const shop = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_TOKEN;

    const getUrl = `https://${shop}/admin/api/2024-10/orders/${numericId}.json`;
    const data = await axios.get(getUrl, {
      headers: { "X-Shopify-Access-Token": token },
    });
    const order = data.data.order;
    let tags = (order.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    tags = tags.filter((t) => t.toLowerCase() !== "hidden");

    const putUrl = `https://${shop}/admin/api/2024-10/orders/${numericId}.json`;
    await axios.put(
      putUrl,
      { order: { id: numericId, tags: tags.join(", ") } },
      { headers: { "X-Shopify-Access-Token": token } }
    );

    res.status(200).json({ success: true, unhidden: orderId });
  } catch (err) {
    res.status(500).json({ error: "Failed to unhide", details: err.message });
  }
}
