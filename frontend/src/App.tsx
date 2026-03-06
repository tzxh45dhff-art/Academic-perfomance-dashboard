import React, { useState, useRef } from 'react';
import {
  Home, BarChart2, BookOpen, Clock,
  Upload, User,
  GraduationCap, Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

type SubjectStats = {
  subject: string;
  mean: number;
  median: number;
  max: number;
  min: number;
};

type ScoreDistribution = {
  subject: string;
  bins: string[];
  counts: number[];
};

type StudentRisk = {
  student_id: string;
  name: string;
  risk_score: number;
  at_risk: boolean;
};

type PerformanceCluster = {
  student_id: string;
  name: string;
  cluster: string;
};

type MarksWarning = {
  student_id: string;
  name: string;
  marks: number;
};

type UserProfile = {
  name: string;
  role: string;
  institution: string;
}

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
};

type TabView = 'home' | 'insights' | 'subjects' | 'interventions' | 'calendar' | 'settings' | 'profile';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [sentWarnings, setSentWarnings] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError("Please upload a CSV file.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to analyze data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formattedChartData = data?.score_distributions.map(dist => {
    return dist.bins.map((bin, index) => ({
      name: bin,
      count: dist.counts[index],
      subject: dist.subject
    }));
  }) || [];

  if (!isLoggedIn) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <GraduationCap size={48} color="var(--brand-blue)" style={{ margin: '0 auto 16px auto' }} />
            <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Academic Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue</p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
              />
            </div>
            <button type="submit" className="btn-upload" style={{ width: '100%', justifyContent: 'center', marginTop: '8px', background: 'var(--brand-blue)', color: 'white', border: 'none' }}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 1. LEFT SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={32} />
        </div>
        <div className={`nav-icon ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')} title="Overview Dashboard">
          <Home size={22} />
          <span className="nav-label">Overview</span>
        </div>
        <div className={`nav-icon ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')} title="Statistical Insights">
          <BarChart2 size={22} />
          <span className="nav-label">Insights</span>
        </div>
        <div className={`nav-icon ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')} title="Subject Breakdowns">
          <BookOpen size={22} />
          <span className="nav-label">Subjects</span>
        </div>
        <div className={`nav-icon ${activeTab === 'interventions' ? 'active' : ''}`} onClick={() => setActiveTab('interventions')} title="Critical Interventions">
          <Clock size={22} />
          <span className="nav-label">Interventions</span>
        </div>

        <div className="sidebar-spacer"></div>

        <div className={`nav-icon ${activeTab === 'profile' ? 'active' : ''}`} style={{ marginBottom: '16px' }} onClick={() => setActiveTab('profile')} title="User Profile">
          <User size={22} />
          <span className="nav-label">Profile</span>
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <main className="main-content">
        <header className="header">
          <h1>
            {activeTab === 'home' && 'Analytics Overview'}
            {activeTab === 'insights' && 'Statistical Insights'}
            {activeTab === 'subjects' && 'Subject Breakdowns'}
            {activeTab === 'interventions' && 'Interventions Menu'}
            {['calendar', 'settings', 'profile'].includes(activeTab) && 'Configuration'}
          </h1>

          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="file-input-hidden"
            />
            <button
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload size={18} />
              {loading ? 'Analyzing...' : 'Upload CSV'}
            </button>
          </div>
        </header>

        {error && (
          <div style={{ color: 'var(--color-red)', background: '#ef444420', padding: '16px', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {!data && !loading && !error && activeTab !== 'profile' && (
          <div className="center-message">
            <Target size={48} style={{ opacity: 0.5 }} />
            <h2>No Data Loaded</h2>
            <p>Please upload your CSV to see the academic progress overview.</p>
          </div>
        )}

        {data && activeTab === 'home' && (
          <>
            {/* TOP METRICS ROW */}
            <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>

              {/* Class Average */}
              <div className="overview-card" style={{ padding: '24px', justifyContent: 'center', gap: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Class Avg.</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                    {(data.subject_stats.reduce((acc, curr) => acc + curr.mean, 0) / data.subject_stats.length).toFixed(1)}%
                  </h3>
                  <span style={{ color: 'var(--color-green)', fontSize: '0.8rem', fontWeight: 600 }}>+2.4%</span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'var(--brand-blue)', height: '100%', width: '84%', boxShadow: 'var(--neon-glow-blue)' }}></div>
                </div>
              </div>

              {/* Attendance (Mocked) */}
              <div className="overview-card" style={{ padding: '24px', justifyContent: 'center', gap: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Attendance</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>92.0%</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Stable</span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'var(--color-green)', height: '100%', width: '92%', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}></div>
                </div>
              </div>

              {/* Submissions (Mocked) */}
              <div className="overview-card" style={{ padding: '24px', justifyContent: 'center', gap: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Submissions</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                    {(data.overall_students_analyzed * data.subject_stats.length * 3 - 4).toLocaleString()}/{(data.overall_students_analyzed * data.subject_stats.length * 3).toLocaleString()}
                  </h3>
                  <span style={{ color: 'var(--color-orange)', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>4 Pending</span>
                </div>
                <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'var(--color-orange)', height: '100%', width: '92%', boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}></div>
                </div>
              </div>

              {/* At-Risk */}
              <div className="overview-card" style={{ padding: '24px', justifyContent: 'center', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>At-Risk Students</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--color-red)' }}>
                    {data.at_risk_students.length.toString().padStart(2, '0')}
                  </h3>
                  {data.at_risk_students.length > 0 && <span style={{ color: 'var(--color-red)', fontSize: '0.8rem', fontWeight: 600 }}>Action Required</span>}
                </div>
                <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: 'var(--color-red)', height: '100%', width: '15%', boxShadow: 'var(--neon-glow-red)' }}></div>
                </div>
              </div>

            </div>

            {/* PERFORMANCE CHART ROW (Phase 3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-card" style={{ gridColumn: 'span 2', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Mark Distribution (Current vs Previous)</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-blue)', marginRight: '4px' }}></span> Current
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4b5563', marginRight: '4px' }}></span> Previous
                    </span>
                  </div>
                </div>
                <div style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.subject_stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="subject" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="mean" fill="var(--brand-blue)" radius={[6, 6, 6, 6]} barSize={16} name="Current Year" />
                      <Bar dataKey="median" fill="rgba(255, 255, 255, 0.1)" radius={[6, 6, 6, 6]} barSize={16} name="Previous Year (Est.)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TOP PERFORMER SKILL PROFILE (Radar Chart) */}
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Top Student Profile</h2>
                  <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--color-green)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Skill Web</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {data.student_skill_profile.length < 3 ? (
                      <BarChart data={data.student_skill_profile} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="subject" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="score" fill="var(--brand-blue)" radius={[6, 6, 6, 6]} barSize={24} name="Student Score" />
                      </BarChart>
                    ) : (
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.student_skill_profile}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} />
                        <Radar name="Student" dataKey="score" stroke="var(--brand-blue)" fill="var(--brand-blue)" fillOpacity={0.5} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                      </RadarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* PREDICTIVE TREND & HEATMAP ROW (Phase 3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', paddingBottom: '32px' }}>

              {/* Predictive Grade Trend */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 24px 0' }}>Term-over-Term Progression</h2>
                <div style={{ height: '256px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.term_progression}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="term" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="top_performer_average" name="Top Performers" stroke="var(--color-green)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-green)' }} />
                      <Line type="monotone" dataKey="class_average" name="Class Average" stroke="var(--brand-blue)" strokeWidth={3} dot={{ r: 4, fill: 'var(--brand-blue)' }} />
                      <Line type="monotone" dataKey="at_risk_average" name="At-Risk" stroke="var(--color-red)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-red)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cohort Migration (Stacked Bar Chart) */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 24px 0' }}>Cohort Migration</h2>
                <div style={{ height: '256px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cohort_migration}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="term" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="at_risk" name="At Risk" stackId="a" fill="var(--color-red)" />
                      <Bar dataKey="average" name="Average" stackId="a" fill="var(--brand-blue)" />
                      <Bar dataKey="top_performer" name="Top Performer" stackId="a" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', flex: 1 }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px 0' }}>Peak Activity</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Wednesday, 2:00 PM</p>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', flex: 1 }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px 0' }}>Avg Session</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>42 Minutes</p>
                </div>
              </div>
            </div>
          </>
        )}

        {data && activeTab === 'insights' && (
          <>
            {/* CORRELATION SCATTER PLOT */}
            <div style={{ marginBottom: '32px' }}>
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '380px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Attendance vs Avg Marks Correlation</h2>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-green)' }}></div> Top Performer</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-blue)' }}></div> Average</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-red)' }}></div> At-Risk</span>
                  </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} label={{ value: 'Simulated Attendance %', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <YAxis type="number" dataKey="marks" name="Average Marks" unit="%" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} label={{ value: 'Average Marks %', angle: -90, position: 'insideLeft', offset: -10, fill: 'var(--text-secondary)', fontSize: 10 }} />
                      <ZAxis type="number" range={[40, 40]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Scatter name="Students" data={data.correlation_analysis}>
                        {
                          data.correlation_analysis.map((entry, index) => {
                            let fill = 'var(--brand-blue)';
                            if (entry.marks >= 80) fill = 'var(--color-green)';
                            else if (entry.marks < 50) fill = 'var(--color-red)';
                            return <Cell key={`cell-${index}`} fill={fill} style={{ filter: `drop-shadow(0 0 4px ${fill}80)` }} />
                          })
                        }
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* BELL CURVE DISTRIBUTIONS CHART */}
            <div>
              <h2 className="section-title">Score Distributions (Bell Curves)</h2>
              <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {formattedChartData.map((chartData, idx) => {
                  const colors = [
                    { border: 'border-purple', chartColor: '#a855f7' },
                    { border: 'border-blue', chartColor: '#3b82f6' },
                    { border: 'border-green', chartColor: '#22c55e' },
                    { border: 'border-orange', chartColor: '#f97316' }
                  ];
                  const style = colors[idx % colors.length];
                  return (
                    <div key={idx} className="overview-card" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                      <div className="card-label" style={{ marginBottom: '16px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        {chartData[0].subject}
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`colorCount-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={style.chartColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={style.chartColor} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--panel-bg)', border: `1px solid ${style.chartColor}`, borderRadius: '8px', color: 'white' }}
                              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                            />
                            <Area type="monotone" dataKey="count" stroke={style.chartColor} strokeWidth={3} fillOpacity={1} fill={`url(#colorCount-${idx})`} animationDuration={1000} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>  {/* COHORT TIER RING CHART */}
            <div style={{ marginTop: '32px' }}>
              <h2 className="section-title">Cohort Tier Breakdown</h2>
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '380px' }}>
                <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Top Performer', value: data.performance_clusters.filter(c => c.cluster === 'Top Performer').length },
                          { name: 'Average', value: data.performance_clusters.filter(c => c.cluster === 'Average').length },
                          { name: 'At-Risk', value: data.performance_clusters.filter(c => c.cluster === 'At-Risk').length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell key="cell-top" fill="var(--color-green)" />
                        <Cell key="cell-avg" fill="var(--brand-blue)" />
                        <Cell key="cell-risk" fill="var(--color-red)" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', marginTop: '-18px' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{data.performance_clusters.length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Students</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {
          data && activeTab === 'subjects' && (
            <>
              <div>
                <h2 className="section-title">Highest vs Lowest Per Subject</h2>
                <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {(() => {
                    const colors = [
                      { border: 'border-purple', iconBg: '#a855f720', iconColor: 'var(--color-purple)' },
                      { border: 'border-blue', iconBg: '#3b82f620', iconColor: 'var(--color-blue)' },
                      { border: 'border-green', iconBg: '#22c55e20', iconColor: 'var(--color-green)' },
                      { border: 'border-orange', iconBg: '#f9731620', iconColor: 'var(--color-orange)' }
                    ];
                    return data.subject_stats.map((subject, idx) => {
                      const style = colors[idx % colors.length];
                      return (
                        <div key={idx} className={`overview-card ${style.border}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <div className="card-icon" style={{ backgroundColor: style.iconBg, color: style.iconColor, marginBottom: 0, width: 64, height: 64 }}>
                              <BookOpen size={32} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{subject.subject}</h3>
                              <div style={{ color: 'var(--text-secondary)' }}>Class Average: {subject.mean.toFixed(1)}%</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-green)' }}>{subject.max}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Highest</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-red)' }}>{subject.min}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lowest</div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )
        }

        {
          data && activeTab === 'interventions' && (
            <>
              <h2 className="section-title" style={{ color: 'var(--color-red)' }}>Critical Interventions Required</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Flagged Metric</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.at_risk_students.map((student, idx) => (
                      <tr key={`risk-${idx}`}>
                        <td style={{ fontWeight: 500 }}>{student.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({student.student_id})</span></td>
                        <td><span style={{ background: '#ef444420', color: 'var(--color-red)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>AT RISK</span></td>
                        <td>Z-Score: {student.risk_score}</td>
                        <td><button className="btn-upload" style={{ background: 'var(--color-red)', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}>Schedule Review</button></td>
                      </tr>
                    ))}
                    {[...data.marks_warnings]
                      .sort((a, b) => {
                        const aSent = sentWarnings.has(a.student_id);
                        const bSent = sentWarnings.has(b.student_id);
                        if (aSent === bSent) return 0;
                        return aSent ? 1 : -1;
                      })
                      .map((student) => {
                        const isSent = sentWarnings.has(student.student_id);
                        return (
                          <tr key={`warning-${student.student_id}`} style={{ opacity: isSent ? 0.6 : 1 }}>
                            <td style={{ fontWeight: 500 }}>{student.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({student.student_id})</span></td>
                            <td><span style={{ background: '#f9731620', color: 'var(--color-orange)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>40-50 MARKS</span></td>
                            <td>Avg: {student.marks}</td>
                            <td>
                              <button
                                className="btn-upload"
                                style={{
                                  background: isSent ? 'var(--color-green)' : 'var(--color-orange)',
                                  color: 'white',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem'
                                }}
                                onClick={() => {
                                  if (!isSent) {
                                    setSentWarnings(prev => new Set(prev).add(student.student_id));
                                  }
                                }}
                              >
                                {isSent ? 'Sent' : 'Send Warning'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    }
                    {(data.at_risk_students.length === 0 && data.marks_warnings.length === 0) && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-green)', padding: '32px' }}>
                          No students currently require critical intervention.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )
        }

        {
          data && ['calendar', 'settings'].includes(activeTab) && (
            <div className="center-message">
              <Target size={48} style={{ opacity: 0.5 }} />
              <h2>Under Construction</h2>
              <p>This view is coming in a future update.</p>
            </div>
          )
        }

        {activeTab === 'profile' && (
          <div className="glass-card" style={{ padding: '32px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div className="profile-avatar" style={{ width: '96px', height: '96px', margin: '0 auto 24px auto', border: '2px solid var(--brand-blue)' }}></div>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>{data ? data.user_profile.name : "Rachit Goyal"}</h2>
            <p style={{ color: 'var(--brand-blue)', fontWeight: 600, fontSize: '1.2rem', marginBottom: '8px' }}>{data ? data.user_profile.role : "Lead Educator"}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '32px' }}>{data ? data.user_profile.institution : "Tech Innovators Academy"}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', textAlign: 'left' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px 0' }}>Contact Email</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{email}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px 0' }}>Department</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0, color: 'var(--color-purple)' }}>Computer Science</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', gridColumn: 'span 2' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 8px 0' }}>Latest Activity</p>
                <p style={{ fontSize: '1rem', margin: 0, color: 'var(--text-primary)' }}>Uploaded CSV data for recent Term</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. RIGHT SIDEBAR PANEL */}
      <aside className="right-panel">

        {/* Profile User Stub */}
        <div className="profile-card">
          <div className="profile-avatar"></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{data ? data.user_profile.name : "Rachit Goyal"}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {data ? `${data.overall_students_analyzed} Students Loaded` : "Awaiting Data"}
            </div>
          </div>
        </div>

        {data && (
          <>
            {/* Mini Calendar replaced Negative Trends */}
            <div>
              <h2 className="section-title">Academic Calendar</h2>
              <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 600 }}>March 2026</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>&lt;</span>
                    <span style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>&gt;</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`day-${i}`} style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>{d}</div>)}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div key={i} style={{
                      padding: '6px 0',
                      borderRadius: '6px',
                      backgroundColor: i + 1 === 5 ? 'var(--brand-blue)' : (i + 1 === 18 ? 'rgba(239, 68, 68, 0.2)' : 'transparent'),
                      color: i + 1 === 5 ? 'white' : (i + 1 === 18 ? 'var(--color-red)' : 'var(--text-primary)'),
                      fontWeight: i + 1 === 5 || i + 1 === 18 ? 700 : 400,
                      cursor: 'pointer'
                    }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-blue)' }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Today</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-red)' }}></div>
                    <span style={{ color: 'var(--text-secondary)' }}>Mid-Term Exams Start</span>
                  </div>
                </div>
              </div>
            </div>

            {/* At-Risk Cohort (Mimicking 'Academic Calendar' events) */}
            <div>
              <h2 className="section-title">At-Risk Intervention Alert</h2>
              <div className="timeline-list">
                {data.at_risk_students.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No immediate interventions required.</div>
                ) : (
                  data.at_risk_students.map((student, idx) => {
                    return (
                      <div key={idx} style={{
                        background: '#ef444420',
                        border: '1px solid var(--color-red)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}>
                        <span style={{ fontWeight: 600, color: 'white' }}>{student.name}</span> is critically below cohort average. (Z-Score: <span style={{ color: 'var(--color-red)' }}>{student.risk_score}</span>)
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </aside>

    </div>
  );
}

export default App;
