import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Home, BarChart2, BookOpen, Clock, Upload, User, GraduationCap, Target,
  Sparkles, MessageCircle, X, Send, Trophy, Download, Activity,
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Shield, Brain,
  FileText, Users, ChevronUp, ChevronDown, Minus, Award, Zap, Star
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, ScatterChart, Scatter, ZAxis
} from 'recharts';

type SubjectStats = { subject: string; mean: number; median: number; max: number; min: number };
type ScoreDistribution = { subject: string; bins: string[]; counts: number[] };
type StudentRisk = { student_id: string; name: string; risk_score: number; at_risk: boolean };
type PerformanceCluster = { student_id: string; name: string; cluster: string };
type MarksWarning = { student_id: string; name: string; marks: number };
type UserProfile = { name: string; role: string; institution: string };
type StudentRanking = { rank: number; student_id: string; name: string; average_score: number; gpa: number; percentile: number; trend: string };
type ClassHealth = { overall_score: number; pass_rate: number; engagement_score: number; improvement_rate: number; avg_gpa: number; grade: string };
type AIInsight = { category: string; title: string; description: string; priority: string };
type ChatMsg = { role: 'user' | 'assistant'; content: string };
type ToastItem = { id: number; message: string; type: 'success' | 'error' | 'info' };

type DashboardData = {
  overall_students_analyzed: number;
  subject_stats: SubjectStats[];
  score_distributions: ScoreDistribution[];
  at_risk_students: StudentRisk[];
  performance_clusters: PerformanceCluster[];
  marks_warnings: MarksWarning[];
  student_skill_profile: { subject: string; score: number; fullMark: number }[];
  term_progression: { term: string; class_average: number; top_performer_average: number; at_risk_average: number }[];
  correlation_analysis: { student_id: string; attendance: number; marks: number }[];
  cohort_migration: { term: string; top_performer: number; average: number; at_risk: number }[];
  user_profile: UserProfile;
  student_rankings: StudentRanking[];
  class_health: ClassHealth | null;
  subject_difficulty: { subject: string; difficulty_index: number; fail_rate: number; spread: number }[];
};

type TabView = 'home' | 'insights' | 'subjects' | 'interventions' | 'students' | 'profile';

function AnimCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = value / 60;
    const t = setInterval(() => {
      cur += step;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.round(cur * 10) / 10);
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <>{Number.isInteger(value) ? Math.round(display) : display.toFixed(1)}{suffix}</>;
}

