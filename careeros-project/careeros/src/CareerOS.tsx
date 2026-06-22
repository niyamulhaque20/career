import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card } from "./components/Card";
import { Badge } from "./components/Badge";
import { ProgressBar } from "./components/ProgressBar";
import { SectionHeader } from "./components/SectionHeader";
import { Button } from "./components/Button";
import { Input } from "./components/Input";
import { Auth } from "./components/Auth";

// Types
type RoadmapPhase = {
  id: number;
  name: string;
  icon: string;
  color: string;
  duration: string;
  status: "active" | "locked" | "completed";
  why: string;
  careerImpact: number;
  researchImpact: number;
  topics: string[];
  projects: string[];
  resources: { title: string; url: string; type: string }[];
};

type Subject = {
  name: string;
  code: string;
  credit: number;
};

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type UserProfile = {
  name: string;
  initial: string;
  university: string;
  department: string;
  semester: string;
  cgpa: number;
  cgpaGoal: number;
};

type AppState = {
  xp: number;
  completedToday: number;
  weeklyHours: number;
  streakDays: number;
  phaseProgress: number;
  completedMissions: string[];
};

// Default data
const DEFAULT_PROFILE: UserProfile = {
  name: "Your Name",
  initial: "Y",
  university: "Your University",
  department: "Your Department",
  semester: "Semester 1",
  cgpa: 3.0,
  cgpaGoal: 3.5,
};

const DEFAULT_STATE: AppState = {
  xp: 0,
  completedToday: 0,
  weeklyHours: 0,
  streakDays: 0,
  phaseProgress: 0,
  completedMissions: [],
};

