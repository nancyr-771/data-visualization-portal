const adminState = {
  currentClassId: "",
  charts: {},
};

function destroyChart(key) {
  if (adminState.charts[key]) {
    adminState.charts[key].destroy();
    delete adminState.charts[key];
  }
}

function renderChart(key, elementId, config) {
  destroyChart(key);
  const target = document.getElementById(elementId);
  if (!target) return;
  adminState.charts[key] = new Chart(target, config);
}

function updateAdminClassSelectors(classes, currentClassId) {
  adminState.currentClassId = currentClassId || adminState.currentClassId;
  document.querySelectorAll("[data-class-select]").forEach((select) => {
    populateClassSelect(select, classes, adminState.currentClassId);
  });
}

function renderOverview(payload) {
  const summary = payload.summary || {};
  const insights = payload.insights || {};
  const passFail = payload.pass_fail || {};

  document.getElementById("pageTitle").textContent = summary.class_name || "Admin Dashboard";
  document.getElementById("pageMeta").textContent = summary.uploaded_at
    ? `Updated ${formatDateTime(summary.uploaded_at)}`
    : "No class selected";

  document.getElementById("totalStudents").textContent = summary.total_students ?? 0;
  document.getElementById("classAverage").textContent = formatNumber(summary.class_average ?? 0);
  document.getElementById("passCount").textContent = passFail.pass_count ?? 0;
  document.getElementById("topperCard").textContent = insights.topper?.name || "-";

  document.getElementById("insightTopper").textContent = insights.topper
    ? `${insights.topper.name} | ${formatNumber(insights.topper.total)}`
    : "-";
  document.getElementById("insightBestSubject").textContent = insights.best_subject
    ? `${insights.best_subject.name} | ${formatNumber(insights.best_subject.average)}`
    : "-";
  document.getElementById("insightWeakestSubject").textContent = insights.weakest_subject
    ? `${insights.weakest_subject.name} | ${formatNumber(insights.weakest_subject.average)}`
    : "-";
  document.getElementById("insightBelowAverage").textContent = insights.students_below_class_average ?? 0;

  const rankingList = document.getElementById("rankingList");
  rankingList.innerHTML = "";
  (payload.top_rankings || []).forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>#${row.rank} ${row.name}</span><strong>${formatNumber(row.average)} | ${row.grade}</strong>`;
    rankingList.appendChild(item);
  });
}

