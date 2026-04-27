const tableBody = document.querySelector(".tasks-table tbody");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskNameInput = document.getElementById("taskNameInput");
const taskStatusInput = document.getElementById("taskStatusInput");
const taskStatusDisplay = document.getElementById("taskStatusDisplay");
const taskTypeInput = document.getElementById("taskTypeInput");
const taskTypeDisplay = document.getElementById("taskTypeDisplay");
const taskDeadlineTrigger = document.getElementById("taskDeadlineTrigger");
const taskPriorityInput = document.getElementById("taskPriorityInput");
const taskDescriptionInput = document.getElementById("taskDescriptionInput");
const tasksTodayCount = document.getElementById("tasksTodayCount");
const inProgressCount = document.getElementById("inProgressCount");
const overdueCount = document.getElementById("overdueCount");
const popover = document.getElementById("deadlinePopover");
const startInput = document.getElementById("startDateInput");
const endInput = document.getElementById("endDateInput");
const saveBtn = document.getElementById("saveDatesBtn");
const closeBtn = document.getElementById("closePopoverBtn");
let activeTrigger = null;
const table = document.querySelector(".tasks-table");
const tableHead = table?.querySelector("thead");
const newTaskRow = tableBody?.querySelector(".new-task-row") || null;
const viewTabs = Array.from(document.querySelectorAll(".view-tab"));
const statusViewTab = document.getElementById("statusViewTab");
const statusFilterPopover = document.getElementById("statusFilterPopover");
const statusViewSelect = document.getElementById("statusViewSelect");
let currentView = "all";
let currentStatusFilter = normalizeText(statusViewSelect?.value || "Не начато");
const STORAGE_KEY = "tasknotify_frontend_state_v1";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCellText(cell) {
  return normalizeText(cell?.textContent || "");
}

function getHeaderTitles() {
  return Array.from(tableHead?.querySelectorAll("th") || []).map((th) => getCellText(th));
}

function getColumnIndexByTitle(title) {
  return getHeaderTitles().findIndex((t) => t === title);
}

function createPill(text, variantClass) {
  const span = document.createElement("span");
  span.className = `pill ${variantClass}`.trim();
  span.textContent = text;
  return span;
}

function renderCellByColumnTitle(td, columnTitle, value) {
  const v = normalizeText(value);
  td.replaceChildren();

  if (!v) return;

  if (columnTitle === "Статус") {
    const cls = v === "Выполнено" ? "done" : v === "В процессе" ? "progress" : "neutral";
    td.appendChild(createPill(v, cls));
    return;
  }

  if (columnTitle === "Приоритет") {
    const cls = v === "Высокий" ? "danger" : v === "Средний" ? "amber" : "mint-outline";
    td.appendChild(createPill(v, cls));
    return;
  }

  if (columnTitle === "Тип задачи") {
    const cls = v === "Доработка" ? "violet" : "mint";
    td.appendChild(createPill(v, cls));
    return;
  }

  td.textContent = v;
}

function setCellValue(td, columnTitle, value) {
  td.dataset.value = normalizeText(value);
  renderCellByColumnTitle(td, columnTitle, td.dataset.value);
  if (columnTitle === "Статус") recomputeCounters();
  persistState();
}

function getCellValue(td) {
  if (!td) return "";
  if (td.dataset.value !== undefined) return td.dataset.value;
  return getCellText(td);
}

function parseIsoDate(value) {
  const v = normalizeText(value);
  if (!v) return null;
  const [y, m, d] = v.split("-").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function recomputeCounters() {
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll("tr")).filter((r) => !r.classList.contains("new-task-row"));
  const total = rows.length;

  const statusIndex = getColumnIndexByTitle("Статус");
  const deadlineIndex = getColumnIndexByTitle("Срок");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let inProgress = 0;
  let overdue = 0;

  for (const row of rows) {
    const statusTd = statusIndex >= 0 ? row.children[statusIndex] : null;
    const status = normalizeText(getCellValue(statusTd));
    if (status === "В процессе") inProgress++;

    const deadlineTd = deadlineIndex >= 0 ? row.children[deadlineIndex] : null;
    const trigger = deadlineTd?.querySelector?.(".date-trigger") || null;
    const endIso = trigger?.dataset?.end || trigger?.dataset?.start || "";
    const endDate = parseIsoDate(endIso);
    if (endDate && endDate < today && status !== "Выполнено") overdue++;
  }

  if (tasksTodayCount) tasksTodayCount.textContent = String(total);
  if (inProgressCount) inProgressCount.textContent = String(inProgress);
  if (overdueCount) overdueCount.textContent = String(overdue);
}