function Toasts({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    items.forEach(t => { setTimeout(() => onDismiss(t.id), 4000); });
  }, [items]);
  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => onDismiss(t.id)}>
          {t.type === 'success' ? <Shield size={16} /> : t.type === 'error' ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [sentWarnings, setSentWarnings] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [aiInsights, setAiInsights] = useState<{ summary: string; insights: AIInsight[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hey! I\'m your AI Academic Advisor. Load some data and ask me anything about student performance!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { if (data) fetchInsights(); }, [data]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) setIsLoggedIn(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setLoading(true); setError(null);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed'); }
      const result = await res.json();
      setData(result);
      toast(`Analyzed ${result.overall_students_analyzed} students!`, 'success');
    } catch (err: any) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const loadDemo = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('http://localhost:8000/demo');
      if (!res.ok) throw new Error('Failed to load demo data');
      setData(await res.json());
      toast('Demo data loaded!', 'success');
    } catch (err: any) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const fetchInsights = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('http://localhost:8000/ai/insights', { method: 'POST' });
      if (res.ok) setAiInsights(await res.json());
    } catch { } finally { setAiLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    setChatMessages(p => [...p, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg, chat_history: chatMessages })
      });
      if (res.ok) { const r = await res.json(); setChatMessages(p => [...p, { role: 'assistant', content: r.response }]); }
      else setChatMessages(p => [...p, { role: 'assistant', content: 'Something went wrong.' }]);
    } catch { setChatMessages(p => [...p, { role: 'assistant', content: 'Cannot reach AI service.' }]); }
    finally { setChatLoading(false); }
  };

  const downloadReport = async () => {
    if (!data) { toast('Load data first', 'error'); return; }
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const primaryBlue = [37, 99, 235];
      const darkBg = [15, 18, 35];
      let yPos = 0;

      // --- COVER HEADER ---
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, pw, 55, 'F');
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.rect(0, 52, pw, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Academic Performance Report', pw / 2, 22, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`AcademiQ Analytics  •  Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw / 2, 34, { align: 'center' });
      doc.text(`Prepared for: ${data.user_profile?.name || 'Instructor'}`, pw / 2, 42, { align: 'center' });
      yPos = 65;

      // --- EXECUTIVE SUMMARY ---
      doc.setTextColor(30, 30, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', 14, yPos); yPos += 8;
      doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.setLineWidth(0.5);
      doc.line(14, yPos - 3, 80, yPos - 3);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 70);
      const classAvg = data.subject_stats.length > 0 ? data.subject_stats.reduce((a, c) => a + c.mean, 0) / data.subject_stats.length : 0;
      const summaryLines = [
        `Total Students Enrolled: ${data.overall_students_analyzed}`,
        `Class Average Score: ${classAvg.toFixed(1)}%`,
        `Class Health Score: ${data.class_health?.overall_score || '--'}/100 (Grade: ${data.class_health?.grade || '--'})`,
        `Students At-Risk: ${data.at_risk_students.length}`,
        `Subjects Analyzed: ${data.subject_stats.length}`
      ];
      summaryLines.forEach(line => { doc.text(line, 18, yPos); yPos += 6; });
      yPos += 6;

      // --- SUBJECT PERFORMANCE TABLE ---
      doc.setTextColor(30, 30, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Performance Breakdown', 14, yPos); yPos += 4;
      doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.line(14, yPos, 110, yPos); yPos += 4;

      const subjectRows = data.subject_stats.map((s: any) => [
        s.subject,
        `${s.mean.toFixed(1)}%`,
        s.max?.toString() || '--',
        s.min?.toString() || '--',
        data.class_health?.pass_rate ? `${data.class_health.pass_rate.toFixed(0)}%` : '--'
      ]);
      autoTable(doc, {
        startY: yPos,
        head: [['Subject', 'Average', 'Highest', 'Lowest', 'Pass Rate']],
        body: subjectRows,
        theme: 'striped',
        headStyles: { fillColor: [primaryBlue[0], primaryBlue[1], primaryBlue[2]], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 60] },
        alternateRowStyles: { fillColor: [240, 243, 255] },
        margin: { left: 14, right: 14 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // --- STUDENT RANKINGS TABLE ---
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.setTextColor(30, 30, 60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Rankings', 14, yPos); yPos += 4;
      doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.line(14, yPos, 70, yPos); yPos += 4;

      const studentRows = (data.student_rankings || []).map((s: any, idx: number) => [
        (idx + 1).toString(),
        s.name,
        s.gpa?.toFixed(2) || '--',
        `${s.average_score.toFixed(1)}%`,
        `${s.percentile}th`,
        s.trend || '--'
      ]);
      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Student', 'GPA', 'Avg', 'Percentile', 'Trend']],
        body: studentRows,
        theme: 'striped',
        headStyles: { fillColor: [primaryBlue[0], primaryBlue[1], primaryBlue[2]], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: [40, 40, 60] },
        alternateRowStyles: { fillColor: [240, 243, 255] },
        margin: { left: 14, right: 14 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // --- AT-RISK STUDENTS ---
      if (data.at_risk_students.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setTextColor(200, 40, 40);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ At-Risk Students — Immediate Action Required', 14, yPos); yPos += 4;
        doc.setDrawColor(200, 40, 40);
        doc.line(14, yPos, 130, yPos); yPos += 4;

        const riskRows = data.at_risk_students.map((s: any) => [
          s.name,
          typeof s.risk_score === 'number' ? s.risk_score.toFixed(2) : s.risk_score,
          s.average ? `${s.average.toFixed(1)}%` : '--',
          'Schedule parent meeting; assign peer tutor'
        ]);
        autoTable(doc, {
          startY: yPos,
          head: [['Student', 'Z-Score', 'Average', 'Recommended Action']],
          body: riskRows,
          theme: 'striped',
          headStyles: { fillColor: [200, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: [40, 40, 60] },
          margin: { left: 14, right: 14 }
        });
        yPos = (doc as any).lastAutoTable.finalY + 12;
      }

      // --- AI INSIGHTS SECTION ---
      const insightsList = aiInsights?.insights || [];
      if (insightsList.length > 0) {
        if (yPos > 220) { doc.addPage(); yPos = 20; }
        doc.setTextColor(30, 30, 60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('AI-Generated Insights', 14, yPos); yPos += 4;
        doc.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        doc.line(14, yPos, 85, yPos); yPos += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 70);
        insightsList.forEach((ins: any) => {
          if (yPos > 270) { doc.addPage(); yPos = 20; }
          const tag = `[${(ins.category || 'insight').toUpperCase()}]`;
          doc.setFont('helvetica', 'bold');
          doc.text(`${tag}  ${ins.title}`, 18, yPos); yPos += 5;
          doc.setFont('helvetica', 'normal');
          const wrapped = doc.splitTextToSize(ins.description, pw - 36);
          doc.text(wrapped, 18, yPos);
          yPos += wrapped.length * 4.5 + 4;
        });
      }

      // --- FOOTER ---
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 170);
        doc.text(`AcademiQ Analytics  •  Confidential  •  Page ${p} of ${pages}`, pw / 2, 290, { align: 'center' });
      }

      doc.save(`Academic_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF report downloaded!', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast('Report generation failed', 'error');
    }
  };

  const insightStyle = (cat: string) => {
    const m: Record<string, { bg: string; color: string }> = {
      strength: { bg: 'rgba(16,185,129,0.12)', color: 'var(--color-green)' },
      weakness: { bg: 'rgba(239,68,68,0.12)', color: 'var(--color-red)' },
      opportunity: { bg: 'rgba(37,99,235,0.12)', color: 'var(--brand-blue-light)' },
      warning: { bg: 'rgba(245,158,11,0.12)', color: 'var(--color-orange)' },
      trend: { bg: 'rgba(139,92,246,0.12)', color: 'var(--color-purple)' },
      recommendation: { bg: 'rgba(6,182,212,0.12)', color: 'var(--color-cyan)' }
    };
    return m[cat] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)' };
  };
  const insightIcon = (cat: string) => {
    const m: Record<string, React.ReactNode> = {
      strength: <TrendingUp size={14} />, weakness: <TrendingDown size={14} />,
      opportunity: <Lightbulb size={14} />, warning: <AlertTriangle size={14} />,
      trend: <Activity size={14} />, recommendation: <Target size={14} />
    };
    return m[cat] || <Sparkles size={14} />;
  };

  const chartData = data?.score_distributions.map(d => d.bins.map((b, i) => ({ name: b, count: d.counts[i], subject: d.subject }))) || [];

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-bg" />
        <div className="animated-bg" />
        <div className="glass-card login-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 30px rgba(37,99,235,0.3)' }}>
              <GraduationCap size={28} color="white" />
            </div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: 6 }}>Academic Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI-Powered Performance Analytics</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@institution.edu" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password" />
            </div>
            <button type="submit" className="btn-gradient" style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', marginTop: 4 }}>
              Sign In
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Powered by Gemini AI</p>
        </div>
      </div>
    );
  }

  const healthColor = (s: number) => s >= 80 ? 'var(--color-green)' : s >= 60 ? 'var(--color-orange)' : 'var(--color-red)';

  return (
    <>
      <div className="animated-bg" />
      <div className="app-container">
        <Toasts items={toasts} onDismiss={dismissToast} />

        {/* SIDEBAR */}
        <nav className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon"><GraduationCap size={20} /></div>
            <div>
              <div className="logo-text">AcademiQ</div>
              <div className="logo-sub">Analytics</div>
            </div>
          </div>
          {([
            { id: 'home' as TabView, icon: <Home size={18} />, label: 'Overview' },
            { id: 'insights' as TabView, icon: <BarChart2 size={18} />, label: 'Insights' },
            { id: 'subjects' as TabView, icon: <BookOpen size={18} />, label: 'Subjects' },
            { id: 'students' as TabView, icon: <Users size={18} />, label: 'Students' },
            { id: 'interventions' as TabView, icon: <AlertTriangle size={18} />, label: 'Interventions' },
          ]).map(tab => (
            <div key={tab.id} className={`nav-icon ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}<span className="nav-label">{tab.label}</span>
            </div>
          ))}
          <div className="sidebar-spacer" />
          <div className="sidebar-divider" />
          <div className={`nav-icon ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={18} /><span className="nav-label">Profile</span>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main-content">
          <header className="header">
            <h1>
              {activeTab === 'home' && 'Analytics Overview'}
              {activeTab === 'insights' && 'Statistical Insights'}
              {activeTab === 'subjects' && 'Subject Breakdowns'}
              {activeTab === 'students' && 'Student Leaderboard'}
              {activeTab === 'interventions' && 'Interventions'}
              {activeTab === 'profile' && 'My Profile'}
            </h1>
            <div className="header-actions">
              {data && <button className="btn-secondary" onClick={downloadReport}><Download size={16} />Report</button>}
              <button className="btn-secondary" onClick={loadDemo} disabled={loading}><Zap size={16} />Demo</button>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleUpload} className="file-input-hidden" />
              <button className="btn-upload" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                <Upload size={16} />{loading ? 'Analyzing...' : 'Upload CSV'}
              </button>
            </div>
          </header>

          {error && <div style={{ color: 'var(--color-red)', background: 'rgba(239,68,68,0.1)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}

          {!data && !loading && !error && activeTab !== 'profile' && (
            <div className="center-message">
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Brain size={36} style={{ color: 'var(--brand-blue)', opacity: 0.7 }} />
              </div>
              <h2 style={{ fontSize: '1.3rem' }}>Ready for Analysis</h2>
              <p style={{ maxWidth: 400 }}>Upload a CSV file or load demo data to see AI-powered academic insights.</p>
              <button className="btn-gradient" onClick={loadDemo} style={{ marginTop: 8 }}><Zap size={16} />Load Demo Data</button>
            </div>
          )}

          {data && activeTab === 'home' && (<>
            {/* METRICS ROW */}
            <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
              <div className="overview-card" style={{ padding: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>Class Average</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
                    <AnimCounter value={parseFloat((data.subject_stats.reduce((a, c) => a + c.mean, 0) / data.subject_stats.length).toFixed(1))} suffix="%" />
                  </h3>
                  <span style={{ color: 'var(--color-green)', fontSize: '0.75rem', fontWeight: 600 }}>+2.4%</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', height: 3, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ background: 'var(--brand-blue)', height: '100%', width: '84%' }} />
                </div>
              </div>
              <div className="overview-card" style={{ padding: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>Students</p>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}><AnimCounter value={data.overall_students_analyzed} /></h3>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', height: 3, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ background: 'var(--color-green)', height: '100%', width: '100%' }} />
                </div>
              </div>
              <div className="overview-card" style={{ padding: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>Class Health</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: healthColor(data.class_health?.overall_score || 0) }}>
                    {data.class_health?.grade || '--'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.class_health?.overall_score || 0}/100</span>
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', height: 3, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ background: healthColor(data.class_health?.overall_score || 0), height: '100%', width: `${data.class_health?.overall_score || 0}%` }} />
                </div>
              </div>
              <div className="overview-card" style={{ padding: 20, borderColor: data.at_risk_students.length > 0 ? 'rgba(239,68,68,0.2)' : 'transparent' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>At-Risk</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: data.at_risk_students.length > 0 ? 'var(--color-red)' : 'var(--color-green)' }}>
                    <AnimCounter value={data.at_risk_students.length} />
                  </h3>
                  {data.at_risk_students.length > 0 && <span style={{ color: 'var(--color-red)', fontSize: '0.75rem', fontWeight: 600 }}>Action Needed</span>}
                </div>
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', height: 3, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ background: 'var(--color-red)', height: '100%', width: `${Math.min(100, data.at_risk_students.length * 25)}%` }} />
                </div>
              </div>
            </div>

            {/* AI INSIGHTS */}
            <div className="ai-insights-card" style={{ marginBottom: 24 }}>
              <div className="ai-insights-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>AI Insights</h2>
                  <span className="ai-badge"><Sparkles size={10} />AI Powered</span>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={fetchInsights}>Refresh</button>
              </div>
              {aiLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
                </div>
              ) : aiInsights ? (<>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{aiInsights.summary}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {aiInsights.insights.map((ins, i) => {
                    const s = insightStyle(ins.category);
                    return (
                      <div key={i} className="insight-item" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="insight-icon" style={{ background: s.bg, color: s.color }}>{insightIcon(ins.category)}</div>
                        <div className="insight-content">
                          <h4 style={{ color: s.color }}>{ins.title}</h4>
                          <p>{ins.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>) : <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Click refresh to generate insights.</p>}
            </div>

            {/* CHARTS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Performance by Subject</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-blue)', marginRight: 4 }} /> Mean
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', marginRight: 4 }} /> Median
                    </span>
                  </div>
                </div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.subject_stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="mean" fill="var(--brand-blue)" radius={[6, 6, 6, 6]} barSize={14} name="Mean" />
                      <Bar dataKey="median" fill="rgba(255,255,255,0.08)" radius={[6, 6, 6, 6]} barSize={14} name="Median" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Skill Profile</h2>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--color-green)', padding: '3px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 }}>Top Student</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {data.student_skill_profile.length < 3 ? (
                      <BarChart data={data.student_skill_profile} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                        <Bar dataKey="score" fill="var(--brand-blue)" radius={[6, 6, 6, 6]} barSize={20} name="Score" />
                      </BarChart>
                    ) : (
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.student_skill_profile}>
                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} />
                        <Radar name="Score" dataKey="score" stroke="var(--brand-blue)" fill="var(--brand-blue)" fillOpacity={0.4} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                      </RadarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TREND + COHORT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="glass-card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px' }}>Term Progression</h2>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.term_progression}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="term" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="top_performer_average" name="Top" stroke="var(--color-green)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-green)' }} />
                      <Line type="monotone" dataKey="class_average" name="Class Avg" stroke="var(--brand-blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--brand-blue)' }} />
                      <Line type="monotone" dataKey="at_risk_average" name="At-Risk" stroke="var(--color-red)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-red)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px' }}>Cohort Migration</h2>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cohort_migration}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="term" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="at_risk" name="At Risk" stackId="a" fill="var(--color-red)" />
                      <Bar dataKey="average" name="Average" stackId="a" fill="var(--brand-blue)" />
                      <Bar dataKey="top_performer" name="Top" stackId="a" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* QUICK STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Avg GPA</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Outfit' }}>{data.class_health?.avg_gpa?.toFixed(2) || '--'}</p>
              </div>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Pass Rate</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Outfit' }}>{data.class_health?.pass_rate || 0}%</p>
              </div>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Engagement</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Outfit' }}>{data.class_health?.engagement_score || 0}%</p>
              </div>
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Improving</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, fontFamily: 'Outfit' }}>{data.class_health?.improvement_rate || 0}%</p>
              </div>
            </div>
          </>)}

          {data && activeTab === 'insights' && (<>
            <div style={{ marginBottom: 24 }}>
              <div className="glass-card" style={{ padding: 20, height: 360, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Attendance vs Marks Correlation</h2>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
                      <YAxis type="number" dataKey="marks" name="Marks" unit="%" domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
                      <ZAxis type="number" range={[35, 35]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.08)' }} contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Scatter name="Students" data={data.correlation_analysis}>
                        {data.correlation_analysis.map((entry, i) => {
                          let fill = 'var(--brand-blue)';
                          if (entry.marks >= 80) fill = 'var(--color-green)';
                          else if (entry.marks < 50) fill = 'var(--color-red)';
                          return <Cell key={i} fill={fill} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <h2 className="section-title">Score Distributions</h2>
            <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 24 }}>
              {chartData.map((cd, idx) => {
                const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f97316'];
                const c = colors[idx % colors.length];
                return (
                  <div key={idx} className="overview-card" style={{ height: 260, display: 'flex', flexDirection: 'column' }}>
                    <div className="card-label" style={{ marginBottom: 12, color: 'var(--text-primary)', fontSize: '1rem' }}>{cd[0].subject}</div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cd} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs><linearGradient id={`gc-${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.6} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--panel-bg)', border: `1px solid ${c}`, borderRadius: 8, color: 'white' }} />
                          <Area type="monotone" dataKey="count" stroke={c} strokeWidth={2} fillOpacity={1} fill={`url(#gc-${idx})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 className="section-title">Cohort Tier Breakdown</h2>
            <div className="glass-card" style={{ padding: 20, height: 340, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Top', value: data.performance_clusters.filter(c => c.cluster === 'Top Performer').length },
                      { name: 'Average', value: data.performance_clusters.filter(c => c.cluster === 'Average').length },
                      { name: 'At-Risk', value: data.performance_clusters.filter(c => c.cluster === 'At-Risk').length }
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                      <Cell fill="var(--color-green)" /><Cell fill="var(--brand-blue)" /><Cell fill="var(--color-red)" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: 8 }} itemStyle={{ color: 'var(--text-primary)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{data.performance_clusters.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Students</div>
                </div>
              </div>
            </div>
          </>)}

          {data && activeTab === 'subjects' && (<>
            <h2 className="section-title">Subject Performance Overview</h2>
            <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {(() => {
                const styles = [
                  { border: 'border-purple', iconBg: '#a855f720', iconColor: 'var(--color-purple)' },
                  { border: 'border-blue', iconBg: '#3b82f620', iconColor: 'var(--color-blue)' },
                  { border: 'border-green', iconBg: '#22c55e20', iconColor: 'var(--color-green)' },
                  { border: 'border-orange', iconBg: '#f9731620', iconColor: 'var(--color-orange)' }
                ];
                return data.subject_stats.map((subj, idx) => {
                  const s = styles[idx % styles.length];
                  const diff = data.subject_difficulty?.find(d => d.subject === subj.subject);
                  return (
                    <div key={idx} className={`overview-card ${s.border}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="card-icon" style={{ background: s.iconBg, color: s.iconColor, marginBottom: 0, width: 52, height: 52 }}>
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{subj.subject}</h3>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Avg: {subj.mean.toFixed(1)}%</div>
                          {diff && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>Difficulty: {diff.difficulty_index.toFixed(0)}/100</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-green)' }}>{subj.max}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highest</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-red)' }}>{subj.min}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lowest</div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>)}

          {data && activeTab === 'students' && (<>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Student Rankings</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.student_rankings.length} students</span>
            </div>
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 80px 100px', gap: 12, padding: '8px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Rank</span><span>Student</span><span>GPA</span><span>Avg</span><span>%ile</span><span>Trend</span>
              </div>
              {data.student_rankings.map((s, i) => {
                const medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
                const medalColor = i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : 'rgba(255,255,255,0.1)';
                const trendColor = s.trend === 'improving' ? 'improving' : s.trend === 'declining' ? 'declining' : 'stable';
                const trendIcon = s.trend === 'improving' ? <ChevronUp size={12} /> : s.trend === 'declining' ? <ChevronDown size={12} /> : <Minus size={12} />;
                return (
                  <div key={s.student_id} className={`leaderboard-row ${medal}`} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 80px 80px 80px 100px', gap: 12, alignItems: 'center', width: '100%' }}>
                      <div className="rank-badge" style={{ background: medalColor, color: i < 3 ? '#000' : 'var(--text-primary)', fontSize: i < 3 ? '0.85rem' : '0.8rem' }}>
                        {i < 3 ? <Trophy size={14} /> : s.rank}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {s.student_id}</div>
                      </div>
                      <div style={{ fontWeight: 600, fontFamily: 'Outfit' }}>{s.gpa.toFixed(2)}</div>
                      <div style={{ fontFamily: 'Outfit' }}>{s.average_score}%</div>
                      <div style={{ fontFamily: 'Outfit' }}>{s.percentile}th</div>
                      <span className={`trend-indicator ${trendColor}`}>{trendIcon}{s.trend}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}

          {data && activeTab === 'interventions' && (<>
            <h2 className="section-title" style={{ color: 'var(--color-red)' }}>Critical Interventions Required</h2>
            <div className="glass-card" style={{ padding: 4 }}>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Status</th><th>Metric</th><th>Action</th></tr></thead>
                  <tbody>
                    {data.at_risk_students.map((s, i) => (
                      <tr key={`r-${i}`}>
                        <td style={{ fontWeight: 500 }}>{s.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({s.student_id})</span></td>
                        <td><span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-red)', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>AT RISK</span></td>
                        <td>Z-Score: {s.risk_score}</td>
                        <td><button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--color-red)' }}>Review</button></td>
                      </tr>
                    ))}
                    {[...data.marks_warnings].sort((a, b) => (sentWarnings.has(a.student_id) ? 1 : 0) - (sentWarnings.has(b.student_id) ? 1 : 0)).map(s => {
                      const sent = sentWarnings.has(s.student_id);
                      return (
                        <tr key={`w-${s.student_id}`} style={{ opacity: sent ? 0.5 : 1 }}>
                          <td style={{ fontWeight: 500 }}>{s.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({s.student_id})</span></td>
                          <td><span style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-orange)', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>40-50 MARKS</span></td>
                          <td>Avg: {s.marks}</td>
                          <td><button className="btn-secondary" onClick={() => { if (!sent) setSentWarnings(p => new Set(p).add(s.student_id)) }} style={{ padding: '5px 12px', fontSize: '0.8rem', background: sent ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', borderColor: sent ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)', color: sent ? 'var(--color-green)' : 'var(--color-orange)' }}>{sent ? 'Sent' : 'Warn'}</button></td>
                        </tr>
                      );
                    })}
                    {data.at_risk_students.length === 0 && data.marks_warnings.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-green)', padding: 32 }}>No interventions needed!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>)}

          {activeTab === 'profile' && (
            <div className="glass-card" style={{ padding: 32, maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
              <div className="profile-avatar" style={{ width: 88, height: 88, margin: '0 auto 20px', border: '3px solid var(--brand-blue)' }} />
              <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>{data ? data.user_profile.name : 'Rachit Goyal'}</h2>
              <p style={{ color: 'var(--brand-blue-light)', fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{data ? data.user_profile.role : 'Lead Educator'}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 28 }}>{data ? data.user_profile.institution : 'Tech Innovators Academy'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 12 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>Email</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0 }}>{email || 'admin@academy.edu'}</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 12 }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>Department</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500, margin: 0, color: 'var(--color-purple)' }}>Computer Science</p>
                </div>
                {data && <div style={{ background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 12, gridColumn: 'span 2' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 6px' }}>Quick Stats</p>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>{data.overall_students_analyzed} students analyzed · {data.subject_stats.length} subjects · Class Health: {data.class_health?.grade || '--'}</p>
                </div>}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL */}
        <aside className="right-panel">
          <div className="profile-card">
            <div className="profile-avatar" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{data ? data.user_profile.name : 'Rachit Goyal'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{data ? `${data.overall_students_analyzed} Students` : 'Awaiting Data'}</div>
            </div>
          </div>

          {data && (<>
            {/* Class Health Gauge */}
            <div>
              <h2 className="section-title" style={{ fontSize: '0.85rem' }}>Class Health</h2>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div className="health-gauge" style={{ border: `3px solid ${healthColor(data.class_health?.overall_score || 0)}`, boxShadow: `0 0 20px ${healthColor(data.class_health?.overall_score || 0)}30` }}>
                  <div>
                    <div className="health-gauge-value" style={{ color: healthColor(data.class_health?.overall_score || 0) }}>{data.class_health?.overall_score || 0}</div>
                    <div className="health-gauge-label">{data.class_health?.grade || '--'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div>
              <h2 className="section-title" style={{ fontSize: '0.85rem' }}>Calendar</h2>
              <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>March 2026</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, textAlign: 'center', fontSize: '0.75rem' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600, fontSize: '0.65rem' }}>{d}</div>)}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div key={i} style={{
                      padding: '5px 0', borderRadius: 6,
                      background: i + 1 === 8 ? 'var(--brand-blue)' : (i + 1 === 18 ? 'rgba(239,68,68,0.15)' : 'transparent'),
                      color: i + 1 === 8 ? 'white' : (i + 1 === 18 ? 'var(--color-red)' : 'var(--text-primary)'),
                      fontWeight: i + 1 === 8 || i + 1 === 18 ? 700 : 400, fontSize: '0.8rem', cursor: 'pointer'
                    }}>{i + 1}</div>
                  ))}
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--brand-blue)', display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Today</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Parent-Teacher Meeting Deadline</span>
                  </div>
                </div>
              </div>
            </div>

            {/* At-Risk Alerts */}
            {data.at_risk_students.length > 0 && (
              <div>
                <h2 className="section-title" style={{ fontSize: '0.85rem', color: 'var(--color-red)' }}>At-Risk Alerts</h2>
                <div className="timeline-list">
                  {data.at_risk_students.map((s, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: 10, borderRadius: 8, fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 600 }}>{s.name}</span> — Z: <span style={{ color: 'var(--color-red)' }}>{s.risk_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}
        </aside>

        {/* FAB */}
        {!chatOpen && (
          <button className="fab-ai" onClick={() => setChatOpen(true)} title="AI Chat">
            <MessageCircle size={24} />
          </button>
        )}

        {/* Chat Drawer */}
        {chatOpen && (<>
          <div className="chat-overlay" onClick={() => setChatOpen(false)} />
          <div className="chat-drawer">
            <div className="chat-header">
              <h3><Brain size={20} style={{ color: 'var(--brand-blue-light)' }} /> AI Advisor</h3>
              <button className="chat-close" onClick={() => setChatOpen(false)}><X size={20} /></button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  {m.content.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
                </div>
              ))}
              {chatLoading && <div className="chat-message assistant"><div className="skeleton" style={{ height: 16, width: 120 }} /></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-area">
              <input className="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about student performance..." onKeyDown={e => { if (e.key === 'Enter') sendChat() }} />
              <button className="chat-send" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </>)}

      </div>
    </>
  );
}

export default App;
