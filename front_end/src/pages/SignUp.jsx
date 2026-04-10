import React from 'react';
import { SignUp } from '@clerk/react';
import { dark } from '@clerk/themes';
import logo from '../assets/veloris-logo.png';
import { Shield, Activity, Users, Database } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a] font-inter flex-row-reverse">
      
      {/* Right Form Panel (Reversed for SignUp to look dynamic) */}
      <div className="w-full lg:w-[500px] shrink-0 flex flex-col justify-center px-8 sm:px-16 relative bg-[#0a0a0a] z-10 border-l border-white/[0.05]">
        
        {/* Top Right Logo */}
        <div className="absolute top-10 right-8 sm:right-16 flex items-center gap-2 cursor-pointer" onClick={() => window.location.href='/'}>
          <span className="text-xl font-bold font-space tracking-tight text-white">Veloris</span>
          <img src={logo} alt="Veloris Logo" className="w-[28px] h-[28px] object-contain opacity-90 filter grayscale" />
        </div>

        {/* Auth Component Container */}
        <div className="w-full mt-16 sm:mt-0">
          <SignUp 
            routing="path" 
            path="/signup" 
            signInUrl="/login"
            appearance={{
              baseTheme: dark,
              elements: {
                card: "bg-transparent border-0 shadow-none p-0 w-full",
                headerTitle: "text-white font-space text-[32px] font-bold mb-1",
                headerSubtitle: "text-white/50 font-inter text-sm mb-6",
                socialButtonsBlockButton: "border border-white/10 bg-transparent hover:bg-white/5 transition-colors text-white h-[46px] rounded-none",
                socialButtonsBlockButtonText: "text-white font-medium text-sm",
                socialButtonsBlockButtonArrow: "text-white/40",
                dividerLine: "bg-white/10",
                dividerText: "text-white/40 text-[11px] uppercase tracking-widest font-semibold",
                formFieldLabel: "text-white/70 font-semibold text-[13px] mb-1.5",
                formFieldInput: "bg-black border border-white/10 text-white focus:border-white/40 rounded-none h-[46px] text-sm px-4",
                formButtonPrimary: "bg-white text-black hover:bg-gray-200 transition-colors border-0 rounded-none h-[46px] font-bold text-sm tracking-wide mt-2",
                footerActionText: "text-white/40 text-sm",
                footerActionLink: "text-white hover:text-white/70 text-sm font-semibold",
                identityPreviewText: "text-white/70",
                identityPreviewEditButtonIcon: "text-white/50 hover:text-white",
                formFieldWarningText: "text-white/60 text-xs",
                formFieldSuccessText: "text-white/60 text-xs",
                main: "gap-6",
                header: "mb-2",
              }
            }}
          />
        </div>
      </div>

      {/* Left Marketing Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#030303] flex-col justify-center items-end p-24 text-right">
        
        {/* Abaka-style Wireframe Grid */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-80" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
          }}
        />

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-3/4 w-[400px] h-[400px] bg-white/[0.02] border border-white/[0.05] rounded-full blur-none pointer-events-none fade-in-up" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-white/[0.01] border border-white/[0.03] rounded-full blur-none pointer-events-none fade-in-up" style={{ animationDelay: '0.1s' }} />

        {/* Floating animated assets */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none text-left">
          <div className="absolute top-[25%] left-[15%] opacity-60" style={{ animation: 'float 7s ease-in-out infinite' }}>
            <div className="flex items-center gap-3 px-4 py-2 border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md rounded-none">
              <span className="text-[11px] font-space text-white/70 tracking-widest uppercase font-semibold">Predictive Risk Scoring</span>
              <Activity size={16} className="text-white/70" />
            </div>
          </div>
          <div className="absolute top-[50%] left-[8%] opacity-40" style={{ animation: 'float 9s ease-in-out infinite 1.5s' }}>
            <div className="flex items-center gap-3 px-4 py-2 border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md rounded-none">
              <span className="text-[11px] font-space text-white/70 tracking-widest uppercase font-semibold">Immutable Audit Trails</span>
              <Shield size={16} className="text-white/70" />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-xl fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-[44px] lg:text-[56px] font-bold font-space text-white mb-6 leading-[1.05] tracking-tight">
            Proactive Interventions,<br />Absolute Transparency
          </h2>
          <p className="text-lg text-white/40 mb-10 leading-relaxed ml-auto max-w-md">
            Unify your academic operations with enterprise-grade risk parsing, immutable dispute resolution, and institution-wide attendance analytics.
          </p>
          
          <div className="flex flex-col gap-4 items-end mt-8 border-r border-white/10 pr-6 fade-in-up" style={{ animationDelay: '0.4s' }}>
             <div className="flex items-center gap-3 text-white/50 text-sm font-semibold">
                <span>Real-Time Sync</span>
                <Database size={14} className="text-white/30" />
             </div>
             <div className="flex items-center gap-3 text-white/50 text-sm font-semibold">
                <span>Multi-role Architecture</span>
                <Users size={14} className="text-white/30" />
             </div>
          </div>
        </div>

      </div>

    </div>
  );
}
