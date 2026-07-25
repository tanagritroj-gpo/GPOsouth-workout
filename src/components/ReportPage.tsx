import React, { useState, useMemo, useEffect } from 'react';
import { User, Workout } from '../types';
import Avatar from './Avatar';
import ActivityIcon from './ActivityIcon';
import { dbGetUsers } from '../firebase-client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FileText,
  Download,
  Filter,
  Users,
  UserCheck,
  Calendar,
  Search,
  Printer,
  Footprints,
  Flame,
  Clock,
  Activity,
  Award,
  ChevronRight,
  Sparkles,
  BarChart3,
  TrendingUp,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface ReportPageProps {
  workouts: Workout[];
  currentUser: User | null;
}

const COLORS = ['#006241', '#00754A', '#1E3932', '#cba258', '#2b5148', '#8ba89f', '#d4e9e2', '#3b82f6'];

export default function ReportPage({ workouts, currentUser }: ReportPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  // Filters state
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7days' | '30days' | 'thisMonth'>('all');

  // Export Notification
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string>('');

  // Fetch registered users list
  useEffect(() => {
    let isMounted = true;
    dbGetUsers().then((fetchedUsers) => {
      if (isMounted) {
        setUsers(fetchedUsers);
        setLoadingUsers(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract all unique departments
  const departmentsList = useMemo(() => {
    const deps = new Set<string>();
    users.forEach((u) => {
      if (u.department) deps.add(u.department);
    });
    workouts.forEach((w) => {
      // derive department if possible or keep unique list
    });
    return Array.from(deps);
  }, [users, workouts]);

  // Combined User Directory with stats
  const employeeDirectory = useMemo(() => {
    // Map of userId -> aggregated stats
    const userStatsMap: {
      [id: string]: {
        user: Partial<User> & { id: string; name: string; department: string; photoUrl?: string };
        totalSteps: number;
        totalCalories: number;
        totalDuration: number;
        totalWorkouts: number;
        dailyCount: number;
        weeklyCount: number;
        monthlyCount: number;
        byActivity: { [act: string]: number };
        lastActiveDate: string;
      };
    } = {};

    // Initialize with all known users
    users.forEach((u) => {
      userStatsMap[u.id] = {
        user: u,
        totalSteps: 0,
        totalCalories: 0,
        totalDuration: 0,
        totalWorkouts: 0,
        dailyCount: 0,
        weeklyCount: 0,
        monthlyCount: 0,
        byActivity: {},
        lastActiveDate: '',
      };
    });

    // Populate from workouts
    workouts.forEach((w) => {
      if (!userStatsMap[w.userId]) {
        userStatsMap[w.userId] = {
          user: { id: w.userId, name: w.userName, department: 'ไม่ระบุแผนก' },
          totalSteps: 0,
          totalCalories: 0,
          totalDuration: 0,
          totalWorkouts: 0,
          dailyCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          byActivity: {},
          lastActiveDate: '',
        };
      }

      const record = userStatsMap[w.userId];
      record.totalSteps += w.steps || 0;
      record.totalCalories += w.calories || 0;
      record.totalDuration += w.durationMinutes || 0;
      record.totalWorkouts += 1;

      if (w.submissionFormat === 'daily') record.dailyCount += 1;
      if (w.submissionFormat === 'weekly') record.weeklyCount += 1;
      if (w.submissionFormat === 'monthly') record.monthlyCount += 1;

      record.byActivity[w.activityType] = (record.byActivity[w.activityType] || 0) + 1;

      if (!record.lastActiveDate || new Date(w.date) > new Date(record.lastActiveDate)) {
        record.lastActiveDate = w.date;
      }
    });

    return Object.values(userStatsMap);
  }, [users, workouts]);

  // Filtered Workouts List based on user selection, department, timeframe, date range
  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    
    return workouts.filter((w) => {
      // 1. User Filter
      if (selectedUserId !== 'all' && w.userId !== selectedUserId) {
        return false;
      }

      // 2. Department Filter
      if (selectedDepartment !== 'all') {
        const emp = users.find((u) => u.id === w.userId);
        if (emp && emp.department !== selectedDepartment) {
          return false;
        }
      }

      // 3. Timeframe Format Filter (daily, weekly, monthly)
      if (selectedTimeframe !== 'all' && w.submissionFormat !== selectedTimeframe) {
        return false;
      }

      // 4. Date Range Filter
      if (dateRangeFilter !== 'all') {
        const workoutDate = new Date(w.date);
        const diffDays = Math.floor((now.getTime() - workoutDate.getTime()) / (1000 * 3600 * 24));

        if (dateRangeFilter === '7days' && diffDays > 7) return false;
        if (dateRangeFilter === '30days' && diffDays > 30) return false;
        if (dateRangeFilter === 'thisMonth') {
          if (workoutDate.getMonth() !== now.getMonth() || workoutDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      // 5. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const emp = users.find((u) => u.id === w.userId);
        const matchesName = w.userName.toLowerCase().includes(q);
        const matchesDep = emp?.department.toLowerCase().includes(q);
        const matchesAct = w.activityType.toLowerCase().includes(q);
        const matchesPeriod = w.period?.toLowerCase().includes(q);
        if (!matchesName && !matchesDep && !matchesAct && !matchesPeriod) {
          return false;
        }
      }

      return true;
    });
  }, [workouts, selectedUserId, selectedDepartment, selectedTimeframe, dateRangeFilter, searchQuery, users]);

  // Filtered Employees List (for Employee Table / Cards)
  const filteredEmployees = useMemo(() => {
    return employeeDirectory.filter((item) => {
      // 1. Specific Employee
      if (selectedUserId !== 'all' && item.user.id !== selectedUserId) {
        return false;
      }
      // 2. Department
      if (selectedDepartment !== 'all' && item.user.department !== selectedDepartment) {
        return false;
      }
      // 3. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = item.user.name?.toLowerCase().includes(q);
        const matchesDep = item.user.department?.toLowerCase().includes(q);
        if (!matchesName && !matchesDep) return false;
      }

      return true;
    }).sort((a, b) => b.totalSteps - a.totalSteps);
  }, [employeeDirectory, selectedUserId, selectedDepartment, searchQuery]);

  // Overall Aggregated Stats for current filtered dataset
  const filteredStats = useMemo(() => {
    let steps = 0;
    let calories = 0;
    let duration = 0;
    const actMap: { [key: string]: number } = {};

    filteredWorkouts.forEach((w) => {
      steps += w.steps || 0;
      calories += w.calories || 0;
      duration += w.durationMinutes || 0;
      actMap[w.activityType] = (actMap[w.activityType] || 0) + 1;
    });

    const activeUserIds = new Set(filteredWorkouts.map((w) => w.userId));

    return {
      totalSteps: steps,
      totalCalories: calories,
      totalDuration: duration,
      totalLogs: filteredWorkouts.length,
      activeEmployeesCount: activeUserIds.size,
      actMap,
    };
  }, [filteredWorkouts]);

  // Daily / Weekly / Monthly Timeline Chart Data
  const timelineChartData = useMemo(() => {
    const map: { [dateKey: string]: { date: string; steps: number; calories: number; count: number } } = {};

    // Sort chronologically ascending for chart
    const sorted = [...filteredWorkouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((w) => {
      const dateKey = w.date || w.createdAt.slice(0, 10);
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, steps: 0, calories: 0, count: 0 };
      }
      map[dateKey].steps += w.steps || 0;
      map[dateKey].calories += w.calories || 0;
      map[dateKey].count += 1;
    });

    return Object.values(map);
  }, [filteredWorkouts]);

  // Single Selected Employee Details (If selectedUserId !== 'all')
  const selectedEmployeeObject = useMemo(() => {
    if (selectedUserId === 'all') return null;
    return employeeDirectory.find((emp) => emp.user.id === selectedUserId) || null;
  }, [selectedUserId, employeeDirectory]);

  // CSV Export Handler
  const handleExportCSV = (exportType: 'employees' | 'detailed') => {
    try {
      let csvContent = '';

      if (exportType === 'employees') {
        // Employee Summary CSV
        const headers = ['ลำดับ', 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'แผนก/ฝ่าย', 'จำนวนการบันทึก (ครั้ง)', 'ก้าวสะสมรวม (ก้าว)', 'แคลลอรี่รวม (kcal)', 'เวลารวม (นาที)', 'กิจกรรมหลัก', 'บันทึกล่าสุด'];
        
        const rows = filteredEmployees.map((emp, idx) => {
          // find top activity
          let topAct = 'ไม่มี';
          let maxCount = 0;
          Object.entries(emp.byActivity).forEach(([act, cnt]) => {
            const count = Number(cnt);
            if (count > maxCount) {
              maxCount = count;
              topAct = act;
            }
          });

          return [
            idx + 1,
            `"${emp.user.id}"`,
            `"${emp.user.name || ''}"`,
            `"${emp.user.department || ''}"`,
            emp.totalWorkouts,
            emp.totalSteps,
            emp.totalCalories,
            emp.totalDuration,
            `"${topAct}"`,
            `"${emp.lastActiveDate || '-'}"`
          ].join(',');
        });

        csvContent = [headers.join(','), ...rows].join('\n');
      } else {
        // Detailed Workouts CSV
        const headers = ['ลำดับ', 'วันที่บันทึก', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'รูปแบบรายงาน', 'ช่วงเวลา/งวด', 'ประเภทกิจกรรม', 'จำนวนก้าว', 'แคลลอรี่ (kcal)', 'ระยะเวลา (นาที)', 'เวลาที่บันทึกระบบ'];

        const rows = filteredWorkouts.map((w, idx) => {
          const emp = users.find((u) => u.id === w.userId);
          const formatLabel = w.submissionFormat === 'daily' ? 'รายวัน' : w.submissionFormat === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน';
          
          return [
            idx + 1,
            `"${w.date}"`,
            `"${w.userId}"`,
            `"${w.userName}"`,
            `"${formatLabel}"`,
            `"${w.period || ''}"`,
            `"${w.activityType}"`,
            w.steps || 0,
            w.calories || 0,
            w.durationMinutes || 0,
            `"${new Date(w.createdAt).toLocaleString('th-TH')}"`
          ].join(',');
        });

        csvContent = [headers.join(','), ...rows].join('\n');
      }

      // Add UTF-8 BOM so Thai characters open cleanly in Excel
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = exportType === 'employees' 
        ? `GPO_South_Employee_Summary_Report_${new Date().toISOString().slice(0,10)}.csv`
        : `GPO_South_Detailed_Workout_Logs_${new Date().toISOString().slice(0,10)}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMsg(`ส่งออกไฟล์ ${filename} สำเร็จแล้ว!`);
      setTimeout(() => setExportSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Export CSV Error:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV');
    }
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#1c1c1c] via-[#2b5148] to-[#006241] text-white p-5 sm:p-7 lg:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 lg:gap-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 text-xs font-bold border border-white/10 shadow-xs">
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Health Analytics & Reports</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-sans tracking-tight leading-tight">
              รายงานสรุปสถิติพนักงานรายบุคคล
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              ระบบสรุปผลกิจกรรมการออกกำลังกาย สถิติรายวัน รายสัปดาห์ รายเดือน แยกตามแผนกและบุคลากร พร้อมส่งออกข้อมูลเป็นไฟล์ CSV สำหรับงานบริหารทรัพยากรบุคคล
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleExportCSV('employees')}
              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export สรุปรายบุคคล (CSV)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV('detailed')}
              className="h-10 px-4 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-full flex items-center gap-2 border border-white/20 shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Export ละเอียด (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 flex items-center justify-center shadow-sm transition-all active:scale-95 shrink-0"
              title="พิมพ์รายงาน"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Export Success Toast Notification */}
      {exportSuccessMsg && (
        <div className="bg-emerald-600 text-white p-3.5 px-5 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-bold animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button onClick={() => setExportSuccessMsg('')} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Control Panel & Filters */}
      <div className="sb-card p-4 sm:p-5 lg:p-6 space-y-4 shadow-sm border border-sb-ceramic/80">
        <div className="flex items-center justify-between pb-3 border-b border-sb-ceramic">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sb-accent" />
            <h3 className="text-xs font-bold text-sb-house uppercase tracking-wider">ตัวกรองรายงานข้อมูล (Filter Options)</h3>
          </div>
          {(selectedUserId !== 'all' || selectedDepartment !== 'all' || selectedTimeframe !== 'all' || dateRangeFilter !== 'all' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setSelectedUserId('all');
                setSelectedDepartment('all');
                setSelectedTimeframe('all');
                setDateRangeFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* A. Employee Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-sb-text-muted flex items-center gap-1">
              <Users className="w-3 h-3 text-sb-accent" />
              เลือกพนักงาน
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house font-bold shadow-sm appearance-none cursor-pointer transition-all hover:border-sb-accent/50 truncate"
              >
                <option value="all">พนักงานทุกคน ({employeeDirectory.length} คน)</option>
                {employeeDirectory.map((emp) => (
                  <option key={emp.user.id} value={emp.user.id}>
                    {emp.user.name} ({emp.user.department || 'ไม่ระบุ'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* B. Department Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-sb-text-muted flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-sb-accent" />
              เลือกแผนก/ฝ่าย
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house font-bold shadow-sm appearance-none cursor-pointer transition-all hover:border-sb-accent/50 truncate"
              >
                <option value="all">ทุกแผนก/ฝ่าย</option>
                {departmentsList.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* C. Timeframe Submission Format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-sb-text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sb-accent" />
              รูปแบบรายงาน
            </label>
            <div className="relative">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house font-bold shadow-sm appearance-none cursor-pointer transition-all hover:border-sb-accent/50 truncate"
              >
                <option value="all">รวมทุกรูปแบบ (วัน/สัปดาห์/เดือน)</option>
                <option value="daily">สรุปรายวัน (Daily)</option>
                <option value="weekly">สรุปรายสัปดาห์ (Weekly)</option>
                <option value="monthly">สรุปรายเดือน (Monthly)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* D. Date Range Quick Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-sb-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-sb-accent" />
              ช่วงเวลาบันทึก
            </label>
            <div className="relative">
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as any)}
                className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house font-bold shadow-sm appearance-none cursor-pointer transition-all hover:border-sb-accent/50 truncate"
              >
                <option value="all">ทั้งหมด (All Time)</option>
                <option value="7days">7 วันล่าสุด</option>
                <option value="30days">30 วันล่าสุด</option>
                <option value="thisMonth">ภายในเดือนนี้</option>
              </select>
              <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-sb-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน, แผนก, ประเภทกิจกรรม หรือข้อความ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-10 bg-white border border-sb-ceramic rounded-full text-xs font-bold text-sb-house shadow-sm hover:border-sb-accent/50 focus:outline-none focus:border-sb-accent placeholder-sb-text-muted/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sb-text-muted hover:text-sb-house p-1 rounded-full hover:bg-sb-cream transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1 */}
        <div className="sb-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-sb-light-green/30 text-sb-accent flex items-center justify-center shrink-0 border border-sb-light-green/50">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase tracking-tight block leading-tight truncate">
              พนักงานที่บันทึก
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-bold font-mono text-sb-house leading-none">{filteredStats.activeEmployeesCount}</span>
              <span className="text-[10px] text-sb-text-muted font-bold">คน</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="sb-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase tracking-tight block leading-tight truncate">
              ก้าวสะสมรวม
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-bold font-mono text-sb-house leading-none">{filteredStats.totalSteps.toLocaleString()}</span>
              <span className="text-[10px] text-sb-text-muted font-bold">ก้าว</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="sb-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase tracking-tight block leading-tight truncate">
              เผาผลาญแคลลอรี่
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-bold font-mono text-sb-house leading-none">{filteredStats.totalCalories.toLocaleString()}</span>
              <span className="text-[10px] text-sb-text-muted font-bold">kcal</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="sb-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 border border-blue-200">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase tracking-tight block leading-tight truncate">
              เวลารวมออกกำลัง
            </span>
            <div className="flex items-baseline flex-wrap gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-bold font-mono text-sb-house leading-none">{Math.round(filteredStats.totalDuration / 60)}</span>
              <span className="text-[10px] text-sb-text-muted font-bold">ชม.</span>
              <span className="text-[9px] text-sb-text-muted font-medium block w-full sm:w-auto truncate">({filteredStats.totalLogs} ครั้ง)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Single Employee Focused Dashboard OR All Employees Overview Table */}
      {selectedEmployeeObject ? (
        /* SINGLE EMPLOYEE DETAILED DASHBOARD CARD */
        <div className="sb-card p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in border-2 border-sb-accent/30 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 pb-4 border-b border-sb-ceramic">
            <div className="flex items-center gap-3.5">
              <Avatar
                photoUrl={selectedEmployeeObject.user.photoUrl}
                name={selectedEmployeeObject.user.name || 'พนักงาน'}
                className="w-12 h-12 sm:w-16 sm:h-16 text-xl sm:text-2xl ring-4 ring-sb-light-green/30 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-sb-house truncate">{selectedEmployeeObject.user.name}</h2>
                  <span className="bg-sb-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                    {selectedEmployeeObject.user.department || 'ไม่ระบุแผนก'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-sb-text-muted mt-0.5 leading-tight">
                  รหัส: <span className="font-mono font-bold text-sb-house">{selectedEmployeeObject.user.id}</span> • บันทึกล่าสุด: {selectedEmployeeObject.lastActiveDate || 'ไม่มีข้อมูล'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedUserId('all')}
              className="h-10 px-4 bg-sb-cream hover:bg-sb-light-green/30 border border-sb-ceramic rounded-full text-xs font-bold text-sb-house flex items-center gap-1.5 shadow-sm transition-all shrink-0 active:scale-95"
            >
              <X className="w-4 h-4 text-sb-accent" />
              <span className="whitespace-nowrap">กลับไปดูพนักงานทั้งหมด</span>
            </button>
          </div>

          {/* Individual Employee Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
            <div className="bg-sb-cream/80 p-2.5 sm:p-3.5 rounded-2xl border border-sb-ceramic flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-sb-text-muted uppercase leading-tight block tracking-tight whitespace-nowrap">การส่งรายงาน</span>
                <span className="text-base sm:text-lg font-bold text-sb-house font-mono block my-1 leading-tight">{selectedEmployeeObject.totalWorkouts} ครั้ง</span>
              </div>
              <span className="text-[9.5px] text-sb-accent font-semibold block leading-tight mt-1 whitespace-nowrap">
                วัน {selectedEmployeeObject.dailyCount} • สัปดาห์ {selectedEmployeeObject.weeklyCount} • เดือน {selectedEmployeeObject.monthlyCount}
              </span>
            </div>
            <div className="bg-sb-cream/80 p-2.5 sm:p-3.5 rounded-2xl border border-sb-ceramic flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-sb-text-muted uppercase leading-tight block tracking-tight whitespace-nowrap">ก้าวสะสม</span>
                <span className="text-base sm:text-lg font-bold text-sb-house font-mono block my-1 leading-tight">{selectedEmployeeObject.totalSteps.toLocaleString()} ก้าว</span>
              </div>
              <span className="text-[9.5px] text-emerald-700 font-semibold block leading-tight mt-1">
                เฉลี่ย {selectedEmployeeObject.totalWorkouts > 0 ? Math.round(selectedEmployeeObject.totalSteps / selectedEmployeeObject.totalWorkouts).toLocaleString() : 0} ก้าว/ครั้ง
              </span>
            </div>
            <div className="bg-sb-cream/80 p-2.5 sm:p-3.5 rounded-2xl border border-sb-ceramic flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-sb-text-muted uppercase leading-tight block tracking-tight whitespace-nowrap">แคลลอรี่สะสม</span>
                <span className="text-base sm:text-lg font-bold text-sb-house font-mono block my-1 leading-tight">{selectedEmployeeObject.totalCalories.toLocaleString()} kcal</span>
              </div>
              <span className="text-[9.5px] text-amber-700 font-semibold block leading-tight mt-1">
                เฉลี่ย {selectedEmployeeObject.totalWorkouts > 0 ? Math.round(selectedEmployeeObject.totalCalories / selectedEmployeeObject.totalWorkouts).toLocaleString() : 0} kcal/ครั้ง
              </span>
            </div>
            <div className="bg-sb-cream/80 p-2.5 sm:p-3.5 rounded-2xl border border-sb-ceramic flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-sb-text-muted uppercase leading-tight block tracking-tight whitespace-nowrap">ระยะเวลาออกกำลัง</span>
                <span className="text-base sm:text-lg font-bold text-sb-house font-mono block my-1 leading-tight">{selectedEmployeeObject.totalDuration} นาที</span>
              </div>
              <span className="text-[9.5px] text-blue-700 font-semibold block leading-tight mt-1">
                ประมาณ {Math.round(selectedEmployeeObject.totalDuration / 60)} ชั่วโมง
              </span>
            </div>
          </div>

          {/* Timeline Trend for Employee */}
          {timelineChartData.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-sb-house uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sb-accent shrink-0" />
                <span>แนวโน้มก้าวสะสมของ {selectedEmployeeObject.user.name}</span>
              </h3>
              <div className="h-44 sm:h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData}>
                    <defs>
                      <linearGradient id="colorUserSteps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#006241" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#006241" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#5f5f5d" fontSize={10} />
                    <YAxis stroke="#5f5f5d" fontSize={10} />
                    <Tooltip
                      contentStyle={{ background: '#1E3932', border: 'none', borderRadius: '8px', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} ก้าว`, 'จำนวนก้าว']}
                    />
                    <Area type="monotone" dataKey="steps" stroke="#006241" strokeWidth={2} fillOpacity={1} fill="url(#colorUserSteps)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ALL EMPLOYEES COMPARISON TABLE & BREAKDOWN */
        <div className="sb-card p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 shadow-sm border border-sb-ceramic">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-sb-ceramic">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-sb-house uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <Users className="w-4 h-4 text-sb-accent shrink-0" />
                <span>ตารางสรุปสถิติผลงานพนักงานรายบุคคล</span>
                <span className="text-sb-accent bg-sb-light-green/30 px-2 py-0.5 rounded-full text-xs font-mono font-bold whitespace-nowrap">
                  ({filteredEmployees.length} คน)
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-sb-text-muted mt-0.5">แตะพนักงานแต่ละคนเพื่อเจาะลึกดูรายงานสถิติเฉพาะบุคคล</p>
            </div>
            <span className="text-[10px] font-bold text-sb-accent bg-sb-light-green/20 px-2.5 py-1 rounded-full border border-sb-light-green/40 whitespace-nowrap shrink-0 self-start sm:self-auto">
              เรียงตามก้าวสะสม
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto -mx-1 px-1">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead>
                <tr className="border-b border-sb-ceramic bg-sb-cream/80 text-sb-text-muted font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">อันดับ</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">ชื่อพนักงาน / แผนก</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">จำนวนบันทึก</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">ก้าวสะสมรวม</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">แคลลอรี่ (kcal)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">เวลารวม (นาที)</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">กิจกรรมหลัก</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sb-ceramic/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sb-text-muted font-bold whitespace-nowrap">
                      ไม่พบข้อมูลพนักงานตรงตามเงื่อนไขตัวกรอง
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    let topAct = 'ไม่มี';
                    let maxCount = 0;
                    Object.entries(emp.byActivity).forEach(([act, cnt]) => {
                      const count = Number(cnt);
                      if (count > maxCount) {
                        maxCount = count;
                        topAct = act;
                      }
                    });

                    return (
                      <tr
                        key={emp.user.id}
                        className="hover:bg-sb-cream/60 transition-colors group cursor-pointer"
                        onClick={() => setSelectedUserId(emp.user.id)}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-sb-house whitespace-nowrap">
                          #{index + 1}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar photoUrl={emp.user.photoUrl} name={emp.user.name || 'พนักงาน'} className="w-8 h-8 text-xs shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-sb-house block group-hover:text-sb-accent transition-colors truncate">
                                {emp.user.name}
                              </span>
                              <span className="text-[10px] text-sb-text-muted block truncate">
                                {emp.user.department || 'ไม่ระบุแผนก'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="font-mono font-bold text-sb-house bg-sb-cream px-2 py-0.5 rounded-full border border-sb-ceramic text-[11px]">
                            {emp.totalWorkouts} ครั้ง
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-sb-green text-sm whitespace-nowrap">
                          {emp.totalSteps.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                          {emp.totalCalories.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {emp.totalDuration}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sb-house bg-sb-light-green/20 px-2.5 py-1 rounded-full border border-sb-light-green/40">
                            <ActivityIcon activityType={topAct} className="w-3.5 h-3.5 text-sb-accent" />
                            <span>{topAct}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(emp.user.id);
                            }}
                            className="p-1.5 rounded-full bg-sb-cream hover:bg-sb-accent hover:text-white text-sb-house transition-colors shadow-xs"
                            title="ดูรายงานเฉพาะบุคคล"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout View */}
          <div className="block md:hidden space-y-2.5">
            {filteredEmployees.length === 0 ? (
              <div className="py-8 text-center text-sb-text-muted font-bold text-xs bg-sb-cream/50 rounded-2xl border border-sb-ceramic">
                ไม่พบข้อมูลพนักงานตรงตามเงื่อนไขตัวกรอง
              </div>
            ) : (
              filteredEmployees.map((emp, index) => {
                let topAct = 'ไม่มี';
                let maxCount = 0;
                Object.entries(emp.byActivity).forEach(([act, cnt]) => {
                  const count = Number(cnt);
                  if (count > maxCount) {
                    maxCount = count;
                    topAct = act;
                  }
                });

                return (
                  <div
                    key={emp.user.id}
                    onClick={() => setSelectedUserId(emp.user.id)}
                    className="bg-white rounded-2xl border border-sb-ceramic p-3.5 space-y-3 shadow-2xs hover:border-sb-accent active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {/* Top Row: Rank badge, Avatar, Name, Department & Arrow */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-sb-cream border border-sb-ceramic flex items-center justify-center font-mono font-bold text-[11px] text-sb-house shrink-0">
                          #{index + 1}
                        </span>
                        <Avatar photoUrl={emp.user.photoUrl} name={emp.user.name || 'พนักงาน'} className="w-9 h-9 border border-sb-ceramic/70 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-sb-house block truncate">{emp.user.name}</span>
                          <span className="text-[10px] text-sb-text-muted block truncate">{emp.user.department || 'ไม่ระบุแผนก'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-sb-house bg-sb-cream border border-sb-ceramic/70 px-2 py-0.5 rounded-full font-mono">
                          {emp.totalWorkouts} ครั้ง
                        </span>
                        <ChevronRight className="w-4 h-4 text-sb-accent" />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-1.5 bg-sb-cream/70 rounded-xl p-2 border border-sb-ceramic/50 text-center">
                      <div>
                        <span className="text-[9px] font-bold text-sb-text-muted uppercase block">ก้าวสะสม</span>
                        <span className="text-xs font-black font-mono text-sb-green flex items-center justify-center gap-0.5 mt-0.5">
                          <Footprints className="w-3 h-3 text-sb-green shrink-0" />
                          {emp.totalSteps.toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-sb-text-muted uppercase block">แคลลอรี่</span>
                        <span className="text-xs font-black font-mono text-amber-700 flex items-center justify-center gap-0.5 mt-0.5">
                          <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                          {emp.totalCalories.toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold text-sb-text-muted uppercase block">เวลา (นาที)</span>
                        <span className="text-xs font-black font-mono text-blue-700 flex items-center justify-center gap-0.5 mt-0.5">
                          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                          {emp.totalDuration}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Top Activity Badge */}
                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className="text-sb-text-muted font-medium">กิจกรรมที่เล่นบ่อยสุด:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-sb-house bg-sb-light-green/20 px-2 py-0.5 rounded-full border border-sb-light-green/40">
                        <ActivityIcon activityType={topAct} className="w-3 h-3 text-sb-accent" />
                        <span>{topAct}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. Detailed Submission Logs List */}
      <div className="sb-card p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-sb-ceramic">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-sb-house uppercase tracking-wider flex items-center gap-2 flex-wrap">
              <BarChart3 className="w-4 h-4 text-sb-accent shrink-0" />
              <span>รายการประวัติกิจกรรมตามตัวกรอง</span>
              <span className="text-sb-accent bg-sb-light-green/30 px-2 py-0.5 rounded-full text-xs font-mono font-bold whitespace-nowrap">
                ({filteredWorkouts.length} รายการ)
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-sb-text-muted mt-0.5">รายการบันทึกผลงานกิจกรรมจากพนักงานแบบละเอียด</p>
          </div>

          <button
            type="button"
            onClick={() => handleExportCSV('detailed')}
            className="text-xs font-bold text-sb-accent hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดไฟล์ละเอียด (CSV)</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto -mx-1 px-1">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-sb-ceramic bg-sb-cream/80 text-sb-text-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 whitespace-nowrap">วันที่</th>
                <th className="py-2.5 px-3 whitespace-nowrap">พนักงาน</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">รูปแบบ</th>
                <th className="py-2.5 px-3 whitespace-nowrap">ประเภทกิจกรรม</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">ก้าว</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">แคลลอรี่ (kcal)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">เวลา (นาที)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-ceramic/60">
              {filteredWorkouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sb-text-muted font-bold whitespace-nowrap">
                    ไม่พบข้อมูลกิจกรรมในเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredWorkouts.slice(0, 30).map((w) => (
                  <tr key={w.id} className="hover:bg-sb-cream/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-sb-house whitespace-nowrap">
                      {w.date}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-sb-house block">{w.userName}</span>
                      {w.period && <span className="text-[10px] text-sb-text-muted block font-sans">งวด: {w.period}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                        w.submissionFormat === 'daily'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                          : w.submissionFormat === 'weekly'
                          ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                          : 'bg-purple-50 text-purple-800 border-purple-200/80'
                      }`}>
                        {w.submissionFormat === 'daily' ? 'รายวัน' : w.submissionFormat === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-sb-house">
                        <ActivityIcon activityType={w.activityType} className="w-3.5 h-3.5 text-sb-accent" />
                        <span>{w.activityType}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sb-green whitespace-nowrap">
                      {w.steps.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {w.calories.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                      {w.durationMinutes || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredWorkouts.length > 30 && (
            <p className="text-center text-[10px] text-sb-text-muted font-bold py-3 bg-sb-cream/30 border-t border-sb-ceramic">
              แสดง 30 รายการแรกจากทั้งหมด {filteredWorkouts.length} รายการ (ส่งออกไฟล์ CSV เพื่อดูข้อมูลทั้งหมด)
            </p>
          )}
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden space-y-2.5">
          {filteredWorkouts.length === 0 ? (
            <div className="py-8 text-center text-sb-text-muted font-bold text-xs bg-sb-cream/50 rounded-2xl border border-sb-ceramic">
              ไม่พบข้อมูลกิจกรรมในเงื่อนไขการค้นหา
            </div>
          ) : (
            filteredWorkouts.slice(0, 30).map((w) => (
              <div key={w.id} className="bg-white rounded-2xl border border-sb-ceramic/80 p-3.5 space-y-2.5 shadow-2xs">
                {/* Header: User & Format */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-sb-house block truncate">{w.userName}</span>
                    <p className="text-[10px] text-sb-text-muted font-mono flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-sb-accent shrink-0" />
                      <span>{w.date}</span>
                      {w.period && <span className="text-sb-text-black font-semibold">({w.period})</span>}
                    </p>
                  </div>

                  <span className={`inline-block whitespace-nowrap text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase border shrink-0 ${
                    w.submissionFormat === 'daily'
                      ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                      : w.submissionFormat === 'weekly'
                      ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                      : 'bg-purple-50 text-purple-800 border-purple-200/80'
                  }`}>
                    {w.submissionFormat === 'daily' ? 'รายวัน' : w.submissionFormat === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}
                  </span>
                </div>

                {/* Activity & Specs */}
                <div className="bg-sb-cream/70 rounded-xl p-2.5 border border-sb-ceramic/50 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-sb-house pb-1.5 border-b border-sb-ceramic/40">
                    <ActivityIcon activityType={w.activityType} className="w-3.5 h-3.5 text-sb-accent shrink-0" />
                    <span>{w.activityType}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-sb-text-muted uppercase block">ก้าว</span>
                      <span className="text-xs font-black font-mono text-sb-green flex items-center justify-center gap-0.5 mt-0.5">
                        <Footprints className="w-3 h-3 text-sb-green shrink-0" />
                        {w.steps.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-sb-text-muted uppercase block">แคลลอรี่</span>
                      <span className="text-xs font-black font-mono text-amber-700 flex items-center justify-center gap-0.5 mt-0.5">
                        <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                        {w.calories.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-sb-text-muted uppercase block">เวลา (นาที)</span>
                      <span className="text-xs font-black font-mono text-blue-700 flex items-center justify-center gap-0.5 mt-0.5">
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        {w.durationMinutes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {filteredWorkouts.length > 30 && (
            <p className="text-center text-[10px] text-sb-text-muted font-bold py-2.5 bg-sb-cream/50 rounded-xl border border-sb-ceramic">
              แสดง 30 รายการแรกจากทั้งหมด {filteredWorkouts.length} รายการ (ดาวน์โหลดไฟล์ CSV เพื่อดูทั้งหมด)
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
