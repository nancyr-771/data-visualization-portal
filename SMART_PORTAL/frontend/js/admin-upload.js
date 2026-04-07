async function loadUploadPage() {
  showStatus("uploadStatus", "Loading uploads...", "info");
  const payload = await fetchAdminJson("/api/uploads/history");
  syncAdminContext(payload);
  renderUploadHistoryList(payload.history || [], "uploadHistoryList");
  showStatus("uploadStatus", "Upload history ready.", "success");
}

async function handleUploadSubmit(event) {
  event.preventDefault();
  const fileInput = document.getElementById("uploadFile");
  const classNameInput = document.getElementById("uploadClassName");
  const button = document.getElementById("uploadSubmitBtn");

  if (!fileInput.files.length) {
    showStatus("uploadStatus", "Choose a file before uploading.", "error");
    return;
  }

  setButtonLoading(button, true, "Uploading...", "Upload Snapshot");
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("class_name", classNameInput.value.trim());

  try {
    const payload = await fetchJson(`${API_BASE}/upload_data`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    syncAdminContext(payload);
    renderUploadHistoryList(payload.upload_history || [], "uploadHistoryList");
    classNameInput.value = "";
    fileInput.value = "";
    showStatus("uploadStatus", `Upload completed for ${payload.class_name}.`, "success");
  } catch (error) {
    showStatus("uploadStatus", error.message, "error");
  } finally {
    setButtonLoading(button, false, "Uploading...", "Upload Snapshot");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initAdminFrame("upload", loadUploadPage);
  document.getElementById("uploadForm").addEventListener("submit", handleUploadSubmit);

  try {
    await loadUploadPage();
  } catch (error) {
    showStatus("uploadStatus", error.message, "error");
  }
});
