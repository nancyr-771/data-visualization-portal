function renderReportStudents(targetId, rows = [], emptyMessage) {
  const list = document.getElementById(targetId);
  list.innerHTML = "";
  if (!rows.length) {
    list.innerHTML = `<li class="empty-state">${emptyMessage}</li>`;
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${row.name}</span><strong>${formatNumber(row.average ?? row.total)} | #${row.rank}</strong>`;
    list.appendChild(item);
  });
}

async function loadReportsPage() {
  showStatus("reportsStatus", "Loading reports...", "info");
  const payload = await fetchAdminJson("/api/students/filter", {
    subject: document.getElementById("reportSubjectFilter").value,
    grade: document.getElementById("reportGradeFilter").value,
    min_marks: document.getElementById("reportMinMarks").value,
    max_marks: document.getElementById("reportMaxMarks").value,
  });
  syncAdminContext(payload);

  document.getElementById("reportsPageTitle").textContent = payload.analytics.summary.class_name || "Reports";
  document.getElementById("reportsMeta").textContent = payload.analytics.summary.uploaded_at
    ? `Snapshot: ${formatDateTime(payload.analytics.summary.uploaded_at)}`
    : "No snapshot selected";
  renderReportStudents("topStudentsList", payload.analytics.top_students || [], "No top students found.");
  renderReportStudents("bottomStudentsList", payload.analytics.bottom_students || [], "No low performers found.");
  showStatus("reportsStatus", "Reports updated.", "success");
}

async function downloadReportFile(format) {
  try {
    const query = getSelectionParams({
      subject: document.getElementById("reportSubjectFilter").value,
      grade: document.getElementById("reportGradeFilter").value,
      min_marks: document.getElementById("reportMinMarks").value,
      max_marks: document.getElementById("reportMaxMarks").value,
    }).toString();
    await downloadFile(`${API_BASE}/admin/export/${format}${query ? `?${query}` : ""}`, `report.${format === "excel" ? "xlsx" : "pdf"}`);
    showStatus("reportsStatus", `${format.toUpperCase()} export downloaded.`, "success");
  } catch (error) {
    showStatus("reportsStatus", error.message, "error");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initAdminFrame("reports", loadReportsPage);
  document.getElementById("downloadPdfBtn").addEventListener("click", () => downloadReportFile("pdf"));
  document.getElementById("downloadExcelBtn").addEventListener("click", () => downloadReportFile("excel"));
  document.getElementById("reportsFilterForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadReportsPage();
  });

  try {
    await loadReportsPage();
  } catch (error) {
    showStatus("reportsStatus", error.message, "error");
  }
});
