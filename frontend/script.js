const API_BASE = "http://127.0.0.1:8000";

// Questions can be written in Sinhala, but answers must always come back in English.
const ANSWER_LANG_NOTE = "\n\n[Instruction: Answer in English only, even if the question is written in Sinhala.]";

// Removes the instruction above when old chat history is shown, so users only see their own question.
function stripLangNote(text) {
  return (text || "").replace(/\s*\[Instruction: Answer in English only[^\]]*\]\s*$/, "");
}

// ---------- Auth elements ----------
const authScreen = document.getElementById("authScreen");
const mainApp = document.getElementById("mainApp");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authSubmitLabel = document.getElementById("authSubmitLabel");
const authError = document.getElementById("authError");
const authSubtitle = document.getElementById("authSubtitle");
const authSwitchText = document.getElementById("authSwitchText");
const authSwitchBtn = document.getElementById("authSwitchBtn");
const authEyeBtn = document.getElementById("authEyeBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const greetingTitle = document.getElementById("greetingTitle");

// ---------- App elements ----------
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const docList = document.getElementById("docList");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const questionInput = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const activeDocTitle = document.getElementById("activeDocTitle");
const activeDocSubtitle = document.getElementById("activeDocSubtitle");
const quizBtn = document.getElementById("quizBtn");
const quizOverlay = document.getElementById("quizOverlay");
const quizClose = document.getElementById("quizClose");
const quizBody = document.getElementById("quizBody");
const subjectInput = document.getElementById("subjectInput");
const navItems = document.querySelectorAll(".nav-item");
const viewHome = document.getElementById("viewHome");
const viewPlanner = document.getElementById("viewPlanner");
const viewSettings = document.getElementById("viewSettings");
const plannerForm = document.getElementById("plannerForm");
const plannerTaskInput = document.getElementById("plannerTaskInput");
const plannerDateInput = document.getElementById("plannerDateInput");
const plannerList = document.getElementById("plannerList");
const settingsAvatar = document.getElementById("settingsAvatar");
const settingsName = document.getElementById("settingsName");
const settingsEmail = document.getElementById("settingsEmail");
const clearPlannerBtn = document.getElementById("clearPlannerBtn");
const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");
const searchInput = document.getElementById("searchInput");
const notifBtn = document.getElementById("notifBtn");
const notifBadge = document.getElementById("notifBadge");
const notifDropdown = document.getElementById("notifDropdown");
const notifList = document.getElementById("notifList");
const themeToggle = document.getElementById("themeToggle");
const viewFlashcards = document.getElementById("viewFlashcards");
const genFlashcardsBtn = document.getElementById("genFlashcardsBtn");
const flashcardsGrid = document.getElementById("flashcardsGrid");

// Keep the documents list in the browser session: { id, filename, subject }
let documents = [];
let activeDocId = null;
let isRegisterMode = false;
let currentUserEmail = null;
let notifications = [];

// ---------- Auth: token helpers ----------

function getToken() {
  return localStorage.getItem("studydesk_token");
}

function setToken(token) {
  localStorage.setItem("studydesk_token", token);
}

function clearToken() {
  localStorage.removeItem("studydesk_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------- Auth: password visibility toggle ----------

authEyeBtn.addEventListener("click", () => {
  const isHidden = authPassword.type === "password";
  authPassword.type = isHidden ? "text" : "password";
});

// ---------- Auth: screen switching ----------

function showAuthScreen() {
  authScreen.hidden = false;
  mainApp.hidden = true;
}

function showMainApp() {
  authScreen.hidden = true;
  mainApp.hidden = false;
}

authSwitchBtn.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  authError.hidden = true;

  if (isRegisterMode) {
    authSubtitle.textContent = "Create a new account";
    authSubmitLabel.textContent = "Register";
    authSwitchText.textContent = "Already have an account?";
    authSwitchBtn.textContent = "Login";
  } else {
    authSubtitle.textContent = "Your AI assistant for exam notes";
    authSubmitLabel.textContent = "Login";
    authSwitchText.textContent = "Don't have an account?";
    authSwitchBtn.textContent = "Register";
  }
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const endpoint = isRegisterMode ? "/auth/register" : "/auth/login";

  authSubmitBtn.disabled = true;
  const originalLabel = authSubmitLabel.textContent;
  authSubmitLabel.textContent = "Please wait...";

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Something went wrong");
    }

    setToken(data.access_token);
    authPassword.value = "";
    startApp(data.email);
  } catch (err) {
    authError.textContent = err.message;
    authError.hidden = false;
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitLabel.textContent = originalLabel;
  }
});

