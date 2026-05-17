const API = "http://localhost:3000/api/v1";

const state = {
  page: "home",
  restaurants: [],
  categories: [],
  orders: [],
  detail: null,
  cart: {},
  search: "",
  category_id: null,
};

const app = document.getElementById("app");

function rupiah(n) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

function showLoading() {
  app.innerHTML = `<div class="spinner"></div>`;
}

function showError(msg) {
  app.innerHTML = `
    <div class="state">
      <p>${msg}</p>
    </div>`;
}

function showEmpty(msg) {
  return `
    <div class="state">
      <p>${msg}</p>
    </div>`;
}

function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error("Gagal memuat data");
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal mengirim data");
  return data;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const c = await apiGet("/categories");
    state.categories = c.data;
  } catch (e) {
    console.error(e);
  }

  bindNav();
  navigate("home");
});

function bindNav() {
  document.querySelectorAll(".tabbar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.tab);
    });
  });
  document.getElementById("btn-back").addEventListener("click", () => navigate("home"));
  document.getElementById("btn-orders").addEventListener("click", () => navigate("orders"));
}

function setActiveTab(tab) {
  document.querySelectorAll(".tabbar button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
}

function navigate(page, param) {
  state.page = page;
  document.getElementById("btn-back").classList.toggle("hidden", page === "home");

  const titles = {
    home: "FoodGo",
    detail: "Detail Restoran",
    orders: "Pesanan Saya",
    categories: "Kategori",
  };
  document.getElementById("page-title").textContent = titles[page] || "FoodGo";

  if (["home", "categories", "orders"].includes(page)) setActiveTab(page);

  if (page === "home") renderHome();
  else if (page === "categories") renderCategories();
  else if (page === "orders") renderOrders();
  else if (page === "detail") renderDetail(param);
}

async function renderHome() {
  showLoading();
  try {
    const params = new URLSearchParams();
    if (state.search) params.set("search", state.search);
    if (state.category_id) params.set("category_id", state.category_id);
    const res = await apiGet("/restaurants?" + params.toString());
    state.restaurants = res.data;

    let html = `
      <div class="search-box">
        <input id="search-input" placeholder="Cari restoran..." value="${state.search}">
      </div>
      <div class="chips-wrap">
        <div class="chips" id="chip-list">
          <div class="chip ${!state.category_id ? "active" : ""}" data-cat="">Semua</div>
          ${state.categories
            .map(
              (c) => `
            <div class="chip ${state.category_id === c.id ? "active" : ""}" data-cat="${c.id}">${c.name}</div>
          `
            )
            .join("")}
        </div>
      </div>
      <div class="section-title">Restoran (${state.restaurants.length})</div>
    `;

    if (state.restaurants.length === 0) {
      html += showEmpty("Tidak ada restoran ditemukan.");
    } else {
      html += state.restaurants
        .map(
          (r) => `
        <div class="card" data-slug="${r.slug}">
          <img src="${r.image}" alt="${r.name}" onerror="this.src='https://placehold.co/600x350/dddddd/666666?text=No+Image'">
          <div class="card-body">
            <h3>${r.name}</h3>
            <div class="card-meta">
              <span class="rating">Rating: ${r.rating}</span>
              <span class="price">${r.price_range}</span>
            </div>
            <div class="card-row">
              <span>${r.delivery_time}</span>
              <span>Ongkir: ${rupiah(r.delivery_fee)}</span>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    }

    app.innerHTML = html;

    const inp = document.getElementById("search-input");
    let timer;
    inp.addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.search = e.target.value;
        renderHome();
      }, 300);
    });

    document.querySelectorAll(".chip").forEach((ch) => {
      ch.addEventListener("click", () => {
        const id = ch.dataset.cat;
        state.category_id = id ? Number(id) : null;
        renderHome();
      });
    });

    document.querySelectorAll(".card").forEach((c) => {
      c.addEventListener("click", () => navigate("detail", c.dataset.slug));
    });
  } catch (e) {
    showError(e.message);
  }
}

function renderCategories() {
  if (state.categories.length === 0) {
    showEmpty("Belum ada kategori");
    return;
  }
  app.innerHTML = `
    <div class="section-title">Pilih Kategori</div>
    ${state.categories
      .map(
        (c) => `
      <div class="cat-card" data-cat="${c.id}">
        <div class="cat-letter">${c.name.charAt(0).toUpperCase()}</div>
        <h3>${c.name}</h3>
        <span class="arrow">&rsaquo;</span>
      </div>
    `
      )
      .join("")}
  `;
  document.querySelectorAll(".cat-card").forEach((c) => {
    c.addEventListener("click", () => {
      state.category_id = Number(c.dataset.cat);
      state.search = "";
      navigate("home");
    });
  });
}

async function renderDetail(slug) {
  showLoading();
  state.cart = {};
  try {
    const res = await apiGet("/restaurants/" + slug);
    state.detail = res.data;
    const r = state.detail;
    const category = state.categories.find((c) => c.id === r.category_id);

    app.innerHTML = `
      <img src="${r.image}" class="detail-img" alt="${r.name}" onerror="this.src='https://placehold.co/600x350/dddddd/666666?text=No+Image'">
      <div class="detail-info">
        <h2>${r.name}</h2>
        <div class="card-meta">
          <span class="rating">Rating: ${r.rating}</span>
          <span class="price">${r.price_range}</span>
        </div>
        <div class="detail-row">
          <span class="item">
            <span class="label">Estimasi</span>
            <span class="value">${r.delivery_time}</span>
          </span>
          <span class="item">
            <span class="label">Ongkir</span>
            <span class="value">${rupiah(r.delivery_fee)}</span>
          </span>
          <span class="item">
            <span class="label">Kategori</span>
            <span class="value">${category?.name || "-"}</span>
          </span>
        </div>
        <p class="address">${r.address}</p>
        <p class="desc">${r.description}</p>
      </div>

      <div class="section-title">Menu</div>
      <div class="menu-list">
        ${r.menus
          .map(
            (m) => `
          <div class="menu-item" data-id="${m.id}">
            <div class="info">
              <div class="name">${m.name}</div>
              <div class="price">${rupiah(m.price)}</div>
            </div>
            <div class="qty-ctrl">
              <button class="dec">-</button>
              <span class="qty">0</span>
              <button class="inc">+</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="section-title">Ulasan</div>
      <div class="review-list">
        ${
          r.reviews && r.reviews.length > 0
            ? r.reviews
                .map(
                  (rv) => `
          <div class="review-item">
            <div class="header-row">
              <span class="user">${rv.user}</span>
              <span class="stars">${rv.rating}/5</span>
            </div>
            <p class="comment">${rv.comment}</p>
          </div>
        `
                )
                .join("")
            : `<p class="state">Belum ada ulasan</p>`
        }
      </div>

      <div id="order-bar"></div>
    `;

    document.querySelectorAll(".menu-item").forEach((item) => {
      const id = Number(item.dataset.id);
      item.querySelector(".inc").addEventListener("click", () => updateCart(id, 1));
      item.querySelector(".dec").addEventListener("click", () => updateCart(id, -1));
    });

    updateOrderBar();
  } catch (e) {
    showError(e.message);
  }
}

function updateCart(menuId, delta) {
  const cur = state.cart[menuId] || 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) delete state.cart[menuId];
  else state.cart[menuId] = next;

  const item = document.querySelector(`.menu-item[data-id="${menuId}"]`);
  if (item) item.querySelector(".qty").textContent = next;

  updateOrderBar();
}

function updateOrderBar() {
  const bar = document.getElementById("order-bar");
  if (!bar) return;
  const r = state.detail;
  let subtotal = 0;
  let count = 0;
  for (const id in state.cart) {
    const menu = r.menus.find((m) => m.id === Number(id));
    if (menu) {
      subtotal += menu.price * state.cart[id];
      count += state.cart[id];
    }
  }

  if (count === 0) {
    bar.innerHTML = "";
    return;
  }

  const total = subtotal + (r.delivery_fee || 0);

  bar.innerHTML = `
    <div class="order-bar">
      <span>${count} item &middot; ${rupiah(total)}</span>
      <button id="btn-checkout">Pesan</button>
    </div>
  `;
  document.getElementById("btn-checkout").addEventListener("click", openCheckoutModal);
}

function openCheckoutModal() {
  const r = state.detail;
  const items = Object.keys(state.cart).map((id) => {
    const m = r.menus.find((x) => x.id === Number(id));
    return { menu_id: m.id, name: m.name, price: m.price, qty: state.cart[id] };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const ongkir = r.delivery_fee || 0;
  const total = subtotal + ongkir;

  const wrap = document.createElement("div");
  wrap.className = "modal-bg";
  wrap.innerHTML = `
    <div class="modal">
      <h3>Konfirmasi Pesanan</h3>
      <div class="modal-summary">
        ${items
          .map(
            (i) => `
          <div class="row">
            <span>${i.qty}x ${i.name}</span>
            <span>${rupiah(i.price * i.qty)}</span>
          </div>
        `
          )
          .join("")}
        <div class="row">
          <span>Subtotal</span>
          <span>${rupiah(subtotal)}</span>
        </div>
        <div class="row">
          <span>Ongkir</span>
          <span>${rupiah(ongkir)}</span>
        </div>
        <div class="row total-row">
          <span>Total</span>
          <span>${rupiah(total)}</span>
        </div>
      </div>
      <label>Nama Pemesan</label>
      <input id="customer-name" placeholder="Nama lengkap">
      <div class="modal-actions">
        <button class="btn-cancel">Batal</button>
        <button class="btn-confirm">Pesan Sekarang</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  wrap.querySelector(".btn-cancel").addEventListener("click", () => wrap.remove());
  wrap.querySelector(".btn-confirm").addEventListener("click", async () => {
    const name = document.getElementById("customer-name").value.trim();
    if (!name) {
      toast("Nama harus diisi");
      return;
    }
    try {
      await apiPost("/orders", {
        customer_name: name,
        restaurant_id: r.id,
        items: items.map((i) => ({ menu_id: i.menu_id, qty: i.qty })),
      });
      wrap.remove();
      state.cart = {};
      toast("Pesanan berhasil dibuat");
      navigate("orders");
    } catch (err) {
      toast(err.message);
    }
  });
}

async function renderOrders() {
  showLoading();
  try {
    const res = await apiGet("/orders");
    state.orders = res.data;

    if (state.orders.length === 0) {
      app.innerHTML = showEmpty("Belum ada pesanan.");
      return;
    }

    app.innerHTML = `
      <div class="section-title">Daftar Pesanan</div>
      ${state.orders
        .map(
          (o) => `
        <div class="order-card">
          <div class="row">
            <span class="resto">${o.restaurant_name}</span>
            <span class="timestamp">${new Date(o.created_at).toLocaleString("id-ID")}</span>
          </div>
          <div class="row"><span>Pemesan: ${o.customer_name}</span></div>
          ${o.items.map((i) => `<div class="item">- ${i.qty}x ${i.menu_name} (${rupiah(i.subtotal)})</div>`).join("")}
          <div class="delivery-fee">Ongkir: ${rupiah(o.delivery_fee || 0)}</div>
          <div class="total">Total: ${rupiah(o.total)}</div>
        </div>
      `
        )
        .join("")}
    `;
  } catch (e) {
    showError(e.message);
  }
}
