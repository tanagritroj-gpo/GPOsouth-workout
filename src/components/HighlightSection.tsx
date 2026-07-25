import React, { useState, useMemo } from 'react';
import { Workout, WorkoutStats, LeaderboardEntry, User } from '../types';
import { Sparkles, Flame, Footprints, Trophy, TrendingUp, Users, Calendar, Star, Crown, Activity, MessageSquare } from 'lucide-react';
import LineIntegrationModal from './LineIntegrationModal';

interface HighlightSectionProps {
  workouts: Workout[];
  stats: WorkoutStats;
  leaderboard?: LeaderboardEntry[];
  currentUser?: User | null;
}

const ALLOWED_LINE_ADMIN_IDS = ['u-1784682982533', 'u-1784639599172'];

export default function HighlightSection({ workouts, stats, leaderboard = [], currentUser }: HighlightSectionProps) {
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly'>('all');
  const [showLineModal, setShowLineModal] = useState(false);

  const currentUserIdClean = currentUser?.id ? String(currentUser.id).trim().toLowerCase() : '';
  const isLineAdmin = Boolean(currentUserIdClean && ALLOWED_LINE_ADMIN_IDS.some(id => id.toLowerCase() === currentUserIdClean));

  // Compute dynamic highlights from real workout data
  const highlights = useMemo(() => {
    // 1. Daily calculation (Today)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayWorkouts = workouts.filter((w) => w.date === todayStr);

    const todaySteps = todayWorkouts.reduce((sum, w) => sum + (w.steps || 0), 0);
    const todayCalories = todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const todayDuration = todayWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
    const todayActiveUsersSet = new Set(todayWorkouts.map((w) => w.userId));
    const todayActiveUsersCount = todayActiveUsersSet.size;

    // Daily top activity
    const todayActivityMap: Record<string, { count: number; steps: number }> = {};
    todayWorkouts.forEach((w) => {
      if (!todayActivityMap[w.activityType]) {
        todayActivityMap[w.activityType] = { count: 0, steps: 0 };
      }
      todayActivityMap[w.activityType].count += 1;
      todayActivityMap[w.activityType].steps += w.steps || 0;
    });
    const sortedTodayActivities = Object.entries(todayActivityMap).sort((a, b) => b[1].count - a[1].count);
    const todayTopActivity = sortedTodayActivities[0] ? sortedTodayActivities[0][0] : 'เดินเร็ว / วิ่ง';

    // Today's top contributor
    const todayUserMap: Record<string, { name: string; steps: number; calories: number }> = {};
    todayWorkouts.forEach((w) => {
      if (!todayUserMap[w.userId]) {
        todayUserMap[w.userId] = { name: w.userName, steps: 0, calories: 0 };
      }
      todayUserMap[w.userId].steps += w.steps || 0;
      todayUserMap[w.userId].calories += w.calories || 0;
    });
    const sortedTodayUsers = Object.values(todayUserMap).sort((a, b) => b.steps - a.steps);
    const todayTopUser = sortedTodayUsers[0] || null;

    // 2. Weekly calculation (Last 7 Days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyWorkouts = workouts.filter((w) => new Date(w.date) >= sevenDaysAgo);

    const weeklySteps = weeklyWorkouts.reduce((sum, w) => sum + (w.steps || 0), 0);
    const weeklyCalories = weeklyWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const weeklyDuration = weeklyWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
    const weeklyActiveUsersSet = new Set(weeklyWorkouts.map((w) => w.userId));
    const weeklyActiveUsersCount = weeklyActiveUsersSet.size;

    // Weekly top activity
    const weeklyActivityMap: Record<string, { count: number; steps: number }> = {};
    weeklyWorkouts.forEach((w) => {
      if (!weeklyActivityMap[w.activityType]) {
        weeklyActivityMap[w.activityType] = { count: 0, steps: 0 };
      }
      weeklyActivityMap[w.activityType].count += 1;
      weeklyActivityMap[w.activityType].steps += w.steps || 0;
    });
    const sortedWeeklyActivities = Object.entries(weeklyActivityMap).sort((a, b) => b[1].count - a[1].count);
    const weeklyTopActivity = sortedWeeklyActivities[0] ? sortedWeeklyActivities[0][0] : 'เดินสะสมก้าว';

    // Weekly top user
    const weeklyUserMap: Record<string, { name: string; steps: number; calories: number; count: number }> = {};
    weeklyWorkouts.forEach((w) => {
      if (!weeklyUserMap[w.userId]) {
        weeklyUserMap[w.userId] = { name: w.userName, steps: 0, calories: 0, count: 0 };
      }
      weeklyUserMap[w.userId].steps += w.steps || 0;
      weeklyUserMap[w.userId].calories += w.calories || 0;
      weeklyUserMap[w.userId].count += 1;
    });
    const sortedWeeklyUsers = Object.values(weeklyUserMap).sort((a, b) => b.steps - a.steps);
    const weeklyTopUser = sortedWeeklyUsers[0] || null;

    // Fallbacks if stats are empty
    const fallbackWeeklySteps = weeklySteps > 0 ? weeklySteps : stats.totalSteps;
    const fallbackWeeklyCalories = weeklyCalories > 0 ? weeklyCalories : stats.totalCalories;

    return {
      today: {
        steps: todaySteps,
        calories: todayCalories,
        duration: todayDuration,
        activeUsers: todayActiveUsersCount,
        topActivity: todayTopActivity,
        topUser: todayTopUser,
        count: todayWorkouts.length,
      },
      weekly: {
        steps: fallbackWeeklySteps,
        calories: fallbackWeeklyCalories,
        duration: weeklyDuration,
        activeUsers: weeklyActiveUsersCount || 5,
        topActivity: weeklyTopActivity,
        topUser: weeklyTopUser,
        count: weeklyWorkouts.length,
      },
    };
  }, [workouts, stats]);

  const todayDateTh = useMemo(() => {
    return new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  return (
    <div id="employee-highlights-card" className="sb-card bg-gradient-to-br from-white via-emerald-50/30 to-amber-50/20 border border-emerald-100/80 p-4 sm:p-6 rounded-3xl shadow-sm relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

      {/* Header section with minimal badge & filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-emerald-900/10 relative z-10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" /> ไฮไลต์พนักงาน
            </span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              GPO South Activity
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-1 flex items-center gap-2 font-display">
            🔥 ความเคลื่อนไหวเด่นรายวัน & รายสัปดาห์
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            อัปเดตสถิติก้าวเดินและกิจกรรมของทีมงานประจำวันที่ <span className="font-semibold text-slate-700">{todayDateTh}</span>
          </p>
        </div>

        {/* Filter Switcher Tabs & LINE Notify Action */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex bg-white/90 p-1 rounded-2xl border border-slate-200/80 gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>ทั้งหมด</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('daily')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === 'daily'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>รายวัน</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('weekly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filter === 'weekly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>รายสัปดาห์</span>
            </button>
          </div>

          {isLineAdmin && (
            <button
              type="button"
              onClick={() => setShowLineModal(true)}
              className="px-3.5 py-1.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all hover:scale-102 active:scale-95"
              title="ส่งสรุปและแจ้งเตือนพนักงานเข้ากลุ่ม LINE"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-100 fill-emerald-100/30" />
              <span>แจ้งเตือนกลุ่ม LINE</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of 2 Clean Minimal Bright Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        
        {/* CARD 1: DAILY HIGHLIGHT (รายวัน) */}
        {(filter === 'all' || filter === 'daily') && (
          <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-amber-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-amber-100/50 transition-all flex flex-col justify-between group relative overflow-hidden">
            {/* Top Minimal Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

            <div>
              {/* Badge & Date */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> ไฮไลต์ประจำวัน (Daily)
                </span>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{todayDateTh}</span>
              </div>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-amber-600 transition-colors leading-snug">
                {highlights.today.activeUsers > 0
                  ? `วันนี้ทีมงานออกขยับแล้ว ${highlights.today.activeUsers} ท่าน!`
                  : 'เริ่มต้นวันใหม่ด้วยพลังสุขภาพยามเช้า'}
              </h3>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {highlights.today.steps > 0
                  ? `สะสมก้าวเดินรวมวันนี้ ${highlights.today.steps.toLocaleString()} ก้าว เผาผลาญ ${highlights.today.calories.toLocaleString()} kcal`
                  : 'สะสมก้าวเดินยามเช้าหรือหลังเลิกงาน เพื่อสร้างสังคมสุขภาพดีประจำวัน'}
              </p>

              {/* Stat Metric Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-1.5 text-amber-700 mb-0.5">
                    <Footprints className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">ก้าวรวมวันนี้</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-800 block">
                    {highlights.today.steps.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">ก้าว</span>
                  </span>
                </div>

                <div className="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-1.5 text-orange-700 mb-0.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">กีฬาท็อปฮิต</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate block">
                    {highlights.today.topActivity}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Spotlight Banner */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold truncate w-full">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 font-bold text-[10px] shadow-2xs">
                  1
                </span>
                <span className="truncate text-[11px]">
                  {highlights.today.topUser
                    ? `ผู้นำวันนี้: ${highlights.today.topUser.name} (${highlights.today.topUser.steps.toLocaleString()} ก้าว)`
                    : 'ยังไม่มีผลบันทึกของวันนี้ ร่วมเป็นคนแรก!'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CARD 2: WEEKLY HIGHLIGHT (รายสัปดาห์) */}
        {(filter === 'all' || filter === 'weekly') && (
          <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 hover:border-emerald-400/80 shadow-xs hover:shadow-emerald-100/50 transition-all flex flex-col justify-between group relative overflow-hidden">
            {/* Top Minimal Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />

            <div>
              {/* Badge & Date */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> ไฮไลต์รายสัปดาห์ (Weekly)
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">7 วันล่าสุด</span>
              </div>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors leading-snug">
                สัปดาห์นี้สะสมรวม {highlights.weekly.steps.toLocaleString()} ก้าว!
              </h3>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                พนักงานร่วมทำกิจกรรมอย่างต่อเนื่อง เผาผลาญพลังงานรวมกว่า {highlights.weekly.calories.toLocaleString()} kcal ช่วยลดสภาวะ Office Syndrome
              </p>

              {/* Stat Metric Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-emerald-700 mb-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">ผู้ร่วมกิจกรรม</span>
                  </div>
                  <span className="text-sm font-bold font-mono text-slate-800 block">
                    {highlights.weekly.activeUsers} <span className="text-[10px] font-normal text-slate-500">ท่าน</span>
                  </span>
                </div>

                <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
                  <div className="flex items-center gap-1.5 text-teal-700 mb-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">กีฬาท็อปฮิต</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate block">
                    {highlights.weekly.topActivity}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Champion Banner */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold truncate w-full">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                  <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                </span>
                <span className="truncate text-[11px]">
                  {highlights.weekly.topUser
                    ? `🏆 Champion: คุณ ${highlights.weekly.topUser.name} (${highlights.weekly.topUser.steps.toLocaleString()} ก้าว)`
                    : 'ร่วมสร้างสถิติเพื่อเป็นแชมป์ประจำสัปดาห์!'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* LINE Integration Modal */}
      <LineIntegrationModal
        isOpen={showLineModal}
        onClose={() => setShowLineModal(false)}
        leaderboard={leaderboard}
        stats={stats}
      />
    </div>
  );
}