function renderUploadHistory(items = []) {
  const list = document.getElementById("uploadHistory");
  if (!list) return;
  list.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <span>
        <strong>${item.class_name}</strong>
        <small>${formatDateTime(item.uploaded_at)}</small>
      </span>
      <strong>${item.student_count} students</strong>
    `;
    list.appendChild(row);
  });
}

function renderAdminCharts(payload) {
  const topStudents = payload.top_students || [];
  const subjectAverages = payload.subject_averages || {};
  const passFail = payload.pass_fail || {};
  const gradeDistribution = payload.grade_distribution || {};
  const classPerf = payload.class_performance || { labels: [], totals: [], averages: [] };

  renderChart("topStudents", "topStudentsChart", {
    type: "bar",
    data: {
      labels: topStudents.map((student) => student.name),
      datasets: [{
        label: "Total Marks",
        data: topStudents.map((student) => student.total),
        backgroundColor: "#2563eb",
        borderRadius: 10,
      }],
    },
    options: {
      responsive: true,
      animation: { duration: 900 },
      plugins: { tooltip: { enabled: true } },
      onClick: (_, elements) => {
        if (elements.length) {
          const index = elements[0].index;
          document.getElementById("studentSearchInput").value = topStudents[index].name;
          searchStudentPerformance();
        }
      },
    },
  });

  renderChart("subjectAverage", "subjectAverageChart", {
    type: "bar",
    data: {
      labels: Object.keys(subjectAverages),
      datasets: [{
        label: "Average Marks",
        data: Object.values(subjectAverages),
        backgroundColor: "#14b8a6",
        borderRadius: 10,
      }],
    },
    options: { responsive: true, animation: { duration: 900 } },
  });

  renderChart("passFail", "passFailChart", {
    type: "pie",
    data: {
      labels: ["Pass", "Fail"],
      datasets: [{
        data: [passFail.pass_count || 0, passFail.fail_count || 0],
        backgroundColor: ["#22c55e", "#ef4444"],
      }],
    },
    options: { responsive: true, animation: { duration: 900 } },
  });

  renderChart("gradeDistribution", "gradeDistributionChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(gradeDistribution),
      datasets: [{
        data: Object.values(gradeDistribution),
        backgroundColor: ["#0f766e", "#2563eb", "#f59e0b", "#ef4444"],
      }],
    },
    options: { responsive: true, animation: { duration: 900 } },
  });

  renderChart("classTrend", "classTrendChart", {
    type: "line",
    data: {
      labels: classPerf.labels,
      datasets: [
        {
          label: "Total Marks",
          data: classPerf.totals,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.14)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Average",
          data: classPerf.averages,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: { responsive: true, animation: { duration: 900 } },
  });
}

function renderStudentSearchResult(payload) {
  const student = payload.student || {};
  const subjects = student.subjects || {};
  const classSubjectAverages = payload.class?.subject_averages || {};

  document.getElementById("studentResultCard").hidden = false;
  document.getElementById("studentSearchName").textContent = student.name || "-";
  document.getElementById("studentSearchEmail").textContent = student.email || "-";
  document.getElementById("studentSearchMeta").textContent =
    `Rank #${student.rank ?? "-"} | Grade ${student.grade || "-"} | ${student.pass_status || "-"}`;
  document.getElementById("studentSearchMessage").textContent = payload.message || "";

  const metrics = document.getElementById("studentSearchMetrics");
  metrics.innerHTML = `
    <li><span>Student ID</span><strong>${student.student_id || "-"}</strong></li>
    <li><span>Total</span><strong>${formatNumber(student.total)}</strong></li>
    <li><span>Average</span><strong>${formatNumber(student.average)}</strong></li>
    <li><span>Best Subject</span><strong>${student.best_subject || "-"}</strong></li>
  `;

  renderChart("studentMarks", "studentMarksChart", {
    type: "bar",
    data: {
      labels: Object.keys(subjects),
      datasets: [{
        label: `${student.name} Marks`,
        data: Object.values(subjects),
        backgroundColor: "#2563eb",
        borderRadius: 10,
      }],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });

  renderChart("studentCompare", "studentCompareChart", {
    type: "radar",
    data: {
      labels: Object.keys(subjects),
      datasets: [
        {
          label: student.name || "Student",
          data: Object.values(subjects),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.18)",
        },
        {
          label: "Class Average",
          data: Object.keys(subjects).map((subject) => classSubjectAverages[subject] ?? 0),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.15)",
        },
      ],
    },
    options: { responsive: true, scales: { r: { beginAtZero: true, suggestedMax: 100 } } },
  });
}

async function fetchAdminDashboard(classId = "") {
  const query = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  const payload = await fetchJson(`${API_BASE}/admin/dashboard${query}`, {
    headers: authHeaders(),
  });

  adminState.currentClassId = payload.summary?.class_id || classId;
  updateAdminClassSelectors(payload.available_classes || [], adminState.currentClassId);
  renderOverview(payload);
  renderUploadHistory(payload.upload_history || []);
  renderAdminCharts(payload);
}

async function loadDashboardWithFeedback(classId = "") {
  try {
    showStatus("dashboardStatus", "Loading dashboard...", "info");
    await fetchAdminDashboard(classId);
    showStatus("dashboardStatus", "Dashboard updated", "success");
  } catch (error) {
    showStatus("dashboardStatus", error.message, "error");
  }
}

async function handleUpload(event) {
  event.preventDefault();
  const fileInput = document.getElementById("dataFile");
  const classNameInput = document.getElementById("classNameInput");
  if (!fileInput.files.length) {
    showToast("Choose a file before uploading", "error");
    return;
  }

  const button = document.getElementById("uploadBtn");
  setButtonLoading(button, true, "Uploading...", "Upload Data");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("class_name", classNameInput.value.trim());

  try {
    const payload = await fetchJson(`${API_BASE}/upload_data`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });

    fileInput.value = "";
    classNameInput.value = "";
    showToast(`Uploaded ${payload.class_name}`, "success");
    await loadDashboardWithFeedback(payload.class_id);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(button, false, "Uploading...", "Upload Data");
  }
}

