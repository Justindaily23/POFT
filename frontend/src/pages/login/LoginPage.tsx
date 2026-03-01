import { Header } from "@/components/login/Header";
import { Footer } from "@/components/login/Footer";
import { LoginForm } from "@/components/login/LoginForm";
import { ShieldCheck, Lock, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    /* 
      FIX 1: Change min-h-screen to h-screen and add overflow-hidden.
      This locks the Header and Footer to the top/bottom edges and 
      prevents the "Larger than screen" scrolling issue.
    */
    <div className="flex flex-col h-screen bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-50 via-white to-slate-100 font-sans overflow-hidden">
      <Header />

      {/* 
        FIX 2: Use flex-1 and overflow-y-auto. 
        If the screen is small (like a laptop), only the middle content will scroll, 
        keeping the Header and Footer visible at all times.
      */}
      <main className="flex-1 flex items-center justify-center px-4 overflow-y-auto py-6">
        {/* 
          FIX 3: Standard max-w-lg (512px) ensures Vite/Tailwind v4 
          recognizes the width correctly on Vercel. 
        */}
        <div className="w-full max-w-lg flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500 py-4">
          {/* Brand Title */}
          <div className="flex flex-col items-center mb-6 md:mb-8">
            <div className="flex items-center gap-3 md:gap-5 mb-2 w-full justify-center opacity-90">
              <div className="h-[1px] flex-1 max-w-[40px] md:max-w-[60px] bg-blue-600/30" />
              <h1 className="text-[14px] sm:text-[18px] md:text-[20px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-900 text-center whitespace-nowrap">
                Stecam Nigeria Limited
              </h1>
              <div className="h-[1px] flex-1 max-w-[40px] md:max-w-[60px] bg-blue-600/30" />
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-blue-600" />
              <p className="text-[9px] md:text-[10px] font-bold text-green-800 uppercase tracking-[0.2em]">
                Process Operations & Finance Tracking
              </p>
            </div>
          </div>

          {/* 
            Login Card 
            FIX 4: Use bg-white instead of white/95 to prevent "Mirage" transparency issues.
            Reduced padding to p-8 to ensure it fits comfortably on 13-inch laptop screens.
          */}
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />

            <div className="mb-6 text-center">
              <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] text-slate-700 mb-3">
                Identity Verification
              </h2>
              <div className="h-1 w-10 bg-slate-200 mx-auto rounded-full" />
            </div>

            {/* Your Login Logic */}
            <LoginForm />

            {/* Secure Footer Section */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[9px] md:text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  Encrypted SSL Session
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Assistance & Compliance */}
          <div className="mt-6 flex flex-col items-center space-y-3">
            <Link
              to="/forgot-password"
              className="flex items-center gap-2 text-[11px] md:text-[12px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-all group"
            >
              <HelpCircle className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
              <span>Forgot Credentials?</span>
              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                →
              </span>
            </Link>

            <p className="text-[8px] md:text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-60">
              © {new Date().getFullYear()} Stecam Group Systems
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