logoutBtn.addEventListener("click", () => {
  const confirmed = confirm("Log out?");
  if (!confirmed) return;
  clearToken();
  documents = [];
  activeDocId = null;
  showAuthScreen();
});

// ---------- Sidebar nav ----------

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.nav;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    viewHome.hidden = true;
    viewPlanner.hidden = true;
    viewSettings.hidden = true;
    viewFlashcards.hidden = true;

    if (target === "home" || target === "notes") {
      viewHome.hidden = false;
      if (target === "notes") {
        docList.closest(".doc-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else if (target === "quizzes") {
      viewHome.hidden = false;
      if (activeDocId) {
        quizBtn.click();
      } else {
        alert("Please select a note from the sidebar first, then you can generate a quiz.");
      }
    } else if (target === "flashcards") {
      viewFlashcards.hidden = false;
    } else if (target === "planner") {
      viewPlanner.hidden = false;
      renderPlanner();
    } else if (target === "settings") {
      viewSettings.hidden = false;
      renderSettings();
    }
  });
});

// ---------- App start (after login confirmed) ----------

function setUserDisplay(email) {
  if (!email) return;
  currentUserEmail = email;
  const namePart = email.split("@")[0];
  const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  userAvatar.textContent = displayName.charAt(0).toUpperCase();
  userName.textContent = displayName;
  greetingTitle.textContent = `Welcome back, ${displayName}! 👋`;
}

function decodeTokenEmail(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.email;
  } catch (err) {
    return null;
  }
}

function startApp(email) {
  showMainApp();
  const resolvedEmail = email || decodeTokenEmail(getToken());
  if (resolvedEmail) setUserDisplay(resolvedEmail);
  loadDocuments();
  loadNotifications();
  renderNotifications();
}

// Check whether a token is already saved when the page loads
if (getToken()) {
  startApp();
} else {
  showAuthScreen();
}

// ---------- Load existing documents on page load ----------

async function loadDocuments() {
  try {
    const res = await fetch(`${API_BASE}/pdf/documents`, {
      headers: { ...authHeaders() },
    });

    if (res.status === 401) {
      clearToken();
      showAuthScreen();
      return;
    }

    if (!res.ok) return;

    const data = await res.json();
    documents = data;
    renderDocList();
  } catch (err) {
    console.error("Failed to load documents:", err);
  }
}

// ---------- Upload handling ----------

uploadZone.addEventListener("click", () => fileInput.click());

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    uploadFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    uploadFile(fileInput.files[0]);
  }
});

async function uploadFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    alert("Only PDF files can be uploaded.");
    return;
  }

  uploadZone.classList.add("dragover");
  const originalLabel = uploadZone.querySelector(".upload-label").textContent;
  uploadZone.querySelector(".upload-label").textContent = "Uploading...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("subject", subjectInput.value.trim() || "General");

  try {
    const res = await fetch(`${API_BASE}/pdf/upload`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    });

    if (res.status === 401) {
      clearToken();
      showAuthScreen();
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Upload failed");
    }

    const data = await res.json();
    addDocument(data.id, data.filename, data.subject);
    selectDocument(data.id);
    addNotification(`"${data.filename}" uploaded and ready!`);
  } catch (err) {
    alert("Upload error: " + err.message);
  } finally {
    uploadZone.classList.remove("dragover");
    uploadZone.querySelector(".upload-label").textContent = originalLabel;
    fileInput.value = "";
  }
}

function addDocument(id, filename, subject) {
  documents.push({ id, filename, subject: subject || "General" });
  renderDocList();
}

