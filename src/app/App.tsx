import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Search,
  Upload,
  Star,
  Eye,
  Filter,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ThumbsUp,
  Building2,
  User,
  Briefcase,
  Heart,
  CloudUpload,
  FileText,
  X,
  Send,
  Bot,
  Sparkles,
  CheckCheck,
  Loader2,
  FilePlus2,
  Cpu,
  ScanLine,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "승인" | "재확인 필요" | "중복 제외";
type Page = "dashboard" | "upload" | "review" | "employees";

interface Article {
  id: string;
  author: string;
  subject: string;
  department: string;
  aiScore: number;
  status: Status;
  date: string;
  flagReason?: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  relation?: string;
  relationName?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  progress: number;
  stage: "uploading" | "extracting" | "analyzing" | "done";
  pages?: number;
  found?: number;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  table?: { headers: string[]; rows: string[][] };
  links?: { label: string; id: string }[];
  timestamp: Date;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ARTICLES: Article[] = [
  { id: "A-2024-001", author: "김민지", subject: "박준호", department: "생산팀", aiScore: 4.2, status: "승인", date: "2024-01-15" },
  { id: "A-2024-002", author: "이서연", subject: "최동욱", department: "영업팀", aiScore: 3.1, status: "재확인 필요", date: "2024-01-15", flagReason: "회사 지원 물품(핫팩) 관련 내용 포함" },
  { id: "A-2024-003", author: "박현우", subject: "정수아", department: "기획팀", aiScore: 4.8, status: "승인", date: "2024-01-16" },
  { id: "A-2024-004", author: "김태영", subject: "이민호", department: "생산팀", aiScore: 2.5, status: "재확인 필요", date: "2024-01-16", flagReason: "중복 의심 건 — 유사 내용 A-2024-007과 비교 필요" },
  { id: "A-2024-005", author: "오지수", subject: "한예슬", department: "인사팀", aiScore: 1.0, status: "중복 제외", date: "2024-01-17", flagReason: "A-2024-002 중복" },
  { id: "A-2024-006", author: "정다은", subject: "류승범", department: "품질팀", aiScore: 4.5, status: "승인", date: "2024-01-17" },
  { id: "A-2024-007", author: "신재원", subject: "이민호", department: "생산팀", aiScore: 2.6, status: "재확인 필요", date: "2024-01-18", flagReason: "중복 의심 건 — A-2024-004와 동일 인물" },
  { id: "A-2024-008", author: "장혜린", subject: "문성준", department: "영업팀", aiScore: 3.8, status: "승인", date: "2024-01-18" },
  { id: "A-2024-009", author: "최준서", subject: "박민경", department: "물류팀", aiScore: 4.1, status: "승인", date: "2024-01-19" },
  { id: "A-2024-010", author: "임소영", subject: "강동원", department: "기획팀", aiScore: 2.9, status: "재확인 필요", date: "2024-01-19", flagReason: "작성자-실천자 사내 커플 관계 등록됨 — 친분 제외 대상 검토 필요" },
];

const EMPLOYEES: Employee[] = [
  { id: "EMP-001", name: "김민지", department: "생산팀", position: "대리" },
  { id: "EMP-002", name: "이서연", department: "영업팀", position: "사원" },
  { id: "EMP-003", name: "박현우", department: "기획팀", position: "과장" },
  { id: "EMP-004", name: "김태영", department: "생산팀", position: "사원" },
  { id: "EMP-005", name: "오지수", department: "인사팀", position: "주임", relation: "커플", relationName: "류승범" },
  { id: "EMP-006", name: "류승범", department: "품질팀", position: "대리", relation: "커플", relationName: "오지수" },
  { id: "EMP-007", name: "임소영", department: "기획팀", position: "사원", relation: "커플", relationName: "강동원" },
  { id: "EMP-008", name: "강동원", department: "기획팀", position: "사원", relation: "커플", relationName: "임소영" },
  { id: "EMP-009", name: "정다은", department: "물류팀", position: "주임" },
  { id: "EMP-010", name: "신재원", department: "생산팀", position: "과장" },
];

const PRESET_CHAT: ChatMessage[] = [
  {
    role: "user",
    text: "이번 주 점수 오류 의심 건 요약해 줘",
    timestamp: new Date(Date.now() - 120000),
  },
  {
    role: "ai",
    text: "이번 주(2024년 1월 3주차) 검수가 필요한 기사는 총 **4건**입니다. 아래 내역을 확인하세요.",
    table: {
      headers: ["기사 ID", "실천자", "플래그 사유"],
      rows: [
        ["A-2024-002", "최동욱", "회사 지원 물품(핫팩) 포함"],
        ["A-2024-004", "이민호", "중복 의심 — A-2024-007"],
        ["A-2024-007", "이민호", "중복 의심 — A-2024-004"],
        ["A-2024-010", "강동원", "사내 커플 관계 등록"],
      ],
    },
    links: [
      { label: "A-2024-002 검수하기", id: "A-2024-002" },
      { label: "A-2024-004 검수하기", id: "A-2024-004" },
    ],
    timestamp: new Date(Date.now() - 115000),
  },
];

const AI_RESPONSES: Record<string, ChatMessage["text"] | { text: string; table?: ChatMessage["table"]; links?: ChatMessage["links"] }> = {
  default: "죄송합니다, 해당 질문에 대한 데이터를 현재 찾을 수 없습니다. 구체적인 사원명이나 기사 번호를 포함해 다시 질문해 주시겠어요?",
  중복: "이번 907호에서 중복으로 감지된 기사는 총 **2쌍(4건)**입니다. A-2024-004와 A-2024-007이 동일 실천자(이민호/생산팀)를 다루고 있으며, A-2024-002와 A-2024-005가 내용 중복으로 플래그 처리되었습니다.",
  "이민호": {
    text: "이민호(생산팀) 사원의 최근 3개월 점수 이력입니다.",
    table: {
      headers: ["호수", "날짜", "AI 점수", "최종 점수", "상태"],
      rows: [
        ["905호", "2023-11", "4.2", "4.0", "승인"],
        ["906호", "2023-12", "3.8", "3.5", "승인"],
        ["907호", "2024-01", "2.5", "—", "재확인 필요"],
      ],
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusTag({ status }: { status: Status }) {
  const cfg = {
    "승인": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle2 size={12} /> },
    "재확인 필요": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <AlertTriangle size={12} /> },
    "중복 제외": { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", icon: <XCircle size={12} /> },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.icon}{status}
    </span>
  );
}

function ScoreDots({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={11} className={i <= rounded ? "fill-[#C85A1A] text-[#C85A1A]" : "text-[#DDD0C8]"} />
      ))}
      <span className="ml-1.5 text-xs font-mono text-muted-foreground">{score.toFixed(1)}</span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const nav = [
    { id: "dashboard" as Page, label: "메인 대시보드", icon: <LayoutDashboard size={17} /> },
    { id: "upload" as Page, label: "파일 업로드 · 분석", icon: <CloudUpload size={17} />, badge: "Phase 2" },
    { id: "review" as Page, label: "기사 검수", icon: <FileSearch size={17} /> },
    { id: "employees" as Page, label: "사원 관계 관리", icon: <Users size={17} /> },
  ];
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)" }}>
      <div className="px-5 py-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#C85A1A] flex items-center justify-center">
            <Heart size={14} className="text-white fill-white" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">성심당</div>
            <div className="text-[10px] opacity-50 leading-tight tracking-wide">사랑기사 평가 시스템</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {nav.map(item => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all ${
                active
                  ? "bg-[#C85A1A] text-white font-medium"
                  : "opacity-60 hover:opacity-100 hover:bg-white/10"
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {"badge" in item && item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C85A1A]/30 text-[#F7A07A] font-semibold tracking-wide">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t text-[11px] opacity-30" style={{ borderColor: "var(--sidebar-border)" }}>
        v1.0.0 · 2024 성심당
      </div>
    </aside>
  );
}

// ─── Upload Page ──────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<UploadedFile["stage"], string> = {
  uploading: "파일 업로드 중...",
  extracting: "OCR 텍스트 추출 중...",
  analyzing: "AI가 이름, 부서를 추출하고 점수를 분석하는 중입니다...",
  done: "분석 완료",
};

const STAGE_ICONS: Record<UploadedFile["stage"], React.ReactNode> = {
  uploading: <CloudUpload size={14} className="text-[#C85A1A]" />,
  extracting: <ScanLine size={14} className="text-amber-500" />,
  analyzing: <Cpu size={14} className="text-violet-500" />,
  done: <CheckCheck size={14} className="text-emerald-500" />,
};

function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([
    { name: "한가족신문_907호.pdf", size: 4312000, progress: 75, stage: "analyzing", pages: 8, found: 6 },
    { name: "한가족신문_906호.pdf", size: 3890000, progress: 100, stage: "done", pages: 8, found: 10 },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(f => {
      setFiles(prev => [...prev, { name: f.name, size: f.size, progress: 0, stage: "uploading" }]);
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 18 + 5;
        if (p >= 100) {
          p = 100;
          clearInterval(interval);
          setFiles(prev => prev.map(x => x.name === f.name ? { ...x, progress: 100, stage: "done", pages: 8, found: 7 } : x));
        } else {
          const stage: UploadedFile["stage"] = p < 30 ? "uploading" : p < 65 ? "extracting" : "analyzing";
          setFiles(prev => prev.map(x => x.name === f.name ? { ...x, progress: Math.round(p), stage } : x));
        }
      }, 400);
    });
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-3xl">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-foreground">파일 업로드 · AI 분석</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 border border-violet-200 font-semibold tracking-wide">Phase 2</span>
          </div>
          <p className="text-sm text-muted-foreground">한가족신문 PDF 또는 이미지를 업로드하면 AI가 자동으로 사랑기사를 추출하고 점수를 분류합니다</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`mt-6 cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center py-14 px-8 text-center select-none ${
            dragging
              ? "border-[#C85A1A] bg-[#FFF0E6]"
              : "border-border hover:border-[#C85A1A]/50 hover:bg-accent/40 bg-card"
          }`}
        >
          <input ref={inputRef} type="file" accept=".pdf,image/*" multiple className="hidden" />
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${dragging ? "bg-[#C85A1A]/15" : "bg-muted"}`}>
            <CloudUpload size={30} className={dragging ? "text-[#C85A1A]" : "text-muted-foreground"} />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">
            {dragging ? "여기에 파일을 놓으세요" : "신문 PDF 또는 이미지 파일을 여기에 드래그하세요"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">또는 클릭하여 파일 선택</p>
          <div className="flex gap-2">
            {["PDF", "JPG", "PNG", "TIFF"].map(ext => (
              <span key={ext} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono">.{ext.toLowerCase()}</span>
            ))}
          </div>
        </div>

        {/* File cards */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">처리 현황</h2>
              <span className="text-xs text-muted-foreground font-mono">{files.filter(f => f.stage === "done").length}/{files.length} 완료</span>
            </div>
            {files.map(file => (
              <div key={file.name} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{file.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                        {file.pages && ` · ${file.pages}페이지`}
                        {file.found && ` · 기사 ${file.found}건 발견`}
                      </div>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors p-1" onClick={() => setFiles(f => f.filter(x => x.name !== file.name))}>
                    <X size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mb-2.5">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${file.stage === "done" ? "bg-emerald-500" : "bg-[#C85A1A]"}`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>

