import React, { useState } from 'react';
import useAppStore from '../store';
import { Brain, GraduationCap, Shield, Eye, EyeOff, Code2, Cpu } from 'lucide-react';

const ROLES = [
  { key: 'student', label: 'Student', icon: GraduationCap, color: 'sky', border: 'border-sky-500/40', bg: 'bg-sky-500/10', glow: 'shadow-[0_0_20px_rgba(14,165,233,0.3)]', text: 'text-sky-400', desc: 'View roadmap, mentor chat, documents' },
  { key: 'teacher', label: 'Teacher', icon: Brain, color: 'violet', border: 'border-violet-500/40', bg: 'bg-violet-500/10', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]', text: 'text-violet-400', desc: 'Class analytics, risk alerts, assignments' },
  { key: 'admin', label: 'Admin', icon: Shield, color: 'teal', border: 'border-teal-500/40', bg: 'bg-teal-500/10', glow: 'shadow-[0_0_20px_rgba(20,184,166,0.3)]', text: 'text-teal-400', desc: 'Org-wide insights, disputes, user mgmt' },
];

export default function Login() {
  const login = useAppStore((s) => s.login);
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('rahul@college.edu');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const roleEmails = { student: 'rahul@college.edu', teacher: 'priya@college.edu', admin: 'admin@college.edu' };

  const handleRoleSelect = (roleObj) => {
    setSelectedRole(roleObj);
    setEmail(roleEmails[roleObj.key]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      
      {/* Premium background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0 mask-image:linear-gradient(to_bottom,white,transparent)" />
      
      <div className="w-full max-w-md relative z-10 fade-in-up">
        
        {/* Brand Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-3 mb-2 px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 via-purple-500 to-sky-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)]">
              <Brain size={24} className="text-white" />
            </div>
            <span className="text-3xl font-bold font-space tracking-tight text-white">EduPulse</span>
          </div>
          <p className="text-slate-400 font-medium text-sm mt-3 tracking-wide">
            AI-powered Academic Intelligence
          </p>
        </div>

        {/* Auth Card */}
        <div className="premium-card p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm">Select your portal role to continue</p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {ROLES.map((role) => {
              const isSelected = selectedRole.key === role.key;
              return (
                <button
                  key={role.key}
                  onClick={() => handleRoleSelect(role)}
                  type="button"
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                    isSelected 
                      ? `${role.border} ${role.bg} ${role.glow}` 
                      : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-400'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? role.bg + ' ' + role.text + ' border ' + role.border : 'bg-slate-800 text-slate-500'}`}>
                    <role.icon size={20} />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {role.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                      {role.desc}
                    </div>
                  </div>
                  
                  {/* Active Indicator Radio */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? role.border : 'border-slate-600'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full transition-all ${isSelected ? 'bg-current ' + role.text + ' scale-100' : 'bg-transparent scale-0'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Cpu size={14} /> System ID / Email
              </label>
              <input 
                className="input-premium" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Code2 size={14} /> Security Token
              </label>
              <div className="relative">
                <input 
                  className="input-premium pr-12" 
                  type={showPass ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              className={`btn-premium w-full h-[52px] mt-4 ${selectedRole.glow.replace('0_0_20px', '0_8px_32px')}`} 
              type="submit" 
              disabled={loading}
              style={{
                background: selectedRole.key === 'student' ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 
                            selectedRole.key === 'teacher' ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' :
                            'linear-gradient(135deg, #0d9488, #2dd4bf)'
              }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="text-[15px] font-bold tracking-wide">Initialize Interface</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-8 font-medium tracking-wide">
          Intelligence Core v2.0.4<br/>
          <span className="opacity-60">Authentication tokens pre-filled for demo</span>
        </p>
      </div>
    </div>
  );
}
