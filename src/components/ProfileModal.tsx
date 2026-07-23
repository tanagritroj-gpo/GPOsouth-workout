import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import Avatar from './Avatar';
import { dbUpdateUserPhoto } from '../firebase-client';
import { X, Camera, Upload, Check, Smile, Sparkles, ShieldAlert, UserCheck } from 'lucide-react';


const AVATAR_PRESETS = [
  { id: 'runner-m', label: 'นักวิ่งชาย', value: 'emoji:🏃‍♂️:from-amber-400 to-orange-500' },
  { id: 'runner-f', label: 'นักวิ่งหญิง', value: 'emoji:🏃‍♀️:from-rose-400 to-pink-500' },
  { id: 'cyclist', label: 'นักปั่น', value: 'emoji:🚴:from-teal-400 to-emerald-500' },
  { id: 'swimmer', label: 'นักว่ายน้ำ', value: 'emoji:🏊:from-blue-400 to-indigo-500' },
  { id: 'yoga', label: 'โยคะ', value: 'emoji:🧘:from-violet-400 to-purple-500' },
  { id: 'weight', label: 'ฟิตเนส', value: 'emoji:🏋️:from-slate-400 to-slate-600' },
  { id: 'hiker', label: 'เดินป่า', value: 'emoji:🧗:from-emerald-600 to-teal-800' },
  { id: 'tennis', label: 'เทนนิส', value: 'emoji:🎾:from-lime-400 to-green-600' },
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 160;
        const MAX_HEIGHT = 160;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateSuccess: (updatedUser: User) => void;
}

export default function ProfileModal({ user, onClose, onUpdateSuccess }: ProfileModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(user.photoUrl || 'emoji:🏃‍♂️:from-amber-400 to-orange-500');
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await dbUpdateUserPhoto(user.id, photoUrl);
      const updatedUser: User = {
        ...user,
        photoUrl,
      };
      
      setSuccess(true);
      setTimeout(() => {
        onUpdateSuccess(updatedUser);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถบันทึกรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-sb-house/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 relative border border-sb-ceramic shadow-2xl space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header Close & Title */}
        <div className="flex items-center justify-between pb-3.5 border-b border-sb-ceramic">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sb-light-green/20 text-sb-accent flex items-center justify-center border border-sb-light-green/40 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-sb-house font-sans truncate">เปลี่ยนรูปโปรไฟล์ประจำตัว</h3>
              <p className="text-[11px] sm:text-xs text-sb-text-muted truncate">{user.name} ({user.department})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-sb-text-muted hover:text-sb-house hover:bg-sb-cream transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-2xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Active Preview */}
        <div className="flex flex-col items-center justify-center py-2 bg-sb-cream/60 rounded-2xl border border-sb-ceramic/60">
          <div className="relative group my-2">
            <Avatar photoUrl={photoUrl} name={user.name} className="w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl shadow-md ring-4 ring-white" />
            <div className="absolute -bottom-1 -right-1 bg-sb-accent text-white p-1.5 rounded-full border-2 border-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-xs font-bold text-sb-house mt-1">{user.name}</span>
          <span className="text-[10px] text-sb-text-muted">รูปจะแสดงบน Leaderboard และรายงานกิจกรรม</span>
        </div>

        {/* Preset Emojis & Custom Upload */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-sb-accent" />
            เลือกอิโมจิประจำตัว หรืออัปโหลดรูปภาพใหม่
          </label>

          {/* Preset Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {AVATAR_PRESETS.map((preset) => {
              const isActive = photoUrl === preset.value;
              const emoji = preset.value.split(':')[1];
              const gradient = preset.value.split(':')[2];
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.label}
                  onClick={() => setPhotoUrl(preset.value)}
                  className={`h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-xs transition-all active:scale-90 relative ${
                    isActive ? 'ring-3 ring-sb-accent scale-105 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{emoji}</span>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 bg-sb-accent text-white w-4 h-4 rounded-full flex items-center justify-center border border-white">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Upload Button */}
          <div className="pt-2">
            <label className="block w-full">
              <div className="cursor-pointer py-2.5 px-4 bg-sb-cream hover:bg-sb-light-green/20 border border-sb-ceramic rounded-2xl text-xs font-bold text-sb-house flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs">
                <Upload className="w-4 h-4 text-sb-accent shrink-0" />
                <span className="truncate">{uploadLoading ? 'กำลังประมวลผลย่อรูปภาพ...' : '📷 ถ่ายรูปหรือเลือกรูปจากเครื่อง'}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setUploadLoading(true);
                      setError('');
                      const base64 = await compressImage(file);
                      setPhotoUrl(base64);
                    } catch (err) {
                      setError('ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองเลือกรูปอื่น');
                      console.error(err);
                    } finally {
                      setUploadLoading(false);
                    }
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-sb-ceramic">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 px-4 text-xs font-bold border border-sb-ceramic text-sb-house rounded-full bg-white hover:bg-sb-cream transition-all active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadLoading || success}
            className={`flex-1 py-2.5 sm:py-3 px-4 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
              success
                ? 'bg-emerald-600 text-white'
                : 'sb-btn-primary'
            }`}
          >
            {success ? (
              <>
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>บันทึกสำเร็จ!</span>
              </>
            ) : (
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกรูปโปรไฟล์ ✨'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
