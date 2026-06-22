import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Card } from "./Card";
import { Input } from "./Input";
import { Button } from "./Button";

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          email: email,
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
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F] p-4">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {isLogin ? "Login" : "Sign Up"}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs text-[#64748B] font-mono mb-1 block">Name</label>
              <Input
                value={name}
                onChange={setName}
                placeholder="Your name"
                type="text"
                required
              />
            </div>
          )}
          
          <div>
            <label className="text-xs text-[#64748B] font-mono mb-1 block">Email</label>
            <Input
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              type="email"
              required
            />
          </div>
          
          <div>
            <label className="text-xs text-[#64748B] font-mono mb-1 block">Password</label>
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
            className="w-full mt-6"
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
            className="text-[#7C6AF7] hover:text-[#9A88FF] text-sm"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
}
