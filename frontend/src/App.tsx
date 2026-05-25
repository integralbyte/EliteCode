import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronUp,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Code2,
  CornerDownLeft,
  FileText,
  FlaskConical,
  History,
  Keyboard,
  List,
  Loader2,
  Maximize2,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Tag,
  Terminal,
  X,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  api,
  type CaseResult,
  type ComplexityEstimate,
  type ExecutionRuntime,
  type JudgeResult,
  type Problem,
  type ProblemCase,
  type ProblemSummary,
  type SubmissionAnalysis,
  type SubmissionRecord
} from "./api";
import { runWithPyScript } from "./pyscriptRunner";
import { difficultyClass, firstFailedCase, formatMs, prettyJson, summarizeResult, verdictClass } from "./utils";

type LeftTab = "description" | "editorial" | "solutions" | "submissions";
type ConsoleTab = "testcase" | "result";
type SaveState = "Saved" | "Saving..." | "Unsaved" | "Save failed";
type SettingsTab = "layout" | "editor" | "shortcuts";

const DEFAULT_SETTINGS = {
  leftWidth: 45,
  consoleHeight: 33,
  fontSize: 13,
  fontFamily: "Default",
  fontLigatures: false,
  keyBinding: "Standard",
  tabSize: 4,
  wordWrap: true,
  relativeLineNumbers: false,
  actionButtonsPosition: "toolbar",
  executionRuntime: "python",
  runShortcutEnabled: true,
  submitShortcutEnabled: false
};