function startInlineEdit(td, columnTitle) {
  if (!td || !columnTitle) return;
  if (td.querySelector("input, select, textarea")) return;
  if (td.closest("tr")?.classList.contains("new-task-row")) return;
  if (columnTitle === "Название задачи" || columnTitle === "Срок") return;

  const currentValue = getCellValue(td);

  const commit = (nextValue) => {
    setCellValue(td, columnTitle, nextValue);
  };

  const cancel = () => {
    renderCellByColumnTitle(td, columnTitle, currentValue);
  };

  td.replaceChildren();

  if (columnTitle === "Описание") {
    const textarea = document.createElement("textarea");
    textarea.className = "cell-textarea";
    textarea.value = currentValue;
    textarea.placeholder = "Добавить описание";
    td.appendChild(textarea);
    textarea.focus();
    textarea.select();

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        textarea.blur();
      }
    });
    textarea.addEventListener("blur", () => commit(textarea.value));
    return;
  }

  const select = document.createElement("select");
  select.className = "cell-select";
  const options =
    columnTitle === "Статус"
      ? ["", "Не начато", "В процессе", "Выполнено"]
      : columnTitle === "Приоритет"
        ? ["", "Низкий", "Средний", "Высокий"]
        : columnTitle === "Тип задачи"
          ? ["", "Запрос фичи", "Доработка"]
          : [""];

  for (const opt of options) {
    const optionEl = document.createElement("option");
    optionEl.value = opt;
    optionEl.textContent = opt || "—";
    select.appendChild(optionEl);
  }

  select.value = currentValue;
  td.appendChild(select);
  select.focus();

  select.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      select.blur();
    }
  });
  select.addEventListener("change", () => commit(select.value));
  select.addEventListener("blur", () => commit(select.value));
}

function resetTaskForm() {
  taskNameInput.value = "";
  if (taskStatusInput) taskStatusInput.value = "Не начато";
  if (taskTypeInput) taskTypeInput.value = "";
  if (taskPriorityInput) taskPriorityInput.value = "";
  if (taskDescriptionInput) taskDescriptionInput.value = "";
  if (taskDeadlineTrigger) {
    taskDeadlineTrigger.dataset.start = "";
    taskDeadlineTrigger.dataset.end = "";
    taskDeadlineTrigger.textContent = formatDateRange("", "");
  }
  syncNewTaskRowEditors();
  addTaskBtn.classList.add("hidden");
}

function syncAddButtonVisibility() {
  const hasTitle = Boolean(taskNameInput.value.trim());
  addTaskBtn.classList.toggle("hidden", !hasTitle);
  newTaskRow?.classList.toggle("is-compact", !hasTitle);
  taskStatusDisplay?.classList.toggle("hidden", !hasTitle);
  taskTypeDisplay?.classList.toggle("hidden", !hasTitle);
  taskDeadlineTrigger?.classList.toggle("hidden", !hasTitle);
  taskPriorityInput?.classList.toggle("hidden", !hasTitle);
  taskDescriptionInput?.classList.toggle("hidden", !hasTitle);
}

function setDisplayValue(displayEl, value, emptyLabel) {
  if (!displayEl) return;
  const v = normalizeText(value);
  const hasValue = Boolean(v);
  displayEl.textContent = hasValue ? v : emptyLabel;
  displayEl.classList.toggle("has-value", hasValue);
}

function collapseEditor({ displayEl, editorEl }) {
  displayEl?.classList.remove("hidden");
  editorEl?.classList.add("is-collapsed");
}

function expandEditor({ displayEl, editorEl }) {
  displayEl?.classList.add("hidden");
  editorEl?.classList.remove("is-collapsed");
}

function syncNewTaskRowEditors() {
  setDisplayValue(taskStatusDisplay, taskStatusInput?.value || "Не начато", "Выбрать статус");
  setDisplayValue(taskTypeDisplay, taskTypeInput?.value || "", "Указать тип");
  collapseEditor({ displayEl: taskStatusDisplay, editorEl: taskStatusInput });
  collapseEditor({ displayEl: taskTypeDisplay, editorEl: taskTypeInput });
}

taskStatusDisplay?.addEventListener("click", () => {
  expandEditor({ displayEl: taskStatusDisplay, editorEl: taskStatusInput });
  taskStatusInput?.focus();
});

taskStatusInput?.addEventListener("change", () => {
  setDisplayValue(taskStatusDisplay, taskStatusInput.value, "Выбрать статус");
});

