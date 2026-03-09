let adminCharts = {};

function destroyChart(id) {
  if (adminCharts[id]) {
    adminCharts[id].destroy();
    delete adminCharts[id];
  }
}

function renderAdminCharts(data) {
  const topStudents = data.top_students || [];
  const subjectAverages = data.subject_averages || {};
  const bestDist = data.best_subject_distribution || {};
  const classPerf = data.class_performance || { labels: [], totals: [], averages: [] };

  destroyChart("top5Chart");
  destroyChart("subjectAvgChart");
  destroyChart("bestSubjectPieChart");
  destroyChart("classPerformanceChart");

  adminCharts.top5Chart = new Chart(document.getElementById("top5Chart"), {
    type: "bar",
    data: {
      labels: topStudents.map((s) => s.name),
      datasets: [{
        label: "Total Marks",
        data: topStudents.map((s) => s.total),
        backgroundColor: "rgba(31, 111, 235, 0.75)",
      }],
    },
  });

  adminCharts.subjectAvgChart = new Chart(document.getElementById("subjectAvgChart"), {
    type: "bar",
    data: {
      labels: Object.keys(subjectAverages),
      datasets: [{
        label: "Average Marks",
        data: Object.values(subjectAverages),
        backgroundColor: "rgba(24, 128, 56, 0.7)",
      }],
    },
  });

  adminCharts.bestSubjectPieChart = new Chart(document.getElementById("bestSubjectPieChart"), {
    type: "pie",
    data: {
      labels: Object.keys(bestDist),
      datasets: [{
        data: Object.values(bestDist),
        backgroundColor: ["#1f6feb", "#188038", "#d98600", "#c62828", "#7347f7"],
      }],
    },
  });

  adminCharts.classPerformanceChart = new Chart(document.getElementById("classPerformanceChart"), {
    type: "line",
    data: {
      labels: classPerf.labels,
      datasets: [
        {
          label: "Total Marks",
          data: classPerf.totals,
          borderColor: "#1f6feb",
          fill: false,
          tension: 0.25,
        },
        {
          label: "Average Marks",
          data: classPerf.averages,
          borderColor: "#188038",
          fill: false,
          tension: 0.25,
        },
      ],
    },
  });

  const rankingList = document.getElementById("rankingList");
  rankingList.innerHTML = "";
  (data.top_rankings || []).forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>#${row.rank} ${row.name}</span><strong>Avg: ${row.average}</strong>`;
    rankingList.appendChild(li);
  });

  document.getElementById("kpiStudents").textContent = data.summary?.total_students ?? 0;
  document.getElementById("kpiClassAvg").textContent = data.summary?.class_average ?? 0;
}

function hideStudentSearchResult() {
  const result = document.getElementById("studentSearchResult");
  if (result) {
    result.hidden = true;
  }
}

function renderStudentSearchResult(payload) {
  const student = payload.student || {};
  const subjects = student.subjects || {};
  const classSubjectAverages = payload.class?.subject_averages || {};
  const subjectNames = Object.keys(subjects);

  document.getElementById("searchStudentName").textContent = student.name || "-";
  document.getElementById("searchStudentRank").textContent = student.rank ?? "-";
  document.getElementById("searchStudentAvg").textContent = student.average ?? "-";
  document.getElementById("searchBestSubject").textContent = student.best_subject || "-";
  document.getElementById("searchStudentEmail").textContent = student.email || "-";
  document.getElementById("searchStudentId").textContent = student.student_id || "-";
  document.getElementById("searchStudentTotal").textContent = student.total ?? "-";
  document.getElementById("searchClassAvg").textContent = payload.class?.class_average ?? "-";

  destroyChart("studentSearchMarksChart");
  destroyChart("studentSearchComparisonChart");

  adminCharts.studentSearchMarksChart = new Chart(document.getElementById("studentSearchMarksChart"), {
    type: "bar",
    data: {
      labels: subjectNames,
      datasets: [{
        label: `${student.name} Marks`,
        data: subjectNames.map((subject) => subjects[subject]),
        backgroundColor: "rgba(31, 111, 235, 0.75)",
      }],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });

  adminCharts.studentSearchComparisonChart = new Chart(document.getElementById("studentSearchComparisonChart"), {
    type: "radar",
    data: {
      labels: subjectNames,
      datasets: [
        {
          label: `${student.name} Marks`,
          data: subjectNames.map((subject) => subjects[subject]),
          borderColor: "#1f6feb",
          backgroundColor: "rgba(31, 111, 235, 0.2)",
        },
        {
          label: "Class Average",
          data: subjectNames.map((subject) => classSubjectAverages[subject] ?? 0),
          borderColor: "#d98600",
          backgroundColor: "rgba(217, 134, 0, 0.18)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: 100,
        },
      },
    },
  });

  const breakdown = document.getElementById("studentSubjectBreakdown");
  breakdown.innerHTML = "";
  subjectNames.forEach((subject) => {
    const li = document.createElement("li");
    const classAverage = classSubjectAverages[subject] ?? 0;
    li.innerHTML = `<span>${subject}</span><strong>${subjects[subject]} / 100 (Class Avg: ${classAverage})</strong>`;
    breakdown.appendChild(li);
  });

  document.getElementById("studentSearchResult").hidden = false;
}

async function fetchAdminDashboard() {
  showStatus("dashboardStatus", "Loading dashboard data...", "info");

  try {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to load dashboard");
    }

    renderAdminCharts(data);
    showStatus("dashboardStatus", "Dashboard updated", "success");
  } catch (err) {
    showStatus("dashboardStatus", err.message, "error");
  }
}

async function uploadCsv(event) {
  event.preventDefault();
  hideStatus("uploadStatus");

  const fileInput = document.getElementById("dataFile");
  if (!fileInput.files.length) {
    showStatus("uploadStatus", "Please choose a file", "error");
    return;
  }

  const btn = document.getElementById("uploadBtn");
  btn.disabled = true;
  btn.textContent = "Uploading...";

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch(`${API_BASE}/upload_data`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }

    showStatus("uploadStatus", `Processed ${data.students_processed} students successfully`, "success");
    await fetchAdminDashboard();
  } catch (err) {
    showStatus("uploadStatus", err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload File";
  }
}

async function searchStudentPerformance(event) {
  event.preventDefault();
  hideStatus("studentSearchStatus");

  const input = document.getElementById("studentSearchInput");
  const query = input.value.trim();
  if (!query) {
    hideStudentSearchResult();
    showStatus("studentSearchStatus", "Enter a student name or email", "error");
    return;
  }

  const btn = document.getElementById("studentSearchBtn");
  btn.disabled = true;
  btn.textContent = "Searching...";

  try {
    const res = await fetch(`${API_BASE}/admin/student-search?q=${encodeURIComponent(query)}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Student search failed");
    }

    renderStudentSearchResult(data);
    showStatus("studentSearchStatus", "Student performance loaded", "success");
  } catch (err) {
    hideStudentSearchResult();
    showStatus("studentSearchStatus", err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Search Student";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("admin");
  document.getElementById("welcome").textContent = `Welcome, ${user.name}`;

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("uploadForm").addEventListener("submit", uploadCsv);
  document.getElementById("studentSearchForm").addEventListener("submit", searchStudentPerformance);

  fetchAdminDashboard();
});
