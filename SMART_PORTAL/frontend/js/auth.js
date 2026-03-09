async function registerUser(event) {
  event.preventDefault();
  hideStatus("status");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Registering...";

  const payload = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role: document.getElementById("role").value,
  };

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    showStatus("status", "Registration successful. Please login.", "success");
    document.getElementById("registerForm").reset();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  } catch (err) {
    showStatus("status", err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Register";
  }
}

async function loginUser(event) {
  event.preventDefault();
  hideStatus("status");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Logging in...";

  const payload = {
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    setAuth(data.token, data.user);
    showStatus("status", "Login successful. Redirecting...", "success");

    if (data.user.role === "admin") {
      setTimeout(() => (window.location.href = "admin_dashboard.html"), 700);
    } else {
      setTimeout(() => (window.location.href = "student_dashboard.html"), 700);
    }
  } catch (err) {
    showStatus("status", err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
}