taskStatusInput?.addEventListener("blur", () => {
  setDisplayValue(taskStatusDisplay, taskStatusInput.value, "Выбрать статус");
  collapseEditor({ displayEl: taskStatusDisplay, editorEl: taskStatusInput });
});

taskTypeDisplay?.addEventListener("click", () => {
  expandEditor({ displayEl: taskTypeDisplay, editorEl: taskTypeInput });
  taskTypeInput?.focus();
  taskTypeInput?.select();
});

taskTypeInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    taskTypeInput.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    taskTypeInput.value = "";
    taskTypeInput.blur();
  }
});

taskTypeInput?.addEventListener("blur", () => {
  setDisplayValue(taskTypeDisplay, taskTypeInput.value, "Указать тип");
  collapseEditor({ displayEl: taskTypeDisplay, editorEl: taskTypeInput });
});

// Ensure initial state for add-row editors.
syncNewTaskRowEditors();
syncAddButtonVisibility();

function incrementCount(counterElement) {
  if (!counterElement) return;
  const currentValue = Number.parseInt(counterElement.textContent || "0", 10);
  const nextValue = Number.isNaN(currentValue) ? 1 : currentValue + 1;
  counterElement.textContent = String(nextValue);
}

function decrementCount(counterElement) {
  if (!counterElement) return;
  const currentValue = Number.parseInt(counterElement.textContent || "0", 10);
  const safeValue = Number.isNaN(currentValue) ? 0 : currentValue;
  counterElement.textContent = String(Math.max(0, safeValue - 1));
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return month + "/" + day + "/" + year;
}

function formatDateRange(startDate, endDate) {
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);
  if (startFormatted && endFormatted) return startFormatted + " - " + endFormatted;
  return endFormatted || startFormatted || "Указать дедлайн";
}

function openPopover(trigger) {
  activeTrigger = trigger;
  startInput.value = trigger.dataset.start || "";
  endInput.value = trigger.dataset.end || "";

  const triggerRect = trigger.getBoundingClientRect();
  const workspaceRect = document.querySelector(".workspace")?.getBoundingClientRect();
  const offsetLeft = workspaceRect ? triggerRect.left - workspaceRect.left : triggerRect.left;
  const offsetTop = workspaceRect ? triggerRect.bottom - workspaceRect.top : triggerRect.bottom;

  popover.style.left = offsetLeft + 12 + "px";
  popover.style.top = offsetTop + 10 + "px";
  popover.classList.remove("hidden");
}

function closePopover() {
  popover.classList.add("hidden");
  activeTrigger = null;
}

function openStatusFilterPopover() {
  if (!statusViewTab || !statusFilterPopover) return;
  const tabRect = statusViewTab.getBoundingClientRect();
  const workspaceRect = document.querySelector(".workspace")?.getBoundingClientRect();
  const offsetLeft = workspaceRect ? tabRect.left - workspaceRect.left : tabRect.left;
  const offsetTop = workspaceRect ? tabRect.bottom - workspaceRect.top : tabRect.bottom;
  statusFilterPopover.style.left = `${offsetLeft}px`;
  statusFilterPopover.style.top = `${offsetTop + 6}px`;
  statusFilterPopover.classList.remove("hidden");
}

function closeStatusFilterPopover() {
  statusFilterPopover?.classList.add("hidden");
}

function getRowsForStorage() {
  if (!tableBody) return [];
  const rows = Array.from(tableBody.querySelectorAll("tr")).filter((r) => !r.classList.contains("new-task-row"));
  const statusIndex = getColumnIndexByTitle("Статус");
  const deadlineIndex = getColumnIndexByTitle("Срок");
  const priorityIndex = getColumnIndexByTitle("Приоритет");
  const typeIndex = getColumnIndexByTitle("Тип задачи");
  const descriptionIndex = getColumnIndexByTitle("Описание");

  return rows.map((row) => {
    const title = normalizeText(row.querySelector(".task-title-wrap span")?.textContent || "");
    const status = normalizeText(getCellValue(statusIndex >= 0 ? row.children[statusIndex] : null));
    const deadlineTd = deadlineIndex >= 0 ? row.children[deadlineIndex] : null;
    const trigger = deadlineTd?.querySelector?.(".date-trigger") || null;
    const priority = normalizeText(getCellValue(priorityIndex >= 0 ? row.children[priorityIndex] : null));
    const taskType = normalizeText(getCellValue(typeIndex >= 0 ? row.children[typeIndex] : null));
    const description = normalizeText(getCellValue(descriptionIndex >= 0 ? row.children[descriptionIndex] : null));

    return {
      title,
      status,
      deadlineStart: trigger?.dataset?.start || "",
      deadlineEnd: trigger?.dataset?.end || "",
      priority,
      taskType,
      description,
    };
  });
}

