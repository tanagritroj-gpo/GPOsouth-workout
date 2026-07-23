import React, { useState, useMemo } from 'react';
import { WorkoutStats, Workout } from '../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Footprints, Flame, Activity, Milestone, Zap, HeartHandshake, Trophy, Target, TrendingUp, BarChart3, Clock, Award, Sparkles, CheckCircle2, PieChart as PieIcon, X, ChevronRight, Lightbulb, Star } from 'lucide-react';
import ActivityIcon from './ActivityIcon';

interface DashboardProps {
  stats: WorkoutStats;
  workouts: Workout[];
}

const COLORS = ['#006241', '#00754A', '#1E3932', '#cba258', '#2b5148', '#8ba89f', '#d4e9e2'];

const HEALTH_TIPS = [
  "การออกกำลังกายวันละ 30 นาที ช่วยส่งเสริม Happy Workplace มีพลังทำงานอย่างมีความสุข!",
  "การเดินเร็วช่วยเผาผลาญไขมันสะสม และเสริมระบบไหลเวียนโลหิตได้อย่างยอดเยี่ยม",
  "การดื่มน้ำให้เพียงพอก่อนและหลังออกกำลังกาย ช่วยลดความอ่อนล้าของร่างกาย",
  "รู้หรือไม่? พนักงาน GPO South ร่วมกันก้าวสะสมเพื่อสุขภาพร่างกายและจิตใจที่แข็งแกร่งยิ่งขึ้น",
  "การยืดเหยียดกล้ามเนื้อ 5-10 นาทีหลังออกกำลังกาย ช่วยลดโอกาสเกิดการบาดเจ็บได้ดีมาก",
];