async function searchStudentPerformance(event) {
  if (event) event.preventDefault();
  const query = document.getElementById("studentSearchInput").value.trim();
  if (!query) {
    showToast("Enter a student name or email", "error");
    return;
  }

  try {
    const payload = await fetchJson(
      `${API_BASE}/admin/student-search?q=${encodeURIComponent(query)}&class_id=${encodeURIComponent(adminState.currentClassId)}`,
      { headers: authHeaders() }
    );
    renderStudentSearchResult(payload);
    showStatus("studentSearchStatus", "Student analytics loaded", "success");
  } catch (error) {
    document.getElementById("studentResultCard").hidden = true;
    showStatus("studentSearchStatus", error.message, "error");
  }
}

async function downloadReport(format) {
  try {
    await downloadFile(
      `${API_BASE}/admin/export/${format}?class_id=${encodeURIComponent(adminState.currentClassId)}`,
      `${format}-report.${format === "excel" ? "xlsx" : "pdf"}`
    );
    showToast(`${format.toUpperCase()} report downloaded`, "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderStudentsTable(rows = []) {
  const body = document.getElementById("studentsTableBody");
  if (!body) return;
  body.innerHTML = "";
  rows.forEach((student) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.name}</td>
      <td>${student.student_id}</td>
      <td>${formatNumber(student.total)}</td>
      <td>${formatNumber(student.average)}</td>
      <td>#${student.rank}</td>
      <td>${student.grade}</td>
      <td>${student.pass_status}</td>
      <td>${student.best_subject}</td>
    `;
    tr.addEventListener("click", () => {
      window.location.href = `admin_dashboard.html?class_id=${encodeURIComponent(adminState.currentClassId)}&student=${encodeURIComponent(student.name)}`;
    });
    body.appendChild(tr);
  });
}

async function loadStudentsPage(classId = "") {
  const search = document.getElementById("studentTableSearch")?.value || "";
  const sort = document.getElementById("studentSort")?.value || "rank";
  const filter = document.getElementById("studentFilter")?.value || "all";
  const query = new URLSearchParams({
    class_id: classId || adminState.currentClassId,
    search,
    sort,
    filter,
  });

  const payload = await fetchJson(`${API_BASE}/admin/students?${query.toString()}`, {
    headers: authHeaders(),
  });

  adminState.currentClassId = payload.class.class_id;
  renderStudentsTable(payload.students || []);
  document.getElementById("studentsPageTitle").textContent = payload.class.class_name;
}

function bindClassSelectors() {
  document.querySelectorAll("[data-class-select]").forEach((select) => {
    select.addEventListener("change", async () => {
      adminState.currentClassId = select.value;
      if (document.getElementById("dashboardShell")) {
        await loadDashboardWithFeedback(select.value);
      }
      if (document.getElementById("studentsShell")) {
        try {
          await loadStudentsPage(select.value);
        } catch (error) {
          showToast(error.message, "error");
        }
      }
    });
  });
}

async function initDashboardPage() {
  const user = requireAuth("admin");
  document.getElementById("welcomeName").textContent = user.name;
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("uploadForm").addEventListener("submit", handleUpload);
  document.getElementById("studentSearchForm").addEventListener("submit", searchStudentPerformance);
  document.getElementById("downloadPdfBtn").addEventListener("click", () => downloadReport("pdf"));
  document.getElementById("downloadExcelBtn").addEventListener("click", () => downloadReport("excel"));

  bindClassSelectors();
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("class_id") || "";
  const student = params.get("student");
  await loadDashboardWithFeedback(classId);
  if (student) {
    document.getElementById("studentSearchInput").value = student;
    await searchStudentPerformance();
  }
}

async function initStudentsPage() {
  const user = requireAuth("admin");
  document.getElementById("welcomeName").textContent = user.name;
  document.getElementById("logoutBtn").addEventListener("click", logout);
  bindClassSelectors();

  const controls = ["studentTableSearch", "studentSort", "studentFilter"];
  controls.forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener("input", async () => {
      try {
        await loadStudentsPage(adminState.currentClassId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
    element.addEventListener("change", async () => {
      try {
        await loadStudentsPage(adminState.currentClassId);
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });

  try {
    const classesPayload = await fetchJson(`${API_BASE}/admin/classes`, { headers: authHeaders() });
    const current = classesPayload.classes?.[0]?.class_id || "";
    updateAdminClassSelectors(classesPayload.classes || [], current);
    await loadStudentsPage(current);
  } catch (error) {
    showToast(error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("dashboardShell")) {
    initDashboardPage();
  }
  if (document.getElementById("studentsShell")) {
    initStudentsPage();
  }
});
