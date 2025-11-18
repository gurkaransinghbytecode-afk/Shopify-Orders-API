import axios from "axios";

export default async function handler(req, res) {
  try {
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

    const shop = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_TOKEN;

    const days = parseInt(req.query.days || "0");
    let url = `https://${shop}/admin/api/2024-10/orders.json?status=any&financial_status=paid&limit=250`;

    if (days > 0) {
      const cut = new Date(Date.now() - days * 86400000).toISOString();
      url += `&created_at_min=${encodeURIComponent(cut)}`;
    }

    const response = await axios.get(url, {
      headers: { "X-Shopify-Access-Token": token },
    });

    const orders = response.data.orders || [];

    const formatted = orders.map((o) => ({
      reference: o.name,
      id: "SF" + o.id,
      tags: o.tags || "",
      payment: { totalAmount: parseFloat(o.total_price) || 0 },
      created_at: o.created_at,

      customerName: o.customer
        ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim()
        : "",
      customerEmail: o.customer?.email || "",

      billingAddress: {
        firstName: o.billing_address?.first_name || "",
        lastName: o.billing_address?.last_name || "",
        street: o.billing_address?.address1 || "",
        street2: o.billing_address?.address2 || "",
        city: o.billing_address?.city || "",
        postalCode: o.billing_address?.zip || "",
        country: o.billing_address?.country || "",
        phone: o.billing_address?.phone || "",
      },

      shippingAddress: {
        firstName: o.shipping_address?.first_name || "",
        lastName: o.shipping_address?.last_name || "",
        street: o.shipping_address?.address1 || "",
        street2: o.shipping_address?.address2 || "",
        city: o.shipping_address?.city || "",
        postalCode: o.shipping_address?.zip || "",
        country: o.shipping_address?.country || "",
        phone: o.shipping_address?.phone || "",
      },

      items: (o.line_items || []).map((i) => ({
        reference: i.sku || String(i.product_id),
      })),
    }));

    const visible = formatted.filter((o) => {
      const t = (o.tags || "")
        .toLowerCase()
        .split(",")
        .map((a) => a.trim());
      return !t.includes("hidden");
    });

    res.status(200).json({
      source: "shopify_live",
      hidden_count: formatted.length - visible.length,
      total_count: formatted.length,
      orders: visible,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed", details: err.message });
  }
}
