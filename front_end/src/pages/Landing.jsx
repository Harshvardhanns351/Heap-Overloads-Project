import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, ChevronRight, Zap, Shield, BarChart3, Map, MessageSquare, FileText } from 'lucide-react';
import logo from '../assets/veloris-logo.png';

// Animated dot grid background
function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
      }}
    />
  );
}

// Warped perspective grid (bottom)
function PerspectiveGrid() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[320px] pointer-events-none overflow-hidden"
      style={{ perspective: '600px' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'rotateX(55deg) scaleY(2)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, black 0%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

const PIPELINE_STEPS = [
  { icon: FileText, label: 'Data Collection', sub: 'Academic records & activity' },
  { icon: BarChart3, label: 'Data Curation', sub: 'Risk scoring & analytics' },
  { icon: Brain, label: 'AI Processing', sub: 'Pattern recognition' },
  { icon: Map, label: 'Model Training', sub: 'Personalized roadmaps' },
  { icon: Shield, label: 'Model Evaluation', sub: 'Continuous improvement' },
];

function IsometricCard({ icon: Icon, label, sub, index }) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Connecting line */}
      {index < PIPELINE_STEPS.length - 1 && (
        <div
          className="absolute top-[52px] left-[calc(50%+52px)] w-[calc(100%-104px)] h-px"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
            zIndex: 0,
          }}
        >
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/30"
            style={{ boxShadow: '0 0 6px rgba(255,255,255,0.4)' }}
          />
        </div>
      )}

      {/* Card */}
      <div
        className="relative z-10 w-[100px] h-[120px] flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm"
        style={{
          transform: 'perspective(400px) rotateY(-8deg) rotateX(4deg)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Top edge highlight */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <Icon size={22} className="text-white/60" strokeWidth={1.5} />
        <div className="text-center px-2">
          <div className="text-[10px] font-bold text-white/80 leading-tight">{label}</div>
          <div className="text-[9px] text-white/30 mt-0.5 leading-tight">{sub}</div>
        </div>
        {/* Step number */}
        <div className="absolute bottom-2 right-2 text-[9px] text-white/20 font-mono">0{index + 1}</div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Mentor',
    desc: 'Personalized guidance that adapts to your learning style and academic performance in real time.',
  },
  {
    icon: BarChart3,
    title: 'Risk Intelligence',
    desc: 'Early detection of academic risk patterns before they become critical, with actionable insights.',
  },
  {
    icon: Map,
    title: 'Smart Roadmaps',
    desc: 'Dynamic learning paths generated from your goals, current skills, and industry benchmarks.',
  },
  {
    icon: Zap,
    title: 'Sprint Engine',
    desc: 'Focused study sessions with time tracking, progress nodes, and performance analytics.',
  },
  {
    icon: Shield,
    title: 'Dispute Resolution',
    desc: 'Transparent academic dispute management with full audit trails and resolution tracking.',
  },
  {
    icon: MessageSquare,
    title: 'Peer Intelligence',
    desc: 'Collaborative notes, class digests, and peer-reviewed content curated by AI.',
  },
];