function persistState() {
  try {
    const payload = {
      view: currentView,
      statusFilter: currentStatusFilter,
      rows: getRowsForStorage(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // Ignore storage errors (quota/private mode).
  }
}

function createTaskRow(taskData) {
  const data = {
    title: normalizeText(taskData?.title || ""),
    status: normalizeText(taskData?.status || "") || "Не начато",
    deadlineStart: taskData?.deadlineStart || "",
    deadlineEnd: taskData?.deadlineEnd || "",
    priority: normalizeText(taskData?.priority || ""),
    taskType: normalizeText(taskData?.taskType || ""),
    description: normalizeText(taskData?.description || ""),
  };
  if (!data.title) return null;

  const row = document.createElement("tr");
  row.dataset.userAdded = "true";

  const titleCell = document.createElement("td");
  const titleWrap = document.createElement("div");
  titleWrap.className = "task-title-wrap";
  const titleText = document.createElement("span");
  titleText.textContent = data.title;
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-danger btn-inline-delete delete-task-btn";
  deleteBtn.textContent = "Удалить";
  titleWrap.appendChild(titleText);
  titleWrap.appendChild(deleteBtn);
  titleCell.appendChild(titleWrap);
  row.appendChild(titleCell);

  const statusCell = document.createElement("td");
  setCellValue(statusCell, "Статус", data.status);
  row.appendChild(statusCell);

  const deadlineCell = document.createElement("td");
  const deadlineBtn = document.createElement("button");
  deadlineBtn.className = "date-trigger";
  deadlineBtn.type = "button";
  deadlineBtn.dataset.start = data.deadlineStart;
  deadlineBtn.dataset.end = data.deadlineEnd;
  deadlineBtn.textContent = formatDateRange(data.deadlineStart, data.deadlineEnd);
  deadlineCell.appendChild(deadlineBtn);
  row.appendChild(deadlineCell);

  const priorityCell = document.createElement("td");
  setCellValue(priorityCell, "Приоритет", data.priority);
  row.appendChild(priorityCell);

  const typeCell = document.createElement("td");
  setCellValue(typeCell, "Тип задачи", data.taskType);
  row.appendChild(typeCell);

  const descriptionCell = document.createElement("td");
  setCellValue(descriptionCell, "Описание", data.description);
  row.appendChild(descriptionCell);

  return row;
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    const storedRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const existingRows = Array.from(tableBody?.querySelectorAll("tr") || []).filter((r) => !r.classList.contains("new-task-row"));
    existingRows.forEach((row) => row.remove());

    for (const item of storedRows) {
      const row = createTaskRow(item);
      if (!row) continue;
      const insertBeforeNode = tableBody.querySelector(".new-task-row");
      tableBody.insertBefore(row, insertBeforeNode || null);
    }

    const storedStatus = normalizeText(parsed.statusFilter || "");
    const allowedStatuses = new Set(["Не начато", "В процессе", "Выполнено"]);
    currentStatusFilter = allowedStatuses.has(storedStatus) ? storedStatus : "Не начато";
    if (statusViewSelect) statusViewSelect.value = currentStatusFilter;

    const storedView = normalizeText(parsed.view || "all");
    currentView = storedView === "status" ? "status" : "all";
  } catch (_) {
    // Ignore parse/storage errors.
  }
}

tableBody.querySelectorAll(".date-trigger").forEach((trigger) => {
  trigger.textContent = formatDateRange(trigger.dataset.start, trigger.dataset.end);
});

// Initialize existing rows so editable columns render consistently.
(() => {
  if (!tableBody) return;
  const headers = Array.from(tableHead?.querySelectorAll("th") || []);
  const headerTitles = headers.map((th) => getCellText(th));

  const editable = new Set(["Статус", "Приоритет", "Тип задачи", "Описание"]);
  const rows = Array.from(tableBody.querySelectorAll("tr")).filter((r) => !r.classList.contains("new-task-row"));

  for (const row of rows) {
    const cells = Array.from(row.children);
    for (let i = 0; i < cells.length; i++) {
      const title = headerTitles[i];
      if (!editable.has(title)) continue;
      const td = cells[i];
      const value = getCellText(td);
      setCellValue(td, title, value);
    }
  }
})();

loadPersistedState();
recomputeCounters();
applyViewFilter();
setActiveView(currentView);

function getRowStatus(row) {
  const statusIndex = getColumnIndexByTitle("Статус");
  if (statusIndex < 0) return "";
  return normalizeText(getCellValue(row.children[statusIndex]));
}

function applyViewFilter() {
  if (!tableBody) return;
  const rows = Array.from(tableBody.querySelectorAll("tr")).filter((r) => !r.classList.contains("new-task-row"));

  for (const row of rows) {
    let visible = true;
    const rowStatus = getRowStatus(row);

    if (currentView === "status") {
      visible = rowStatus === currentStatusFilter;
    }

    row.classList.toggle("hidden", !visible);
  }
}

function setActiveView(nextView) {
  currentView = nextView;
  for (const tab of viewTabs) {
    tab.classList.toggle("active", tab.dataset.view === nextView);
  }
  if (nextView === "status") {
    openStatusFilterPopover();
  } else {
    closeStatusFilterPopover();
  }
  applyViewFilter();
  persistState();
}

viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const nextView = normalizeText(tab.dataset.view) || "all";
    setActiveView(nextView);
  });
});

