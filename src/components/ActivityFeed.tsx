import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Workout, User } from '../types';
import Avatar from './Avatar';
import ActivityIcon from './ActivityIcon';
import ShareCardModal from './ShareCardModal';
import { dbSubscribeComments, dbAddComment, dbSubscribeReactions, dbSaveReaction, FeedCommentDoc, FeedReactionDoc } from '../firebase-client';
import { Heart, Flame, Sparkles, Share2, Footprints, Clock, Calendar, Search, Filter, Send, ZoomIn, X } from 'lucide-react';

interface ActivityFeedProps {
  workouts: Workout[];
  users: User[];
  currentUser: User;
}

// Preset motivational phrases for workout posts (Well-balanced Thai Phrasing)
const MOTIVATIONAL_QUOTES = [
  "วันนี้พิชิตเป้าหมายการเดินเรียบร้อยครับ สุขภาพดีเริ่มต้นที่ตัวเราเอง! 🏃💪",
  "ขยับร่างกายวันละนิด ช่วยให้ร่างกายแข็งแรงและพร้อมลุยงานได้อย่างเต็มที่! 🌟",
  "GPO South Happy Workplace เกิดขึ้นได้เมื่อพวกเรามีสุขภาพที่ดีไปด้วยกัน! 💚",
  "ทุกก้าวเล็กๆ ในวันนี้ คือจุดเริ่มต้นของสุขภาพที่แข็งแรงอย่างยั่งยืนครับ 👟✨",
  "เติมพลังความสดชื่นยามเย็นด้วยการออกกำลังกาย สดชื่นและกระปรี้กระเปร่ามากๆ ครับ 🔥",
];