export default function Dashboard({ stats, workouts }: DashboardProps) {
  const [metricTab, setMetricTab] = useState<'steps' | 'calories' | 'duration'>('steps');
  const [ratioMetric, setRatioMetric] = useState<'count' | 'steps' | 'calories' | 'duration'>('count');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // 1. Calculate active days/streak
  const activeStreak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const uniqueDates = new Set(workouts.map(w => w.date));
    return uniqueDates.size;
  }, [workouts]);

  // 2. Formulate charts data (last 7 days of activity)
  const chartData = useMemo(() => {
    const last7Days: { dateLabel: string; steps: number; calories: number; duration: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dateLabel = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      const totalSteps = dayWorkouts.reduce((sum, w) => sum + w.steps, 0);
      const totalCalories = dayWorkouts.reduce((sum, w) => sum + w.calories, 0);
      const totalDuration = dayWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
      
      last7Days.push({
        dateLabel,
        steps: totalSteps,
        calories: totalCalories,
        duration: totalDuration,
      });
    }
    return last7Days;
  }, [workouts]);

  // 3. Formulate activity ratio data dynamically based on selected ratioMetric
  const activityRatioData = useMemo(() => {
    const rawList = Object.keys(stats.byActivity).map((key) => {
      const item = stats.byActivity[key];
      let metricValue = item.count;
      if (ratioMetric === 'steps') metricValue = item.steps;
      if (ratioMetric === 'calories') metricValue = item.calories;
      if (ratioMetric === 'duration') metricValue = item.durationMinutes || 0;

      return {
        name: key,
        value: metricValue,
        count: item.count,
        steps: item.steps,
        calories: item.calories,
        duration: item.durationMinutes || 0,
      };
    });

    const totalForMetric = rawList.reduce((sum, item) => sum + item.value, 0);

    return rawList
      .map((item) => ({
        ...item,
        percentage: totalForMetric > 0 ? Math.round((item.value / totalForMetric) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats, ratioMetric]);

  // Total for currently selected ratioMetric
  const totalRatioMetricValue = useMemo(() => {
    return activityRatioData.reduce((sum, item) => sum + item.value, 0);
  }, [activityRatioData]);

  // Selected Activity Detailed Info
  const selectedActivityDetail = useMemo(() => {
    if (!selectedActivity) return null;
    return activityRatioData.find((a) => a.name === selectedActivity) || null;
  }, [selectedActivity, activityRatioData]);

  // Top activity name
  const topActivity = useMemo(() => {
    if (activityRatioData.length === 0) return 'ยังไม่มีข้อมูล';
    return activityRatioData[0].name;
  }, [activityRatioData]);

  // Average steps per workout
  const avgStepsPerSession = useMemo(() => {
    if (!stats.totalWorkouts || stats.totalWorkouts === 0) return 0;
    return Math.round(stats.totalSteps / stats.totalWorkouts);
  }, [stats]);

  // Calculate equivalent distance in kilometers (approx 0.75m per step)
  const totalKm = useMemo(() => {
    return ((stats.totalSteps * 0.75) / 1000).toFixed(1);
  }, [stats.totalSteps]);

  // Random health tip
  const randomTip = useMemo(() => {
    return HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];
  }, []);

  // Calculate total workout duration in minutes
  const totalDuration = useMemo(() => {
    if (stats.totalDurationMinutes) return stats.totalDurationMinutes;
    return workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
  }, [stats, workouts]);

  // Milestones array
  const milestones = [
    { target: 100000, label: 'Bronze Goal', desc: '100k ก้าว' },
    { target: 250000, label: 'Silver Goal', desc: '250k ก้าว' },
    { target: 500000, label: 'Gold Goal', desc: '500k ก้าว' },
    { target: 1000000, label: 'Platinum Goal', desc: '1M ก้าว' },
  ];

  const currentGoalIndex = milestones.findIndex(m => stats.totalSteps < m.target);
  const nextTarget = currentGoalIndex === -1 ? 1000000 : milestones[currentGoalIndex].target;
  const progressPercent = Math.min(100, Math.round((stats.totalSteps / nextTarget) * 100));

  return (
    <div className="space-y-5 sm:space-y-6 relative z-10">
      {/* 1. Health Tip Banner (Starbucks Minty Green styling) */}
      <div id="health-tip-banner" className="sb-card bg-sb-light-green/35 border-transparent p-3.5 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-sb-light-green/40 rounded-full flex items-center justify-center shrink-0 shadow-sm text-sb-gold">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase text-sb-green tracking-wider flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-sb-accent" /> GPO South Health Tip
            </span>
            <p className="text-xs sm:text-sm text-sb-house font-semibold mt-0.5 leading-snug">{randomTip}</p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white/80 rounded-full border border-sb-light-green text-[11px] font-bold text-sb-house shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-sb-gold" />
          <span>Happy Workplace 2026</span>
        </div>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Card 1: Total Steps */}
        <div className="sb-card sb-card-hover p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-sb-light-green/20 rounded-full flex items-center justify-center text-sb-accent border border-sb-light-green/40 shrink-0">
            <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] text-sb-text-muted font-bold uppercase block tracking-wider truncate">Total Steps</span>
            <span className="text-base sm:text-xl font-bold text-sb-house font-mono block mt-0.5 truncate">
              {stats.totalSteps.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-sb-green block truncate">ก้าวสุขภาพ</span>
          </div>
        </div>

        {/* Card 2: Total Calories */}
        <div className="sb-card sb-card-hover p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-sb-light-green/20 rounded-full flex items-center justify-center text-sb-accent border border-sb-light-green/40 shrink-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] text-sb-text-muted font-bold uppercase block tracking-wider truncate">Burned Calories</span>
            <span className="text-base sm:text-xl font-bold text-sb-house font-mono block mt-0.5 truncate">
              {stats.totalCalories.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-sb-green block truncate">kcal เผาผลาญ</span>
          </div>
        </div>

        {/* Card 3: Total Duration */}
        <div className="sb-card sb-card-hover p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-sb-light-green/20 rounded-full flex items-center justify-center text-sb-accent border border-sb-light-green/40 shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] text-sb-text-muted font-bold uppercase block tracking-wider truncate">Total Duration</span>
            <span className="text-base sm:text-xl font-bold text-sb-house font-mono block mt-0.5 truncate">
              {totalDuration.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-sb-green block truncate">นาทีออกกำลังกาย</span>
          </div>
        </div>

        {/* Card 4: Equivalent Km */}
        <div className="sb-card sb-card-hover p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-sb-light-green/20 rounded-full flex items-center justify-center text-sb-accent border border-sb-light-green/40 shrink-0">
            <Milestone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] text-sb-text-muted font-bold uppercase block tracking-wider truncate">Distance</span>
            <span className="text-base sm:text-xl font-bold text-sb-house font-mono block mt-0.5 truncate">
              {totalKm}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-sb-green block truncate">กิโลเมตรสะสม</span>
          </div>
        </div>

        {/* Card 5: Active Days Streak */}
        <div className="col-span-2 sm:col-span-1 sb-card sb-card-hover p-3.5 sm:p-5 flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-sb-gold/10 rounded-full flex items-center justify-center text-sb-gold border border-sb-gold/30 shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] text-sb-text-muted font-bold uppercase block tracking-wider truncate">Active Days</span>
            <span className="text-base sm:text-xl font-bold text-sb-house font-mono block mt-0.5 truncate">
              {activeStreak}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-sb-gold flex items-center gap-1 truncate">
              <span>วันออกกำลังกาย</span>
              <Star className="w-3 h-3 text-sb-gold fill-sb-gold shrink-0" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        
        {/* Chart A: 7-Day Performance Trend with Metric Tabs */}
        <div className="lg:col-span-2 sb-card p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-sb-ceramic">
              <div>
                <h3 className="text-sm font-bold text-sb-green uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sb-accent" />
                  Performance Trend (Last 7 Days)
                </h3>
                <p className="text-xs text-sb-text-muted mt-0.5">สถิติก้าวเดิน แคลลอรี่ และระยะเวลาการออกกำลังกายของหน่วยงาน</p>
              </div>

              {/* Metric Toggle Tabs */}
              <div className="flex bg-sb-cream p-1 rounded-full border border-sb-ceramic gap-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMetricTab('steps')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    metricTab === 'steps' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  <Footprints className="w-3 h-3" />
                  <span>ก้าว</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetricTab('calories')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    metricTab === 'calories' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>kcal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetricTab('duration')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                    metricTab === 'duration' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>นาที</span>
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00754A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00754A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#006241', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#006241', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1E3932', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}
                    labelFormatter={(value) => `วันที่ ${value}`}
                    formatter={(val: any) => [
                      `${Number(val).toLocaleString()} ${metricTab === 'steps' ? 'ก้าว' : metricTab === 'calories' ? 'kcal' : 'นาที'}`,
                      metricTab === 'steps' ? 'จำนวนก้าว' : metricTab === 'calories' ? 'แคลลอรี่' : 'ระยะเวลา'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey={metricTab}
                    stroke="#00754A"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMetric)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Insights Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4 mt-4 border-t border-sb-ceramic/60">
            <div className="bg-sb-cream/60 p-2.5 rounded-xl border border-sb-ceramic/50">
              <span className="text-[9px] text-sb-text-muted font-bold uppercase block">เฉลี่ยต่อรอบ</span>
              <span className="text-xs sm:text-sm font-bold text-sb-house font-mono block mt-0.5">
                {avgStepsPerSession.toLocaleString()} ก้าว
              </span>
            </div>
            <div className="bg-sb-cream/60 p-2.5 rounded-xl border border-sb-ceramic/50">
              <span className="text-[9px] text-sb-text-muted font-bold uppercase block">กีฬายอดนิยม</span>
              <span className="text-xs sm:text-sm font-bold text-sb-accent block truncate mt-0.5">
                {topActivity}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-sb-cream/60 p-2.5 rounded-xl border border-sb-ceramic/50">
              <span className="text-[9px] text-sb-text-muted font-bold uppercase block">การรายงานรวม</span>
              <span className="text-xs sm:text-sm font-bold text-sb-house font-mono block mt-0.5">
                {stats.totalWorkouts} ครั้ง
              </span>
            </div>
          </div>
        </div>

        {/* Chart B: Category Breakdown & Proportions (ACTIVITY RATIO ENHANCED) */}
        <div className="sb-card p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-sb-ceramic flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sb-green uppercase tracking-wide flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-sb-accent" />
                  Activity Ratio
                </h3>
                <span className="text-[10px] font-bold text-sb-accent bg-sb-light-green/20 px-2 py-0.5 rounded-full border border-sb-light-green/40">
                  {activityRatioData.length} กิจกรรม
                </span>
              </div>
              
              {/* Ratio Metric Filter Switcher */}
              <div className="flex bg-sb-cream p-1 rounded-xl border border-sb-ceramic justify-between text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setRatioMetric('count')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all ${
                    ratioMetric === 'count' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  ครั้ง
                </button>
                <button
                  type="button"
                  onClick={() => setRatioMetric('steps')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all ${
                    ratioMetric === 'steps' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  ก้าว
                </button>
                <button
                  type="button"
                  onClick={() => setRatioMetric('calories')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all ${
                    ratioMetric === 'calories' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  kcal
                </button>
                <button
                  type="button"
                  onClick={() => setRatioMetric('duration')}
                  className={`flex-1 py-1 rounded-lg text-center transition-all ${
                    ratioMetric === 'duration' ? 'bg-sb-accent text-white shadow-xs' : 'text-sb-text-muted hover:text-sb-house'
                  }`}
                >
                  นาที
                </button>
              </div>
            </div>

            {/* Interactive Pie/Donut Chart */}
            {activityRatioData.length === 0 ? (
              <div className="py-12 text-center text-xs text-sb-text-muted">
                ยังไม่มีข้อมูลประเภทกิจกรรมในขณะนี้
              </div>
            ) : (
              <div className="h-44 relative flex items-center justify-center my-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityRatioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                      onClick={(entry) => {
                        setSelectedActivity(selectedActivity === entry.name ? null : entry.name);
                      }}
                      className="cursor-pointer"
                    >
                      {activityRatioData.map((entry, index) => {
                        const isSelected = selectedActivity === entry.name;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke={isSelected ? '#ffffff' : 'none'}
                            strokeWidth={isSelected ? 3 : 0}
                            className="transition-all hover:opacity-80"
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1E3932', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} ${
                          ratioMetric === 'count' ? 'ครั้ง' : ratioMetric === 'steps' ? 'ก้าว' : ratioMetric === 'calories' ? 'kcal' : 'นาที'
                        } (${item.payload.percentage}%)`,
                        item.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <span className="text-[9px] font-bold text-sb-text-muted uppercase block">
                    {ratioMetric === 'count' ? 'รายงานรวม' : ratioMetric === 'steps' ? 'ก้าวรวม' : ratioMetric === 'calories' ? 'แคลรวม' : 'เวลารวม'}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-sb-house font-mono leading-none block mt-0.5">
                    {totalRatioMetricValue.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-sb-accent font-bold block mt-0.5">
                    {ratioMetric === 'count' ? 'ครั้ง' : ratioMetric === 'steps' ? 'ก้าว' : ratioMetric === 'calories' ? 'kcal' : 'นาที'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Drill-down Activity Detailed Inspection Banner */}
          {selectedActivityDetail ? (
            <div className="bg-sb-light-green/30 border border-sb-light-green/70 rounded-2xl p-3 relative space-y-2 animate-fade-in shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sb-accent border border-sb-light-green/50 shadow-2xs shrink-0">
                    <ActivityIcon activityType={selectedActivityDetail.name} className="w-4 h-4 text-sb-accent" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sb-house">{selectedActivityDetail.name}</h4>
                    <span className="text-[10px] text-sb-green font-bold">
                      สัดส่วน {selectedActivityDetail.percentage}% ของ{ratioMetric === 'count' ? 'กิจกรรม' : ratioMetric === 'steps' ? 'ก้าว' : ratioMetric === 'calories' ? 'แคลลอรี่' : 'เวลา'}ทั้งหมด
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedActivity(null)}
                  className="p-1 rounded-full text-sb-text-muted hover:text-sb-house hover:bg-white/80 transition-all"
                  title="ปิดรายละเอียด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Specific Activity Details Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-sb-light-green/40 text-[10px]">
                <div className="bg-white/80 p-1.5 rounded-xl border border-sb-light-green/30">
                  <span className="text-sb-text-muted font-semibold block">จำนวนรายงาน</span>
                  <span className="font-bold font-mono text-sb-house">{selectedActivityDetail.count} ครั้ง</span>
                </div>
                <div className="bg-white/80 p-1.5 rounded-xl border border-sb-light-green/30">
                  <span className="text-sb-text-muted font-semibold block">ก้าวสะสม</span>
                  <span className="font-bold font-mono text-sb-house">{selectedActivityDetail.steps.toLocaleString()} ก้าว</span>
                </div>
                <div className="bg-white/80 p-1.5 rounded-xl border border-sb-light-green/30">
                  <span className="text-sb-text-muted font-semibold block">แคลลอรี่</span>
                  <span className="font-bold font-mono text-sb-house">{selectedActivityDetail.calories.toLocaleString()} kcal</span>
                </div>
                <div className="bg-white/80 p-1.5 rounded-xl border border-sb-light-green/30">
                  <span className="text-sb-text-muted font-semibold block">เวลารวม</span>
                  <span className="font-bold font-mono text-sb-house">{selectedActivityDetail.duration} นาที</span>
                </div>
              </div>
            </div>
          ) : (
            /* Activity Interactive Progress List */
            <div className="space-y-2 pt-2 border-t border-sb-ceramic/60">
              <div className="flex items-center justify-between text-[10px] text-sb-text-muted font-bold uppercase tracking-wider">
                <span>ประเภทกิจกรรม</span>
                <span>คลิกเพื่อดูรายละเอียด</span>
              </div>
              {activityRatioData.slice(0, 5).map((item, index) => {
                const color = COLORS[index % COLORS.length];
                const isSelected = selectedActivity === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedActivity(isSelected ? null : item.name)}
                    className={`w-full text-left space-y-1 p-1.5 rounded-xl transition-all border ${
                      isSelected ? 'bg-sb-light-green/35 border-sb-accent shadow-2xs' : 'hover:bg-sb-cream/80 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ActivityIcon activityType={item.name} className="w-3.5 h-3.5 text-sb-accent shrink-0" />
                        <span className="font-bold text-sb-house truncate text-xs">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-bold text-sb-green shrink-0">
                          {item.value.toLocaleString()} {ratioMetric === 'count' ? 'ครั้ง' : ratioMetric === 'steps' ? 'ก้าว' : ratioMetric === 'calories' ? 'kcal' : 'นาที'} ({item.percentage}%)
                        </span>
                        <ChevronRight className="w-3 h-3 text-sb-text-muted shrink-0" />
                      </div>
                    </div>
                    <div className="w-full bg-sb-ceramic/70 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. GPO South Department Health Milestone Tracker */}
      <div className="sb-card p-4 sm:p-6 bg-linear-to-br from-white via-white to-sb-cream">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-sb-ceramic">
          <div>
            <h3 className="text-sm font-bold text-sb-green uppercase tracking-wide flex items-center gap-2">
              <Trophy className="w-4 h-4 text-sb-gold" /> GPO South Department Milestone Target
            </h3>
            <p className="text-xs text-sb-text-muted font-medium mt-0.5">
              เป้าหมายร่วมกันสะสมก้าวเดินระดับองค์กร (เป้าหมายถัดไป: {nextTarget.toLocaleString()} ก้าว)
            </p>
          </div>
          <div className="flex items-center gap-2 bg-sb-accent/10 px-3 py-1.5 rounded-full border border-sb-accent/20">
            <Target className="w-3.5 h-3.5 text-sb-accent" />
            <span className="text-xs font-bold text-sb-accent font-mono">
              {progressPercent}% Complete
            </span>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="my-5">
          <div className="w-full bg-sb-ceramic h-4 rounded-full overflow-hidden relative border border-sb-ceramic/80 p-0.5">
            <div
              className="h-full bg-linear-to-r from-sb-green to-sb-accent rounded-full transition-all duration-1000 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-sb-text-muted font-bold mt-2 uppercase tracking-wider font-mono">
            <span>0 ก้าว</span>
            <span className="text-sb-accent text-xs font-bold font-mono">
              {stats.totalSteps.toLocaleString()} / {nextTarget.toLocaleString()} ก้าว
            </span>
            <span>{nextTarget.toLocaleString()} ก้าว</span>
          </div>
        </div>

        {/* Milestone Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {milestones.map((m) => {
            const isUnlocked = stats.totalSteps >= m.target;
            return (
              <div
                key={m.target}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  isUnlocked
                    ? 'bg-sb-light-green/30 border-sb-green/40 text-sb-house'
                    : 'bg-sb-cream/50 border-sb-ceramic/80 text-sb-text-muted'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUnlocked ? 'bg-sb-accent text-white shadow-xs' : 'bg-sb-ceramic text-sb-text-muted'
                }`}>
                  {isUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">{m.label}</span>
                  <span className="text-[10px] font-medium block truncate text-sb-text-muted">{m.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

