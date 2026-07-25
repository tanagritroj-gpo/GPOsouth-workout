import React, { useState, useEffect } from 'react';
import { User, Workout } from '../types';
import { Calendar, Flame, Footprints, Image as ImageIcon, CheckCircle2, Activity, PlusCircle, AlertCircle, UploadCloud, FolderSync, LogOut, Check, RefreshCw, Trash2, X, Clock } from 'lucide-react';
import ActivityIcon from './ActivityIcon';
import { dbAddWorkout } from '../firebase-client';
import { signInWithGoogleDrive, getCachedDriveToken, uploadImageToGoogleDrive, clearCachedDriveToken, handleDriveRedirectResult, TARGET_DRIVE_FOLDER_ID } from '../google-drive';

interface WorkoutFormProps {
  currentUser: User;
  onSuccess: () => void;
  onCancel?: () => void;
}

const ACTIVITIES = [
  { name: 'วิ่ง', stepsPerMin: 150, calPerMin: 10 },
  { name: 'เดินเร็ว', stepsPerMin: 110, calPerMin: 5 },
  { name: 'ว่ายน้ำ', stepsPerMin: 20, calPerMin: 8 },
  { name: 'เต้นแอโรบิค', stepsPerMin: 90, calPerMin: 6 },
  { name: 'เดิน Trail', stepsPerMin: 130, calPerMin: 9 },
  { name: 'ออกกำลังกายหลายรูปแบบ', stepsPerMin: 80, calPerMin: 7 },
];