const LEVELS = [
  { level: 1, name: "Starter Engineer", xpRequired: 0 },
  { level: 2, name: "Explorer", xpRequired: 200 },
  { level: 3, name: "Builder", xpRequired: 500 },
  { level: 4, name: "Master", xpRequired: 1000 },
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⚡" },
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
  { id: "academic", label: "Academic", icon: "🎓" },
  { id: "studyjebu", label: "StudyJebu", icon: "🚀" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// Helper function
function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }
  const progress = nextLevel
    ? ((xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
    : 100;
  return { currentLevel, nextLevel, progress: Math.min(progress, 100) };
}

export default function CareerOS() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("dashboard");

  // Data state
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showXPToast, setShowXPToast] = useState(false);
  const [xpToShow, setXpToShow] = useState(0);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser.uid);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Load data from Firestore
  const loadUserData = async (uid: string) => {
    try {
      // Load profile
      const profileDoc = await getDoc(doc(db, "users", uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setProfile(data.profile || DEFAULT_PROFILE);
        setAppState(data.state || DEFAULT_STATE);
        setRoadmap(data.roadmap || []);
        setSubjects(data.subjects || []);
        setChecklist(data.checklist || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // Save data to Firestore
  const saveUserData = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        profile,
        state: appState,
        roadmap,
        subjects,
        checklist,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Save whenever data changes
  useEffect(() => {
    if (user) {
      saveUserData();
    }
  }, [profile, appState, roadmap, subjects, checklist, user]);

  const handleSignOut = () => signOut(auth);

  const handleAddXP = (amount: number) => {
    setAppState(prev => ({ ...prev, xp: prev.xp + amount }));
    setXpToShow(amount);
    setShowXPToast(true);
  };

  // If loading, show nothing
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // If not logged in, show Auth
  if (!user) {
    return <Auth />;
  }

  // Render pages
  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard state={appState} profile={profile} roadmap={roadmap} onAddXP={handleAddXP} />;
      case "roadmap":
        return <Roadmap roadmap={roadmap} setRoadmap={setRoadmap} onAddXP={handleAddXP} />;
      case "academic":
        return <Academic subjects={subjects} setSubjects={setSubjects} />;
      case "studyjebu":
        return <StudyJebu checklist={checklist} setChecklist={setChecklist} />;
      case "settings":
        return <Settings profile={profile} setProfile={setProfile} state={appState} setState={setAppState} onSignOut={handleSignOut} />;
      default:
        return null;
    }
  };

  const levelInfo = getLevelInfo(appState.xp);
  const level = { ...levelInfo.currentLevel, nextLevel: levelInfo.nextLevel };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar 
        active={active} 
        setActive={setActive} 
        xp={appState.xp} 
        level={level} 
        profile={profile} 
      />
      <main className="flex-1 overflow-y-auto bg-[#0A0A0F]">
        {renderPage()}
      </main>
      {showXPToast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-2 bg-[#1E1E2E] border border-[#7C6AF7] rounded-xl px-4 py-2 shadow-[0_0_20px_rgba(124,106,247,0.4)]">
            <span className="text-[#F472B6] text-lg">⚡</span>
            <span className="font-mono text-[#7C6AF7] font-bold">+{xpToShow} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar
function Sidebar({ 
  active, setActive, xp, level, profile 
}: { 
  active: string; setActive: (id: string) => void; 
  xp: number; level: any; profile: UserProfile;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`flex flex-col bg-[#0A0A0F] border-r border-[#1E1E2E] transition-all duration-300 ${collapsed ? "w-16" : "w-56"} shrink-0`}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#1E1E2E]">
        {!collapsed && (
          <div>
            <span className="text-[#7C6AF7] font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Career<span className="text-white">OS</span></span>
            <p className="text-[10px] text-[#475569] font-mono">v1.0</p>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} className="text-[#475569] hover:text-white text-lg">
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 py-3 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C6AF7] to-[#F472B6] flex items-center justify-center text-white text-sm font-bold">{profile.initial}</div>
            <div>
              <p className="text-xs font-semibold text-white">{profile.name}</p>
              <p className="text-[10px] text-[#475569]">{level.name}</p>
            </div>
          </div>
          <div className="mt-2">
            <ProgressBar value={xp} max={level.nextLevel?.xpRequired || xp} color="#7C6AF7" height={3} />
            <p className="text-[10px] text-[#475569] mt-1 font-mono">{xp} XP · Lv {level.level}</p>
          </div>
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
              ${active === item.id ? "bg-[#7C6AF7]22 text-[#7C6AF7] border-r-2 border-[#7C6AF7]" : "text-[#64748B] hover:text-white hover:bg-[#1E1E2E]"}`}>
            <span className="text-base">{item.icon}</span>
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// Dashboard
function Dashboard({ 
  state, profile, roadmap, onAddXP 
}: { 
  state: AppState; profile: UserProfile; roadmap: RoadmapPhase[]; onAddXP: (amount: number) => void;
}) {
  const levelInfo = getLevelInfo(state.xp);
  const currentPhase = roadmap.find(p => p.status === "active") || roadmap[0];

  return (
    <div className="p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12121A] to-[#1E1E2E] border border-[#7C6AF7]33 p-6">
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[#7C6AF7] text-xs font-mono uppercase tracking-widest">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}</p>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {profile.name} — Welcome back! 🎯
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[#475569] text-xs font-mono">CURRENT LEVEL</p>
            <p className="text-[#7C6AF7] font-bold text-lg">{levelInfo.currentLevel.name}</p>
            <p className="text-white font-mono text-2xl font-bold">{state.xp.toLocaleString()} <span className="text-[#475569] text-sm">XP</span></p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#475569] mb-1">
            <span>Level {levelInfo.currentLevel.level}</span>
            {levelInfo.nextLevel && <span>Level {levelInfo.nextLevel.level} — {levelInfo.nextLevel.xpRequired.toLocaleString()} XP</span>}
          </div>
          <ProgressBar value={levelInfo.progress} max={100} color="#7C6AF7" height={8} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="CGPA Goal" value={`${profile.cgpaGoal}+`} sub={`Current: ${profile.cgpa}`} icon="📊" color="#22D3EE" />
        <StatCard label="Streak" value={`${state.streakDays}d`} sub="Keep going!" icon="🔥" color="#F472B6" />
        <StatCard label="This Week" value={`${state.weeklyHours}h`} sub="Logged" icon="⏱️" color="#34D399" />
        <StatCard label="Phases" value={`${roadmap.filter(p => p.status === "completed").length}/${roadmap.length}`} sub="Completed" icon="⚙️" color="#7C6AF7" />
      </div>

      {currentPhase && (
        <Card glow>
          <SectionHeader title="Current Phase" sub={`You're on Phase ${currentPhase.id}`} />
          <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg, #7C6AF711, transparent)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: currentPhase.color + "22", border: `1px solid ${currentPhase.color}44` }}>
                {currentPhase.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{currentPhase.name}</h3>
                <p className="text-xs text-[#475569]">{currentPhase.duration}</p>
              </div>
            </div>
            <p className="text-sm text-[#64748B] mb-3">{currentPhase.why}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E]">
                <p className="text-xs text-[#475569] font-mono">Career Impact</p>
                <p className="text-lg font-bold text-[#22D3EE]">{currentPhase.careerImpact}%</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E]">
                <p className="text-xs text-[#475569] font-mono">Research Impact</p>
                <p className="text-lg font-bold text-[#F472B6]">{currentPhase.researchImpact}%</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "#7C6AF7" }: { 
  label: string; value: string | number; sub?: string; icon: string; color?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-widest font-mono">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
          {sub && <p className="text-xs text-[#475569] mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}

// Roadmap
function Roadmap({ 
  roadmap, setRoadmap, onAddXP 
}: { roadmap: RoadmapPhase[]; setRoadmap: (v: RoadmapPhase[]) => void; onAddXP: (amount: number) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<RoadmapPhase | null>(null);
  const [formData, setFormData] = useState({
    name: "", icon: "📌", color: "#7C6AF7", duration: "4 weeks", status: "locked" as const,
    why: "", careerImpact: 50, researchImpact: 50, topics: "", projects: "", resources: ""
  });

  const handleAddPhase = () => {
    setEditingPhase(null);
    setFormData({
      name: "", icon: "📌", color: "#7C6AF7", duration: "4 weeks", status: "locked",
      why: "", careerImpact: 50, researchImpact: 50, topics: "", projects: "", resources: ""
    });
    setIsModalOpen(true);
  };

  const handleEditPhase = (phase: RoadmapPhase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name, icon: phase.icon, color: phase.color, duration: phase.duration, status: phase.status,
      why: phase.why, careerImpact: phase.careerImpact, researchImpact: phase.researchImpact,
      topics: phase.topics.join(", "), projects: phase.projects.join(", "),
      resources: phase.resources.map(r => `${r.title}|${r.url}|${r.type}`).join("\n")
    });
    setIsModalOpen(true);
  };

  const handleSavePhase = () => {
    const newPhase: RoadmapPhase = {
      id: editingPhase ? editingPhase.id : Date.now(),
      ...formData,
      topics: formData.topics.split(",").map(t => t.trim()).filter(Boolean),
      projects: formData.projects.split(",").map(p => p.trim()).filter(Boolean),
      resources: formData.resources.split("\n").map(line => {
        const [title, url, type] = line.split("|").map(s => s.trim());
        return title && url ? { title, url, type: type || "Resource" } : null;
      }).filter(Boolean) as { title: string; url: string; type: string }[]
    };

    if (editingPhase) {
      setRoadmap(roadmap.map(p => p.id === editingPhase.id ? newPhase : p));
    } else {
      setRoadmap([...roadmap, newPhase].sort((a, b) => a.id - b.id));
    }
    setIsModalOpen(false);
  };

  const handleDeletePhase = (id: number) => {
    if (confirm("Are you sure you want to delete this phase?")) {
      setRoadmap(roadmap.filter(p => p.id !== id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Career Roadmap" 
        sub={`${roadmap.length} phases to your goal`}
        action={<Button onClick={handleAddPhase}>+ Add Phase</Button>}
      />
      <div className="space-y-4">
        {roadmap.sort((a, b) => a.id - b.id).map(phase => (
          <Card key={phase.id} glow={phase.status === "active"}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: phase.color + "22", border: `1px solid ${phase.color}44` }}>
                {phase.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Phase {phase.id}: {phase.name}
                    </h3>
                    <p className="text-xs text-[#475569]">{phase.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={phase.color}>{phase.status}</Badge>
                    <button onClick={() => handleEditPhase(phase)} className="text-[#64748B] hover:text-[#7C6AF7] text-sm">Edit</button>
                    <button onClick={() => handleDeletePhase(phase.id)} className="text-[#64748B] hover:text-red-500 text-sm">Delete</button>
                  </div>
                </div>
                <p className="text-sm text-[#64748B] mb-3">{phase.why}</p>
                {phase.topics.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-[#475569] font-mono mb-2 uppercase tracking-widest">Topics</p>
                    <div className="flex flex-wrap gap-2">
                      {phase.topics.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-[#1E1E2E] text-[#94A3B8]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {phase.resources.length > 0 && (
                  <div>
                    <p className="text-xs text-[#475569] font-mono mb-2 uppercase tracking-widest">Resources</p>
                    <div className="space-y-1">
                      {phase.resources.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[#7C6AF7] hover:text-[#9A88FF] flex items-center gap-2">
                          <Badge color={phase.color}>{r.type}</Badge>
                          {r.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPhase ? "Edit Phase" : "Add Phase"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Phase Name</label>
              <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g., C Programming" />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Icon</label>
              <Input value={formData.icon} onChange={v => setFormData({ ...formData, icon: v })} placeholder="e.g., ⚙️" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Duration</label>
              <Input value={formData.duration} onChange={v => setFormData({ ...formData, duration: v })} placeholder="e.g., 4 weeks" />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Color</label>
              <Input type="color" value={formData.color} onChange={v => setFormData({ ...formData, color: v })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Status</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] text-white focus:border-[#7C6AF7] focus:outline-none"
            >
              <option value="locked">Locked</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Description</label>
            <textarea
              value={formData.why}
              onChange={e => setFormData({ ...formData, why: e.target.value })}
              placeholder="Why this phase is important"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] text-white placeholder-[#475569] focus:border-[#7C6AF7] focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Career Impact (%)</label>
              <Input type="number" value={String(formData.careerImpact)} onChange={v => setFormData({ ...formData, careerImpact: Number(v) })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Research Impact (%)</label>
              <Input type="number" value={String(formData.researchImpact)} onChange={v => setFormData({ ...formData, researchImpact: Number(v) })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Topics (comma-separated)</label>
            <Input value={formData.topics} onChange={v => setFormData({ ...formData, topics: v })} placeholder="Topic 1, Topic 2" />
          </div>
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Resources (one per line: Title|URL|Type)</label>
            <textarea
              value={formData.resources}
              onChange={e => setFormData({ ...formData, resources: e.target.value })}
              placeholder="Example Course|https://example.com|Course"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] text-white placeholder-[#475569] focus:border-[#7C6AF7] focus:outline-none resize-none"
            />
          </div>
          <Button onClick={handleSavePhase} className="w-full">Save Phase</Button>
        </div>
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-white text-2xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Academic
function Academic({ subjects, setSubjects }: { subjects: Subject[]; setSubjects: (v: Subject[]) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", credit: 3 });

  const handleAddSubject = () => {
    setEditingSubject(null);
    setFormData({ name: "", code: "", credit: 3 });
    setIsModalOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData(subject);
    setIsModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (editingSubject) {
      setSubjects(subjects.map(s => s.code === editingSubject.code ? formData : s));
    } else {
      setSubjects([...subjects, formData]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteSubject = (code: string) => {
    if (confirm("Delete this subject?")) {
      setSubjects(subjects.filter(s => s.code !== code));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="Academic Tracker" 
        sub="Manage your courses"
        action={<Button onClick={handleAddSubject}>+ Add Subject</Button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((sub, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#475569] font-mono">{sub.code}</p>
                <h3 className="text-lg font-bold text-white mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{sub.name}</h3>
                <p className="text-xs text-[#64748B] mt-1">{sub.credit} credits</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditSubject(sub)} className="text-[#64748B] hover:text-[#7C6AF7] text-sm">Edit</button>
                <button onClick={() => handleDeleteSubject(sub.code)} className="text-[#64748B] hover:text-red-500 text-sm">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? "Edit Subject" : "Add Subject"}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Subject Name</label>
            <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g., Mathematics" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Course Code</label>
              <Input value={formData.code} onChange={v => setFormData({ ...formData, code: v })} placeholder="e.g., MATH 101" />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Credits</label>
              <Input type="number" value={String(formData.credit)} onChange={v => setFormData({ ...formData, credit: Number(v) })} />
            </div>
          </div>
          <Button onClick={handleSaveSubject} className="w-full">Save Subject</Button>
        </div>
      </Modal>
    </div>
  );
}

// StudyJebu
function StudyJebu({ checklist, setChecklist }: { checklist: ChecklistItem[]; setChecklist: (v: ChecklistItem[]) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");

  const handleAddItem = () => {
    if (newItemLabel.trim()) {
      setChecklist([...checklist, { id: Date.now().toString(), label: newItemLabel, done: false }]);
      setNewItemLabel("");
      setIsModalOpen(false);
    }
  };

  const toggleItem = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const deleteItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <SectionHeader 
        title="StudyJebu" 
        sub="Your startup checklist"
        action={<Button onClick={() => setIsModalOpen(true)}>+ Add Item</Button>}
      />
      <Card>
        <div className="space-y-3">
          {checklist.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[#0A0A0F]">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`w-6 h-6 rounded border flex items-center justify-center ${item.done ? "bg-[#34D399] border-[#34D399]" : "border-[#475569] hover:border-[#7C6AF7]"}`}
                >
                  {item.done && <span className="text-white text-xs">✓</span>}
                </button>
                <span className={item.done ? "text-[#475569] line-through" : "text-white"}>{item.label}</span>
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-[#64748B] hover:text-red-500 text-sm">Delete</button>
            </div>
          ))}
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Checklist Item">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">Item</label>
            <Input value={newItemLabel} onChange={setNewItemLabel} placeholder="e.g., Launch website" />
          </div>
          <Button onClick={handleAddItem} className="w-full">Add Item</Button>
        </div>
      </Modal>
    </div>
  );
}

// Settings
function Settings({ 
  profile, setProfile, state, setState, onSignOut 
}: { 
  profile: UserProfile; setProfile: (v: UserProfile) => void;
  state: AppState; setState: (v: AppState) => void;
  onSignOut: () => void;
}) {
  const [formData, setFormData] = useState(profile);

  const handleSave = () => setProfile(formData);

  return (
    <div className="p-6 space-y-6">
      <SectionHeader title="Settings" sub="Manage your profile and app data" />
      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Profile</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Name</label>
              <Input value={formData.name} onChange={v => setFormData({ ...formData, name: v })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Initial</label>
              <Input value={formData.initial} onChange={v => setFormData({ ...formData, initial: v })} maxLength={1} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#475569] font-mono mb-1 block">University</label>
            <Input value={formData.university} onChange={v => setFormData({ ...formData, university: v })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Department</label>
              <Input value={formData.department} onChange={v => setFormData({ ...formData, department: v })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Semester</label>
              <Input value={formData.semester} onChange={v => setFormData({ ...formData, semester: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Current CGPA</label>
              <Input type="number" step="0.01" value={String(formData.cgpa)} onChange={v => setFormData({ ...formData, cgpa: Number(v) })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">CGPA Goal</label>
              <Input type="number" step="0.01" value={String(formData.cgpaGoal)} onChange={v => setFormData({ ...formData, cgpaGoal: Number(v) })} />
            </div>
          </div>
          <Button onClick={handleSave}>Save Profile</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Stats</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Total XP</label>
              <Input type="number" value={String(state.xp)} onChange={v => setState({ ...state, xp: Number(v) })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Streak Days</label>
              <Input type="number" value={String(state.streakDays)} onChange={v => setState({ ...state, streakDays: Number(v) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Weekly Hours</label>
              <Input type="number" value={String(state.weeklyHours)} onChange={v => setState({ ...state, weeklyHours: Number(v) })} />
            </div>
            <div>
              <label className="text-xs text-[#475569] font-mono mb-1 block">Completed Today</label>
              <Input type="number" value={String(state.completedToday)} onChange={v => setState({ ...state, completedToday: Number(v) })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Account</h3>
        <Button variant="danger" onClick={onSignOut}>Sign Out</Button>
      </Card>
    </div>
  );
}
