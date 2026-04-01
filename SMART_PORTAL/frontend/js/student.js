const studentState = {
  currentClassId: "",
  charts: {},
};

function destroyStudentChart(key) {
  if (studentState.charts[key]) {
    studentState.charts[key].destroy();
    delete studentState.charts[key];
  }
}

function renderStudentChart(key, elementId, config) {
  destroyStudentChart(key);
  const canvas = document.getElementById(elementId);
  if (!canvas) return;
  studentState.charts[key] = new Chart(canvas, config);
}

function renderSubjectProgress(subjects = {}, weakSubject = "") {
  const container = document.getElementById("subjectProgressList");
  container.innerHTML = "";
  Object.entries(subjects).forEach(([subject, score]) => {
    const item = document.createElement("div");
    item.className = `progress-card ${subject === weakSubject ? "danger" : ""}`;
    item.innerHTML = `
      <div class="progress-head">
        <span>${subject}</span>
        <strong>${formatNumber(score)}</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${Math.min(Number(score), 100)}%"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderStudentDashboard(payload) {
  const student = payload.student || {};
  const subjects = student.subjects || {};
  const classSubjectAverages = payload.class?.subject_averages || {};

  studentState.currentClassId = payload.class?.class_id || studentState.currentClassId;
  populateClassSelect(document.getElementById("studentClassSelect"), payload.available_classes || [], studentState.currentClassId);

  document.getElementById("welcomeName").textContent = student.name || "-";
  document.getElementById("studentName").textContent = student.name || "-";
  document.getElementById("studentRank").textContent = `#${student.rank ?? "-"}`;
  document.getElementById("studentGrade").textContent = student.grade || "-";
  document.getElementById("studentStatus").textContent = student.pass_status || "-";
  document.getElementById("studentAverage").textContent = formatNumber(student.average);
  document.getElementById("classAverage").textContent = formatNumber(payload.class?.class_average);
  document.getElementById("bestSubject").textContent = student.best_subject || "-";
  document.getElementById("weakSubject").textContent = student.weak_subject || "-";
  document.getElementById("studentMessage").textContent = payload.message || "";

  renderSubjectProgress(subjects, student.weak_subject);

  renderStudentChart("marks", "subjectMarksChart", {
    type: "bar",
    data: {
      labels: Object.keys(subjects),
      datasets: [{
        label: "Marks",
        data: Object.values(subjects),
        backgroundColor: Object.keys(subjects).map((subject) => subject === student.weak_subject ? "#ef4444" : "#2563eb"),
        borderRadius: 10,
      }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } },
  });

  renderStudentChart("trend", "performanceLineChart", {
    type: "line",
    data: {
      labels: Object.keys(subjects),
      datasets: [{
        label: `${student.name} Performance`,
        data: Object.values(subjects),
        borderColor: "#14b8a6",
        backgroundColor: "rgba(20,184,166,0.18)",
        fill: true,
        tension: 0.32,
      }],
    },
    options: { responsive: true },
  });

  renderStudentChart("compare", "compareAvgChart", {
    type: "radar",
    data: {
      labels: Object.keys(subjects),
      datasets: [
        {
          label: "Your Marks",
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

async function fetchStudentDashboard(classId = "") {
  const query = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  const payload = await fetchJson(`${API_BASE}/student/dashboard${query}`, {
    headers: authHeaders(),
  });
  renderStudentDashboard(payload);
}

async function downloadStudentMarksPdf() {
  try {
    await downloadFile(
      `${API_BASE}/student/export/pdf?class_id=${encodeURIComponent(studentState.currentClassId)}`,
      "student-marks.pdf"
    );
    showToast("Marks PDF downloaded", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  requireAuth("student");
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("downloadMarksPdfBtn").addEventListener("click", downloadStudentMarksPdf);
  document.getElementById("studentClassSelect").addEventListener("change", async (event) => {
    try {
      await fetchStudentDashboard(event.target.value);
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  try {
    showStatus("dashboardStatus", "Loading your dashboard...", "info");
    await fetchStudentDashboard();
    showStatus("dashboardStatus", "Dashboard updated", "success");
  } catch (error) {
    showStatus("dashboardStatus", error.message, "error");
  }
});