const PRESET_IMAGES = [
  { name: 'วิ่งในสวน', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=300&q=80' },
  { name: 'ลู่วิ่งไฟฟ้า', url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=300&q=80' },
  { name: 'ว่ายน้ำคลายร้อน', url: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&w=300&q=80' },
  { name: 'ฟิตเนสรวม', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=300&q=80' },
];

export default function WorkoutForm({ currentUser, onSuccess, onCancel }: WorkoutFormProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submissionFormat, setSubmissionFormat] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [period, setPeriod] = useState<string>('');
  const [activityType, setActivityType] = useState<string>('วิ่ง');
  const [steps, setSteps] = useState<number>(8000);
  const [calories, setCalories] = useState<number>(450);
  const [calcMinutes, setCalcMinutes] = useState<number>(30); // minutes for slider auto-estimates
  const [duration, setDuration] = useState<number>(30); // actual workout duration saved
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<boolean>(false);
  const [uploadedToTargetFolder, setUploadedToTargetFolder] = useState<boolean | null>(null);

  // Update default period when submission format or date changes
  useEffect(() => {
    if (submissionFormat === 'daily') {
      const formattedDate = new Date(date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      setPeriod(formattedDate);
    } else if (submissionFormat === 'weekly') {
      const selectedDate = new Date(date);
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

      const fmtStart = startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      const fmtEnd = endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      setPeriod(`สัปดาห์ ${fmtStart} - ${fmtEnd}`);
    } else if (submissionFormat === 'monthly') {
      const formattedMonth = new Date(date).toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric',
      });
      setPeriod(`รอบสะสมประจำเดือน ${formattedMonth}`);
    }
  }, [date, submissionFormat]);

  // Estimate steps and calories when calcMinutes slider or activity changes
  useEffect(() => {
    const act = ACTIVITIES.find(a => a.name === activityType);
    if (act) {
      setSteps(act.stepsPerMin * calcMinutes);
      setCalories(act.calPerMin * calcMinutes);
      setDuration(calcMinutes);
    }
  }, [activityType, calcMinutes]);

  const [driveToken, setDriveToken] = useState<string | null>(getCachedDriveToken());

  // Check for Google Drive OAuth redirect result on component mount
  useEffect(() => {
    handleDriveRedirectResult().then((token) => {
      if (token) {
        setDriveToken(token);
      }
    });
  }, []);

  const handleConnectDrive = async () => {
    setError('');
    try {
      const token = await signInWithGoogleDrive();
      if (token) {
        setDriveToken(token);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อ Google Drive ได้');
    }
  };

  const handleDisconnectDrive = () => {
    clearCachedDriveToken();
    setDriveToken(null);
    setImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = imageUrls.filter((_, idx) => idx !== indexToRemove);
    setImageUrls(updated);
    if (updated.length > 0) {
      setImageUrl(updated[0]);
    } else {
      setImageUrl('');
    }
  };

  // Direct image upload to Google Drive supporting multiple files
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.some((f) => f.size > 15 * 1024 * 1024);
    if (oversized) {
      setError('มีไฟล์รูปภาพขนาดใหญ่เกิน 15MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง');
      return;
    }

    let token = driveToken;
    if (!token) {
      try {
        token = await signInWithGoogleDrive();
        if (token) {
          setDriveToken(token);
        } else {
          return; // Redirecting to Google OAuth
        }
      } catch (err: any) {
        setError('กรุณากดปุ่ม "เชื่อมต่อ Google Account" ด้านล่างเพื่ออนุญาตให้อัปโหลดรูปภาพเข้า Google Drive');
        return;
      }
    }

    setIsUploadingToDrive(true);
    setError('');
    setUploadedToTargetFolder(null);

    const uploadedList: string[] = [];
    let allTarget = true;

    try {
      for (const file of files) {
        const { imageUrl: driveUrl, isTargetFolder } = await uploadImageToGoogleDrive(file, token);
        uploadedList.push(driveUrl);
        if (!isTargetFolder) allTarget = false;
      }

      const combinedUrls = [...imageUrls, ...uploadedList];
      setImageUrls(combinedUrls);
      setImageUrl(combinedUrls[0] || '');
      setUploadedToTargetFolder(allTarget);

      if (!allTarget) {
        setError('ไฟล์บางส่วนถูกบันทึกใน Google Drive ของคุณแล้ว แต่ยังไม่สามารถส่งลงโฟลเดอร์องค์กรได้เนื่องจากสิทธิ์การแชร์');
      }
    } catch (err: any) {
      console.error('Google Drive Upload Error:', err);
      const errMsg = err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ไปที่ Google Drive';
      setError(errMsg);
      if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('expired')) {
        setDriveToken(null);
        clearCachedDriveToken();
      }
    } finally {
      setIsUploadingToDrive(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period) {
      setError('กรุณาระบุช่วงเวลาที่ต้องการลงข้อมูล');
      return;
    }
    if (steps <= 0 && calories <= 0) {
      setError('กรุณาระบุจำนวนก้าวหรือแคลลอรี่ที่เหมาะสม');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const finalImageUrls = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);

    try {
      const newWorkout: Workout = {
        id: `w-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        date,
        submissionFormat: submissionFormat as 'daily' | 'weekly' | 'monthly',
        period,
        activityType,
        steps: Number(steps),
        calories: Number(calories),
        durationMinutes: Number(duration),
        imageUrl: finalImageUrls[0] || '',
        imageUrls: finalImageUrls,
        createdAt: new Date().toISOString(),
      };

      await dbAddWorkout(newWorkout);

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setDuration(30);
        setImageUrl('');
        setImageUrls([]);
        onSuccess();
      }, 1500);
    } catch (e) {
      console.error(e);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยัง Firebase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sb-card p-4 sm:p-6 max-w-xl mx-auto relative z-10 animate-fade-in">
      {showSuccessToast ? (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-pulse">
          <div className="w-16 h-16 bg-sb-accent text-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-sb-green">ส่งข้อมูลออกกำลังกายสำเร็จ!</h3>
          <p className="text-xs text-sb-text-muted mt-2">กำลังบันทึกข้อมูลและอัปเดตกระดานคะแนนผู้นำ...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border-b border-sb-ceramic pb-4">
            <h2 className="text-lg font-bold text-sb-green flex items-center gap-2 uppercase tracking-wide font-sans">
              <PlusCircle className="w-5 h-5 text-sb-accent" />
              Log Workout Session
            </h2>
            <p className="text-xs text-sb-text-muted font-semibold mt-1">
              พนักงาน: <span className="font-bold text-sb-green">{currentUser.name}</span> ({currentUser.department})
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. วันที่บันทึก */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sb-accent" />
              วันที่บันทึก *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black text-xs font-semibold"
            />
          </div>

          {/* 2. รูปแบบการส่งข้อมูล */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider block">รูปแบบการส่งข้อมูล *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSubmissionFormat(format)}
                  className={`py-2 rounded-full text-xs font-semibold border transition-all ${
                    submissionFormat === format
                      ? 'bg-sb-accent border-transparent text-white shadow-sm'
                      : 'border-sb-ceramic text-sb-text-muted hover:bg-sb-cream bg-white'
                  }`}
                >
                  <span>
                    {format === 'daily' ? '📅 รายวัน' : format === 'weekly' ? '🗓️ รายสัปดาห์' : '📊 รายเดือน'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. ช่วงเวลาที่ต้องการลงข้อมูล */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider">ช่วงเวลาที่ลงข้อมูล (ระบบคำนวณอัตโนมัติ) *</label>
            <input
              type="text"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="ระบุวันที่ หรือ ช่วงสัปดาห์"
              className="w-full px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black text-xs font-semibold"
            />
          </div>

          {/* 4. รูปแบบการออกกำลังกาย */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-sb-accent" />
              รูปแบบการออกกำลังกาย *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ACTIVITIES.map((act) => (
                <button
                  key={act.name}
                  type="button"
                  onClick={() => setActivityType(act.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    activityType === act.name
                      ? 'bg-sb-accent border-transparent text-white font-bold shadow-sm'
                      : 'border-sb-ceramic bg-white text-sb-text-muted hover:bg-sb-cream'
                  }`}
                >
                  <ActivityIcon activityType={act.name} className="w-4 h-4 shrink-0" />
                  <span className="text-xs truncate font-semibold">{act.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. เวลาในการทำกิจกรรมเพื่อคำนวณสถิติคร่าวๆ */}
          <div className="bg-sb-cream rounded-2xl p-4 border border-sb-ceramic/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sb-house">ระยะเวลาทำกิจกรรมเพื่อประเมิน (นาที)</label>
              <span className="text-xs font-bold text-sb-accent font-mono">{calcMinutes} นาที</span>
            </div>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={calcMinutes}
              onChange={(e) => setCalcMinutes(Number(e.target.value))}
              className="w-full accent-sb-accent cursor-pointer"
            />
            <p className="text-[10px] text-sb-text-muted leading-relaxed">
              * ข้อมูลนาทีตรงนี้จะช่วยประเมินจำนวนก้าวและแคลลอรี่ให้ท่านโดยประมาณ (ท่านสามารถกรอกระยะเวลาจริง ก้าว และแคลลอรี่ได้อิสระด้านล่าง)
            </p>
          </div>

          {/* 6. ปรับแต่งจำนวนก้าว, แคลลอรี่ และระยะเวลาแมนนวล */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div className="space-y-1.5 flex flex-col justify-between">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5 min-h-[32px]">
                <Footprints className="w-4 h-4 text-sb-accent flex-shrink-0" />
                <span>จำนวนก้าว (ก้าว) *</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={steps === 0 ? '' : steps}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  setSteps(raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                }}
                className="w-full h-11 px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-mono text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-between">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5 min-h-[32px]">
                <Flame className="w-4 h-4 text-sb-green flex-shrink-0" />
                <span>แคลลอรี่ (kcal) *</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={calories === 0 ? '' : calories}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  setCalories(raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                }}
                className="w-full h-11 px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-mono text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-between">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5 min-h-[32px]">
                <Clock className="w-4 h-4 text-sb-accent flex-shrink-0" />
                <span>ระยะเวลาออกกำลังกาย (รวม)(นาที) *</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={duration === 0 ? '' : duration}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  setDuration(raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0));
                }}
                className="w-full h-11 px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sb-text-black font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* 7. อัปโหลดภาพหลักฐานประกอบไปยัง Google Drive โฟลเดอร์กลาง */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sb-accent" />
                ภาพหลักฐานประกอบ (จัดเก็บบน Google Drive)
              </label>
              {driveToken && (
                <button
                  type="button"
                  onClick={handleDisconnectDrive}
                  className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-bold bg-red-50 px-2 py-1 rounded-md border border-red-200"
                >
                  <LogOut className="w-3 h-3" /> เปลี่ยนบัญชี Google
                </button>
              )}
            </div>

            {!driveToken ? (
              <div className="flex flex-col items-center justify-center p-5 border border-dashed border-sb-ceramic/80 bg-sb-cream/40 rounded-2xl text-center">
                <FolderSync className="w-8 h-8 text-sb-accent mb-2" />
                <p className="text-xs font-bold text-sb-house mb-1">ยืนยันตัวตนเพื่อบันทึกรูปภาพลงใน Google Drive</p>
                <p className="text-[10px] text-sb-text-muted mb-3 max-w-sm">
                  รูปภาพจะถูกส่งตรงไปเก็บที่ Google Drive โฟลเดอร์ <code className="bg-sb-cream px-1 py-0.5 rounded text-sb-accent font-semibold font-mono">{TARGET_DRIVE_FOLDER_ID}</code>
                </p>
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-4 py-2.5 bg-white hover:bg-sb-cream text-xs font-bold text-sb-text-black rounded-full border border-sb-ceramic flex items-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.12-4.53-2.12-4.53z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  เชื่อมต่อ Google Account เพื่ออัปโหลด
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>เชื่อมต่อ Google Drive แล้ว (เลือกอัปโหลดหลายรูปได้พร้อมกัน)</span>
                  </div>
                </div>

                {/* List of uploaded thumbnails if any */}
                {(imageUrls.length > 0 || imageUrl) && (
                  <div className="bg-sb-cream/60 p-3 rounded-2xl border border-sb-ceramic space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sb-green">
                        📷 รูปภาพหลักฐานที่เลือก ({imageUrls.length || (imageUrl ? 1 : 0)} รูป)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrls([]);
                          setImageUrl('');
                        }}
                        className="text-[10px] text-red-600 hover:underline font-bold"
                      >
                        ลบรูปทั้งหมด
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {(imageUrls.length > 0 ? imageUrls : [imageUrl]).map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-sb-ceramic bg-black/5 aspect-square">
                          <img
                            src={url}
                            alt={`Proof ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition-all z-20"
                            title="ลบรูปนี้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Dropzone / Button */}
                <div className="border border-dashed border-sb-ceramic/80 bg-sb-cream/40 rounded-2xl p-4 text-center hover:bg-sb-cream/70 hover:border-sb-accent transition-all cursor-pointer relative min-h-[110px] flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploadingToDrive}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {isUploadingToDrive ? (
                    <div className="flex flex-col items-center justify-center py-3 animate-pulse z-0">
                      <RefreshCw className="w-7 h-7 text-sb-accent animate-spin mb-1.5" />
                      <p className="text-xs font-bold text-sb-house">กำลังอัปโหลดรูปภาพไปยัง Google Drive...</p>
                      <p className="text-[10px] text-sb-text-muted mt-0.5">ระบบกำลังออก Direct Link และบันทึกลงโฟลเดอร์</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 z-0">
                      <div className="w-9 h-9 bg-sb-light-green/20 rounded-2xl flex items-center justify-center mb-1.5 text-sb-accent">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-sb-house">
                        {imageUrls.length > 0 ? '+ เพิ่มรูปภาพหลักฐานเพิ่มเติม (เลือกได้หลายรูป)' : 'คลิก หรือ ลากไฟล์รูปภาพมาวางที่นี่ (เลือกได้หลายรูป)'}
                      </p>
                      <p className="text-[10px] text-sb-text-muted mt-0.5">ระบบจะส่งภาพเข้า Google Drive โฟลเดอร์ ID: {TARGET_DRIVE_FOLDER_ID}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preset Image Options */}
            <div className="pt-1">
              <p className="text-[11px] font-bold text-sb-text-muted mb-1.5">หรือ เลือกรูปตัวอย่างกิจกรรมฉุกเฉิน:</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      if (!imageUrls.includes(preset.url)) {
                        const updated = [...imageUrls, preset.url];
                        setImageUrls(updated);
                        if (!imageUrl) setImageUrl(preset.url);
                      }
                    }}
                    className={`relative rounded-xl overflow-hidden border transition-all h-14 ${
                      imageUrls.includes(preset.url) || imageUrl === preset.url
                        ? 'border-sb-accent ring-2 ring-sb-accent/40 shadow-sm'
                        : 'border-sb-ceramic opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-bold py-0.5 px-1 truncate text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 border border-sb-ceramic text-sb-house rounded-full bg-transparent hover:bg-sb-cream font-bold py-2.5 text-xs transition-all active:scale-95"
              >
                ยกเลิก
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sb-btn-primary rounded-full text-xs font-bold py-2.5 transition-all active:scale-95"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : (
                <span>ส่งรายงานออกกำลังกาย 🚀</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
