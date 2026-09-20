const API = "/api";

// ---------- View switching ----------
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    views.forEach((v) => v.classList.remove("active"));
    document.getElementById(target).classList.add("active");

    if (target === "dashboard-view") loadDashboard();
    if (target === "donations-view") loadDonations();
    if (target === "history-view") loadHistory();
  });
});

// ---------- Auth helpers ----------
function getToken() {
  return localStorage.getItem("fb_token");
}
function getUser() {
  const raw = localStorage.getItem("fb_user");
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem("fb_token", token);
  localStorage.setItem("fb_user", JSON.stringify(user));
  updateAuthButton();
}
function logout() {
  localStorage.removeItem("fb_token");
  localStorage.removeItem("fb_user");
  updateAuthButton();
}
function updateAuthButton() {
  const authBtn = document.getElementById("auth-btn");
  const user = getUser();
  if (user) {
    authBtn.textContent = `Logout (${user.name})`;
    authBtn.dataset.target = "dashboard-view";
    authBtn.onclick = (e) => {
      e.stopImmediatePropagation();
      logout();
      views.forEach((v) => v.classList.remove("active"));
      document.getElementById("dashboard-view").classList.add("active");
    };
  } else {
    authBtn.textContent = "Login";
    authBtn.dataset.target = "auth-view";
    authBtn.onclick = null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ---------- Auth tabs ----------
document.querySelectorAll(".tab-btn").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("login-form").classList.toggle("hidden", tab.dataset.tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", tab.dataset.tab !== "register");
  });
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("login-msg");
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form)),
    });
    setSession(data.token, data.user);
    msg.textContent = "Logged in successfully!";
    msg.className = "msg success";
    document.getElementById("dashboard-view").classList.add("active");
    document.getElementById("auth-view").classList.remove("active");
    loadDashboard();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("register-msg");
  try {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form)),
    });
    setSession(data.token, data.user);
    msg.textContent = "Registered and logged in!";
    msg.className = "msg success";
    document.getElementById("dashboard-view").classList.add("active");
    document.getElementById("auth-view").classList.remove("active");
    loadDashboard();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

// ---------- Donate form ----------
document.getElementById("donate-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("donate-msg");
  if (!getToken()) {
    msg.textContent = "Please login as a donor first.";
    msg.className = "msg error";
    return;
  }
  const form = new FormData(e.target);
  try {
    await apiFetch("/donations", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form)),
    });
    msg.textContent = "Donation registered! Thank you.";
    msg.className = "msg success";
    e.target.reset();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = "msg error";
  }
});

// ---------- Dashboard ----------
async function loadDashboard() {
  if (!getToken()) return;
  try {
    const stats = await apiFetch("/donations/stats/dashboard");
    document.getElementById("stat-total").textContent = stats.totalDonations;
    document.getElementById("stat-rescued").textContent = stats.foodRescued;
    document.getElementById("stat-pending").textContent = stats.pendingPickups;
    document.getElementById("stat-volunteers").textContent = stats.activeVolunteers;
  } catch (err) {
    console.error(err.message);
  }
}

// ---------- Available donations ----------
async function loadDonations() {
  const list = document.getElementById("donations-list");
  if (!getToken()) {
    list.innerHTML = `<p>Please login to view and request available food.</p>`;
    return;
  }
  try {
    const donations = await apiFetch("/donations?status=available");
    list.innerHTML = donations.length
      ? donations.map(renderDonationCard).join("")
      : `<p>No surplus food available right now.</p>`;

    list.querySelectorAll("[data-request-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await apiFetch(`/donations/${btn.dataset.requestId}/request`, { method: "PUT" });
          loadDonations();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p>${err.message}</p>`;
  }
}

function renderDonationCard(d) {
  const user = getUser();
  const canRequest =
    d.status === "available" && user && (user.role === "volunteer" || user.role === "ngo");
  return `
    <div class="food-card">
      <span class="badge status-${d.status}">${d.status.replace("_", " ")}</span>
      <h3>${escapeHtml(d.foodName)}</h3>
      <p><strong>Type:</strong> ${d.foodType}</p>
      <p><strong>Quantity:</strong> ${escapeHtml(d.quantity)}</p>
      <p><strong>Expiry:</strong> ${new Date(d.expiryTime).toLocaleString()}</p>
      <p><strong>Pickup:</strong> ${escapeHtml(d.pickupAddress)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(d.contactNumber)}</p>
      ${canRequest ? `<button data-request-id="${d._id}">Request Pickup</button>` : ""}
    </div>`;
}

// ---------- History ----------
async function loadHistory() {
  const list = document.getElementById("history-list");
  if (!getToken()) {
    list.innerHTML = `<p>Please login to view your history.</p>`;
    return;
  }
  try {
    const donations = await apiFetch("/donations/mine");
    list.innerHTML = donations.length
      ? donations.map(renderDonationCard).join("")
      : `<p>No records yet.</p>`;
  } catch (err) {
    list.innerHTML = `<p>${err.message}</p>`;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Init ----------
updateAuthButton();
loadDashboard();