                {/* Stage + percentage */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {file.stage !== "done" && <Loader2 size={12} className="text-[#C85A1A] animate-spin" />}
                    {STAGE_ICONS[file.stage]}
                    <span className={`text-xs ${file.stage === "done" ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                      {STAGE_LABELS[file.stage]}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-muted-foreground">{file.progress}%</span>
                </div>

                {/* Stage pipeline indicators */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  {(["uploading", "extracting", "analyzing", "done"] as const).map((s, i) => {
                    const stageOrder = ["uploading", "extracting", "analyzing", "done"];
                    const currentIdx = stageOrder.indexOf(file.stage);
                    const thisIdx = stageOrder.indexOf(s);
                    const isActive = currentIdx === thisIdx;
                    const isDone = currentIdx > thisIdx;
                    return (
                      <div key={s} className="flex items-center gap-1.5 flex-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDone ? "bg-emerald-500" : isActive ? "bg-[#C85A1A]" : "bg-muted-foreground/20"}`} />
                        <span className={`text-[10px] ${isDone ? "text-emerald-600" : isActive ? "text-[#C85A1A] font-medium" : "text-muted-foreground/40"}`}>
                          {["업로드", "OCR 추출", "AI 분석", "완료"][i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phase 2 notice */}
        <div className="mt-8 p-5 rounded-xl border border-violet-200 bg-violet-50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={14} className="text-violet-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-violet-800 mb-1">Phase 2 — 시스템 고도화 예정 기능</div>
              <div className="text-xs text-violet-700 leading-relaxed">
                1단계에서는 텍스트 기반 검수 시스템을 안정화하고, 2단계에서 <strong>대량 파일 일괄 업로드 파이프라인</strong>과 <strong>인사 데이터 전용 AI 챗봇 인터페이스</strong>를 연동할 예정입니다. 이 화면은 향후 확장 기능의 UI 프로토타입입니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

function DashboardPage({ setPage }: { setPage: (p: Page) => void }) {
  const [filterStatus, setFilterStatus] = useState<string>("전체");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const total = ARTICLES.length;
  const done = ARTICLES.filter(a => a.status === "승인").length;
  const needs = ARTICLES.filter(a => a.status === "재확인 필요").length;
  const excluded = ARTICLES.filter(a => a.status === "중복 제외").length;

  const filtered = filterStatus === "전체" ? ARTICLES : ARTICLES.filter(a => a.status === filterStatus);
  const statuses: string[] = ["전체", "승인", "재확인 필요", "중복 제외"];

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-6xl">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-foreground">메인 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI 분류 결과 검수 현황 — 2024년 1월 · 907호</p>
        </div>

        {/* Quick action banner */}
        <div
          onClick={() => setPage("upload")}
          className="mb-6 p-4 rounded-xl border border-dashed border-[#C85A1A]/40 bg-accent/40 flex items-center justify-between cursor-pointer hover:bg-accent transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C85A1A]/10 flex items-center justify-center">
              <FilePlus2 size={15} className="text-[#C85A1A]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#C85A1A]">새 신문 파일 업로드</div>
              <div className="text-xs text-muted-foreground">908호 PDF를 업로드하면 AI가 자동으로 기사를 분류합니다</div>
            </div>
          </div>
          <span className="text-xs text-[#C85A1A] font-medium group-hover:underline">파일 업로드 →</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "전체 기사", value: total, sub: "제출된 사랑기사 수", color: "text-foreground", bg: "bg-card border-border" },
            { label: "처리 완료", value: done, sub: "AI 승인 처리", color: "text-emerald-600", bg: "bg-card border-border" },
            { label: "재확인 필요", value: needs, sub: "검수단 확인 대기", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "중복 제외", value: excluded, sub: "중복 감지 제외", color: "text-slate-500", bg: "bg-card border-border" },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-5 ${card.bg}`}>
              <div className={`text-3xl font-semibold font-mono tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-sm font-medium text-foreground mt-1">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={14} />
            <span>{filtered.length}건 표시 중</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:border-[#C85A1A] transition-colors"
            >
              <span>{filterStatus}</span>
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-card rounded-lg border border-border shadow-lg z-20 overflow-hidden">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setDropdownOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-muted ${filterStatus === s ? "text-[#C85A1A] font-medium bg-accent" : "text-foreground"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">기사 ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">작성자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">실천자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">부서</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI 제안 점수</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">검수 상태</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">날짜</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((article, idx) => (
                <tr key={article.id} className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{article.id}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground">{article.author}</td>
                  <td className="px-4 py-3.5 text-foreground">{article.subject}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 size={11} />{article.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><ScoreDots score={article.aiScore} /></td>
                  <td className="px-4 py-3.5"><StatusTag status={article.status} /></td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{article.date}</td>
                  <td className="px-4 py-3.5">
                    {article.status === "재확인 필요" && (
                      <button
                        onClick={() => setPage("review")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                      >
                        <Eye size={12} />검수
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Review Page ──────────────────────────────────────────────────────────────

function ReviewPage({ setPage }: { setPage: (p: Page) => void }) {
  const article = ARTICLES.find(a => a.status === "재확인 필요")!;
  const [zoom, setZoom] = useState(100);
  const [votes, setVotes] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const voteCount = [1, 2, 3, 4, 5].map(s => votes.filter(v => v === s).length);
  const finalScore = votes.length > 0 ? (votes.reduce((a, b) => a + b, 0) / votes.length).toFixed(1) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage("dashboard")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={15} />목록으로
          </button>
          <div className="w-px h-4 bg-border" />
          <div>
            <span className="text-sm font-semibold text-foreground">{article.id}</span>
            <span className="ml-2"><StatusTag status={article.status} /></span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
          <AlertTriangle size={13} />
          <span>{article.flagReason}</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        <div className="flex flex-col border-r border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">원본 데이터</span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ZoomOut size={13} /></button>
              <span className="text-xs font-mono text-muted-foreground w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ZoomIn size={13} /></button>
              <button onClick={() => setZoom(100)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><RotateCcw size={13} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#E8E0D8] flex items-start justify-center p-6">
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s" }}>
              <div className="w-80 bg-[#FDFBF8] border border-[#D4C8BC] rounded shadow-md overflow-hidden">
                <div className="bg-[#2C1A0E] text-[#F7EEE8] text-center py-2 text-xs font-semibold tracking-widest">성 심 당 사 보</div>
                <div className="p-4 space-y-2">
                  <div className="text-[10px] text-center text-[#8A7060]">2024년 1월호 · 사랑기사란</div>
                  <div className="border-t border-[#DDD0C8] pt-3">
                    <div className="text-xs font-bold text-[#1C1410] mb-1.5 leading-snug">따뜻한 마음이 빛난 순간</div>
                    <div className="text-[9px] text-[#5C3A1E] leading-relaxed">
                      지난 한 주 극심한 한파가 몰아쳤던 날, 영업팀 최동욱 대리님께서는 현장 배달을 나선 동료들을 위해 사비로 핫팩 30개를 구입해 나눠주셨습니다. 추운 날씨에 지친 팀원들에게 큰 힘이 되었으며…
                    </div>
                    <div className="mt-2 text-[9px] text-[#8A7060]">작성자: 이서연 · 영업팀</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 border-t border-border">
            <div className="px-5 py-2.5 bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">OCR 추출 텍스트</span>
            </div>
            <div className="px-5 py-4 max-h-40 overflow-auto text-xs text-foreground leading-relaxed font-mono bg-card">
              지난 한 주 극심한 한파가 몰아쳤던 날, 영업팀 최동욱 대리님께서는 현장 배달을 나선 동료들을 위해 사비로 핫팩 30개를 구입해 나눠주셨습니다. 추운 날씨에 지친 팀원들에게 큰 힘이 되었으며 이후로도 따뜻한 배려가 팀 문화에 긍정적인 영향을 미쳤습니다.
              <br /><br />
              <span className="text-muted-foreground">작성자: 이서연 / 실천자: 최동욱 / 부서: 영업팀 / 날짜: 2024-01-15</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI 분석 결과</span>
          </div>
          <div className="flex-1 overflow-auto px-5 py-5 space-y-5">
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">인식 정보</div>
              {[
                { icon: <User size={13} />, label: "작성자", value: "이서연" },
                { icon: <User size={13} />, label: "실천자", value: "최동욱" },
                { icon: <Building2 size={13} />, label: "부서", value: "영업팀" },
                { icon: <Briefcase size={13} />, label: "직위", value: "대리" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">{row.icon}{row.label}</div>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">AI 제안 점수</div>
              <div className="flex items-center justify-between">
                <ScoreDots score={3.1} />
                <span className="text-xs text-muted-foreground">신뢰도 62%</span>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                <div className="bg-[#C85A1A] h-1.5 rounded-full" style={{ width: "62%" }} />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle size={12} />플래그 사유</div>
              <ul className="space-y-1.5">
                <li className="text-xs text-amber-800 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />회사 지원 물품(핫팩) 관련 행동이 언급됨 — 개인 사비 여부 불분명</li>
                <li className="text-xs text-amber-800 flex items-start gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />실천 내용이 업무 범주에 해당할 가능성 있음</li>
              </ul>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-1.5"><ThumbsUp size={12} />평가단 다수결 투표</div>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map(score => (
                  <button key={score} onClick={() => !submitted && setVotes(v => [...v, score])} disabled={submitted}
                    className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${submitted ? "opacity-50 cursor-default border-border text-muted-foreground" : "hover:border-[#C85A1A] hover:bg-accent hover:text-[#C85A1A] border-border text-foreground active:scale-95"}`}>
                    {score}
                  </button>
                ))}
              </div>
              {votes.length > 0 && (
                <div className="space-y-2 mb-4">
                  {[1, 2, 3, 4, 5].map(score => (
                    <div key={score} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground font-mono">{score}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#C85A1A] h-1.5 rounded-full transition-all duration-300" style={{ width: votes.length ? `${(voteCount[score - 1] / votes.length) * 100}%` : "0%" }} />
                      </div>
                      <span className="w-4 text-muted-foreground font-mono">{voteCount[score - 1]}</span>
                    </div>
                  ))}
                  <div className="pt-1 text-xs text-muted-foreground">총 {votes.length}표 · 평균 <span className="font-mono font-semibold text-[#C85A1A]">{finalScore}</span>점</div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setSubmitted(true)} disabled={votes.length === 0 || submitted}
                  className="flex-1 py-2.5 rounded-lg bg-[#C85A1A] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#A8481A] transition-colors">
                  {submitted ? "최종 점수 확정됨" : "점수 확정"}
                </button>
                <button onClick={() => { setVotes([]); setSubmitted(false); }} className="px-3 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted transition-colors">초기화</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Page ────────────────────────────────────────────────────────────

function EmployeePage() {
  const [search, setSearch] = useState("");
  const filtered = EMPLOYEES.filter(e => e.name.includes(search) || e.department.includes(search) || e.position.includes(search));

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 py-7 max-w-5xl">
        <div className="mb-7">
          <h1 className="text-xl font-semibold text-foreground">사원 및 관계 데이터 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">사내 관계 정보를 등록하여 AI 오판을 방지합니다</p>
        </div>
        <div className="flex items-center justify-between mb-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 부서, 직위 검색..."
              className="pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#C85A1A] focus:ring-1 focus:ring-[#C85A1A] transition-colors w-64" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C85A1A] text-white text-sm font-medium hover:bg-[#A8481A] transition-colors">
            <Upload size={14} />인사 엑셀 가져오기
          </button>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["사번", "이름", "부서", "직위", "가족/커플 관계", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((emp, idx) => (
                <tr key={emp.id} className={`hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{emp.id}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground">{emp.name}</td>
                  <td className="px-4 py-3.5 text-foreground">{emp.department}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{emp.position}</td>
                  <td className="px-4 py-3.5">
                    {emp.relation ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 border border-rose-200 text-rose-700">
                        <Heart size={10} className="fill-rose-400 text-rose-400" />{emp.relation} — {emp.relationName}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="text-xs text-muted-foreground hover:text-[#C85A1A] transition-colors">관계 설정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{filtered.length}명 표시 / 전체 {EMPLOYEES.length}명</span>
            <span className="text-xs text-muted-foreground">관계 등록: <span className="font-semibold text-rose-600">{EMPLOYEES.filter(e => e.relation).length}명</span></span>
          </div>
        </div>
        <div className="mt-5 p-4 bg-card rounded-xl border border-border">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">관계 유형 안내</div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Heart size={10} className="fill-rose-400 text-rose-400" />커플 — 점수 평가 제외</div>
            <div className="flex items-center gap-1.5"><Heart size={10} className="fill-amber-400 text-amber-400" />가족 — 점수 평가 제외</div>
            <div className="flex items-center gap-1.5"><Heart size={10} className="fill-blue-400 text-blue-400" />상급자 — 가중치 검토</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Chatbot Widget ───────────────────────────────────────────────────────────

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(PRESET_CHAT);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text, timestamp: new Date() }]);
    setTyping(true);
    setTimeout(() => {
      let response: { text: string; table?: ChatMessage["table"]; links?: ChatMessage["links"] };
      const key = Object.keys(AI_RESPONSES).find(k => k !== "default" && text.includes(k));
      const raw = key ? AI_RESPONSES[key] : AI_RESPONSES.default;
      if (typeof raw === "string") {
        response = { text: raw };
      } else {
        response = raw as { text: string; table?: ChatMessage["table"]; links?: ChatMessage["links"] };
      }
      setMessages(m => [...m, { role: "ai", ...response, timestamp: new Date() }]);
      setTyping(false);
    }, 1200 + Math.random() * 600);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#C85A1A] text-white shadow-xl flex items-center justify-center hover:bg-[#A8481A] transition-all hover:scale-105 active:scale-95"
        aria-label="AI 챗봇 열기"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-[#2C1A0E]">
            <div className="w-8 h-8 rounded-full bg-[#C85A1A] flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-[#F7EEE8]">사랑 AI 비서</div>
              <div className="text-[10px] text-[#F7EEE8]/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />온라인 · 실시간 응답
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#F7EEE8]/40 hover:text-[#F7EEE8] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-[#C85A1A]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={11} className="text-[#C85A1A]" />
                  </div>
                )}
                <div className={`max-w-[80%] space-y-2`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#C85A1A] text-white rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {msg.text.split("**").map((part, pi) =>
                      pi % 2 === 1 ? <strong key={pi}>{part}</strong> : <span key={pi}>{part}</span>
                    )}
                  </div>
                  {msg.table && (
                    <div className="rounded-xl border border-border overflow-hidden text-xs">
                      <div className="bg-muted/50">
                        <div className="flex border-b border-border">
                          {msg.table.headers.map(h => (
                            <div key={h} className="flex-1 px-2.5 py-1.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">{h}</div>
                          ))}
                        </div>
                        {msg.table.rows.map((row, ri) => (
                          <div key={ri} className={`flex ${ri % 2 ? "bg-white" : ""}`}>
                            {row.map((cell, ci) => (
                              <div key={ci} className="flex-1 px-2.5 py-1.5 text-[10px] text-foreground font-mono truncate">{cell}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.links && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.links.map(link => (
                        <button key={link.id} className="text-[10px] px-2.5 py-1 rounded-full bg-accent border border-[#C85A1A]/20 text-[#C85A1A] font-medium hover:bg-[#C85A1A] hover:text-white transition-colors">
                          {link.label} →
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`text-[9px] text-muted-foreground/60 ${msg.role === "user" ? "text-right" : ""}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#C85A1A]/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={11} className="text-[#C85A1A]" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested queries */}
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
            {["중복 몇 건?", "이민호 이력 조회", "미처리 건 요약"].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-[#C85A1A] hover:text-[#C85A1A] transition-colors bg-card whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="사랑 AI에게 무엇이든 물어보세요..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button onClick={send} disabled={!input.trim() || typing}
                className="w-7 h-7 rounded-lg bg-[#C85A1A] flex items-center justify-center disabled:opacity-40 hover:bg-[#A8481A] transition-colors flex-shrink-0">
                <Send size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="flex h-screen bg-background font-['Noto_Sans_KR',sans-serif] overflow-hidden">
      <Sidebar page={page} setPage={setPage} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {page === "dashboard" && <DashboardPage setPage={setPage} />}
        {page === "upload" && <UploadPage />}
        {page === "review" && <ReviewPage setPage={setPage} />}
        {page === "employees" && <EmployeePage />}
        <ChatbotWidget />
      </main>
    </div>
  );
}
