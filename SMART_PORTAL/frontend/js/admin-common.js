const adminPageState = {
  currentClassId: "",
  currentUploadDate: "",
  availableClasses: [],
  uploadDates: [],
  latestUpload: null,
};

function getSelectionParams(extra = {}) {
  const params = new URLSearchParams();
  const classId = extra.class_id ?? adminPageState.currentClassId;
  const uploadDate = extra.upload_date ?? adminPageState.currentUploadDate;

  if (classId) {
    params.set("class_id", classId);
  } else if (uploadDate) {
    params.set("upload_date", uploadDate);
  }

  Object.entries(extra).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || key === "class_id" || key === "upload_date") {
      return;
    }
    params.set(key, value);
  });

  return params;
}

function setPageSelection({ classId = "", uploadDate = "" } = {}) {
  adminPageState.currentClassId = classId;
  adminPageState.currentUploadDate = uploadDate;
}

function updateUrlSelection() {
  const params = getSelectionParams();
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", nextUrl);
}

function populateUploadDateSelect(select, uploadDates = [], selectedDate = "") {
  if (!select) return;
  select.innerHTML = '<option value="">Latest Upload</option>';
  uploadDates.forEach((dateValue) => {
    const option = document.createElement("option");
    option.value = dateValue;
    option.textContent = dateValue;
    option.selected = dateValue === selectedDate;
    select.appendChild(option);
  });
}

function populateComparisonSelect(select, classes = [], selectedValue = "") {
  if (!select) return;
  select.innerHTML = "";
  classes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.class_id;
    option.textContent = `${item.class_name} | ${formatDateTime(item.uploaded_at)}`;
    option.selected = item.class_id === selectedValue;
    select.appendChild(option);
  });
}

function populateSubjectSelect(select, subjects = []) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">All Subjects</option>';
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    option.selected = subject === current;
    select.appendChild(option);
  });
}

function activateAdminNav(activePage) {
  document.querySelectorAll("[data-admin-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.adminPage === activePage);
  });
}

function syncAdminContext(payload = {}) {
  const selectedClass = payload.selected_class || payload.class || payload.summary || {};
  adminPageState.availableClasses = payload.available_classes || adminPageState.availableClasses;
  adminPageState.uploadDates = payload.upload_dates || adminPageState.uploadDates;
  adminPageState.latestUpload = payload.latest_upload || adminPageState.latestUpload;
  adminPageState.currentClassId = selectedClass.class_id || payload.class?.class_id || payload.summary?.class_id || adminPageState.currentClassId;
  adminPageState.currentUploadDate = selectedClass.uploaded_date || payload.class?.uploaded_date || payload.summary?.uploaded_date || adminPageState.currentUploadDate;

  document.querySelectorAll("[data-class-select]").forEach((select) => {
    populateClassSelect(select, adminPageState.availableClasses, adminPageState.currentClassId);
  });
  document.querySelectorAll("[data-upload-date-select]").forEach((select) => {
    populateUploadDateSelect(select, adminPageState.uploadDates, adminPageState.currentUploadDate);
  });
  document.querySelectorAll("[data-compare-class-select]").forEach((select) => {
    populateComparisonSelect(select, adminPageState.availableClasses, select.value || "");
  });
  document.querySelectorAll("[data-subject-select]").forEach((select) => {
    populateSubjectSelect(select, selectedClass.subjects || []);
  });

  const latestEl = document.getElementById("latestUploadMeta");
  if (latestEl) {
    latestEl.textContent = adminPageState.latestUpload?.uploaded_at
      ? `Latest upload: ${formatDateTime(adminPageState.latestUpload.uploaded_at)}`
      : "No uploads available";
  }

  updateUrlSelection();
}

async function fetchAdminJson(path, params = {}) {
  const query = getSelectionParams(params).toString();
  return fetchJson(`${API_BASE}${path}${query ? `?${query}` : ""}`, { headers: authHeaders() });
}

function bindAdminSelectors(onChange) {
  document.querySelectorAll("[data-class-select]").forEach((select) => {
    select.addEventListener("change", () => {
      setPageSelection({ classId: select.value, uploadDate: "" });
      onChange?.();
    });
  });

  document.querySelectorAll("[data-upload-date-select]").forEach((select) => {
    select.addEventListener("change", () => {
      setPageSelection({ classId: "", uploadDate: select.value });
      onChange?.();
    });
  });
}

function initAdminFrame(activePage, onSelectionChange) {
  const user = requireAuth("admin");
  document.querySelectorAll("[data-welcome-name]").forEach((el) => {
    el.textContent = user.name;
  });
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", logout);
  });

  activateAdminNav(activePage);

  const urlParams = new URLSearchParams(window.location.search);
  setPageSelection({
    classId: urlParams.get("class_id") || "",
    uploadDate: urlParams.get("upload_date") || "",
  });

  bindAdminSelectors(onSelectionChange);
}

function renderUploadHistoryList(items = [], targetId = "uploadHistoryList") {
  const list = document.getElementById(targetId);
  if (!list) return;
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = '<li class="empty-state">No uploads available yet.</li>';
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = item.is_latest ? "history-item latest" : "history-item";
    row.innerHTML = `
      <div>
        <strong>${item.class_name}</strong>
        <small>${formatDateTime(item.uploaded_at)}</small>
      </div>
      <span class="badge">${item.student_count} students</span>
    `;
    list.appendChild(row);
  });
}