export default function ActivityFeed({ workouts, users, currentUser }: ActivityFeedProps) {
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWorkoutForShare, setSelectedWorkoutForShare] = useState<Workout | null>(null);

  // Reaction State structure: { [workoutId]: { hearts: number, highFives: number, fires: number, myReactions: string[] } }
  const [reactions, setReactions] = useState<{
    [workoutId: string]: { hearts: number; highFives: number; fires: number; myReactions: string[] };
  }>({});

  // Comments state: { [workoutId]: FeedCommentDoc[] }
  const [comments, setComments] = useState<{
    [workoutId: string]: FeedCommentDoc[];
  }>({});
  const [commentInput, setCommentInput] = useState<{ [workoutId: string]: string }>({});

  // Floating animation effect trigger
  const [floatingEffect, setFloatingEffect] = useState<{ workoutId: string; type: string } | null>(null);

  // Full Screen Image Preview Lightbox State
  const [fullScreenImage, setFullScreenImage] = useState<{
    url: string;
    userName: string;
    activityType: string;
    date: string;
  } | null>(null);

  // Subscribe to Firestore real-time updates for comments and reactions
  useEffect(() => {
    // 1. Subscribe to Comments
    const unsubscribeComments = dbSubscribeComments((rawComments) => {
      const commentMap: { [workoutId: string]: FeedCommentDoc[] } = {};
      rawComments.forEach((c) => {
        if (!commentMap[c.workoutId]) {
          commentMap[c.workoutId] = [];
        }
        commentMap[c.workoutId].push(c);
      });

      // Sort comments in ascending order by date
      Object.keys(commentMap).forEach((wId) => {
        commentMap[wId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });

      setComments(commentMap);
    });

    // 2. Subscribe to Reactions
    const unsubscribeReactions = dbSubscribeReactions((rawReactions) => {
      const reactionMap: { [workoutId: string]: { hearts: number; highFives: number; fires: number; myReactions: string[] } } = {};

      // Seed initial base counts for workouts
      workouts.forEach((w) => {
        reactionMap[w.id] = {
          hearts: Math.floor((w.id.length * 3) % 7) + 1,
          highFives: Math.floor((w.id.length * 5) % 9) + 2,
          fires: Math.floor((w.id.length * 2) % 6) + 1,
          myReactions: [],
        };
      });

      rawReactions.forEach((r) => {
        if (!r.active) return;
        if (!reactionMap[r.workoutId]) {
          reactionMap[r.workoutId] = { hearts: 0, highFives: 0, fires: 0, myReactions: [] };
        }

        if (r.type === 'hearts' || r.type === 'highFives' || r.type === 'fires') {
          reactionMap[r.workoutId][r.type] = (reactionMap[r.workoutId][r.type] || 0) + 1;
        }

        if (r.userId === currentUser.id) {
          if (!reactionMap[r.workoutId].myReactions.includes(r.type)) {
            reactionMap[r.workoutId].myReactions.push(r.type);
          }
        }
      });

      setReactions(reactionMap);
    });

    return () => {
      unsubscribeComments();
      unsubscribeReactions();
    };
  }, [workouts, currentUser.id]);

  const handleToggleReaction = async (workoutId: string, type: 'hearts' | 'highFives' | 'fires') => {
    const currentMyReactions = reactions[workoutId]?.myReactions || [];
    const isCurrentlyActive = currentMyReactions.includes(type);
    const newActiveState = !isCurrentlyActive;

    const docId = `${workoutId}_${currentUser.id}_${type}`;
    const reactionDoc: FeedReactionDoc = {
      id: docId,
      workoutId,
      userId: currentUser.id,
      type,
      active: newActiveState,
      updatedAt: new Date().toISOString(),
    };

    if (newActiveState) {
      setFloatingEffect({ workoutId, type });
      setTimeout(() => setFloatingEffect(null), 1200);
    }

    try {
      await dbSaveReaction(reactionDoc);
    } catch (e) {
      console.error('Error saving reaction to Firestore:', e);
    }
  };

  const handleAddComment = async (workoutId: string) => {
    const text = (commentInput[workoutId] || '').trim();
    if (!text) return;

    const newComment: FeedCommentDoc = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workoutId,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      createdAt: new Date().toISOString(),
    };

    setCommentInput({ ...commentInput, [workoutId]: '' });

    try {
      await dbAddComment(newComment);
    } catch (e) {
      console.error('Error adding comment to Firestore:', e);
    }
  };

  const formatCommentTime = (isoOrTimeStr: string) => {
    if (!isoOrTimeStr) return '';
    if (isoOrTimeStr.includes('T')) {
      const d = new Date(isoOrTimeStr);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    return isoOrTimeStr;
  };

  // Find photoUrl for user
  const getUserPhoto = (userId: string, userName: string) => {
    const matchedUser = users.find((u) => u.id === userId || u.name === userName);
    return matchedUser?.photoUrl;
  };

  // Unique activity types
  const uniqueActivities = Array.from(new Set(workouts.map((w) => w.activityType))).filter(Boolean);

  // Filter workouts
  const filteredWorkouts = workouts.filter((w) => {
    const matchesActivity = filterActivity === 'all' || w.activityType === filterActivity;
    const matchesSearch = w.userName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesActivity && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-12">
      {/* Feed Title Banner */}
      <div className="sb-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sb-cream via-white to-sb-light-green/20 border-sb-ceramic shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 bg-sb-accent text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6 text-sb-gold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-sb-house flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap">Activity Feed & Community</span>
              <span className="text-[10px] bg-sb-accent text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0">
                GPO South
              </span>
            </h2>
            <p className="text-xs text-sb-text-muted font-medium mt-0.5 break-words leading-relaxed">
              แบ่งปันภาพกิจกรรมและส่ง ❤️ ให้กำลังใจเพื่อนร่วมงาน!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSelectedWorkoutForShare(workouts[0] || null)}
          className="h-10 px-4 rounded-full bg-sb-accent hover:bg-sb-green text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap"
        >
          <Share2 className="w-4 h-4 text-sb-gold shrink-0" />
          <span>สร้าง Share Card ของฉัน</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-sb-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อเพื่อนร่วมงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house shadow-2xs"
          />
        </div>

        <div className="relative w-full sm:w-56 shrink-0">
          <select
            value={filterActivity}
            onChange={(e) => setFilterActivity(e.target.value)}
            className="w-full text-xs pl-4 pr-8 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house font-bold shadow-2xs appearance-none cursor-pointer truncate"
          >
            <option value="all">🏃 ทุกกิจกรรม ({workouts.length})</option>
            {uniqueActivities.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-5">
        {filteredWorkouts.length === 0 ? (
          <div className="sb-card p-12 text-center text-sb-text-muted space-y-2">
            <div className="w-12 h-12 rounded-full bg-sb-cream flex items-center justify-center mx-auto text-sb-accent">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-sb-house">ยังไม่มีรายการโพสต์กิจกรรมในหมวดนี้</p>
            <p className="text-xs">มาร่วมส่งผลการออกกำลังกายเป็นคนแรกของวันนี้กันเลยครับ!</p>
          </div>
        ) : (
          filteredWorkouts.map((workout, index) => {
            const photoUrl = getUserPhoto(workout.userId, workout.userName);
            const workoutImage = workout.imageUrl || (workout.imageUrls && workout.imageUrls[0]);
            
            // Deterministic motivational quote index
            const quoteIndex = (workout.id.length + index) % MOTIVATIONAL_QUOTES.length;
            const caption = MOTIVATIONAL_QUOTES[quoteIndex];

            // Reaction state for this item
            const itemReaction = reactions[workout.id] || {
              hearts: Math.floor((workout.id.length * 3) % 7) + 2,
              highFives: Math.floor((workout.id.length * 5) % 9) + 3,
              fires: Math.floor((workout.id.length * 2) % 6) + 1,
              myReactions: [],
            };

            const itemComments = comments[workout.id] || [];
            const hasHeart = itemReaction.myReactions.includes('hearts');
            const hasHighFive = itemReaction.myReactions.includes('highFives');
            const hasFire = itemReaction.myReactions.includes('fires');

            return (
              <div
                key={workout.id}
                className="sb-card p-4 sm:p-5 hover:shadow-md transition-all duration-300 relative border-sb-ceramic/80 space-y-3.5 overflow-hidden"
              >
                {/* Floating Micro-interaction Animation */}
                {floatingEffect?.workoutId === workout.id && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 animate-ping text-3xl">
                    {floatingEffect.type === 'hearts' && '❤️'}
                    {floatingEffect.type === 'highFives' && '👏'}
                    {floatingEffect.type === 'fires' && '🔥'}
                  </div>
                )}

                {/* 1. Header: User Info & Time & Activity Badge */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar
                      photoUrl={photoUrl}
                      name={workout.userName}
                      className="w-11 h-11 border-2 border-sb-light-green/60 shadow-2xs shrink-0"
                      textClassName="text-sm font-bold text-sb-house"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-sb-house truncate max-w-[150px] sm:max-w-none">
                          {workout.userName}
                        </h3>
                        <span className="text-[10px] bg-sb-light-green/30 text-sb-green font-extrabold px-2 py-0.5 rounded-full border border-sb-light-green/50 shrink-0 whitespace-nowrap">
                          GPO South
                        </span>
                      </div>
                      <p className="text-[11px] text-sb-text-muted font-medium flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-sb-green shrink-0" />
                        <span>{workout.period || workout.date}</span>
                      </p>
                    </div>
                  </div>

                  {/* Activity Badge */}
                  <div className="flex items-center gap-1.5 bg-sb-cream border border-sb-ceramic px-3 py-1.5 rounded-full text-xs font-bold text-sb-house shadow-2xs shrink-0 whitespace-nowrap">
                    <ActivityIcon activityType={workout.activityType} className="w-4 h-4 text-sb-accent shrink-0" />
                    <span>{workout.activityType}</span>
                  </div>
                </div>

                {/* 2. Motivational Caption */}
                <p className="text-xs sm:text-sm text-sb-house font-medium leading-relaxed bg-sb-cream/50 p-3.5 rounded-2xl border border-sb-ceramic/60 break-words">
                  {caption}
                </p>

                {/* 3. Photo Attachment (if available) */}
                {workoutImage && (
                  <div
                    onClick={() => setFullScreenImage({
                      url: workoutImage,
                      userName: workout.userName,
                      activityType: workout.activityType,
                      date: workout.period || workout.date,
                    })}
                    className="rounded-2xl overflow-hidden border border-sb-ceramic/80 max-h-80 relative group shadow-2xs cursor-pointer"
                  >
                    <img
                      src={workoutImage}
                      alt={workout.activityType}
                      className="w-full h-64 sm:h-72 object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-90 transition-opacity" />
                    
                    {/* Zoom Icon Overlay Badge */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity shadow-sm">
                      <ZoomIn className="w-3.5 h-3.5 text-sb-gold shrink-0" />
                      <span>ขยายรูปเต็มจอ</span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold pointer-events-none">
                      <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 whitespace-nowrap">
                        {workout.period || workout.date}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Workout Specs Summary Pills (Clean Centered Balanced Columns) */}
                <div className="grid grid-cols-3 gap-2 bg-sb-cream p-2.5 rounded-2xl border border-sb-ceramic/60 text-center font-mono">
                  <div className="flex flex-col items-center justify-center p-1 min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase flex items-center gap-1 whitespace-nowrap">
                      <Footprints className="w-3.5 h-3.5 text-sb-green shrink-0" />
                      <span>ก้าว</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-sb-house mt-0.5 truncate w-full">
                      {workout.steps.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 border-x border-sb-ceramic/60 min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase flex items-center gap-1 whitespace-nowrap">
                      <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>kcal</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-sb-house mt-0.5 truncate w-full">
                      {workout.calories.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-1 min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-sb-text-muted uppercase flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>นาที</span>
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-sb-house mt-0.5 truncate w-full">
                      {workout.durationMinutes || 0}
                    </span>
                  </div>
                </div>

                {/* 5. Reactions & Encouragement Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-sb-ceramic/60 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* ❤️ Heart Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleReaction(workout.id, 'hearts')}
                      className={`h-9 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                        hasHeart
                          ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs scale-105'
                          : 'bg-white text-sb-text-muted border-sb-ceramic hover:bg-rose-50/50'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 shrink-0 ${hasHeart ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{itemReaction.hearts}</span>
                    </button>

                    {/* 👏 High Five Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleReaction(workout.id, 'highFives')}
                      className={`h-9 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                        hasHighFive
                          ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs scale-105'
                          : 'bg-white text-sb-text-muted border-sb-ceramic hover:bg-amber-50/50'
                      }`}
                    >
                      <span className="text-sm shrink-0">👏</span>
                      <span>{itemReaction.highFives}</span>
                    </button>

                    {/* 🔥 Keep Going Fire Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleReaction(workout.id, 'fires')}
                      className={`h-9 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                        hasFire
                          ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-2xs scale-105'
                          : 'bg-white text-sb-text-muted border-sb-ceramic hover:bg-orange-50/50'
                      }`}
                    >
                      <Flame className={`w-3.5 h-3.5 shrink-0 ${hasFire ? 'fill-orange-500 text-orange-500' : ''}`} />
                      <span>{itemReaction.fires}</span>
                    </button>
                  </div>

                  {/* Share Card Trigger */}
                  <button
                    type="button"
                    onClick={() => setSelectedWorkoutForShare(workout)}
                    className="h-9 px-3.5 rounded-full bg-sb-light-green/30 hover:bg-sb-light-green/60 border border-sb-light-green/60 text-sb-house font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs whitespace-nowrap ml-auto"
                  >
                    <Share2 className="w-3.5 h-3.5 text-sb-accent shrink-0" />
                    <span>สร้างการ์ดแชร์</span>
                  </button>
                </div>

                {/* 6. Comments Section */}
                <div className="pt-2 space-y-2">
                  {itemComments.length > 0 && (
                    <div className="space-y-1.5 pl-2.5 border-l-2 border-sb-light-green/60">
                      {itemComments.map((c) => (
                        <div key={c.id} className="text-xs bg-sb-cream/60 p-2.5 rounded-xl flex items-baseline justify-between gap-2 break-words">
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-sb-house mr-1.5 whitespace-nowrap">{c.userName}:</span>
                            <span className="text-sb-text-black leading-relaxed break-words">{c.text}</span>
                          </div>
                          <span className="text-[9px] text-sb-text-muted shrink-0 font-mono">{formatCommentTime(c.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="เขียนข้อความให้กำลังใจเพื่อน..."
                      value={commentInput[workout.id] || ''}
                      onChange={(e) => setCommentInput({ ...commentInput, [workout.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(workout.id)}
                      className="flex-1 h-9 text-xs px-3.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-house"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddComment(workout.id)}
                      className="w-9 h-9 rounded-full bg-sb-accent hover:bg-sb-green text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs"
                      title="ส่งข้อความ"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Share Card Modal Trigger */}
      {selectedWorkoutForShare && (
        <ShareCardModal
          workout={selectedWorkoutForShare}
          currentUser={currentUser}
          onClose={() => setSelectedWorkoutForShare(null)}
        />
      )}

      {/* Full-Screen Image Lightbox Modal */}
      {fullScreenImage && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-fade-in select-none cursor-pointer"
          onClick={() => setFullScreenImage(null)}
        >
          {/* Top Bar Header */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/20 shrink-0 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-white truncate">{fullScreenImage.userName}</h4>
                <p className="text-xs text-white/70 flex items-center gap-2 font-mono">
                  <span className="text-sb-gold font-bold">{fullScreenImage.activityType}</span>
                  <span>•</span>
                  <span>{fullScreenImage.date}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFullScreenImage(null)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/25 flex items-center justify-center text-white transition-all shrink-0 active:scale-95"
              title="ปิด (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Full Image Container */}
          <div
            className="flex-1 w-full max-w-5xl flex items-center justify-center p-1 sm:p-3 my-auto overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullScreenImage.url}
              alt={fullScreenImage.activityType}
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-fade-in"
            />
          </div>

          {/* Bottom Hint */}
          <div className="text-[11px] sm:text-xs text-white/60 pt-2 text-center shrink-0">
            แตะที่ใดก็ได้บนหน้าจอเพื่อปิด
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
