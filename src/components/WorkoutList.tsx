import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Workout, User } from '../types';
import { Calendar, Trash2, ShieldAlert, Footprints, Flame, Filter, Search, X, Clock, ChevronDown, BarChart3 } from 'lucide-react';
import ActivityIcon from './ActivityIcon';
import Avatar from './Avatar';

interface WorkoutListProps {
  workouts: Workout[];
  currentUser: User | null;
  allUsers?: User[];
  onDeleteWorkout: (id: string) => Promise<void>;
}

export default function WorkoutList({ workouts, currentUser, allUsers = [], onDeleteWorkout }: WorkoutListProps) {
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [searchName, setSearchName] = useState<string>('');
  
  // Lightbox modal for previewing verification images
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePin, setDeletePin] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');

  // Get unique activity types for filtering dropdown
  const uniqueActivities = Array.from(new Set(workouts.map((w) => w.activityType)));

  // Filtered list
  const filteredWorkouts = workouts.filter((w) => {
    const matchesFormat = filterFormat === 'all' || w.submissionFormat === filterFormat;
    const matchesActivity = filterActivity === 'all' || w.activityType === filterActivity;
    const matchesName = !searchName.trim() || w.userName.toLowerCase().includes(searchName.toLowerCase());
    return matchesFormat && matchesActivity && matchesName;
  });

  const getFormatBadge = (format: string) => {
    if (format === 'daily') {
      return <span className="bg-sb-light-green/40 text-sb-accent border border-sb-light-green/60 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> รายวัน</span>;
    }
    if (format === 'weekly') {
      return <span className="bg-sb-gold/15 text-sb-gold border border-sb-gold/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> รายสัปดาห์</span>;
    }
    return <span className="bg-sb-house text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"><BarChart3 className="w-3 h-3" /> รายเดือน</span>;
  };

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    if (!currentUser) return;
    
    // Safety check: Is this workout logged by the current logged-in user?
    const targetWorkout = workouts.find(w => w.id === id);
    if (!targetWorkout) return;

    if (targetWorkout.userId !== currentUser.id) {
      setDeleteError('คุณไม่สามารถลบรายการออกกำลังกายของผู้อื่นได้');
      return;
    }

    if (deletePin !== currentUser.pin) {
      setDeleteError('รหัสผ่าน (PIN) ส่วนตัวของคุณไม่ถูกต้อง');
      return;
    }

    try {
      await onDeleteWorkout(id);
      setDeletingId(null);
      setDeletePin('');
      setDeleteError('');
    } catch (err) {
      setDeleteError('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  return (
    <div className="sb-card p-4 sm:p-6 animate-fade-in">
      
      {/* Search & Filter bar */}
      <div className="border-b border-sb-ceramic pb-5 mb-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-sb-green flex items-center gap-2 uppercase tracking-wide font-sans">
              <Calendar className="w-5 h-5 text-sb-accent" />
              Recent Workout Logs
            </h2>
            <p className="text-xs text-sb-text-muted font-medium mt-1">รายการสรุปและหลักฐานการออกกำลังกายจากพนักงาน</p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-sb-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อพนักงาน..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full h-10 text-xs pl-9 pr-4 rounded-full border border-sb-ceramic bg-white focus:bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-bold shadow-sm"
            />
          </div>
        </div>

        {/* Dropdowns for formats & activities */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sb-text-muted bg-sb-cream px-3.5 h-10 rounded-full border border-sb-ceramic flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-sb-accent" />
            <span>Filters:</span>
          </div>

          <div className="relative flex-1 min-w-[150px] sm:flex-initial">
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-bold shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">รูปแบบทั้งหมด</option>
              <option value="daily">รายวัน (Daily)</option>
              <option value="weekly">รายสัปดาห์ (Weekly)</option>
              <option value="monthly">รายเดือน (Monthly)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[150px] sm:flex-initial">
            <select
              value={filterActivity}
              onChange={(e) => setFilterActivity(e.target.value)}
              className="w-full h-10 text-xs pl-4 pr-9 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-bold shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">กิจกรรมทั้งหมด</option>
              {uniqueActivities.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-sb-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid of Workouts cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkouts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-sb-text-muted">
            ไม่มีรายการส่งสถิติการออกกำลังกายที่ตรงกับตัวกรองของคุณ
          </div>
        ) : (
          filteredWorkouts.map((workout) => {
            const isOwnLog = currentUser && workout.userId === currentUser.id;
            const userObj = allUsers.find((u) => u.id === workout.userId || u.name === workout.userName);
            const userPhotoUrl = userObj?.photoUrl || (isOwnLog ? currentUser?.photoUrl : undefined);
            
            return (
              <div
                key={workout.id}
                className="bg-white rounded-2xl border border-sb-ceramic/80 p-3.5 sm:p-4 transition-all flex flex-col justify-between gap-3 sm:gap-4 hover:border-sb-accent shadow-xs hover:shadow-sm"
              >
                {/* Upper section: User info & format badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        photoUrl={userPhotoUrl}
                        name={workout.userName}
                        className="w-9 h-9 sm:w-10 sm:h-10 border border-sb-ceramic/70 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-sb-house block truncate">{workout.userName}</span>
                        <p className="text-[10px] sm:text-[11px] text-sb-text-muted font-medium mt-0.5 truncate">
                          ช่วงข้อมูล: <span className="font-semibold text-sb-house">{workout.period}</span>
                        </p>
                        {workout.createdAt && (
                          <p className="text-[10px] text-sb-accent font-semibold mt-0.5 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-sb-accent shrink-0" />
                            <span>บันทึกเมื่อ: {formatLogTime(workout.createdAt)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getFormatBadge(workout.submissionFormat)}
                    </div>
                  </div>

                  {/* Main specs inside card (Mobile-Optimized Grid) */}
                  <div className="bg-sb-cream/90 rounded-xl p-3 border border-sb-ceramic/70 space-y-2.5">
                    {/* Activity Type Row */}
                    <div className="flex items-center justify-between pb-2 border-b border-sb-ceramic/50">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-sb-ceramic/60 shrink-0 shadow-2xs">
                          <ActivityIcon activityType={workout.activityType} className="w-3.5 h-3.5 text-sb-accent" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-sb-text-muted uppercase block leading-none">ประเภทกิจกรรม</span>
                          <span className="text-xs font-bold text-sb-green leading-tight">{workout.activityType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Tiles Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      <div className="bg-white/80 rounded-lg p-2 border border-sb-ceramic/50 text-center shadow-2xs">
                        <span className="text-[9px] font-bold text-sb-text-muted uppercase block">จำนวนก้าว</span>
                        <span className="text-xs sm:text-sm font-black text-sb-accent font-mono flex items-center justify-center gap-1 mt-0.5">
                          <Footprints className="w-3.5 h-3.5 text-sb-accent shrink-0" />
                          {workout.steps.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-white/80 rounded-lg p-2 border border-sb-ceramic/50 text-center shadow-2xs">
                        <span className="text-[9px] font-bold text-sb-text-muted uppercase block">แคลลอรี่</span>
                        <span className="text-xs sm:text-sm font-black text-sb-green font-mono flex items-center justify-center gap-1 mt-0.5">
                          <Flame className="w-3.5 h-3.5 text-sb-green shrink-0" />
                          {workout.calories} <span className="text-[9px] font-normal">kcal</span>
                        </span>
                      </div>

                      {workout.durationMinutes !== undefined && workout.durationMinutes !== null && (
                        <div className="bg-white/80 rounded-lg p-2 border border-sb-ceramic/50 text-center shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[9px] font-bold text-sb-text-muted uppercase block">ระยะเวลา</span>
                          <span className="text-xs sm:text-sm font-black text-sb-house font-mono flex items-center justify-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-sb-accent shrink-0" />
                            {workout.durationMinutes} <span className="text-[9px] font-normal">นาที</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer bar with actions & images */}
                <div className="flex items-center justify-between pt-2 border-t border-sb-ceramic/50 gap-2">
                  {/* Proof Image thumbnail click trigger */}
                  {(() => {
                    const images = workout.imageUrls && workout.imageUrls.length > 0
                      ? workout.imageUrls
                      : (workout.imageUrl ? [workout.imageUrl] : []);
                    if (images.length === 0) {
                      return <span className="text-[10px] text-sb-text-muted italic">ไม่มีรูปภาพหลักฐาน</span>;
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImages(images);
                          setPreviewImage(images[0]);
                        }}
                        className="flex items-center gap-1.5 text-[10px] sm:text-xs text-sb-accent font-bold hover:underline transition-all bg-sb-light-green/20 hover:bg-sb-light-green/40 px-2.5 sm:px-3 py-1 rounded-full border border-sb-light-green/40 shadow-2xs active:scale-95"
                      >
                        <img
                          src={images[0]}
                          alt="Proof thumbnail"
                          className="w-4 h-4 sm:w-5 sm:h-5 object-cover rounded-full border border-sb-ceramic shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span>
                          ดูภาพหลักฐาน {images.length > 1 ? `(${images.length} รูป) 🔍` : '🔍'}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Delete button (only visible if own log) */}
                  {isOwnLog && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(workout.id);
                        setDeletePin('');
                        setDeleteError('');
                      }}
                      className="text-[10px] sm:text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                      title="ลบรายการผลนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>ลบรายการ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 1. FULL-SCREEN LIGHTBOX MODAL FOR PROOF IMAGES */}
      {previewImage && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-fade-in select-none cursor-pointer"
          onClick={() => {
            setPreviewImage(null);
            setPreviewImages([]);
          }}
        >
          {/* Top Bar Header */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-white/20 shrink-0 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide truncate">
                  หลักฐานการออกกำลังกาย (Verification Proof)
                </h4>
                <p className="text-xs text-white/70 font-medium truncate">
                  ภาพรายงานความแข็งแรง พนักงาน GPO South
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewImage(null);
                setPreviewImages([]);
              }}
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
              src={previewImage}
              alt="Verification Proof"
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-fade-in"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Bottom Thumbnail Strip & Hint */}
          <div
            className="w-full max-w-2xl flex flex-col items-center gap-2 shrink-0 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImages.length > 1 && (
              <div className="flex items-center justify-center gap-2 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-x-auto max-w-full">
                {previewImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewImage(img)}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      previewImage === img
                        ? 'border-sb-gold ring-2 ring-sb-gold/50 scale-105 shadow-md'
                        : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="text-[11px] sm:text-xs text-white/60 text-center">
              แตะที่ใดก็ได้บนหน้าจอเพื่อปิด
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. CONFIRM DELETE MODAL WITH PIN CHECK */}
      {deletingId && createPortal(
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => {
            setDeletingId(null);
            setDeletePin('');
            setDeleteError('');
          }}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm sm:max-w-md w-full border border-sb-ceramic space-y-4 shadow-2xl animate-fade-in my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-700 pb-2 border-b border-sb-ceramic/50">
              <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center border border-rose-200 shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-sb-green">คุณแน่ใจหรือไม่ที่จะลบรายการนี้?</h3>
                <p className="text-[11px] text-sb-text-muted font-medium">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
              </div>
            </div>

            <p className="text-xs text-sb-text-black leading-relaxed bg-sb-cream/70 p-3 rounded-2xl border border-sb-ceramic/60">
              การลบรายการนี้จะหักล้างจำนวนก้าวสะสมและแคลลอรี่ที่ถูกบันทึกไปแล้วทันที เพื่อความปลอดภัย กรุณากรอกรหัส PIN ประจำตัวของคุณ
            </p>

            {deleteError && (
              <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-semibold flex items-center gap-1.5">
                <span>⚠️ {deleteError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-sb-text-muted uppercase block">กรอกรหัส PIN (4 หลัก) เพื่อยืนยัน</label>
              <input
                type="password"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                autoFocus
                value={deletePin}
                onChange={(e) => setDeletePin(e.target.value)}
                placeholder="PIN 4 หลัก"
                className="w-full text-center py-2.5 border border-sb-ceramic rounded-full font-mono tracking-widest text-xl bg-sb-cream/30 focus:bg-white focus:border-sb-accent focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setDeletePin('');
                  setDeleteError('');
                }}
                className="flex-1 py-2.5 text-xs font-bold border border-sb-ceramic text-sb-house rounded-full bg-transparent hover:bg-sb-cream transition-all active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingId)}
                className="flex-1 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all active:scale-95 shadow-sm"
              >
                ยืนยันการลบ 🗑️
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