function renderDocList() {
  const searchTerm = (searchInput.value || "").trim().toLowerCase();
  const filtered = searchTerm
    ? documents.filter(
        (d) =>
          d.filename.toLowerCase().includes(searchTerm) ||
          (d.subject || "").toLowerCase().includes(searchTerm)
      )
    : documents;

  if (documents.length === 0) {
    docList.innerHTML = `<li class="doc-empty">No PDF uploaded yet</li>`;
    return;
  }

  if (filtered.length === 0) {
    docList.innerHTML = `<li class="doc-empty">No notes match "${escapeHtml(searchTerm)}"</li>`;
    return;
  }

  const grouped = {};
  filtered.forEach((doc) => {
    const subject = doc.subject || "General";
    if (!grouped[subject]) grouped[subject] = [];
    grouped[subject].push(doc);
  });

  docList.innerHTML = "";

  Object.keys(grouped).forEach((subject) => {
    const groupTitle = document.createElement("li");
    groupTitle.className = "subject-group-title";
    groupTitle.textContent = subject;
    groupTitle.style.listStyle = "none";
    docList.appendChild(groupTitle);

    grouped[subject].forEach((doc) => {
      const li = document.createElement("li");
      li.className = "doc-item" + (doc.id === activeDocId ? " active" : "");
      li.tabIndex = 0;
      li.innerHTML = `
        <span class="doc-item-dot">PDF</span>
        <span class="doc-item-name">${escapeHtml(doc.filename)}</span>
        <button class="doc-item-delete" title="Delete" aria-label="Delete document">×</button>
      `;
      li.addEventListener("click", () => selectDocument(doc.id));

      const deleteBtn = li.querySelector(".doc-item-delete");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteDocument(doc.id);
      });

      docList.appendChild(li);
    });
  });
}

searchInput.addEventListener("input", renderDocList);

