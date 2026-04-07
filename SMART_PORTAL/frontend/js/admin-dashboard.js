const dashboardCharts = {};

function destroyDashboardChart(key) {
  if (dashboardCharts[key]) {
    dashboardCharts[key].destroy();
    delete dashboardCharts[key];
  }
}

function renderDashboardChart(key, elementId, config) {
  destroyDashboardChart(key);
  const canvas = document.getElementById(elementId);
  if (!canvas) return;
  dashboardCharts[key] = new Chart(canvas, config);
}

function renderDashboardSummary(summary = {}, insights = {}, passFail = {}) {
  document.getElementById("pageTitle").textContent = summary.class_name || "Dashboard";
  document.getElementById("pageMeta").textContent = summary.uploaded_at
    ? `Last uploaded on ${formatDateTime(summary.uploaded_at)}`
    : "No uploaded class selected";
  document.getElementById("totalStudents").textContent = summary.total_students ?? 0;
  document.getElementById("averageMarks").textContent = formatNumber(summary.class_average ?? 0);
  document.getElementById("passPercentage").textContent = `${formatNumber(summary.pass_percentage ?? 0)}%`;
  document.getElementById("topScore").textContent = formatNumber(summary.top_score ?? 0);
  document.getElementById("hardestSubjectMessage").textContent = insights.hardest_subject_message || "No insight available.";
}

function renderDashboardRanking(rows = []) {
  const list = document.getElementById("rankingList");
  list.innerHTML = "";
  if (!rows.length) {
    list.innerHTML = '<li class="empty-state">No rankings to show.</li>';
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>#${row.rank} ${row.name}</span><strong>${formatNumber(row.average)} | ${row.grade}</strong>`;
    list.appendChild(item);
  });
}

function renderDashboardStudents(rows = []) {
  const body = document.getElementById("studentsTableBody");
  body.innerHTML = "";
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-cell">No students match the current filters.</td></tr>';
    return;
  }

  rows.forEach((student) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.student_id}</td>
      <td>${student.name}</td>
      <td>${formatNumber(student.total)}</td>
      <td>${formatNumber(student.average)}</td>
      <td>${student.grade}</td>
      <td>#${student.rank}</td>
      <td>${student.pass_status}</td>
    `;
    body.appendChild(tr);
  });
}

function renderStudentSearch(payload) {
  const student = payload.student || {};
  const subjects = student.subjects || {};
  const subjectAverages = payload.class?.subject_averages || {};
  const passSubjectCount = student.pass_subject_count ?? 0;
  const failSubjectCount = student.fail_subject_count ?? 0;

  document.getElementById("studentResultCard").hidden = false;
  document.getElementById("studentSearchName").textContent = student.name || "-";
  document.getElementById("studentSearchMeta").textContent = `Rank #${student.rank ?? "-"} | Grade ${student.grade || "-"} | ${student.pass_status || "-"}`;
  document.getElementById("studentSearchMessage").textContent = payload.message || "";
  document.getElementById("studentInsight").textContent = student.weak_subject
    ? `Needs improvement in ${student.weak_subject}.`
    : "No weak subject found.";
  document.getElementById("studentPassSubjectCount").textContent = passSubjectCount;
  document.getElementById("studentFailSubjectCount").textContent = failSubjectCount;

  const metrics = document.getElementById("studentSearchMetrics");
  metrics.innerHTML = `
    <li><span>Student ID</span><strong>${student.student_id || "-"}</strong></li>
    <li><span>Total</span><strong>${formatNumber(student.total)}</strong></li>
    <li><span>Average</span><strong>${formatNumber(student.average)}</strong></li>
    <li><span>Best Subject</span><strong>${student.best_subject || "-"}</strong></li>
    <li><span>Subjects Cleared</span><strong>${passSubjectCount}</strong></li>
    <li><span>Subjects to Improve</span><strong>${failSubjectCount}</strong></li>
  `;

  renderDashboardChart("studentMarks", "studentMarksChart", {
    type: "bar",
    data: {
      labels: Object.keys(subjects),
      datasets: [{ label: "Student Marks", data: Object.values(subjects), backgroundColor: "#2563eb", borderRadius: 10 }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
  });

  renderDashboardChart("studentCompare", "studentCompareChart", {
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
          data: Object.keys(subjects).map((subject) => subjectAverages[subject] ?? 0),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.16)",
        },
      ],
    },
    options: { responsive: true, scales: { r: { beginAtZero: true, suggestedMax: 100 } } },
  });
}

