const OFFICIAL_URLS = Object.freeze({
  facebook: "https://www.facebook.com/",
  google: "https://accounts.google.com/",
  youtube: "https://www.youtube.com/",
  instagram: "https://www.instagram.com/"
});

const STORAGE_KEY = "minhanhtool_accounts_v1";
const LOG_KEY = "minhanhtool_logs_v1";

let accounts = load(STORAGE_KEY, []);
let logs = load(LOG_KEY, []);

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}

function addLog(accountId, action) {
  logs.unshift({
    accountId,
    action,
    time: new Date().toLocaleString("vi-VN")
  });
  logs = logs.slice(0, 200);
  save();
  renderLogs();
}

function openOfficialLogin(platform) {
  const url = OFFICIAL_URLS[platform];
  if (!url) return;

  // URL is selected only from the fixed allow-list above.
  // No user-entered URL is ever passed here.
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    showToast("Trình duyệt đã chặn cửa sổ mới. Cho phép pop-up cho website này.");
  }
}

document.querySelectorAll("[data-login]").forEach(button => {
  button.addEventListener("click", () => {
    openOfficialLogin(button.dataset.login);
  });
});

document.getElementById("accountForm").addEventListener("submit", event => {
  event.preventDefault();

  const platform = document.getElementById("platform").value;
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!username) return;

  const account = {
    id: Date.now(),
    platform,
    username,
    email,
    note,
    status: "NOT_LOGGED_IN",
    updatedAt: new Date().toLocaleString("vi-VN")
  };

  accounts.unshift(account);
  save();
  addLog(account.id, `Thêm tài khoản ${platform}: ${username}`);

  event.target.reset();
  renderAll();
  showToast("Đã thêm tài khoản.");
});

function statusHTML(status) {
  if (status === "LOGGED_IN")
    return '<span class="badge badge-green">Đã đăng nhập</span>';
  if (status === "NEEDS_RELOGIN")
    return '<span class="badge badge-yellow">Cần đăng nhập lại</span>';
  return '<span class="badge badge-gray">Chưa đăng nhập</span>';
}

function setStatus(id, status) {
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  account.status = status;
  account.updatedAt = new Date().toLocaleString("vi-VN");
  save();

  addLog(id, `Đổi trạng thái thành ${status}`);
  renderAll();
}

function deleteAccount(id) {
  const account = accounts.find(a => a.id === id);
  if (!account) return;

  if (!confirm(`Xóa tài khoản "${account.username}" khỏi danh sách?`)) return;

  accounts = accounts.filter(a => a.id !== id);
  save();
  addLog(id, `Xóa tài khoản ${account.username}`);
  renderAll();
  showToast("Đã xóa.");
}

function renderAccounts() {
  const table = document.getElementById("accountTable");
  const empty = document.getElementById("emptyAccounts");

  table.innerHTML = "";

  if (!accounts.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  for (const a of accounts) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHTML(a.id)}</td>
      <td><b>${escapeHTML(a.platform.toUpperCase())}</b></td>
      <td>${escapeHTML(a.username)}</td>
      <td>${escapeHTML(a.email)}</td>
      <td>${statusHTML(a.status)}</td>
      <td>${escapeHTML(a.updatedAt)}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-green" data-action="login">🔐 Đăng nhập</button>
          <button class="btn btn-gray" data-action="logged">✓ Đã login</button>
          <button class="btn btn-yellow" data-action="relogin">↻ Login lại</button>
          <button class="btn btn-red" data-action="notlogged">Chưa login</button>
          <button class="btn btn-red" data-action="delete">Xóa</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="login"]').onclick =
      () => openOfficialLogin(a.platform);

    tr.querySelector('[data-action="logged"]').onclick =
      () => setStatus(a.id, "LOGGED_IN");

    tr.querySelector('[data-action="relogin"]').onclick =
      () => setStatus(a.id, "NEEDS_RELOGIN");

    tr.querySelector('[data-action="notlogged"]').onclick =
      () => setStatus(a.id, "NOT_LOGGED_IN");

    tr.querySelector('[data-action="delete"]').onclick =
      () => deleteAccount(a.id);

    table.appendChild(tr);
  }
}

function renderNurture() {
  const box = document.getElementById("nurtureList");

  if (!accounts.length) {
    box.innerHTML = '<div class="empty">Chưa có tài khoản.</div>';
    return;
  }

  box.innerHTML = accounts.map(a => `
    <div class="log">
      <b>${escapeHTML(a.platform.toUpperCase())} — ${escapeHTML(a.username)}</b>
      <div>${statusHTML(a.status)}</div>
      <div class="small">Cập nhật: ${escapeHTML(a.updatedAt)}</div>
      <div class="actions" style="margin-top:8px">
        <button class="btn btn-green" onclick="openOfficialLogin('${escapeHTML(a.platform)}')">Mở đăng nhập</button>
        <button class="btn btn-gray" onclick="setStatus(${a.id}, 'LOGGED_IN')">Đánh dấu đang hoạt động</button>
      </div>
    </div>
  `).join("");
}

function renderLogs() {
  const box = document.getElementById("logsList");
  const empty = document.getElementById("emptyLogs");

  if (!logs.length) {
    box.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  box.innerHTML = logs.map(log => `
    <div class="log">
      <b>${escapeHTML(log.action)}</b>
      <div class="small">${escapeHTML(log.time)}</div>
    </div>
  `).join("");
}

function renderStats() {
  document.getElementById("totalCount").textContent = accounts.length;
  document.getElementById("loggedCount").textContent =
    accounts.filter(a => a.status === "LOGGED_IN").length;
  document.getElementById("reloginCount").textContent =
    accounts.filter(a => a.status === "NEEDS_RELOGIN").length;
  document.getElementById("notLoggedCount").textContent =
    accounts.filter(a => a.status === "NOT_LOGGED_IN").length;
}

function renderAll() {
  renderStats();
  renderAccounts();
  renderNurture();
  renderLogs();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

renderAll();
