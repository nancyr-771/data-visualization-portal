let studentCharts = {};

function destroyStudentChart(id) {
  if (studentCharts[id]) {
    studentCharts[id].destroy();
    delete studentCharts[id];
  }
}

function renderStudentDashboard(payload) {
  const student = payload.student;
  const subjects = student.subjects;

  document.getElementById("studentName").textContent = student.name;
  document.getElementById("rank").textContent = student.rank;
  document.getElementById("bestSubject").textContent = student.best_subject;
  document.getElementById("studentAvg").textContent = student.average;
  document.getElementById("classAvg").textContent = payload.class.class_average;

  destroyStudentChart("subjectMarksChart");
  destroyStudentChart("performanceLineChart");
  destroyStudentChart("compareAvgChart");

  studentCharts.subjectMarksChart = new Chart(document.getElementById("subjectMarksChart"), {
    type: "bar",
    data: {
      labels: Object.keys(subjects),
      datasets: [{
        label: "Marks",
        data: Object.values(subjects),
        backgroundColor: "rgba(31,111,235,0.75)",
      }],
    },
  });

  studentCharts.performanceLineChart = new Chart(document.getElementById("performanceLineChart"), {
    type: "line",
    data: {
      labels: Object.keys(subjects),
      datasets: [{
        label: `${student.name} Performance`,
        data: Object.values(subjects),
        borderColor: "#188038",
        fill: false,
        tension: 0.2,
      }],
    },
  });

  studentCharts.compareAvgChart = new Chart(document.getElementById("compareAvgChart"), {
    type: "bar",
    data: {
      labels: ["Student Average", "Class Average"],
      datasets: [{
        label: "Average Comparison",
        data: [payload.comparison.student_average, payload.comparison.class_average],
        backgroundColor: ["#1f6feb", "#d98600"],
      }],
    },
  });
}

async function fetchStudentDashboard() {
  showStatus("dashboardStatus", "Loading dashboard data...", "info");

  try {
    const res = await fetch(`${API_BASE}/student/dashboard`, {
      headers: authHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch dashboard");
    }

    renderStudentDashboard(data);
    showStatus("dashboardStatus", "Dashboard updated", "success");
  } catch (err) {
    showStatus("dashboardStatus", err.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth("student");
  document.getElementById("welcome").textContent = `Welcome, ${user.name}`;

  document.getElementById("logoutBtn").addEventListener("click", logout);
  fetchStudentDashboard();
});