function renderDashboardCharts(analytics = {}) {
  const topStudents = analytics.top_students || [];
  const subjectAverages = analytics.subject_averages || {};
  const passFail = analytics.pass_fail || {};
  const gradeDistribution = analytics.grade_distribution || {};
  const classPerf = analytics.class_performance || { labels: [], totals: [], averages: [] };

  renderDashboardChart("topStudents", "topStudentsChart", {
    type: "bar",
    data: {
      labels: topStudents.map((student) => student.name),
      datasets: [{ label: "Total Marks", data: topStudents.map((student) => student.total), backgroundColor: "#2563eb", borderRadius: 10 }],
    },
    options: { responsive: true },
  });

  renderDashboardChart("subjectAverage", "subjectAverageChart", {
    type: "bar",
    data: {
      labels: Object.keys(subjectAverages),
      datasets: [{ label: "Average Marks", data: Object.values(subjectAverages), backgroundColor: "#14b8a6", borderRadius: 10 }],
    },
    options: { responsive: true },
  });

  renderDashboardChart("passFail", "passFailChart", {
    type: "pie",
    data: {
      labels: ["Pass", "Fail"],
      datasets: [{ data: [passFail.pass_count || 0, passFail.fail_count || 0], backgroundColor: ["#22c55e", "#ef4444"] }],
    },
    options: { responsive: true },
  });

  renderDashboardChart("gradeDistribution", "gradeDistributionChart", {
    type: "doughnut",
    data: {
      labels: Object.keys(gradeDistribution),
      datasets: [{ data: Object.values(gradeDistribution), backgroundColor: ["#0f766e", "#2563eb", "#f59e0b", "#ef4444"] }],
    },
    options: { responsive: true },
  });

  renderDashboardChart("classTrend", "classTrendChart", {
    type: "line",
    data: {
      labels: classPerf.labels,
      datasets: [
        { label: "Total Marks", data: classPerf.totals, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.14)", fill: true, tension: 0.3 },
        { label: "Average", data: classPerf.averages, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)", fill: true, tension: 0.3 },
      ],
    },
    options: { responsive: true },
  });
}

function renderComparison(payload = {}) {
  renderDashboardChart("comparison", "comparisonChart", {
    type: "bar",
    data: {
      labels: payload.labels || [],
      datasets: (payload.datasets || []).map((set, index) => ({
        label: `${set.label} (${formatDateTime(set.uploaded_at)})`,
        data: set.subject_averages || [],
        backgroundColor: index === 0 ? "#2563eb" : "#14b8a6",
        borderRadius: 10,
      })),
    },
    options: { responsive: true },
  });
}

async function loadDashboard() {
  showStatus("dashboardStatus", "Loading dashboard...", "info");
  const payload = await fetchAdminJson("/api/students/filter");

  syncAdminContext(payload);
  renderDashboardSummary(payload.analytics.summary, payload.analytics.insights, payload.analytics.pass_fail);
  renderDashboardCharts(payload.analytics);
  renderDashboardRanking(payload.analytics.top_rankings || []);
  renderDashboardStudents(payload.students || []);
  showStatus("dashboardStatus", "Dashboard updated", "success");

  const compareSelect = document.getElementById("compareClassSelect");
  if (compareSelect && adminPageState.availableClasses.length) {
    if (!compareSelect.value) {
      const fallback = adminPageState.availableClasses.find((item) => item.class_id !== adminPageState.currentClassId) || adminPageState.availableClasses[0];
      compareSelect.value = fallback?.class_id || "";
    }
    await loadComparison();
  }
}

async function loadComparison() {
  const compareClassId = document.getElementById("compareClassSelect").value;
  if (!compareClassId) return;
  const payload = await fetchAdminJson("/api/analytics/comparison", { compare_class_id: compareClassId });
  renderComparison(payload);
}

async function searchStudent(event) {
  event?.preventDefault();
  const query = document.getElementById("studentSearchInput").value.trim();
  if (!query) {
    showStatus("studentSearchStatus", "Enter a student name, email, or ID.", "error");
    return;
  }

  try {
    const payload = await fetchAdminJson(`/api/student/${encodeURIComponent(query)}`);
    syncAdminContext(payload);
    renderStudentSearch(payload);
    showStatus("studentSearchStatus", "Student details loaded.", "success");
  } catch (error) {
    document.getElementById("studentResultCard").hidden = true;
    showStatus("studentSearchStatus", error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initAdminFrame("dashboard", loadDashboard);

  document.getElementById("compareClassSelect").addEventListener("change", loadComparison);
  document.getElementById("studentSearchForm").addEventListener("submit", searchStudent);

  try {
    await loadDashboard();
    const params = new URLSearchParams(window.location.search);
    const student = params.get("student");
    if (student) {
      document.getElementById("studentSearchInput").value = student;
      await searchStudent();
    }
  } catch (error) {
    showStatus("dashboardStatus", error.message, "error");
  }
});
