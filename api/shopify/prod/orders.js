import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const validUser = "prod_user";
  const validPass = "prod_pass";

  if (!auth.startsWith("Basic ")) {
    res.status(401).setHeader("WWW-Authenticate", "Basic").json({ error: "Unauthorized" });
    return;
  }
  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user !== validUser || pass !== validPass) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const filePath = path.resolve("./lib/mockOrders.json");
  const mockData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  res.status(200).json(mockData);
}