const STATS = [
  { value: '98%', label: 'Prediction Accuracy' },
  { value: '3x', label: 'Faster Intervention' },
  { value: '40+', label: 'Data Signals' },
  { value: '<24h', label: 'Risk Detection' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-inter overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
          <img src={logo} alt="Veloris Logo" className="w-[30px] h-[30px] object-contain logo-float transition-all" />
          <span className="text-[15px] font-bold tracking-tight text-white font-space drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]">Veloris</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-white/40 font-medium">
          <a href="#platform" className="hover:text-white/80 transition-colors">Platform</a>
          <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
          <a href="#intelligence" className="hover:text-white/80 transition-colors">Intelligence</a>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="landing-btn-ghost text-[13px] font-semibold"
        >
          Sign In <ArrowRight size={13} className="inline ml-1" />
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-32 overflow-hidden">
        <DotGrid />

        {/* Subtle center glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/[0.03] blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Pill tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[11px] text-white/50 font-medium tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
            Academic Intelligence Platform
          </div>

          <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[1.05] tracking-tight text-white mb-6 font-space">
            Academic Intelligence<br />
            <span className="text-white/40">for Frontier Education</span>
          </h1>

          <p className="text-[clamp(0.95rem,2vw,1.15rem)] text-white/40 max-w-xl mx-auto leading-relaxed mb-10 font-medium">
            Power your institution with a trustworthy AI platform that detects risk, personalizes learning, and drives outcomes.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/login')}
              className="landing-btn-primary"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              className="landing-btn-ghost"
            >
              View Demo
            </button>
          </div>

          {/* Trusted by */}
          <div className="mt-16 flex items-center justify-center gap-2 text-[11px] text-white/20 tracking-widest uppercase">
            <div className="w-8 h-px bg-white/10" />
            Trusted by leading academic institutions
            <div className="w-8 h-px bg-white/10" />
          </div>
        </div>

        <PerspectiveGrid />
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-black font-space text-white mb-1">{value}</div>
              <div className="text-[11px] text-white/30 uppercase tracking-widest font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM PIPELINE ── */}
      <section id="platform" className="py-28 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <div className="text-[11px] text-white/25 uppercase tracking-widest font-medium mb-4">How It Works</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black font-space text-white leading-tight mb-4">
            Veloris is All You Need<br />When Building Academic AI
          </h2>
          <p className="text-[13px] text-white/30 max-w-md mx-auto leading-relaxed">
            Veloris provides comprehensive data processing support, covering the whole academic AI data lifecycle.
          </p>
        </div>

        {/* Pipeline cards */}
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-0 overflow-x-auto pb-4">
          <div className="flex items-center gap-0 min-w-max mx-auto">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <IsometricCard {...step} index={i} />
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="w-8 flex items-center justify-center">
                    <div className="w-full h-px bg-white/10 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white/20" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[11px] text-white/25 uppercase tracking-widest font-medium mb-4">Capabilities</div>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black font-space text-white leading-tight">
              Everything Your Institution Needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 cursor-default"
              >
                <div className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center mb-4 group-hover:border-white/20 transition-colors">
                  <Icon size={16} className="text-white/50" strokeWidth={1.5} />
                </div>
                <div className="text-[14px] font-bold text-white/80 mb-2 group-hover:text-white transition-colors">{title}</div>
                <div className="text-[12px] text-white/30 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTELLIGENCE / DATASETS SECTION ── */}
      <section id="intelligence" className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        {/* Radar graphic */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-[0.04]">
          {[1, 0.75, 0.55, 0.35, 0.18].map((scale, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-white"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
            />
          ))}
          {/* Tick lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-[250px] h-px bg-white origin-left"
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="text-[11px] text-white/25 uppercase tracking-widest font-medium mb-4">Intelligence Layer</div>
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black font-space text-white leading-tight mb-4">
            Datasets
          </h2>
          <p className="text-[13px] text-white/30 mb-8">Pre-curated multimodal academic datasets</p>

          <button
            onClick={() => navigate('/login')}
            className="landing-btn-ghost mb-16"
          >
            Read More
          </button>

          {/* Vertical accent line */}
          <div className="flex flex-col items-center gap-0 mb-8">
            <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/20" />
            <div className="w-2.5 h-2.5 rounded-full border border-white/30 bg-white/10 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white/60" />
            </div>
            <div className="w-px h-6 bg-gradient-to-b from-white/20 to-transparent" />
          </div>

          {/* Dataset label */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-[12px] text-white/50 mb-8">
            <Brain size={12} className="text-white/40" />
            Datasets for LLM training, academic optimization, sentiment analysis
          </div>

          {/* Pill tags */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {['Research', 'Exams', 'Analytics', 'Business'].map((tag) => (
              <span
                key={tag}
                className="px-4 py-1.5 rounded-full border border-white/15 text-[11px] text-white/40 font-medium hover:border-white/30 hover:text-white/60 transition-colors cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black font-space text-white leading-tight mb-4">
            Ready to Transform<br />Academic Outcomes?
          </h2>
          <p className="text-[13px] text-white/30 mb-10 leading-relaxed">
            Join institutions using Veloris to detect risk early, personalize learning, and drive measurable results.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="landing-btn-primary"
          >
            Launch Platform <ChevronRight size={14} className="inline ml-1" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-8 px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Veloris Logo" className="w-6 h-6 object-contain opacity-50 filter grayscale transition-all hover:grayscale-0 hover:opacity-100" />
          <span className="text-[12px] text-white/20 font-medium font-space">Veloris</span>
        </div>
        <div className="text-[11px] text-white/15">
          Academic Intelligence Core v2.0 · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
