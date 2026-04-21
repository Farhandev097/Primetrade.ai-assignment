import { useState, useEffect, useCallback, ReactNode, CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "completed";
  category?: string | null;
  tags?: string[];
  userId: number;
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

type AuthMode = "signin" | "signup";
type TabMode = "all" | "pending" | "completed";

interface TaskModalState {
  mode: "new" | "edit";
  task?: Task;
}

interface AuthForm {
  name: string;
  email: string;
  password: string;
}

interface TaskForm {
  title: string;
  description: string;
  dueDate: string;
  category: string;
  tags: string;
}

interface SaveTaskPayload extends TaskForm {
  taskId?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = "http://localhost:3005";

const api = async (
  path: string,
  opts: RequestInit = {},
  token: string | null = null
): Promise<any> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

const formatDate = (d: string | Date): string =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      } as Intl.DateTimeFormatOptions)
    : "";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<TabMode>("all");
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterTags, setFilterTags] = useState<string>("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);
  const [taskModal, setTaskModal] = useState<TaskModalState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTasks = useCallback(
    async (cat: string = filterCat, tags: string = filterTags) => {
      if (!token) return;
      setLoading(true);
      try {
        let data: { tasks: Task[] };
        if (cat || tags) {
          const params = new URLSearchParams();
          if (cat) params.set("category", cat);
          if (tags) params.set("tags", tags);
          data = await api("/api/task/filter?" + params.toString(), {}, token);
        } else {
          data = await api("/api/task/all-task", {}, token);
        }
        setTasks(data.tasks || []);
      } catch (e: unknown) {
        showToast((e as Error).message, "error");
      } finally {
        setLoading(false);
      }
    },
    [token, filterCat, filterTags]
  );

  useEffect(() => {
    if (token) loadTasks();
  }, [token]);

  const handleSignin = async ({ email, password }: AuthForm) => {
    const data = await api("/api/user/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUserName(email.split("@")[0]);
    setAuthModal(null);
    showToast("Signed in successfully");
  };

  const handleSignup = async ({ name, email, password }: AuthForm) => {
    await api("/api/user/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    showToast("Account created! Please sign in.");
    setAuthModal("signin");
  };

  const handleSaveTask = async (form: SaveTaskPayload) => {
    const { taskId, title, description, dueDate, category, tags } = form;
    const tagsArr = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    if (taskId) {
      await api(
        "/api/task/update-task",
        {
          method: "PUT",
          body: JSON.stringify({
            taskId, title, description, dueDate,
            category: category || undefined,
            tags: tagsArr,
          }),
        },
        token
      );
      showToast("Task updated");
    } else {
      await api(
        "/api/task/new-task",
        {
          method: "POST",
          body: JSON.stringify({
            title, description, dueDate,
            category: category || undefined,
            tags: tagsArr,
          }),
        },
        token
      );
      showToast("Task created");
    }
    setTaskModal(null);
    loadTasks();
  };

  const markComplete = async (taskId: string) => {
    await api(
      "/api/task/update-task",
      { method: "PUT", body: JSON.stringify({ taskId, status: "completed" }) },
      token
    );
    showToast("Marked complete");
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    await api(
      "/api/task/delete-task",
      { method: "DELETE", body: JSON.stringify({ taskId }) },
      token
    );
    showToast("Task deleted");
    loadTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (tab === "pending") return t.status === "pending";
    if (tab === "completed") return t.status === "completed";
    return true;
  });

  return (
    <div style={styles.root}>
      <style>{css}</style>
      <Navbar
        token={token}
        userName={userName}
        onSignin={() => setAuthModal("signin")}
        onSignup={() => setAuthModal("signup")}
        onLogout={() => { setToken(null); setTasks([]); setUserName(""); }}
      />

      {!token ? (
        <Landing
          onSignin={() => setAuthModal("signin")}
          onSignup={() => setAuthModal("signup")}
        />
      ) : (
        <main style={styles.main}>
          <div style={styles.toolbar}>
            <TabBar tab={tab} setTab={setTab} tasks={tasks} />
            <button className="btn-primary" onClick={() => setTaskModal({ mode: "new" })}>
              + New task
            </button>
          </div>

          <FilterBar
            filterCat={filterCat}
            setFilterCat={setFilterCat}
            filterTags={filterTags}
            setFilterTags={setFilterTags}
            onApply={() => loadTasks(filterCat, filterTags)}
            onClear={() => { setFilterCat(""); setFilterTags(""); loadTasks("", ""); }}
          />

          {loading ? (
            <div style={styles.empty}>Loading tasks…</div>
          ) : filteredTasks.length === 0 ? (
            <div style={styles.empty}>
              No tasks yet.{" "}
              <span
                style={{ color: "var(--accent)", cursor: "pointer" }}
                onClick={() => setTaskModal({ mode: "new" })}
              >
                Create one →
              </span>
            </div>
          ) : (
            <div style={styles.taskGrid}>
              {filteredTasks.map((t) => (
                <TaskCard
                  key={t._id}
                  task={t}
                  onEdit={() => setTaskModal({ mode: "edit", task: t })}
                  onComplete={() => markComplete(t._id)}
                  onDelete={() => deleteTask(t._id)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSignin={handleSignin}
          onSignup={handleSignup}
          switchMode={(m: AuthMode) => setAuthModal(m)}
          showToast={showToast}
        />
      )}

      {taskModal && (
        <TaskModal
          mode={taskModal.mode}
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          showToast={showToast}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

interface NavbarProps {
  token: string | null;
  userName: string;
  onSignin: () => void;
  onSignup: () => void;
  onLogout: () => void;
}

function Navbar({ token, userName, onSignin, onSignup, onLogout }: NavbarProps) {
  return (
    <nav style={styles.nav}>
      <div style={styles.navLogo}>
        <span style={styles.logoMark}>✦</span> Taskly
      </div>
      <div style={styles.navRight}>
        {token ? (
          <>
            <span style={styles.navUser}>{userName}</span>
            <button className="btn-ghost" onClick={onLogout}>Sign out</button>
          </>
        ) : (
          <>
            <button className="btn-ghost" onClick={onSignin}>Sign in</button>
            <button className="btn-primary" onClick={onSignup}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

interface LandingProps {
  onSignin: () => void;
  onSignup: () => void;
}

function Landing({ onSignin, onSignup }: LandingProps) {
  const cards = [
    { color: "#f0f4ff", label: "Design system", tag: "UI" },
    { color: "#f0fff4", label: "API integration", tag: "Backend" },
    { color: "#fff8f0", label: "Due reminders", tag: "BullMQ" },
  ];
  return (
    <div style={styles.landing}>
      <div style={styles.landingInner}>
        <div style={styles.landingBadge}>Task management, simplified</div>
        <h1 style={styles.landingH1}>
          Stay on top of<br />
          <span style={styles.landingAccent}>everything.</span>
        </h1>
        <p style={styles.landingSubtitle}>
          Create tasks, set due dates, filter by category and tags — all in one
          clean interface backed by your Express API.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-primary btn-lg" onClick={onSignup}>Get started →</button>
          <button className="btn-ghost btn-lg" onClick={onSignin}>Sign in</button>
        </div>
      </div>
      <div style={styles.landingDeco}>
        {cards.map((c, i) => (
          <div
            key={i}
            style={{
              ...styles.decoCard,
              background: c.color,
              transform: `rotate(${i * 2 - 2}deg) translateY(${i * -8}px)`,
            }}
          >
            <span style={styles.decoTag}>{c.tag}</span>
            <span style={styles.decoLabel}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

interface TabBarProps {
  tab: TabMode;
  setTab: (t: TabMode) => void;
  tasks: Task[];
}

function TabBar({ tab, setTab, tasks }: TabBarProps) {
  const counts: Record<TabMode, number> = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };
  const tabs: TabMode[] = ["all", "pending", "completed"];
  return (
    <div style={styles.tabs}>
      {tabs.map((t) => (
        <button
          key={t}
          className={`tab${tab === t ? " tab-active" : ""}`}
          onClick={() => setTab(t)}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
          <span style={styles.tabCount}>{counts[t]}</span>
        </button>
      ))}
    </div>
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filterCat: string;
  setFilterCat: (v: string) => void;
  filterTags: string;
  setFilterTags: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
}

function FilterBar({ filterCat, setFilterCat, filterTags, setFilterTags, onApply, onClear }: FilterBarProps) {
  return (
    <div style={styles.filterBar}>
      <input
        placeholder="Filter by category…"
        value={filterCat}
        onChange={(e) => setFilterCat(e.target.value)}
        style={styles.filterInput}
        onKeyDown={(e) => e.key === "Enter" && onApply()}
      />
      <input
        placeholder="Tags (comma separated)…"
        value={filterTags}
        onChange={(e) => setFilterTags(e.target.value)}
        style={styles.filterInput}
        onKeyDown={(e) => e.key === "Enter" && onApply()}
      />
      <button className="btn-secondary" onClick={onApply}>Filter</button>
      {(filterCat || filterTags) && (
        <button className="btn-ghost" onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

function TaskCard({ task, onEdit, onComplete, onDelete }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  return (
    <div className="task-card" style={{ opacity: isCompleted ? 0.6 : 1 }}>
      <div style={styles.cardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.cardTitleRow}>
            <span style={{ ...styles.cardTitle, textDecoration: isCompleted ? "line-through" : "none" }}>
              {task.title}
            </span>
            <span className={`badge badge-${task.status}`}>{task.status}</span>
          </div>
          <p style={styles.cardDesc}>{task.description}</p>
        </div>
      </div>

      <div style={styles.cardMeta}>
        {task.dueDate && (
          <span style={styles.metaChip}>
            <span style={{ marginRight: 4 }}>📅</span>
            {formatDate(task.dueDate)}
          </span>
        )}
        {task.category && (
          <span style={{ ...styles.metaChip, ...styles.catChip }}>{task.category}</span>
        )}
        {(task.tags || []).map((tag) => (
          <span key={tag} style={styles.tagChip}>#{tag}</span>
        ))}
      </div>

      <div style={styles.cardActions}>
        {!isCompleted && (
          <button className="btn-action btn-complete" onClick={onComplete}>✓ Complete</button>
        )}
        <button className="btn-action" onClick={onEdit}>Edit</button>
        <button className="btn-action btn-del" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// ─── AuthModal ────────────────────────────────────────────────────────────────

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onSignin: (form: AuthForm) => Promise<void>;
  onSignup: (form: AuthForm) => Promise<void>;
  switchMode: (m: AuthMode) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

function AuthModal({ mode, onClose, onSignin, onSignup, switchMode, showToast }: AuthModalProps) {
  const [form, setForm] = useState<AuthForm>({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState<boolean>(false);

  const set = (k: keyof AuthForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "signin") await onSignin(form);
      else await onSignup(form);
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const authModes: AuthMode[] = ["signin", "signup"];

  return (
    <Overlay onClose={onClose}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>
            {mode === "signin" ? "Welcome back" : "Create account"}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.authTabs}>
          {authModes.map((m) => (
            <button
              key={m}
              className={`auth-tab${mode === m ? " auth-tab-active" : ""}`}
              onClick={() => switchMode(m)}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <Field label="Name">
            <input placeholder="Your name" value={form.name} onChange={set("name")} />
          </Field>
        )}
        <Field label="Email">
          <input type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            placeholder={mode === "signup" ? "Min 8 characters" : "••••••••"}
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </Field>

        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: 8 }}
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in →" : "Create account →"}
        </button>
      </div>
    </Overlay>
  );
}

// ─── TaskModal ────────────────────────────────────────────────────────────────

interface TaskModalProps {
  mode: "new" | "edit";
  task?: Task;
  onClose: () => void;
  onSave: (form: SaveTaskPayload) => Promise<void>;
  showToast: (msg: string, type?: "success" | "error") => void;
}

function TaskModal({ mode, task, onClose, onSave, showToast }: TaskModalProps) {
  const [form, setForm] = useState<TaskForm>({
    title: task?.title || "",
    description: task?.description || "",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
    category: task?.category || "",
    tags: (task?.tags || []).join(", "),
  });
  const [busy, setBusy] = useState<boolean>(false);

  const set = (k: keyof TaskForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title || !form.description || !form.dueDate) {
      showToast("Title, description and due date are required", "error");
      return;
    }
    setBusy(true);
    try {
      await onSave({ ...form, taskId: task?._id });
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>{mode === "new" ? "New task" : "Edit task"}</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <Field label="Title">
          <input placeholder="Task title (3–100 chars)" value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            placeholder="Describe the task…"
            value={form.description}
            onChange={set("description")}
            style={{ resize: "vertical", minHeight: 72 }}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Due date">
            <input type="datetime-local" value={form.dueDate} onChange={set("dueDate")} />
          </Field>
          <Field label="Category">
            <input placeholder="e.g. Work" value={form.category} onChange={set("category")} />
          </Field>
        </div>
        <Field label="Tags">
          <input placeholder="tag1, tag2, tag3" value={form.tags} onChange={set("tags")} />
        </Field>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
            {busy ? "Saving…" : mode === "new" ? "Create task →" : "Save changes →"}
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

interface OverlayProps {
  children: ReactNode;
  onClose: () => void;
}

function Overlay({ children, onClose }: OverlayProps) {
  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

interface ToastProps {
  msg: string;
  type: "success" | "error";
}

function Toast({ msg, type }: ToastProps) {
  return (
    <div className={`toast toast-${type}`} style={styles.toast}>
      {msg}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 2rem", height: 60,
    borderBottom: "1px solid var(--border)",
    background: "var(--bg)",
    position: "sticky", top: 0, zIndex: 10,
  },
  navLogo: { fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 8 },
  logoMark: { color: "var(--accent)", fontSize: 14 },
  navRight: { display: "flex", alignItems: "center", gap: 10 },
  navUser: { fontSize: 13, color: "var(--muted)", marginRight: 4 },
  landing: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "5rem 2rem", maxWidth: 900, margin: "0 auto", gap: 40, flexWrap: "wrap",
  },
  landingInner: { flex: "1 1 340px" },
  landingBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", background: "var(--accent-light)", color: "var(--accent)",
    padding: "4px 12px", borderRadius: 20, marginBottom: 20,
  },
  landingH1: { fontSize: "clamp(36px,6vw,56px)", fontWeight: 800, lineHeight: 1.1, color: "var(--text)", marginBottom: 16, letterSpacing: "-1.5px" },
  landingAccent: { color: "var(--accent)" },
  landingSubtitle: { fontSize: 15, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28, maxWidth: 380 },
  landingDeco: { flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" },
  decoCard: {
    width: 220, padding: "16px 20px", borderRadius: 14,
    border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4,
    transition: "transform 0.2s",
  },
  decoTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" },
  decoLabel: { fontSize: 14, fontWeight: 600, color: "var(--text)" },
  main: { maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 },
  tabs: { display: "flex", gap: 4 },
  tabCount: { marginLeft: 6, fontSize: 11, background: "var(--border)", padding: "1px 6px", borderRadius: 10, fontWeight: 600 },
  filterBar: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  filterInput: { flex: "1 1 160px", minWidth: 120, fontSize: 13, padding: "7px 12px" },
  taskGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  empty: { textAlign: "center", padding: "4rem 1rem", color: "var(--muted)", fontSize: 14 },
  cardTop: { marginBottom: 10 },
  cardTitleRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3, flex: 1 },
  cardDesc: { fontSize: 13, color: "var(--muted)", lineHeight: 1.6 },
  cardMeta: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 },
  metaChip: { fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" },
  catChip: { background: "var(--accent-light)", color: "var(--accent)", borderColor: "transparent" },
  tagChip: { fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" },
  cardActions: { display: "flex", gap: 6, paddingTop: 10, borderTop: "1px solid var(--border)" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
  },
  modal: {
    background: "var(--bg)", borderRadius: 16, border: "1px solid var(--border)",
    padding: "1.75rem", width: "100%", maxWidth: 460,
    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" },
  closeBtn: { background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)", lineHeight: 1, padding: 0 },
  authTabs: { display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--border)" },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" },
  toast: {
    position: "fixed", bottom: "1.5rem", right: "1.5rem", padding: "10px 18px",
    borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
  },
};

// ─── Global CSS ───────────────────────────────────────────────────────────────

const css = `
  :root {
    --bg: #ffffff;
    --surface: #f8f9fa;
    --border: #e8e8e8;
    --text: #111111;
    --muted: #888888;
    --accent: #2563eb;
    --accent-light: #eff4ff;
    --danger: #dc2626;
    --danger-light: #fef2f2;
    --success: #16a34a;
    --success-light: #f0fdf4;
    --font: 'DM Sans', system-ui, sans-serif;
  }
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  input, textarea, select {
    width: 100%; padding: 8px 12px; font-size: 14px; font-family: var(--font);
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); color: var(--text);
    outline: none; transition: border-color 0.15s;
  }
  input:focus, textarea:focus { border-color: var(--accent); background: #fff; }
  .btn-primary {
    background: var(--accent); color: #fff; border: none;
    padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: var(--font); transition: opacity 0.15s, transform 0.1s;
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-secondary {
    background: var(--surface); color: var(--text);
    border: 1px solid var(--border); padding: 7px 16px;
    border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: var(--font); transition: background 0.15s;
  }
  .btn-secondary:hover { background: #eee; }
  .btn-ghost {
    background: transparent; color: var(--muted);
    border: 1px solid var(--border); padding: 7px 16px;
    border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: var(--font); transition: all 0.15s;
  }
  .btn-ghost:hover { background: var(--surface); color: var(--text); }
  .btn-lg { padding: 11px 24px; font-size: 15px; border-radius: 10px; }
  .tab {
    padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
    border: 1px solid transparent; cursor: pointer; background: transparent;
    color: var(--muted); font-family: var(--font); transition: all 0.15s;
    display: flex; align-items: center;
  }
  .tab:hover { color: var(--text); background: var(--surface); }
  .tab-active { background: var(--surface) !important; color: var(--text) !important; border-color: var(--border) !important; }
  .task-card {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 12px; padding: 1rem 1.1rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .task-card:hover { border-color: #ccc; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  .badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px;
    border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
    white-space: nowrap; flex-shrink: 0;
  }
  .badge-pending { background: #fef9c3; color: #854d0e; }
  .badge-completed { background: var(--success-light); color: var(--success); }
  .btn-action {
    padding: 5px 12px; font-size: 12px; font-weight: 500; border-radius: 6px;
    border: 1px solid var(--border); cursor: pointer; background: transparent;
    color: var(--muted); font-family: var(--font); transition: all 0.15s;
  }
  .btn-action:hover { background: var(--surface); color: var(--text); }
  .btn-complete { color: var(--success) !important; border-color: #bbf7d0 !important; }
  .btn-complete:hover { background: var(--success-light) !important; }
  .btn-del { color: var(--danger) !important; border-color: #fecaca !important; }
  .btn-del:hover { background: var(--danger-light) !important; }
  .auth-tab {
    padding: 8px 20px; font-size: 14px; cursor: pointer; color: var(--muted);
    border: none; border-bottom: 2px solid transparent; background: none;
    font-family: var(--font); font-weight: 500; transition: all 0.15s;
  }
  .auth-tab:hover { color: var(--text); }
  .auth-tab-active { color: var(--text) !important; border-bottom-color: var(--accent) !important; }
  .toast-success { background: var(--success-light); color: var(--success); border: 1px solid #bbf7d0; }
  .toast-error { background: var(--danger-light); color: var(--danger); border: 1px solid #fecaca; }
`;