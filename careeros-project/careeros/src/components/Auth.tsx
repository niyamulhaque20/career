import { useState, type FormEvent } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Card } from "./Card";
import { Input } from "./Input";
import { Button } from "./Button";

type AcademicStage = "Class 11" | "Class 12" | "HSC Candidate" | "University Student";

type CareerGoal = 
  | "Medical Admission"
  | "Engineering Admission"
  | "Embedded Engineer"
  | "AI Engineer"
  | "Robotics Engineer"
  | "VLSI Engineer"
  | "Software Engineer"
  | "Researcher";

const CAREER_GOALS_BY_STAGE: Record<AcademicStage, CareerGoal[]> = {
  "Class 11": ["Medical Admission", "Engineering Admission", "Researcher"],
  "Class 12": ["Medical Admission", "Engineering Admission", "Researcher"],
  "HSC Candidate": ["Medical Admission", "Engineering Admission"],
  "University Student": [
    "Embedded Engineer",
    "AI Engineer",
    "Robotics Engineer",
    "VLSI Engineer",
    "Software Engineer",
    "Researcher",
  ],
};

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [academicStage, setAcademicStage] = useState<AcademicStage>("University Student");
  const [careerGoal, setCareerGoal] = useState<CareerGoal>("Software Engineer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const initial = name.trim().charAt(0).toUpperCase() || "U";

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          profile: {
            name: name || "New User",
            initial,
            academicStage,
            careerGoal,
            university: "",
            department: "",
            cgpa: 0,
            cgpaGoal: 0,
          },
          state: {
            xp: 0,
            completedToday: 0,
            weeklyHours: 0,
            streakDays: 0,
            phaseProgress: 0,
            completedMissions: [],
          },
          roadmap: [],
          dailyMissions: [],
          weeklyTasks: [],
          subjects: [],
          checklist: [],
          reminders: [],
          email,
          createdAt: new Date(),
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <Card className="w-full max-w-md p-8 glass">
        <div className="mb-6">
          <h2 className="text-3xl section-title text-white mb-2">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="subtle text-sm">
            {isLogin ? "Sign in to access your CareerOS dashboard." : "Sign up and start your learning journey."}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div>
                <label className="form-label mb-1 block">Name</label>
                <Input
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                  type="text"
                  required
                />
              </div>
              <div>
                <label className="form-label mb-1 block">Academic Stage</label>
                <select
                  value={academicStage}
                  onChange={e => {
                    const stage = e.target.value as AcademicStage;
                    setAcademicStage(stage);
                    // Auto-select first career goal for new stage
                    const goals = CAREER_GOALS_BY_STAGE[stage];
                    if (goals.length > 0) {
                      setCareerGoal(goals[0]);
                    }
                  }}
                  className="w-full fancy-input appearance-none bg-[rgba(255,255,255,0.05)] text-white focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
                >
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="HSC Candidate">HSC Candidate</option>
                  <option value="University Student">University Student</option>
                </select>
              </div>
              <div>
                <label className="form-label mb-1 block">Career Goal</label>
                <select
                  value={careerGoal}
                  onChange={e => setCareerGoal(e.target.value as CareerGoal)}
                  className="w-full fancy-input appearance-none bg-[rgba(255,255,255,0.05)] text-white focus:border-transparent focus:ring-2 focus:ring-[rgba(124,106,247,0.18)]"
                >
                  {CAREER_GOALS_BY_STAGE[academicStage].map(goal => (
                    <option key={goal} value={goal}>{goal}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          <div>
            <label className="form-label mb-1 block">Email</label>
            <Input
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              required
            />
          </div>
          
          <div>
            <label className="form-label mb-1 block">Password</label>
            <Input
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              required
            />
          </div>
          
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={loading}
          >
            {loading ? "Loading..." : (isLogin ? "Login" : "Sign Up")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-[#7C6AF7] hover:text-white text-sm"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
}
