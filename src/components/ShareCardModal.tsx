import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Workout, User } from '../types';
import GpoLogo from './GpoLogo';
import ActivityIcon from './ActivityIcon';
import Avatar from './Avatar';
import { X, Download, Share2, Check, Sparkles, Footprints, Flame, Clock } from 'lucide-react';
import { toPng } from 'html-to-image';

interface ShareCardModalProps {
  workout?: Workout | null;
  currentUser: User;
  onClose: () => void;
}

export default function ShareCardModal({ workout, currentUser, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // If specific workout is provided, use its details. Otherwise, construct a summary card for user.
  const activityName = workout?.activityType || 'ออกกำลังกายประจำวัน';
  const steps = workout?.steps ?? 10000;
  const calories = workout?.calories ?? 450;
  const duration = workout?.durationMinutes ?? 45;
  const dateStr = workout?.period || workout?.date || new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const imageUrl = workout?.imageUrl || (workout?.imageUrls && workout.imageUrls[0]);

  const generateCardFileAndUrl = async (): Promise<{ file: File; dataUrl: string } | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
    });
    
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `GPO_Workout_${currentUser.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    return { file, dataUrl };
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const card = await generateCardFileAndUrl();
      if (!card) return;

      // Check if Web Share API with file support is available (Mobile iOS Safari / Chrome)
      if (navigator.canShare && navigator.canShare({ files: [card.file] })) {
        try {
          await navigator.share({
            files: [card.file],
            title: 'GPO South Share Card',
            text: `การ์ดสรุปออกกำลังกาย - ${currentUser.name}`,
          });
          setDownloading(false);
          return;
        } catch (shareErr) {
          // User cancelled or share failed, fallback to standard download
          console.log('Web share cancelled or failed, using download fallback:', shareErr);
        }
      }

      // Standard desktop/fallback download link
      const link = document.createElement('a');
      link.download = card.file.name;
      link.href = card.dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('ไม่สามารถบันทึกภาพได้ชั่วคราว กรุณาลองจับภาพหน้าจอ (Screenshot) เพื่อบันทึกการ์ด');
    } finally {
      setDownloading(false);
    }
  };

  const handleShareToLine = async () => {
    setDownloading(true);
    const shareText = `🏃‍♂️ ผลการออกกำลังกายของ ${currentUser.name} (${currentUser.department || 'GPO South'})\n🏆 กิจกรรม: ${activityName}\n👟 จำนวน: ${steps.toLocaleString()} ก้าว | 🔥 ${calories} kcal | ⏱️ ${duration} นาที\n✨ มาร่วมสร้างสุขภาพดีกับ GPO South Health Tracker ด้วยกันครับ!`;

    try {
      const card = await generateCardFileAndUrl();
      if (card && navigator.canShare && navigator.canShare({ files: [card.file] })) {
        // Native Web Share with actual Image File (Allows sending direct photo to LINE / Save to Photos)
        await navigator.share({
          files: [card.file],
          title: 'GPO South Health Card',
          text: shareText,
        });
        setDownloading(false);
        return;
      }
    } catch (e) {
      console.log('Native share bypassed or error:', e);
    } finally {
      setDownloading(false);
    }

    // Fallback if native Web Share is not available (Desktop or unsupported browsers)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }

    // Try LINE Share scheme or WEB Intent
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full overflow-hidden shadow-2xl border border-sb-ceramic flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-sb-ceramic flex items-center justify-between bg-sb-cream shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-sb-gold shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-sb-house truncate">การ์ดสรุปสำหรับแชร์ (Share Card)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-sb-ceramic flex items-center justify-center text-sb-text-muted hover:text-sb-house transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Canvas Container (What gets exported) */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex justify-center items-center bg-slate-100/90">
          <div
            ref={cardRef}
            className="w-full max-w-[310px] sm:max-w-[340px] bg-gradient-to-b from-[#1E3932] via-[#006241] to-[#004d33] text-white rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden border-2 border-sb-gold/40 my-auto"
          >
            {/* Background Aesthetic Watermark & Gradient Glows */}
            <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-40 h-40 bg-sb-accent/30 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -translate-x-12 translate-y-12 w-40 h-40 bg-amber-300/20 rounded-full blur-2xl pointer-events-none" />

            {/* Top Brand Bar */}
            <div className="flex items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-white/15 relative z-10">
              <div className="flex items-center gap-2">
                <GpoLogo className="h-6 sm:h-7 w-auto drop-shadow-sm" />
                <div>
                  <h4 className="text-[10px] sm:text-[11px] font-black text-sb-gold uppercase tracking-widest font-sans leading-none">
                    HEALTH TRACKER
                  </h4>
                  <span className="text-[8px] sm:text-[9px] text-white/70 font-medium">GPO South Happy Workplace</span>
                </div>
              </div>
              <span className="text-[8px] sm:text-[9px] bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full font-mono shrink-0">
                {dateStr}
              </span>
            </div>

            {/* Profile Header */}
            <div className="py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 relative z-10">
              <Avatar
                photoUrl={currentUser.photoUrl}
                name={currentUser.name}
                className="w-10 h-10 sm:w-11 sm:h-11 border-2 border-sb-gold shadow-md shrink-0"
                textClassName="text-sm sm:text-base font-bold text-sb-house"
              />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate font-sans">{currentUser.name}</h3>
                <p className="text-[9px] sm:text-[10px] text-sb-light-green font-medium truncate">{currentUser.department || 'GPO South'}</p>
              </div>
            </div>

            {/* Optional Photo Attachment */}
            {imageUrl ? (
              <div className="my-2 rounded-2xl overflow-hidden border-2 border-white/20 shadow-md max-h-40 sm:max-h-48 relative group">
                <img src={imageUrl} alt="Workout" className="w-full h-36 sm:h-44 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-[10px] sm:text-[11px] font-bold">
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    <ActivityIcon activityType={activityName} className="w-3.5 h-3.5 text-sb-gold" />
                    <span>{activityName}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="my-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/15 text-center flex flex-col items-center justify-center gap-1">
                <div className="w-9 h-9 rounded-full bg-sb-gold/20 flex items-center justify-center text-sb-gold mb-0.5">
                  <ActivityIcon activityType={activityName} className="w-4 h-4 sm:w-5 sm:h-5 text-sb-gold" />
                </div>
                <span className="text-xs font-bold text-white">{activityName}</span>
                <span className="text-[9px] sm:text-[10px] text-white/70">มุ่งมั่นสร้างสุขภาพที่ดีในทุกๆ วัน</span>
              </div>
            )}

            {/* Main Stats Banner */}
            <div className="my-2.5 sm:my-3 bg-white/10 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/20 relative z-10 space-y-2">
              <div className="text-center pb-2 border-b border-white/10">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-sb-light-green block">
                  จำนวนก้าวสะสม (Total Steps)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight drop-shadow-sm flex items-center justify-center gap-1">
                  <Footprints className="w-5 h-5 sm:w-6 sm:h-6 text-sb-gold shrink-0" />
                  <span>{steps.toLocaleString()}</span>
                  <span className="text-xs font-normal text-white/80">ก้าว</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-0.5 font-mono">
                <div className="bg-black/20 rounded-xl p-1.5 sm:p-2 border border-white/10">
                  <span className="text-[8px] sm:text-[9px] text-white/70 block uppercase">แคลลอรี่</span>
                  <span className="text-xs sm:text-sm font-extrabold text-orange-300 flex items-center justify-center gap-1">
                    <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" />
                    {calories.toLocaleString()} <span className="text-[8px] sm:text-[9px]">kcal</span>
                  </span>
                </div>
                <div className="bg-black/20 rounded-xl p-1.5 sm:p-2 border border-white/10">
                  <span className="text-[8px] sm:text-[9px] text-white/70 block uppercase">ระยะเวลา</span>
                  <span className="text-xs sm:text-sm font-extrabold text-sky-300 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
                    {duration} <span className="text-[8px] sm:text-[9px]">นาที</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Quote */}
            <div className="pt-1.5 sm:pt-2 text-center border-t border-white/15 relative z-10">
              <p className="text-[9px] sm:text-[10px] text-amber-200/90 font-bold italic">
                "สุขภาพดี เริ่มต้นที่ตัวเรา • GPO South Happy Workplace"
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-3 sm:p-4 bg-sb-cream border-t border-sb-ceramic flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full sm:flex-1 h-10 sm:h-11 bg-sb-accent hover:bg-sb-green text-white font-bold rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{downloading ? 'กำลังสร้างรูปภาพ...' : 'บันทึกรูปภาพ (Save Photo)'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareToLine}
            disabled={downloading}
            className="w-full sm:flex-1 h-10 sm:h-11 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-white shrink-0" /> : <Share2 className="w-4 h-4 shrink-0" />}
            <span>{copied ? 'คัดลอกแล้ว!' : 'แชร์รูปภาพไปยัง LINE'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