async function deleteDocument(id) {
  const confirmed = confirm("Delete this PDF? This cannot be undone.");
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/pdf/documents/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });

    if (res.status === 401) {
      clearToken();
      showAuthScreen();
      return;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to delete");
    }

    documents = documents.filter((d) => d.id !== id);
    renderDocList();

    if (activeDocId === id) {
      activeDocId = null;
      activeDocTitle.textContent = "Select a note";
      activeDocSubtitle.textContent = "Upload a PDF from the sidebar, then ask any question";
      questionInput.disabled = true;
      sendBtn.disabled = true;
      quizBtn.disabled = true;
      messages.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-mark">?</div>
          <h2>Chat with your notes here</h2>
          <p>Upload a PDF and ask any question about its contents.<br>The answer comes straight from your notes.</p>
        </div>
      `;
    }
  } catch (err) {
    alert("Delete error: " + err.message);
  }
}

// ---------- Select document + load its chat history ----------

async function selectDocument(id) {
  activeDocId = id;
  const doc = documents.find((d) => d.id === id);

  renderDocList();
  activeDocTitle.textContent = doc.filename;
  activeDocSubtitle.textContent = "Ask about this note's content";

  questionInput.disabled = false;
  sendBtn.disabled = false;
  quizBtn.disabled = false;
  questionInput.focus();

  messages.innerHTML = `<p class="history-loading">Loading chat history...</p>`;

  try {
    const res = await fetch(`${API_BASE}/chat/history/${id}`, {
      headers: { ...authHeaders() },
    });
    const history = res.ok ? await res.json() : [];

    if (history.length === 0) {
      messages.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-mark">?</div>
          <h2>"${escapeHtml(doc.filename)}" ready!</h2>
          <p>Ask any question about this note's content.</p>
        </div>
      `;
    } else {
      messages.innerHTML = "";
      history.forEach((entry) => {
        appendMessage(stripLangNote(entry.question), "user");
        appendMessage(entry.answer, "ai");
      });
    }
  } catch (err) {
    messages.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-mark">?</div>
        <h2>"${escapeHtml(doc.filename)}" ready!</h2>
        <p>Ask any question about this note's content.</p>
      </div>
    `;
  }
}

// ---------- Chat handling ----------

composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question || !activeDocId) return;

  clearEmptyState();
  appendMessage(question, "user");
  questionInput.value = "";
  questionInput.disabled = true;
  sendBtn.disabled = true;

  const loadingEl = appendMessage("Thinking...", "ai loading");

  try {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ document_id: activeDocId, question: question + ANSWER_LANG_NOTE }),
    });

    const data = await res.json();
    loadingEl.remove();

    if (!res.ok) {
      appendMessage(data.detail || "A server error occurred", "error");
    } else {
      appendMessage(data.answer, "ai");
      addNotification("Got an answer from the AI ✅");
    }
  } catch (err) {
    loadingEl.remove();
    appendMessage("Connection error: please check that the server is running.", "error");
  } finally {
    questionInput.disabled = false;
    sendBtn.disabled = false;
    questionInput.focus();
  }
});

function appendMessage(text, cssClass) {
  const el = document.createElement("div");
  el.className = "msg " + cssClass;
  el.textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function clearEmptyState() {
  const empty = messages.querySelector(".empty-state");
  if (empty) empty.remove();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Quiz handling ----------

quizBtn.addEventListener("click", async () => {
  if (!activeDocId) return;

  quizOverlay.hidden = false;
  quizBody.innerHTML = `<p class="quiz-loading">Generating quiz... please wait.</p>`;

  try {
    const res = await fetch(`${API_BASE}/chat/quiz/${activeDocId}`, {
      method: "POST",
      headers: { ...authHeaders() },
    });

    const data = await res.json();

    if (!res.ok) {
      quizBody.innerHTML = `<p class="quiz-error">${escapeHtml(data.detail || "Failed to generate quiz")}</p>`;
      return;
    }

    renderQuiz(data.quiz);
    addNotification("Quiz ready! 📝");
  } catch (err) {
    quizBody.innerHTML = `<p class="quiz-error">Connection error: please check that the server is running.</p>`;
  }
});

quizClose.addEventListener("click", () => {
  quizOverlay.hidden = true;
});

quizOverlay.addEventListener("click", (e) => {
  if (e.target === quizOverlay) {
    quizOverlay.hidden = true;
  }
});

function renderQuiz(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    quizBody.innerHTML = `<p class="quiz-error">No quiz questions found. Please try again.</p>`;
    return;
  }

  quizBody.innerHTML = "";

  questions.forEach((q, qIndex) => {
    const card = document.createElement("div");
    card.className = "quiz-question";

    const title = document.createElement("p");
    title.className = "quiz-question-text";
    title.textContent = `${qIndex + 1}. ${q.question}`;
    card.appendChild(title);

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "quiz-options";

    q.options.forEach((optionText, optIndex) => {
      const optBtn = document.createElement("button");
      optBtn.type = "button";
      optBtn.className = "quiz-option";
      optBtn.textContent = optionText;

      optBtn.addEventListener("click", () => {
        if (optionsWrap.classList.contains("answered")) return;
        optionsWrap.classList.add("answered");

        const isCorrect = optIndex === q.correct_index;
        optBtn.classList.add(isCorrect ? "correct" : "incorrect");

        if (!isCorrect) {
          const correctBtn = optionsWrap.children[q.correct_index];
          if (correctBtn) correctBtn.classList.add("correct");
        }
      });

      optionsWrap.appendChild(optBtn);
    });

    card.appendChild(optionsWrap);
    quizBody.appendChild(card);
  });
}

// ---------- Study Planner (browser localStorage, per user) ----------

function plannerStorageKey() {
  return "studydesk_planner_" + (currentUserEmail || "guest");
}

function loadPlannerTasks() {
  try {
    const raw = localStorage.getItem(plannerStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function savePlannerTasks(tasks) {
  localStorage.setItem(plannerStorageKey(), JSON.stringify(tasks));
}

function renderPlanner() {
  const tasks = loadPlannerTasks();

  if (tasks.length === 0) {
    plannerList.innerHTML = `<li class="doc-empty">No tasks added yet</li>`;
    return;
  }

  plannerList.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "planner-item" + (task.done ? " done" : "");

    const dateLabel = task.date ? formatPlannerDate(task.date) : "";

    li.innerHTML = `
      <button class="planner-check" aria-label="Mark as done">
        ${task.done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>' : ""}
      </button>
      <div class="planner-task-body">
        <span class="planner-task-text">${escapeHtml(task.text)}</span>
        ${dateLabel ? `<span class="planner-task-date">${dateLabel}</span>` : ""}
      </div>
      <button class="planner-delete" aria-label="Delete task">×</button>
    `;

    li.querySelector(".planner-check").addEventListener("click", () => {
      task.done = !task.done;
      savePlannerTasks(tasks);
      renderPlanner();
    });

    li.querySelector(".planner-delete").addEventListener("click", () => {
      const updated = tasks.filter((t) => t.id !== task.id);
      savePlannerTasks(updated);
      renderPlanner();
    });

    plannerList.appendChild(li);
  });
}

function formatPlannerDate(dateStr) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch (err) {
    return dateStr;
  }
}

plannerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = plannerTaskInput.value.trim();
  if (!text) return;

  const tasks = loadPlannerTasks();
  tasks.push({
    id: Date.now(),
    text,
    date: plannerDateInput.value || null,
    done: false,
  });
  savePlannerTasks(tasks);

  plannerTaskInput.value = "";
  plannerDateInput.value = "";
  renderPlanner();
});

// ---------- Settings ----------

function renderSettings() {
  const email = currentUserEmail || "";
  const namePart = email.split("@")[0] || "Student";
  const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

  settingsAvatar.textContent = displayName.charAt(0).toUpperCase();
  settingsName.textContent = displayName;
  settingsEmail.textContent = email;
}

clearPlannerBtn.addEventListener("click", () => {
  const confirmed = confirm("Delete all study planner tasks? This cannot be undone.");
  if (!confirmed) return;
  localStorage.removeItem(plannerStorageKey());
  renderPlanner();
  alert("Planner data cleared.");
});

settingsLogoutBtn.addEventListener("click", () => {
  logoutBtn.click();
});

// ---------- Notifications ----------

function notifStorageKey() {
  return "studydesk_notifs_" + (currentUserEmail || "guest");
}

function loadNotifications() {
  try {
    const raw = localStorage.getItem(notifStorageKey());
    notifications = raw ? JSON.parse(raw) : [];
  } catch (err) {
    notifications = [];
  }
}

function saveNotifications() {
  localStorage.setItem(notifStorageKey(), JSON.stringify(notifications));
}

function addNotification(text) {
  notifications.unshift({
    id: Date.now(),
    text,
    time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    read: false,
  });
  notifications = notifications.slice(0, 20);
  saveNotifications();
  renderNotifications();
}

function renderNotifications() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (unreadCount > 0) {
    notifBadge.hidden = false;
    notifBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  } else {
    notifBadge.hidden = true;
  }

  if (notifications.length === 0) {
    notifList.innerHTML = `<li class="notif-empty">No notifications yet</li>`;
    return;
  }

  notifList.innerHTML = "";
  notifications.forEach((n) => {
    const li = document.createElement("li");
    li.className = "notif-item" + (n.read ? " read" : "");
    li.innerHTML = `${escapeHtml(n.text)}<span class="notif-time">${n.time}</span>`;
    notifList.appendChild(li);
  });
}

notifBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  notifDropdown.hidden = !notifDropdown.hidden;

  if (!notifDropdown.hidden) {
    notifications.forEach((n) => (n.read = true));
    saveNotifications();
    renderNotifications();
  }
});

document.addEventListener("click", (e) => {
  if (!notifDropdown.hidden && !notifDropdown.contains(e.target) && e.target !== notifBtn) {
    notifDropdown.hidden = true;
  }
});

// ---------- Dark mode ----------

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("studydesk_theme", theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.body.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

(function initTheme() {
  const saved = localStorage.getItem("studydesk_theme");
  if (saved) applyTheme(saved);
})();

// ---------- Flashcards ----------

genFlashcardsBtn.addEventListener("click", async () => {
  if (!activeDocId) {
    alert("Please select a note from the sidebar first.");
    return;
  }

  flashcardsGrid.innerHTML = `<p class="flashcards-loading">Generating flashcards... please wait.</p>`;

  try {
    const res = await fetch(`${API_BASE}/chat/flashcards/${activeDocId}`, {
      method: "POST",
      headers: { ...authHeaders() },
    });

    const data = await res.json();

    if (!res.ok) {
      flashcardsGrid.innerHTML = `<p class="flashcards-error">${escapeHtml(data.detail || "Failed to generate flashcards")}</p>`;
      return;
    }

    renderFlashcards(data.flashcards);
    addNotification("Flashcards ready! 🗂️");
  } catch (err) {
    flashcardsGrid.innerHTML = `<p class="flashcards-error">Connection error: please check that the server is running.</p>`;
  }
});

function renderFlashcards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    flashcardsGrid.innerHTML = `<p class="flashcards-error">No flashcards found. Please try again.</p>`;
    return;
  }

  flashcardsGrid.innerHTML = "";

  cards.forEach((card) => {
    const wrap = document.createElement("div");
    wrap.className = "flash-card";
    wrap.innerHTML = `
      <div class="flash-card-inner">
        <div class="flash-card-front">${escapeHtml(card.term)}</div>
        <div class="flash-card-back">${escapeHtml(card.definition)}</div>
      </div>
    `;
    wrap.addEventListener("click", () => wrap.classList.toggle("flipped"));
    flashcardsGrid.appendChild(wrap);
  });
}