const CUSTOM_CASE_TEMPLATE = `{
  "id": "custom-1",
  "name": "Custom Case",
  "input": {
    "nums": [2, 5, 8],
    "target": 10
  },
  "expected": [0, 2],
  "hidden": false
}`;

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export default function App() {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [problemListOpen, setProblemListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("layout");
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [useCustomCase, setUseCustomCase] = useState(false);
  const [customCaseText, setCustomCaseText] = useState(CUSTOM_CASE_TEMPLATE);
  const [code, setCode] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>(DEFAULT_SETTINGS);
  const [saveState, setSaveState] = useState<SaveState>("Saved");
  const [loadedProgress, setLoadedProgress] = useState(false);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [runningAction, setRunningAction] = useState<"run" | "submit" | null>(null);
  const [error, setError] = useState<string>("");
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api
      .getProblems()
      .then((payload) => {
        setProblems(payload.problems);
        setSelectedSlug(payload.last_opened_slug || payload.problems[0]?.slug || "");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    let cancelled = false;
    setError("");
    setLoadedProgress(false);
    setJudgeResult(null);
    Promise.all([api.getProblem(selectedSlug), api.getProgress(selectedSlug), api.getSubmissions(selectedSlug)])
      .then(([loadedProblem, progress, loadedSubmissions]) => {
        if (cancelled) {
          return;
        }
        setProblem(loadedProblem);
        setSelectedCaseId(loadedProblem.cases[0]?.id || "");
        setCode(progress.code || loadedProblem.starter_code.python);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...progress.settings
        });
        setSubmissions(loadedSubmissions);
        setSaveState("Saved");
        setLoadedProgress(true);
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  useEffect(() => {
    if (!problem || !loadedProgress) {
      return;
    }

    setSaveState("Unsaved");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveState("Saving...");
      api
        .saveProgress(problem.slug, code, settings)
        .then(() => setSaveState("Saved"))
        .catch(() => setSaveState("Save failed"));
    }, 700);

    return () => window.clearTimeout(saveTimer.current);
  }, [code, settings, problem, loadedProgress]);

  const selectedCase = useMemo(() => {
    return problem?.cases.find((testCase) => testCase.id === selectedCaseId) ?? problem?.cases[0] ?? null;
  }, [problem, selectedCaseId]);

  const activeFailure = useMemo(() => firstFailedCase(judgeResult), [judgeResult]);
  const executionRuntime = readString(settings.executionRuntime, DEFAULT_SETTINGS.executionRuntime) as ExecutionRuntime;

  const updateSettings = (patch: Record<string, unknown>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const parseCustomCase = (): ProblemCase[] => {
    const parsed = JSON.parse(customCaseText) as ProblemCase | ProblemCase[];
    return Array.isArray(parsed) ? parsed : [parsed];
  };

  const runCode = async () => {
    if (!problem) {
      return;
    }

    setRunningAction("run");
    setConsoleTab("result");
    setError("");
    try {
      if (executionRuntime === "pyscript") {
        const cases = useCustomCase
          ? parseCustomCase()
          : problem.cases.filter((testCase) => !selectedCaseId || testCase.id === selectedCaseId);
        setJudgeResult(await runWithPyScript(problem, code, cases));
        return;
      }

      const payload = useCustomCase
        ? { slug: problem.slug, language: "python" as const, code, custom_cases: parseCustomCase() }
        : { slug: problem.slug, language: "python" as const, code, case_ids: selectedCaseId ? [selectedCaseId] : undefined };
      setJudgeResult(await api.run(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunningAction(null);
    }
  };

  const submitCode = async () => {
    if (!problem) {
      return;
    }

    setRunningAction("submit");
    setConsoleTab("result");
    setError("");
    try {
      if (executionRuntime === "pyscript") {
        const result = await runWithPyScript(problem, code, problem.cases);
        const record: SubmissionRecord = {
          id: Date.now(),
          slug: problem.slug,
          language: "python",
          verdict: result.verdict,
          passed: result.passed,
          runtime_ms: result.runtime_ms,
          created_at: new Date().toLocaleString(),
          results: result
        };
        setJudgeResult(result);
        setSubmissions(api.saveBrowserSubmission(record));
        if (result.passed) {
          api.markBrowserSolved(problem.slug, code, settings);
        }
        setProblems((current) =>
          current.map((item) => (item.slug === problem.slug ? { ...item, solved: item.solved || result.passed } : item))
        );
        return;
      }

      const result = await api.submit({ slug: problem.slug, language: "python", code });
      setJudgeResult(result);
      setSubmissions(await api.getSubmissions(problem.slug));
      setProblems((current) =>
        current.map((item) => (item.slug === problem.slug ? { ...item, solved: item.solved || result.passed } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setRunningAction(null);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandKey = event.metaKey || event.ctrlKey;
      if (!commandKey) {
        return;
      }

      if (event.key === "'" && Boolean(settings.runShortcutEnabled)) {
        event.preventDefault();
        void runCode();
      }

      if (event.key === "Enter" && Boolean(settings.submitShortcutEnabled)) {
        event.preventDefault();
        void submitCode();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const beginHorizontalResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = Number(settings.leftWidth ?? 46);
    const onMove = (moveEvent: MouseEvent) => {
      const delta = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
      updateSettings({ leftWidth: Math.min(68, Math.max(32, startWidth + delta)) });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const beginVerticalResize = (event: ReactMouseEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = Number(settings.consoleHeight ?? 34);
    const onMove = (moveEvent: MouseEvent) => {
      const delta = ((startY - moveEvent.clientY) / window.innerHeight) * 100;
      updateSettings({ consoleHeight: Math.min(58, Math.max(24, startHeight + delta)) });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const leftWidth = `${readNumber(settings.leftWidth, DEFAULT_SETTINGS.leftWidth)}%`;
  const consoleHeight = `${readNumber(settings.consoleHeight, DEFAULT_SETTINGS.consoleHeight)}%`;
  const editorFontSize = readNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize);
  const actionButtonsPosition = readString(settings.actionButtonsPosition, DEFAULT_SETTINGS.actionButtonsPosition);
  const showTopbarActions = actionButtonsPosition === "toolbar";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img className="brand-logo" src="/elitecode-logo.png" alt="" aria-hidden="true" />
          <span className="brand-name">EliteCode</span>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <button className="nav-link active" onClick={() => setProblemListOpen((open) => !open)}>
            <List size={16} />
            Problem List
          </button>
          {problemListOpen ? (
            <div className="problem-menu">
              {problems.map((item) => (
                <button
                  key={item.slug}
                  className={`problem-menu-row ${item.slug === selectedSlug ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedSlug(item.slug);
                    setProblemListOpen(false);
                  }}
                >
                  <span>{item.id}. {item.title}</span>
                  <span className={difficultyClass(item.difficulty)}>{item.difficulty}</span>
                  {item.solved ? <CheckCircle2 size={16} className="solved-icon" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </nav>
        <div className="question-controls">
          <button className="icon-button nav-icon-button" title="Previous problem">
            <ArrowLeft size={16} />
          </button>
          <button className="question-title-button">{problem ? `${problem.id}. ${problem.title}` : "Problem"}</button>
          <button className="icon-button nav-icon-button" title="Next problem">
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="topbar-spacer" />
        {showTopbarActions ? (
          <div className="topbar-run-controls" aria-label="Execution controls">
            <ActionButtons onRun={runCode} onSubmit={submitCode} runningAction={runningAction} disabled={!problem || runningAction !== null} compact />
          </div>
        ) : null}
        <div className="timer-chip">
          <button className="nav-link">
            <Clock3 size={16} />
            00:00:00
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="workspace">
        <section className="workbench" style={{ gridTemplateColumns: `${leftWidth} 8px 1fr` }}>
          <section className="panel problem-panel">
            <TabBar
              active={leftTab}
              tabs={[
                { id: "description", label: "Description", icon: FileText },
                { id: "editorial", label: "Editorial", icon: BookOpen },
                { id: "solutions", label: "Solutions", icon: FlaskConical },
                { id: "submissions", label: "Submissions", icon: History }
              ]}
              onChange={(value) => setLeftTab(value as LeftTab)}
              rightSlot={<PanelToolbar />}
            />
            <div className="panel-body scroll-area">
              {!problem ? <LoadingBlock /> : null}
              {problem && leftTab === "description" ? <Description problem={problem} /> : null}
              {problem && leftTab === "editorial" ? <MarkdownArticle content={problem.editorial} /> : null}
              {problem && leftTab === "solutions" ? <MarkdownArticle content={problem.solution_notes} /> : null}
              {problem && leftTab === "submissions" ? <Submissions submissions={submissions} /> : null}
            </div>
          </section>

          <div className="resize-handle" onMouseDown={beginHorizontalResize} role="separator" aria-orientation="vertical" />

          <section className="right-stack">
            <section className="panel editor-panel" style={{ height: `calc(100% - ${consoleHeight} - 8px)` }}>
              <div className="editor-toolbar">
                <div className="toolbar-left">
                  <span className="toolbar-tab active">
                    <Code2 size={16} />
                    Code
                  </span>
                  <label className="runtime-select-shell" title="Choose where Python code runs.">
                    <span className="sr-only">Execution runtime</span>
                    <select
                      className="runtime-select"
                      value={executionRuntime}
                      onChange={(event) => updateSettings({ executionRuntime: event.target.value as ExecutionRuntime })}
                      aria-label="Execution runtime"
                    >
                      <option value="python">Python</option>
                      <option value="pyscript">PyScript</option>
                    </select>
                  </label>
                  {executionRuntime === "pyscript" ? (
                    <span className="runtime-warning" title="Runs in the browser with Pyodide/PyScript. Experimental: slower cold starts, package limits, and browser sandbox differences.">
                      <span className="runtime-warning-dot" aria-hidden="true" />
                      Experimental
                    </span>
                  ) : null}
                  <span className="select-pill">Auto</span>
                </div>
                <div className="toolbar-right">
                  {actionButtonsPosition === "editor" ? (
                    <ActionButtons
                      onRun={runCode}
                      onSubmit={submitCode}
                      runningAction={runningAction}
                      disabled={!problem || runningAction !== null}
                      compact
                    />
                  ) : null}
                  <span className={`save-state save-${saveState.toLowerCase().replaceAll(" ", "-")}`}>{saveState}</span>
                  <PanelToolbar />
                  <button className="icon-button" title="Settings" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
                    <Settings size={16} />
                  </button>
                </div>
              </div>
              <div className="editor-frame" data-testid="editor-frame">
                <Editor
                  language="python"
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value ?? "")}
                  options={{
                    fontSize: editorFontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: readNumber(settings.tabSize, DEFAULT_SETTINGS.tabSize),
                    wordWrap: Boolean(settings.wordWrap) ? "on" : "off",
                    fontLigatures: Boolean(settings.fontLigatures),
                    lineNumbers: Boolean(settings.relativeLineNumbers) ? "relative" : "on",
                    padding: { top: 18, bottom: 18 }
                  }}
                />
              </div>
            </section>

            <div className="resize-handle-vertical" onMouseDown={beginVerticalResize} role="separator" aria-orientation="horizontal" />

            <section className="panel console-panel" style={{ height: consoleHeight }}>
              <div className="console-actions">
                <TabBar
                  active={consoleTab}
                  tabs={[
                    { id: "testcase", label: "Testcase", icon: CheckCircle2 },
                    { id: "result", label: "Test Result", icon: Terminal }
                  ]}
                  onChange={(value) => setConsoleTab(value as ConsoleTab)}
                  rightSlot={<PanelToolbar />}
                />
              </div>
              <div className="console-body">
                {problem && consoleTab === "testcase" ? (
                  <TestcasePanel
                    problem={problem}
                    selectedCase={selectedCase}
                    selectedCaseId={selectedCaseId}
                    setSelectedCaseId={setSelectedCaseId}
                    useCustomCase={useCustomCase}
                    setUseCustomCase={setUseCustomCase}
                    customCaseText={customCaseText}
                    setCustomCaseText={setCustomCaseText}
                  />
                ) : null}
                {consoleTab === "result" ? <ResultPanel result={judgeResult} activeFailure={activeFailure} /> : null}
              </div>
            </section>
          </section>
        </section>
      </main>
      {settingsOpen ? (
        <SettingsModal
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          settings={settings}
          updateSettings={updateSettings}
          close={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ActionButtons({
  onRun,
  onSubmit,
  runningAction,
  disabled,
  compact = false
}: {
  onRun: () => void;
  onSubmit: () => void;
  runningAction: "run" | "submit" | null;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`action-buttons ${compact ? "compact" : ""}`}>
      <button className="run-button" aria-label="Run" title="Run" onClick={onRun} disabled={disabled}>
        {runningAction === "run" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
        <span>Run</span>
      </button>
      <button className="submit-button" onClick={onSubmit} disabled={disabled}>
        {runningAction === "submit" ? <Loader2 className="spin" size={16} /> : <CloudUpload size={16} />}
        <span>Submit</span>
      </button>
    </div>
  );
}

function PanelToolbar() {
  return (
    <div className="panel-toolbar" aria-hidden="true">
      <button className="panel-tool-button" title="Maximize tabset" tabIndex={-1}>
        <Maximize2 size={14} />
      </button>
      <button className="panel-tool-button" title="Fold tabset" tabIndex={-1}>
        <ChevronUp size={14} />
      </button>
    </div>
  );
}

function SettingsModal({
  activeTab,
  onTabChange,
  settings,
  updateSettings,
  close
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  settings: Record<string, unknown>;
  updateSettings: (patch: Record<string, unknown>) => void;
  close: () => void;
}) {
  const tabs: Array<{ id: SettingsTab; label: string; icon: ComponentType<{ size?: number }> }> = [
    { id: "layout", label: "Layout", icon: List },
    { id: "editor", label: "Editor", icon: Code2 },
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard }
  ];

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-dialog">
        <aside className="settings-sidebar">
          <h2>Settings</h2>
          <div className="settings-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
        <section className="settings-content">
          <button className="settings-close" aria-label="Close settings" onClick={close}>
            <X size={22} />
          </button>
          {activeTab === "layout" ? <LayoutSettings settings={settings} updateSettings={updateSettings} /> : null}
          {activeTab === "editor" ? <EditorSettings settings={settings} updateSettings={updateSettings} /> : null}
          {activeTab === "shortcuts" ? <ShortcutSettings settings={settings} updateSettings={updateSettings} /> : null}
        </section>
      </div>
    </div>
  );
}

function LayoutSettings({
  settings,
  updateSettings
}: {
  settings: Record<string, unknown>;
  updateSettings: (patch: Record<string, unknown>) => void;
}) {
  const position = readString(settings.actionButtonsPosition, DEFAULT_SETTINGS.actionButtonsPosition);
  return (
    <div className="settings-page">
      <div className="settings-page-row top">
        <h3>Execution controls</h3>
        <button className="settings-reset" onClick={() => updateSettings(DEFAULT_SETTINGS)}>
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
      <div className="layout-choice-row">
        <h3>Place Run and Submit controls in</h3>
        <div className="layout-choice-grid">
          <button
            className={`layout-card ${position === "toolbar" ? "active" : ""}`}
            onClick={() => updateSettings({ actionButtonsPosition: "toolbar" })}
          >
            <div className="layout-preview toolbar-preview">
              <span />
              <span />
              <span />
            </div>
            <strong>Top bar</strong>
          </button>
          <button
            className={`layout-card ${position === "editor" ? "active" : ""}`}
            onClick={() => updateSettings({ actionButtonsPosition: "editor" })}
          >
            <div className="layout-preview editor-preview">
              <Code2 size={16} />
              <span />
            </div>
            <strong>Editor header</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

function EditorSettings({
  settings,
  updateSettings
}: {
  settings: Record<string, unknown>;
  updateSettings: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="settings-page editor-settings-page">
      <SettingsSelect label="Font" value={readString(settings.fontFamily, DEFAULT_SETTINGS.fontFamily)} options={["Default", "Menlo", "Monaco"]} onChange={(fontFamily) => updateSettings({ fontFamily })} />
      <SettingsSelect
        label="Font size"
        value={`${readNumber(settings.fontSize, DEFAULT_SETTINGS.fontSize)}px`}
        options={["12px", "13px", "14px", "15px", "16px", "18px", "20px"]}
        onChange={(value) => updateSettings({ fontSize: Number(value.replace("px", "")) })}
      />
      <SettingsToggle label="Font ligatures" checked={Boolean(settings.fontLigatures)} onChange={(fontLigatures) => updateSettings({ fontLigatures })} />
      <SettingsSelect label="Key binding" value={readString(settings.keyBinding, DEFAULT_SETTINGS.keyBinding)} options={["Standard", "Vim", "Emacs"]} onChange={(keyBinding) => updateSettings({ keyBinding })} />
      <SettingsSelect
        label="Tab size"
        value={`${readNumber(settings.tabSize, DEFAULT_SETTINGS.tabSize)} spaces`}
        options={["2 spaces", "4 spaces", "8 spaces"]}
        onChange={(value) => updateSettings({ tabSize: Number(value.split(" ")[0]) })}
      />
      <SettingsToggle label="Word Wrap" checked={Boolean(settings.wordWrap)} onChange={(wordWrap) => updateSettings({ wordWrap })} />
      <SettingsToggle label="Relative Line Number" checked={Boolean(settings.relativeLineNumbers)} onChange={(relativeLineNumbers) => updateSettings({ relativeLineNumbers })} />
    </div>
  );
}

function ShortcutSettings({
  settings,
  updateSettings
}: {
  settings: Record<string, unknown>;
  updateSettings: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="settings-page shortcut-settings-page">
      <h3 className="settings-section-label">Execution</h3>
      <ShortcutRow
        label="Run code"
        enabled={Boolean(settings.runShortcutEnabled)}
        onEnabledChange={(runShortcutEnabled) => updateSettings({ runShortcutEnabled })}
        keys={["Cmd", "'"]}
      />
      <ShortcutRow
        label="Submit"
        enabled={Boolean(settings.submitShortcutEnabled)}
        onEnabledChange={(submitShortcutEnabled) => updateSettings({ submitShortcutEnabled })}
        keys={["Cmd", "Enter"]}
      />
    </div>
  );
}

function SettingsSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-control-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-control-row toggle-row">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function ShortcutRow({
  label,
  enabled,
  onEnabledChange,
  keys
}: {
  label: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  keys: string[];
}) {
  return (
    <div className="shortcut-row">
      <span>{label}</span>
      <div className="shortcut-right">
        {onEnabledChange ? <Switch checked={Boolean(enabled)} onChange={onEnabledChange} /> : null}
        <div className="keycap-row">
          {keys.map((key) => (
            <kbd key={key}>{key === "Enter" ? <CornerDownLeft size={16} /> : key}</kbd>
          ))}
        </div>
      </div>
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button className={`switch ${checked ? "checked" : ""}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  rightSlot
}: {
  tabs: Array<{ id: T; label: string; icon: ComponentType<{ size?: number }> }>;
  active: T;
  onChange: (id: T) => void;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="tabbar">
      <div className="tabbar-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`tab-button ${active === tab.id ? "active" : ""}`} onClick={() => onChange(tab.id)}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>
      {rightSlot ? <div className="tabbar-right">{rightSlot}</div> : null}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="loading-block">
      <Loader2 className="spin" />
      Loading problem...
    </div>
  );
}

function Description({ problem }: { problem: Problem }) {
  return (
    <article className="description-view">
      <div className="title-row">
        <h1>
          {problem.id}. {problem.title}
        </h1>
      </div>
      <div className="meta-row">
        <span className={difficultyClass(problem.difficulty)}>{problem.difficulty}</span>
      </div>
      <MarkdownArticle content={problem.statement} compact />
      {problem.tags.length ? (
        <details className="topic-details">
          <summary>Topics</summary>
          <div className="topic-pill-row">
            {problem.tags.map((tag) => (
              <span className="meta-pill" key={tag}>
                <Tag size={14} />
                {tag}
              </span>
            ))}
          </div>
        </details>
      ) : null}
      <section className="hint-section">
        <h2>Hints</h2>
        {problem.hints.map((hint, index) => (
          <details key={hint} className="hint-card">
            <summary>Hint {index + 1}</summary>
            <p>{hint}</p>
          </details>
        ))}
      </section>
    </article>
  );
}

function MarkdownArticle({ content, compact = false }: { content: string; compact?: boolean }) {
  return (
    <div className={`markdown ${compact ? "compact" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src = "", alt = "" }) => (
            <img
              src={src}
              alt={alt}
              onError={(event) => {
                if (src.startsWith("/api/problem-assets/")) {
                  event.currentTarget.src = src.replace("/api/problem-assets/", "/problem-assets/");
                }
              }}
            />
          )
        }}
      >
        {content || "No content yet."}
      </ReactMarkdown>
    </div>
  );
}

function Submissions({ submissions }: { submissions: SubmissionRecord[] }) {
  if (!submissions.length) {
    return (
      <div className="empty-state">
        <History size={28} />
        <p>No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="submission-list">
      {submissions.map((submission) => (
        <div className="submission-row" key={submission.id}>
          <div>
            <strong className={verdictClass(submission.verdict)}>{submission.verdict}</strong>
            <span>{submission.created_at}</span>
          </div>
          <div>
            <span>{submission.language}</span>
            <span>{formatMs(submission.runtime_ms)}</span>
            {submission.results.analysis?.runtime ? <span>{submission.results.analysis.runtime.relative_label}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TestcasePanel({
  problem,
  selectedCase,
  selectedCaseId,
  setSelectedCaseId,
  useCustomCase,
  setUseCustomCase,
  customCaseText,
  setCustomCaseText
}: {
  problem: Problem;
  selectedCase: ProblemCase | null;
  selectedCaseId: string;
  setSelectedCaseId: (id: string) => void;
  useCustomCase: boolean;
  setUseCustomCase: (value: boolean) => void;
  customCaseText: string;
  setCustomCaseText: (value: string) => void;
}) {
  const fields = selectedCase && typeof selectedCase.input === "object" && selectedCase.input !== null && !Array.isArray(selectedCase.input)
    ? Object.entries(selectedCase.input as Record<string, unknown>)
    : [];

  return (
    <div className="testcase-view">
      <div className="case-chip-row">
        {problem.cases.map((testCase) => (
          <button
            key={testCase.id}
            className={`case-chip ${!useCustomCase && selectedCaseId === testCase.id ? "active" : ""}`}
            onClick={() => {
              setUseCustomCase(false);
              setSelectedCaseId(testCase.id);
            }}
          >
            {testCase.name}
          </button>
        ))}
        <button className={`case-chip add ${useCustomCase ? "active" : ""}`} onClick={() => setUseCustomCase(true)}>
          <Plus size={14} />
          Custom
        </button>
      </div>

      {useCustomCase ? (
        <textarea className="custom-case-editor" value={customCaseText} onChange={(event) => setCustomCaseText(event.target.value)} spellCheck={false} />
      ) : (
        <div className="case-fields">
          {fields.map(([name, value]) => (
            <label className="case-field" key={name}>
              <span>{name} =</span>
              <code>{prettyJson(value)}</code>
            </label>
          ))}
          <label className="case-field expected">
            <span>expected =</span>
            <code>{prettyJson(selectedCase?.expected)}</code>
          </label>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, activeFailure }: { result: JudgeResult | null; activeFailure: CaseResult | null }) {
  if (!result) {
    return (
      <div className="empty-state">
        <Terminal size={28} />
        <p>Run code or submit to see judge output.</p>
      </div>
    );
  }

  const focusCase = activeFailure ?? result.case_results[0];

  return (
    <div className="result-view">
      <div className="result-summary">
        <div>
          {result.passed ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          <strong className={verdictClass(result.verdict)}>{summarizeResult(result)}</strong>
        </div>
      </div>
      <div className="result-case-row">
        {result.case_results.map((caseResult) => (
          <span key={caseResult.case_id} className={`result-case-chip ${caseResult.passed ? "passed" : "failed"}`}>
            {caseResult.case_name}
          </span>
        ))}
      </div>
      {result.analysis ? <PerformanceAnalysis analysis={result.analysis} /> : null}
      {focusCase ? (
        <div className="result-detail">
          <ResultValue label="Input" value={focusCase.hidden ? "Hidden test case" : prettyJson(focusCase.input)} />
          <ResultValue label="Expected" value={focusCase.hidden ? "Hidden" : prettyJson(focusCase.expected)} />
          <ResultValue label="Actual" value={prettyJson(focusCase.actual)} />
          {focusCase.stdout ? <ResultValue label="Stdout" value={focusCase.stdout} /> : null}
          {focusCase.stderr ? <ResultValue label="Stderr" value={focusCase.stderr} /> : null}
          {focusCase.message ? <ResultValue label="Message" value={focusCase.message} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function PerformanceAnalysis({ analysis }: { analysis: SubmissionAnalysis }) {
  const runtime = analysis.runtime;

  return (
    <section className="performance-panel" aria-label="Performance analysis">
      <div className="performance-header">
        <strong>Performance</strong>
        <span>Compared with the curated expected solution</span>
      </div>
      {runtime ? (
        <div className="metric-grid">
          <MetricCard label="Your runtime" value={formatMs(runtime.user_runtime_ms)} />
          <MetricCard label="Expected runtime" value={formatMs(runtime.reference_runtime_ms)} />
          <MetricCard label="Comparison" value={runtime.relative_label} />
        </div>
      ) : (
        <p className="analysis-note">Runtime comparison appears after an accepted submission with a valid expected solution benchmark.</p>
      )}
      <div className="complexity-grid">
        <ComplexityCard title="Your complexity" estimate={analysis.user_complexity} />
        {analysis.reference_complexity ? <ComplexityCard title="Expected complexity" estimate={analysis.reference_complexity} /> : null}
      </div>
      {analysis.notes.length ? (
        <ul className="analysis-notes">
          {analysis.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ComplexityCard({ title, estimate }: { title: string; estimate: ComplexityEstimate }) {
  return (
    <div className="complexity-card">
      <div>
        <span>{title}</span>
        <strong>Time: {estimate.label}</strong>
        {estimate.space_label ? <strong>Space: {estimate.space_label}</strong> : null}
      </div>
      <p>{estimate.reason}</p>
      {estimate.observed_growth ? <p>{estimate.observed_growth}</p> : null}
      <div className="complexity-meta">
        <span>Confidence: {estimate.confidence}</span>
        {estimate.features.slice(0, 3).map((feature) => (
          <span key={feature}>{feature}</span>
        ))}
      </div>
      {estimate.source_url ? (
        <a className="complexity-source" href={estimate.source_url} target="_blank" rel="noreferrer">
          Source reference
        </a>
      ) : null}
    </div>
  );
}

function ResultValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-value">
      <span>{label}</span>
      <pre>{value}</pre>
    </div>
  );
}
