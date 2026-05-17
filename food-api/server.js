const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function readJson(file) {
  const p = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

const orders = [];
let orderId = 1;

app.get("/api/v1/restaurants", (req, res) => {
  let list = readJson("restaurants.json");
  const { search, category_id } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }

  if (category_id) {
    list = list.filter((r) => r.category_id === Number(category_id));
  }

  res.json({ data: list, total: list.length });
});

app.get("/api/v1/restaurants/:slug", (req, res) => {
  const list = readJson("restaurants.json");
  const r = list.find((x) => x.slug === req.params.slug);
  if (!r) return res.status(404).json({ message: "Restoran tidak ditemukan" });
  res.json({ data: r });
});

app.get("/api/v1/categories", (req, res) => {
  res.json({ data: readJson("categories.json") });
});

app.get("/api/v1/orders", (req, res) => {
  res.json({ data: orders, total: orders.length });
});

app.post("/api/v1/orders", (req, res) => {
  const { customer_name, restaurant_id, items } = req.body;

  if (!customer_name || !restaurant_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Data tidak lengkap. customer_name, restaurant_id, items wajib diisi.",
    });
  }

  const restaurants = readJson("restaurants.json");
  const resto = restaurants.find((r) => r.id === Number(restaurant_id));
  if (!resto) {
    return res.status(404).json({ message: "Restoran tidak ditemukan" });
  }

  let subtotal = 0;
  const detailItems = [];
  for (const it of items) {
    const menu = resto.menus.find((m) => m.id === Number(it.menu_id));
    if (!menu) {
      return res
        .status(400)
        .json({ message: `Menu id ${it.menu_id} tidak ada di restoran ini` });
    }
    const qty = Number(it.qty) || 1;
    if (qty < 1) {
      return res.status(400).json({ message: "Quantity minimal 1" });
    }
    subtotal += menu.price * qty;
    detailItems.push({
      menu_id: menu.id,
      menu_name: menu.name,
      price: menu.price,
      qty,
      subtotal: menu.price * qty,
    });
  }

  const deliveryFee = resto.delivery_fee || 0;
  const total = subtotal + deliveryFee;

  const order = {
    id: orderId++,
    customer_name,
    restaurant_id: resto.id,
    restaurant_name: resto.name,
    items: detailItems,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  orders.unshift(order);

  res.status(201).json({ message: "Order berhasil dibuat", data: order });
});

app.listen(PORT, () => {
  console.log(`food-api running at http://localhost:${PORT}`);
});
