import axios from "axios";

export default async function handler(req, res) {
  try {
    // === Basic Auth ===
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

    // === Shopify Settings ===
    const shop = process.env.SHOPIFY_STORE;
    const token = process.env.SHOPIFY_TOKEN;

    // === Build URL ===
    const days = parseInt(req.query.days || "0", 10);
    let url = `https://${shop}/admin/api/2024-10/orders.json?status=any&financial_status=paid`;

    if (!isNaN(days) && days > 0) {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      url += `&created_at_min=${encodeURIComponent(cutoffDate.toISOString())}`;
    }

    // === Fetch from Shopify ===
    const response = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    const orders = response.data?.orders || [];

    if (orders.length === 0) {
      return res.status(200).json({
        source: "shopify_live",
        message:
          days > 0
            ? `No paid orders found in the last ${days} day(s).`
            : "No paid orders found.",
        orders: [],
      });
    }

    // === Format data for VT ===
    const formattedOrders = orders.map((order) => ({
      reference: order.name, // ORDER1234
      id: "SF" + order.id, // SF12345
      payment: {
        totalAmount: parseFloat(order.total_price),
      },
      billingAddress: {
        lastName: order.billing_address?.last_name || "",
        firstName: order.billing_address?.first_name || "",
        phone: order.billing_address?.phone || "",
        mobilePhone: order.billing_address?.phone || "",
        street: order.billing_address?.address1 || "",
        street2: order.billing_address?.address2 || "",
        postalCode: order.billing_address?.zip || "",
        city: order.billing_address?.city || "",
        country: order.billing_address?.country || "",
        email: order.email || "",
      },
      shippingAddress: {
        lastName: order.shipping_address?.last_name || "",
        firstName: order.shipping_address?.first_name || "",
        phone: order.shipping_address?.phone || "",
        mobilePhone: order.shipping_address?.phone || "",
        street: order.shipping_address?.address1 || "",
        street2: order.shipping_address?.address2 || "",
        postalCode: order.shipping_address?.zip || "",
        city: order.shipping_address?.city || "",
        country: order.shipping_address?.country || "",
      },
      items: order.line_items.map((i) => ({
        reference: i.sku || i.product_id?.toString(),
      })),
    }));

    // === Send Response ===
    return res.status(200).json({
      source: "shopify_live",
      orders: formattedOrders,
    });
  } catch (error) {
    console.error(
      "PROD Shopify API error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      error: "Failed to fetch production orders",
      details: error.response?.data || error.message,
    });
  }
}
