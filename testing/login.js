function showMessage(text, type = "success") {
  const div = document.createElement("div");
  div.className = type === "error" ? "error" : "success";
  div.textContent = text;
  document.body.prepend(div);
  setTimeout(() => div.remove(), 3000);
}

function showLoader() {
  document.getElementById("loader").style.display = "block";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

function attachLoginHandler() {
  const loginBtn = document.getElementById("loginBtn");
  loginBtn.addEventListener("click", async () => {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showMessage("الرجاء إدخال معلومات الدخول", "error");
      return;
    }

    showLoader();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      hideLoader();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || "donor");
        localStorage.setItem("username", data.username || "");
        showMessage("تم تسجيل الدخول بنجاح");
        if (data.role === "admin") location.href = "admin-dashboard.html";
        else location.href = "dashboard.html";
      } else {
        showMessage(data.error || "فشل تسجيل الدخول", "error");
      }
    } catch (e) {
      hideLoader();
      showMessage("خطأ في الاتصال بالخادم", "error");
      console.error(e);
    }
  });
}

// Export for Jest tests
if (typeof module !== "undefined") {
  module.exports = { attachLoginHandler };
}