statusViewSelect?.addEventListener("change", () => {
  currentStatusFilter = normalizeText(statusViewSelect.value || "Не начато");
  if (currentView !== "status") {
    setActiveView("status");
    closeStatusFilterPopover();
    return;
  }
  applyViewFilter();
  persistState();
  closeStatusFilterPopover();
});

tableBody.addEventListener("click", (event) => {
  const deleteBtn = event.target.closest(".delete-task-btn");
  if (deleteBtn) {
    const row = deleteBtn.closest("tr");
    if (row) {
      if (activeTrigger && row.contains(activeTrigger)) closePopover();
      row.remove();
      recomputeCounters();
      persistState();
    }
    return;
  }

  const trigger = event.target.closest(".date-trigger");
  if (!trigger) return;
  event.stopPropagation();
  openPopover(trigger);
});

// Inline editing for table columns (except task title and deadlines).
tableBody.addEventListener("click", (event) => {
  if (event.target.closest(".date-trigger")) return;
  if (event.target.closest(".delete-task-btn")) return;

  const td = event.target.closest("td");
  if (!td) return;
  const row = td.closest("tr");
  if (!row || row.classList.contains("new-task-row")) return;

  const colIndex = Array.from(row.children).indexOf(td);
  const headers = Array.from(tableHead?.querySelectorAll("th") || []);
  const columnTitle = getCellText(headers[colIndex]);
  startInlineEdit(td, columnTitle);
});

saveBtn.addEventListener("click", () => {
  if (!activeTrigger) return;
  activeTrigger.dataset.start = startInput.value;
  activeTrigger.dataset.end = endInput.value;
  activeTrigger.textContent = formatDateRange(startInput.value, endInput.value);
  closePopover();
  recomputeCounters();
  persistState();
});

closeBtn.addEventListener("click", closePopover);

addTaskBtn.addEventListener("click", () => {
  const title = taskNameInput.value.trim();
  if (!title) {
    taskNameInput.focus();
    syncAddButtonVisibility();
    return;
  }

  const selectedStatus = normalizeText(taskStatusInput?.value || "") || "Не начато";
  const typedTaskType = normalizeText(taskTypeInput?.value || "");
  const selectedPriority = normalizeText(taskPriorityInput?.value || "");
  const typedDescription = normalizeText(taskDescriptionInput?.value || "");
  const deadlineStart = taskDeadlineTrigger?.dataset?.start || "";
  const deadlineEnd = taskDeadlineTrigger?.dataset?.end || "";

  const row = createTaskRow({
    title,
    status: selectedStatus,
    deadlineStart,
    deadlineEnd,
    priority: selectedPriority,
    taskType: typedTaskType,
    description: typedDescription,
  });
  if (!row) return;

  const insertBeforeNode = tableBody.querySelector(".new-task-row");
  tableBody.insertBefore(row, insertBeforeNode || null);

  recomputeCounters();
  applyViewFilter();
  persistState();

  resetTaskForm();
  taskNameInput.focus();
});

document.addEventListener("click", (event) => {
  if (popover.classList.contains("hidden")) return;
  if (!popover.contains(event.target)) closePopover();
});

document.addEventListener("click", (event) => {
  if (statusFilterPopover?.classList.contains("hidden")) return;
  if (statusFilterPopover.contains(event.target)) return;
  if (statusViewTab?.contains(event.target)) return;
  closeStatusFilterPopover();
});

taskNameInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addTaskBtn.click();
});

taskNameInput.addEventListener("input", syncAddButtonVisibility);
