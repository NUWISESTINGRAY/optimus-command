import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Mail, Lock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-wider">OPTIMUS</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">Executive AI Operating System</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8">
          <h2 className="text-lg font-display font-semibold text-foreground mb-1">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to your command center" : "Initialize your OPTIMUS instance"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-md bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-md bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-md bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              {mode === "signin" ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "signin" ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          OPTIMUS Executive AI Operating System · v1.0
        </p>
      </motion.div>
    </div>
  );
}
