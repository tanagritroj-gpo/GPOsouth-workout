import React, { useState } from 'react';
import { User, LeaderboardEntry } from '../types';
import { Trophy, Search, Flame, Footprints, Award, Calendar, Star, Clock, Medal, Zap, Sparkles, TrendingUp } from 'lucide-react';
import Avatar from './Avatar';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUser?: User | null;
}

type SortMetric = 'steps' | 'calories' | 'duration' | 'workouts';

export default function Leaderboard({ entries, currentUser }: LeaderboardProps) {
  const [metric, setMetric] = useState<SortMetric>('steps');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sort entries based on chosen metric
  const sortedEntries = [...entries].sort((a, b) => {
    if (metric === 'steps') return b.totalSteps - a.totalSteps;
    if (metric === 'calories') return b.totalCalories - a.totalCalories;
    if (metric === 'duration') return (b.totalDurationMinutes || 0) - (a.totalDurationMinutes || 0);
    return b.totalWorkouts - a.totalWorkouts;
  });

  // Filter based on search query
  const filteredEntries = sortedEntries.filter((entry) =>
    entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reference maximum value (#1 entry) for relative progress calculation
  const topLeaderValue = sortedEntries.length > 0 ? (
    metric === 'steps' ? sortedEntries[0].totalSteps :
    metric === 'calories' ? sortedEntries[0].totalCalories :
    metric === 'duration' ? (sortedEntries[0].totalDurationMinutes || 0) :
    sortedEntries[0].totalWorkouts
  ) : 1;

  // Find Current User's position in leaderboard
  const currentUserIndex = currentUser
    ? sortedEntries.findIndex((e) => e.userId === currentUser.id || e.userName === currentUser.name)
    : -1;

  const currentUserEntry = currentUserIndex >= 0 ? sortedEntries[currentUserIndex] : null;
  const currentUserRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;
  const prevRankUser = currentUserIndex > 0 ? sortedEntries[currentUserIndex - 1] : null;

  // Calculate gap to next rank
  let gapToNextRank = 0;
  if (currentUserEntry && prevRankUser) {
    const myVal =
      metric === 'steps' ? currentUserEntry.totalSteps :
      metric === 'calories' ? currentUserEntry.totalCalories :
      metric === 'duration' ? (currentUserEntry.totalDurationMinutes || 0) :
      currentUserEntry.totalWorkouts;

    const nextVal =
      metric === 'steps' ? prevRankUser.totalSteps :
      metric === 'calories' ? prevRankUser.totalCalories :
      metric === 'duration' ? (prevRankUser.totalDurationMinutes || 0) :
      prevRankUser.totalWorkouts;

    gapToNextRank = Math.max(1, nextVal - myVal + 1);
  }

  const getMetricUnitLabel = () => {
    if (metric === 'steps') return 'ก้าว';
    if (metric === 'calories') return 'kcal';
    if (metric === 'duration') return 'นาที';
    return 'ครั้ง';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2 border-amber-100 animate-pulse">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 border-slate-100">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-[#e8cfc1] via-[#d6b09a] to-[#b88c74] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm border-2 border-[#f7ede8]">
          🥉
        </div>
      );
    }
    return (
      <div className="w-7 h-7 bg-white border border-sb-ceramic rounded-full flex items-center justify-center shadow-2xs">
        <span className="text-xs font-extrabold text-sb-house font-mono">{rank}</span>
      </div>
    );
  };

  const formatValue = (entry: LeaderboardEntry) => {
    if (metric === 'steps') {
      return `${entry.totalSteps.toLocaleString()} ก้าว`;
    }
    if (metric === 'calories') {
      return `${entry.totalCalories.toLocaleString()} kcal`;
    }
    if (metric === 'duration') {
      return `${(entry.totalDurationMinutes || 0).toLocaleString()} นาที`;
    }
    return `${entry.totalWorkouts} ครั้ง`;
  };

  // Divide into Podium vs List
  const showPodium = filteredEntries.length >= 3 && searchQuery === '';
  const podiumEntries = showPodium ? filteredEntries.slice(0, 3) : [];
  const listEntries = showPodium ? filteredEntries.slice(3) : filteredEntries;

  // Podium Positions (2nd on left, 1st in middle, 3rd on right)
  const firstPlace = podiumEntries[0];
  const secondPlace = podiumEntries[1];
  const thirdPlace = podiumEntries[2];

  return (
    <div className="sb-card p-4 sm:p-6 animate-fade-in">
      {/* 1. Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sb-ceramic pb-5 mb-5">
        <div>
          <h2 className="text-lg font-bold text-sb-green flex items-center gap-2 uppercase tracking-wide font-sans">
            <Trophy className="w-5 h-5 text-sb-gold" />
            GPO South Leaderboard
          </h2>
          <p className="text-xs text-sb-text-muted font-medium mt-1">อันดับการออกกำลังกายสะสม อัปเดตแบบเรียลไทม์</p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-sb-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:bg-white focus:outline-none focus:border-sb-accent text-sb-text-black shadow-2xs"
          />
        </div>
      </div>

      {/* 2. My Rank Spotlight Card (Featured Banner for Logged-In User) */}
      {currentUser && currentUserEntry && (
        <div className="bg-gradient-to-r from-[#1E3932] via-[#006241] to-[#004d33] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-sb-light-green/30 relative overflow-hidden mb-6">
          {/* Decorative background radiance */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-sb-accent/30 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <Avatar
                  photoUrl={currentUserEntry.userPhotoUrl || currentUser.photoUrl}
                  name={currentUserEntry.userName}
                  className="w-12 h-12 border-2 border-sb-gold shadow-md"
                  textClassName="text-base font-bold"
                />
                <div className="absolute -bottom-1 -right-1 bg-sb-gold text-sb-house font-black text-[10px] px-1.5 py-0.5 rounded-full shadow border border-white">
                  #{currentUserRank}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sb-light-green uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sb-gold" />
                    อันดับปัจจุบันของคุณ
                  </span>
                </div>
                <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                  {currentUserEntry.userName}
                  <span className="text-[11px] font-normal text-white/80">({currentUser.department || 'GPO'})</span>
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/90 font-mono">
                  <span className="flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5 text-sb-gold" />
                    {currentUserEntry.totalSteps.toLocaleString()} ก้าว
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    {currentUserEntry.totalCalories.toLocaleString()} kcal
                  </span>
                </div>
              </div>
            </div>

            {/* Motivational Gap Banner */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 flex items-center gap-2.5 sm:max-w-xs shrink-0">
              <div className="w-8 h-8 rounded-full bg-sb-gold/20 flex items-center justify-center shrink-0 text-sb-gold">
                {currentUserRank === 1 ? <Trophy className="w-4 h-4 text-sb-gold" /> : <Zap className="w-4 h-4 text-amber-300" />}
              </div>
              <div className="text-xs">
                {currentUserRank === 1 ? (
                  <p className="font-bold text-sb-gold">🏆 ยอดเยี่ยมที่สุด! คุณคือผู้นำอันดับ #1 ขององค์กรในขณะนี้!</p>
                ) : prevRankUser ? (
                  <p className="text-white/90 font-medium leading-tight">
                    คุณอยู่อันดับที่ <span className="font-bold text-sb-gold">#{currentUserRank}</span>{' '}
                    (อีกเพียง <span className="font-bold text-amber-300">{gapToNextRank.toLocaleString()} {getMetricUnitLabel()}</span> จะแซง{' '}
                    <span className="font-bold text-white">{prevRankUser.userName}</span> อันดับ #{currentUserRank - 1}!)
                  </p>
                ) : (
                  <p className="text-white/90 font-medium">สู้ๆ! ส่งผลการออกกำลังกายเพื่อไต่อันดับใน Leaderboard</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Metric Selector Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-sb-cream p-1 rounded-2xl sm:rounded-full gap-1.5 mb-6 border border-sb-ceramic">
        <button
          type="button"
          onClick={() => setMetric('steps')}
          className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            metric === 'steps' ? 'bg-sb-accent text-white shadow-sm' : 'text-sb-text-muted hover:text-sb-house hover:bg-black/5'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          ก้าวสะสม
        </button>
        <button
          type="button"
          onClick={() => setMetric('calories')}
          className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            metric === 'calories' ? 'bg-sb-accent text-white shadow-sm' : 'text-sb-text-muted hover:text-sb-house hover:bg-black/5'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          แคลลอรี่สะสม
        </button>
        <button
          type="button"
          onClick={() => setMetric('duration')}
          className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            metric === 'duration' ? 'bg-sb-accent text-white shadow-sm' : 'text-sb-text-muted hover:text-sb-house hover:bg-black/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          ระยะเวลาสะสม
        </button>
        <button
          type="button"
          onClick={() => setMetric('workouts')}
          className={`py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            metric === 'workouts' ? 'bg-sb-accent text-white shadow-sm' : 'text-sb-text-muted hover:text-sb-house hover:bg-black/5'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          จำนวนครั้งสะสม
        </button>
      </div>

      {/* 4. 3D-Like Athletic Podium for Top 3 with Metallic Bevel Edge (สัน) */}
      {showPodium && (
        <div className="bg-gradient-to-b from-sb-cream/90 via-sb-cream/50 to-transparent border border-sb-ceramic/80 rounded-3xl p-6 mb-8 shadow-sm relative overflow-hidden">
          {/* Subtle background glow circle for first place */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6 relative z-10">
            <span className="text-[10px] bg-sb-light-green/30 text-sb-green border border-sb-light-green/50 px-3.5 py-1.5 rounded-full font-extrabold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-2xs">
              <span>🏅</span>
              <span>Top 3 Podium Of The Week</span>
              <span>🏅</span>
            </span>
          </div>

          <div className="grid grid-cols-3 items-end justify-center gap-2 md:gap-6 pt-10 pb-4 max-w-md mx-auto relative z-10">
            
            {/* 2nd Place (Left - Silver) */}
            <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-2 active:scale-95">
              {/* User Standing Above */}
              <div className="text-center mb-2.5 flex flex-col items-center animate-fade-in">
                <div className="relative mb-1">
                  <Avatar
                    photoUrl={secondPlace.userPhotoUrl}
                    name={secondPlace.userName}
                    className="w-11 h-11 transition-all duration-300 group-hover:border-slate-400 group-hover:scale-110 shadow-sm"
                    textClassName="text-base font-bold"
                  />
                  <div className="absolute -top-2.5 -right-1 bg-gradient-to-r from-slate-400 to-slate-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] shadow-md border-2 border-white transition-transform group-hover:scale-110">
                    2
                  </div>
                </div>
                <p className="text-xs font-bold text-sb-house truncate max-w-[80px] transition-colors group-hover:text-sb-green">{secondPlace.userName}</p>
                <p className="text-[10px] font-bold text-sb-accent mt-0.5">{formatValue(secondPlace)}</p>
              </div>

              {/* 3D Silver Stand Box with Slanted Bevel Edge (สันขอบเงาโลหะเงิน) */}
              <div className="w-full flex flex-col items-center">
                {/* Metallic Silver Bevel Ridge */}
                <div className="w-[106%] h-2.5 bg-gradient-to-r from-slate-100 via-white to-slate-200 rounded-t-lg border-t-2 border-l border-r border-white shadow-xs z-10" />
                {/* Stand Face */}
                <div className="w-full h-24 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 border-x border-b border-slate-400/80 rounded-b-2xl flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_10px_20px_rgba(0,0,0,0.12)] relative overflow-hidden transition-all duration-300 group-hover:shadow-slate-400/30">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
                  <span className="text-3xl filter drop-shadow-md transform group-hover:scale-125 group-hover:rotate-[-6deg] transition-all duration-300 select-none z-10">🥈</span>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider mt-1 font-mono drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">2ND PLACE</span>
                </div>
              </div>
            </div>

            {/* 1st Place (Center - Gold) */}
            <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-2 active:scale-95">
              {/* User Standing Above */}
              <div className="text-center mb-3 flex flex-col items-center animate-bounce-subtle">
                <div className="relative mb-1">
                  {/* Floating Gold Crown */}
                  <span className="text-xl absolute -top-5 left-1/2 -translate-x-1/2 filter drop-shadow-sm rotate-6 transition-transform group-hover:scale-125 group-hover:rotate-12 select-none">
                    👑
                  </span>
                  <Avatar
                    photoUrl={firstPlace.userPhotoUrl}
                    name={firstPlace.userName}
                    className="w-14 h-14 border-2 border-sb-gold transition-all duration-300 group-hover:border-sb-accent group-hover:scale-110 shadow-md"
                    textClassName="text-xl font-black"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shadow-md border-2 border-white transition-transform group-hover:scale-110">
                    1
                  </div>
                </div>
                <p className="text-xs font-black text-sb-house truncate max-w-[90px] transition-colors group-hover:text-sb-green flex items-center gap-1">
                  <span>{firstPlace.userName}</span>
                  <Star className="w-3 h-3 text-sb-gold fill-sb-gold shrink-0" />
                </p>
                <p className="text-xs font-extrabold text-sb-accent mt-0.5">{formatValue(firstPlace)}</p>
              </div>

              {/* 3D Gold Stand Box with Metallic Bevel Edge (สันขอบเงาโลหะทอง) */}
              <div className="w-full flex flex-col items-center">
                {/* Metallic Gold Bevel Ridge */}
                <div className="w-[106%] h-3.5 bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 rounded-t-lg border-t-2 border-l border-r border-amber-100 shadow-sm z-10" />
                {/* Stand Face */}
                <div className="w-full h-32 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 border-x border-b border-amber-600/80 rounded-b-2xl flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_12px_24px_rgba(217,119,6,0.35)] relative overflow-hidden transition-all duration-300 group-hover:shadow-amber-500/30">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none animate-pulse" />
                  <span className="text-4xl filter drop-shadow-lg transform group-hover:scale-125 group-hover:rotate-[6deg] transition-all duration-300 select-none z-10">🏆</span>
                  <span className="text-xs font-black text-amber-950 uppercase tracking-widest mt-1 font-mono drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">1ST PLACE</span>
                </div>
              </div>
            </div>

            {/* 3rd Place (Right - Bronze) */}
            <div className="flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-2 active:scale-95">
              {/* User Standing Above */}
              <div className="text-center mb-2.5 flex flex-col items-center animate-fade-in">
                <div className="relative mb-1">
                  <Avatar
                    photoUrl={thirdPlace.userPhotoUrl}
                    name={thirdPlace.userName}
                    className="w-11 h-11 transition-all duration-300 group-hover:border-amber-400 group-hover:scale-110 shadow-sm"
                    textClassName="text-base font-bold"
                  />
                  <div className="absolute -top-2.5 -right-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold text-[10px] shadow-md border-2 border-white transition-transform group-hover:scale-110">
                    3
                  </div>
                </div>
                <p className="text-xs font-bold text-sb-house truncate max-w-[80px] transition-colors group-hover:text-sb-green">{thirdPlace.userName}</p>
                <p className="text-[10px] font-bold text-sb-accent mt-0.5">{formatValue(thirdPlace)}</p>
              </div>

              {/* 3D Bronze Stand Box with Metallic Bevel Edge (สันขอบเงาโลหะทองแดง) */}
              <div className="w-full flex flex-col items-center">
                {/* Metallic Bronze Bevel Ridge */}
                <div className="w-[106%] h-2.5 bg-gradient-to-r from-[#f8ece3] via-[#ebd2c3] to-[#dcb49e] rounded-t-lg border-t-2 border-l border-r border-white shadow-xs z-10" />
                {/* Stand Face */}
                <div className="w-full h-18 bg-gradient-to-b from-[#e0baa2] via-[#c79b80] to-[#a87456] border-x border-b border-[#966346]/80 rounded-b-2xl flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_16px_rgba(168,116,86,0.2)] relative overflow-hidden transition-all duration-300 group-hover:shadow-amber-900/20">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
                  <span className="text-3xl filter drop-shadow-md transform group-hover:scale-125 group-hover:rotate-[12deg] transition-all duration-300 select-none z-10">🥉</span>
                  <span className="text-[10px] font-black text-[#422515] uppercase tracking-wider mt-0.5 font-mono drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">3RD PLACE</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. Leaderboard entries list with Relative Progress Bar & Starbucks Minty Shadow */}
      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
        {listEntries.length === 0 && !showPodium ? (
          <div className="py-12 text-center text-sm text-sb-text-muted">
            ไม่พบรายชื่อพนักงานที่กำลังค้นหา...
          </div>
        ) : (
          listEntries.map((entry, index) => {
            const currentValue =
              metric === 'steps'
                ? entry.totalSteps
                : metric === 'calories'
                ? entry.totalCalories
                : metric === 'duration'
                ? (entry.totalDurationMinutes || 0)
                : entry.totalWorkouts;

            // Percentage of progress relative to #1 Leader
            const percentage = topLeaderValue > 0 ? (currentValue / topLeaderValue) * 100 : 0;
            
            // Real Rank represents actual position in sorted list
            const realRank = showPodium ? index + 4 : index + 1;
            const isTop3InList = !showPodium && realRank <= 3;
            const isMe = currentUser && (entry.userId === currentUser.id || entry.userName === currentUser.name);

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sb-light-green/40 hover:border-sb-accent/50 group cursor-pointer ${
                  isMe
                    ? 'bg-sb-light-green/20 border-sb-accent ring-1 ring-sb-accent/50 shadow-sm'
                    : isTop3InList
                    ? 'bg-sb-light-green/10 border-sb-light-green/40'
                    : 'bg-white border-sb-ceramic/40 shadow-2xs'
                }`}
              >
                {/* Medal/Rank Badge & Profile Photo */}
                <div className="shrink-0 flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankBadge(realRank)}
                  </div>
                  <Avatar
                    photoUrl={entry.userPhotoUrl}
                    name={entry.userName}
                    className="w-10 h-10 border border-sb-ceramic group-hover:border-sb-accent transition-colors"
                    textClassName="text-xs font-bold"
                  />
                </div>

                {/* Employee Info, Relative Progress bar & Badges */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-sb-house truncate group-hover:text-sb-green transition-colors">
                        {entry.userName}
                      </span>
                      {isMe && (
                        <span className="bg-sb-accent text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider">
                          YOU
                        </span>
                      )}
                      {entry.totalWorkouts >= 3 && (
                        <span className="bg-orange-100 text-orange-600 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500 animate-pulse" />
                          <span>🔥 {entry.totalWorkouts} รายงาน</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-sb-accent font-mono shrink-0">
                      {formatValue(entry)}
                    </span>
                  </div>

                  {/* Relative Progress bar to #1 Leader */}
                  <div className="space-y-1">
                    <div className="w-full bg-sb-ceramic/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-sb-ceramic/30">
                      <div
                        className="h-full bg-gradient-to-r from-sb-green to-sb-accent rounded-full transition-all duration-700 group-hover:brightness-110"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-sb-text-muted font-bold font-mono">
                      <span>เทียบกับอันดับ #1</span>
                      <span className="text-sb-green">{Math.round(percentage)}%</span>
                    </div>
                  </div>

                  {/* Supporting minor stats */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] text-sb-text-muted font-semibold uppercase tracking-wider pt-0.5">
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-sb-green" />
                      {entry.totalSteps.toLocaleString()} ก้าว
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-sb-green" />
                      {entry.totalCalories.toLocaleString()} kcal
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sb-green" />
                      {(entry.totalDurationMinutes || 0).toLocaleString()} นาที
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
