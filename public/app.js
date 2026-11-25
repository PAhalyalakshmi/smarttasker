const taskList = document.querySelector("#taskList");
const taskDialog = document.querySelector("#taskDialog");
const taskForm = document.querySelector("#taskForm");
const deleteDialog = document.querySelector("#deleteDialog");
const toast = document.querySelector("#toast");

let tasks = [];
let activeFilter = "all";
let editingId = null;
let deletingId = null;
let toastTimeout;

const priorityOrder = { high: 0, medium: 1, low: 2 };
const statusLabels = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Completed",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }
  return data;
}

function showToast(message, kind = "success") {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `toast is-visible${kind === "error" ? " is-error" : ""}`;
  toastTimeout = window.setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function getLocalDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  const todayKey = getLocalDateKey(new Date());
  const dueKey = getLocalDateKey(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);

  if (dueKey === todayKey) return "Today";
  if (dueKey === tomorrowKey) return "Tomorrow";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function isOverdue(task) {
  return task.status !== "done" && task.dueDate && getLocalDateKey(task.dueDate) < getLocalDateKey(new Date());
}

function renderTask(task) {
  const dueLabel = formatDueDate(task.dueDate);
  const dueClass = isOverdue(task) ? "task-due is-overdue" : "task-due";
  const checked = task.status === "done";
  const description = task.description
    ? `<p class="task-description">${escapeHtml(task.description)}</p>`
    : "";

  return `
    <article class="task-card${checked ? " is-complete" : ""}" data-id="${escapeHtml(task._id)}">
      <button class="task-check${checked ? " is-checked" : ""}" data-action="toggle" type="button" aria-label="${checked ? "Mark as to do" : "Mark as complete"}">
        ${checked ? "✓" : ""}
      </button>
      <div class="task-content">
        <div class="task-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="priority-pill priority-${escapeHtml(task.priority)}">
            <span aria-hidden="true">●</span> ${escapeHtml(task.priority)} priority
          </span>
        </div>
        ${description}
        <div class="task-meta">
          <span class="category-pill"><span aria-hidden="true">◇</span> ${escapeHtml(task.category || "General")}</span>
          <span class="${dueClass}"><span aria-hidden="true">◷</span> ${escapeHtml(dueLabel)}</span>
          <span class="status-pill status-${escapeHtml(task.status)}">${escapeHtml(statusLabels[task.status] || "To do")}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action" data-action="edit" type="button" aria-label="Edit ${escapeHtml(task.title)}" title="Edit task">✎</button>
        <button class="task-action task-action-delete" data-action="delete" type="button" aria-label="Delete ${escapeHtml(task.title)}" title="Delete task">×</button>
      </div>
    </article>
  `;
}

function getVisibleTasks() {
  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const priority = document.querySelector("#priorityFilter").value;
  const sortBy = document.querySelector("#sortSelect").value;

  const visible = tasks.filter((task) => {
    const matchesStatus = activeFilter === "all" || task.status === activeFilter;
    const matchesPriority = priority === "all" || task.priority === priority;
    const searchableText = `${task.title} ${task.description || ""} ${task.category || ""}`.toLowerCase();
    return matchesStatus && matchesPriority && searchableText.includes(search);
  });

  visible.sort((first, second) => {
    if (sortBy === "priority") {
      return priorityOrder[first.priority] - priorityOrder[second.priority];
    }
    if (sortBy === "created") {
      return new Date(second.createdAt) - new Date(first.createdAt);
    }
    if (!first.dueDate) return 1;
    if (!second.dueDate) return -1;
    return new Date(first.dueDate) - new Date(second.dueDate);
  });
  return visible;
}

function renderStats() {
  const completed = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  document.querySelector("#statTotal").textContent = tasks.length;
  document.querySelector("#statCompleted").textContent = completed;
  document.querySelector("#statInProgress").textContent = inProgress;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressFill").style.width = `${percent}%`;
  document.querySelector("#progressTrack").setAttribute("aria-valuenow", percent);
  document.querySelector("#allCount").textContent = tasks.length;
  document.querySelector("#todoCount").textContent = todo;
  document.querySelector("#progressCount").textContent = inProgress;
  document.querySelector("#doneCount").textContent = completed;
}

function renderTasks() {
  const visible = getVisibleTasks();
  document.querySelector("#visibleCount").textContent = visible.length;

  if (!visible.length) {
    const hasFilters =
      document.querySelector("#searchInput").value.trim() ||
      document.querySelector("#priorityFilter").value !== "all" ||
      activeFilter !== "all";
    taskList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" aria-hidden="true">${hasFilters ? "⌕" : "✦"}</span>
        <h3>${hasFilters ? "No tasks match those filters" : "A fresh page, full of possibility"}</h3>
        <p>${hasFilters ? "Try changing your search or filters." : "Create your first task and start building momentum."}</p>
        ${hasFilters ? "" : '<button class="primary-button" data-action="create" type="button">＋ Create your first task</button>'}
      </div>
    `;
    return;
  }

  taskList.innerHTML = visible.map(renderTask).join("");
}

function render() {
  renderStats();
  renderTasks();
}

async function loadTasks() {
  taskList.innerHTML = '<div class="loading-state"><span class="loading-spinner"></span>Getting your tasks ready…</div>';
  try {
    const result = await request("/api/tasks");
    if (!Array.isArray(result)) throw new Error("The task service returned an unexpected response.");
    tasks = result;
    render();
  } catch (error) {
    taskList.innerHTML = `
      <div class="error-state">
        <span class="empty-state-icon" aria-hidden="true">!</span>
        <h3>We couldn’t load your tasks</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="secondary-button" data-action="reload" type="button">Try again</button>
      </div>
    `;
    showToast("Could not connect to the task service.", "error");
  }
}

function dateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return getLocalDateKey(date);
}

function openTaskDialog(task = null) {
  editingId = task?._id || null;
  taskForm.reset();
  taskForm.elements.category.value = task?.category || "";
  taskForm.elements.title.value = task?.title || "";
  taskForm.elements.description.value = task?.description || "";
  taskForm.elements.dueDate.value = dateForInput(task?.dueDate);
  taskForm.elements.priority.value = task?.priority || "medium";
  taskForm.elements.status.value = task?.status || "todo";
  document.querySelector("#modalTitle").textContent = task ? "Edit task" : "Create a task";
  document.querySelector("#saveTaskButton").textContent = task ? "Save changes" : "Create task";
  taskDialog.showModal();
  taskForm.elements.title.focus();
}

async function saveTask(event) {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const payload = Object.fromEntries(formData.entries());
  if (!payload.dueDate) payload.dueDate = null;

  const saveButton = document.querySelector("#saveTaskButton");
  saveButton.disabled = true;
  saveButton.textContent = editingId ? "Saving…" : "Creating…";

  try {
    const path = editingId ? `/api/tasks/${encodeURIComponent(editingId)}` : "/api/tasks";
    await request(path, {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    taskDialog.close();
    await loadTasks();
    showToast(editingId ? "Task updated." : "Task created.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = editingId ? "Save changes" : "Create task";
  }
}

async function updateTask(id, changes) {
  try {
    await request(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    await loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteTask() {
  if (!deletingId) return;
  const id = deletingId;
  const button = document.querySelector("#confirmDelete");
  button.disabled = true;
  try {
    await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    deleteDialog.close();
    deletingId = null;
    await loadTasks();
    showToast("Task deleted.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function setActiveFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
  renderTasks();
}

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
}

document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
    closeMobileMenu();
  });
});

document.querySelectorAll("#topCreate, #sidebarCreate, #welcomeCreate, #sectionCreate").forEach((button) => {
  button.addEventListener("click", () => openTaskDialog());
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  });
});

taskForm.addEventListener("submit", saveTask);
document.querySelector("#confirmDelete").addEventListener("click", deleteTask);
taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  if (button.dataset.action === "create") {
    openTaskDialog();
    return;
  }
  if (button.dataset.action === "reload") {
    loadTasks();
    return;
  }

  const card = button.closest("[data-id]");
  const task = tasks.find((item) => item._id === card?.dataset.id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    await updateTask(task._id, { status: task.status === "done" ? "todo" : "done" });
  } else if (button.dataset.action === "edit") {
    openTaskDialog(task);
  } else if (button.dataset.action === "delete") {
    deletingId = task._id;
    deleteDialog.showModal();
  }
});

document.querySelector("#searchInput").addEventListener("input", renderTasks);
document.querySelector("#priorityFilter").addEventListener("change", renderTasks);
document.querySelector("#sortSelect").addEventListener("change", renderTasks);

document.querySelector("#themeToggle").addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("smarttasker-theme", isDark ? "dark" : "light");
  document.querySelector("#themeIcon").textContent = isDark ? "☀" : "☾";
  document.querySelector("#themeToggle").setAttribute(
    "aria-label",
    `Switch to ${isDark ? "light" : "dark"} theme`
  );
});

document.querySelector("#mobileMenu").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});
document.querySelector("#sidebarBackdrop").addEventListener("click", closeMobileMenu);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (event.key.toLowerCase() === "n" && !isTyping && !taskDialog.open && !deleteDialog.open) {
    event.preventDefault();
    openTaskDialog();
  }
  if (event.key === "/" && !isTyping && !taskDialog.open && !deleteDialog.open) {
    event.preventDefault();
    document.querySelector("#searchInput").focus();
  }
});

if (localStorage.getItem("smarttasker-theme") === "dark") {
  document.body.classList.add("dark-theme");
  document.querySelector("#themeIcon").textContent = "☀";
  document.querySelector("#themeToggle").setAttribute("aria-label", "Switch to light theme");
}

loadTasks();