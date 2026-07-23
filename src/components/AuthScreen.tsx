import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Users, ShieldAlert, KeyRound, Plus, LogIn, Heart, UserPlus, Check, Camera, Upload, Smile } from 'lucide-react';
import { dbGetUsers, dbAddUser } from '../firebase-client';
import Avatar from './Avatar';

const AVATAR_PRESETS = [
  { id: 'runner-m', label: 'นักวิ่งชาย', value: 'emoji:🏃‍♂️:from-amber-400 to-orange-500' },
  { id: 'runner-f', label: 'นักวิ่งหญิง', value: 'emoji:🏃‍♀️:from-rose-400 to-pink-500' },
  { id: 'cyclist', label: 'นักปั่น', value: 'emoji:🚴:from-teal-400 to-emerald-500' },
  { id: 'swimmer', label: 'นักว่ายน้ำ', value: 'emoji:🏊:from-blue-400 to-indigo-500' },
  { id: 'yoga', label: 'โยคะ', value: 'emoji:🧘:from-violet-400 to-purple-500' },
  { id: 'weight', label: 'ฟิตเนส', value: 'emoji:🏋️:from-slate-400 to-slate-600' },
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
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality jpeg
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  
  // Registration Form
  const [newName, setNewName] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [newDept, setNewDept] = useState<string>('GPO South');
  const [photoUrl, setPhotoUrl] = useState<string>('emoji:🏃‍♂️:from-amber-400 to-orange-500');
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchUsers = async () => {
    try {
      const data = await dbGetUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('กรุณาเลือกพนักงานที่จะเข้าสู่ระบบ');
      return;
    }
    if (!pin) {
      setError('กรุณากรอกรหัสผ่าน (PIN)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Direct PIN checking on client side for static compatibility (Vercel)
      if (selectedUser.pin !== pin) {
        throw new Error('รหัสผ่าน (PIN) ไม่ถูกต้อง');
      }

      onLoginSuccess(selectedUser);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล พนักงาน');
      return;
    }
    if (!newPin || newPin.length < 4) {
      setError('กรุณากำหนดรหัสผ่าน (PIN) อย่างน้อย 4 หลัก');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const allUsers = await dbGetUsers();
      const existing = allUsers.find(u => u.name.trim().toLowerCase() === newName.trim().toLowerCase());
      if (existing) {
        throw new Error('มีรายชื่อพนักงานนี้ในระบบแล้ว');
      }

      const newUser: User = {
        id: `u-${Date.now()}`,
        name: newName.trim(),
        pin: newPin,
        department: newDept,
        photoUrl,
        createdAt: new Date().toISOString(),
      };

      await dbAddUser(newUser);

      setSuccessMsg('ลงทะเบียนพนักงานใหม่สำเร็จ!');
      setNewName('');
      setNewPin('');
      
      // Refresh user list
      await fetchUsers();
      
      // Select the newly registered user
      setSelectedUser(newUser);

      setTimeout(() => {
        setIsRegistering(false);
        setSuccessMsg('');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto sb-card p-6 animate-fade-in relative z-10">
      {/* Decorative Brand Header */}
      <div className="text-center pb-6 border-b border-sb-ceramic">
        <div className="w-14 h-14 bg-sb-accent rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
          <Heart className="w-6 h-6 text-white fill-white" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-sb-green font-sans">Workouts Tracker</h1>
        <p className="text-sm font-bold text-sb-gold mt-1">GPO South Flagship</p>
        <p className="text-xs text-sb-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
          GPO South Health in motion : เพราะสุขภาพที่ดีนำไปสู่ Happy Workplace
        </p>
        <div className="inline-block bg-sb-light-green/20 px-4 py-1.5 rounded-full text-[11px] font-bold text-sb-accent border border-sb-light-green/35 tracking-wider mt-3.5 uppercase">
          โครงการ: 9 ก.ค. 2569 - 30 ก.ค. 2570
        </div>
      </div>

      <div className="pt-6">
        {/* Toggle Login/Register Tabs */}
        <div className="flex border-b border-sb-ceramic pb-4 mb-6">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setError(''); }}
            className={`flex-1 py-2 text-center text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              !isRegistering
                ? 'text-sb-green border-b-2 border-sb-accent'
                : 'text-sb-text-muted hover:text-sb-house'
            }`}
          >
            <LogIn className="w-4 h-4" />
            เข้าสู่ระบบพนักงาน
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setError(''); }}
            className={`flex-1 py-2 text-center text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isRegistering
                ? 'text-sb-green border-b-2 border-sb-accent'
                : 'text-sb-text-muted hover:text-sb-house'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            ลงทะเบียนใหม่
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2 mb-4 animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2 mb-4">
            <Check className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {!isRegistering ? (
          /* LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sb-accent" />
                เลือกพนักงาน GPO South
              </label>
              
              {users.length === 0 ? (
                <div className="py-4 text-center text-xs text-sb-text-muted">
                  กำลังดาวน์โหลดรายชื่อพนักงาน...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1 border border-sb-ceramic rounded-xl p-2 bg-sb-cream/50">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setError('');
                      }}
                      className={`p-2.5 rounded-lg text-left transition-all flex items-center justify-between border ${
                        selectedUser?.id === user.id
                          ? 'bg-sb-accent border-sb-accent text-white shadow-sm'
                          : 'bg-white border-sb-ceramic/30 text-sb-house hover:bg-sb-cream'
                      }`}
                    >
                      <div>
                        <span className="text-sm font-semibold block">{user.name}</span>
                        <span className={`text-[11px] ${selectedUser?.id === user.id ? 'text-white/80' : 'text-sb-text-muted'}`}>
                          {user.department}
                        </span>
                      </div>
                      {selectedUser?.id === user.id && (
                        <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                          <Check className="w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sb-accent" />
                  รหัสผ่านประจำตัว (PIN 4 หลัก)
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="กรอก PIN 4 หลัก"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-center px-4 py-2.5 rounded-full border border-sb-ceramic bg-sb-cream focus:outline-none focus:border-sb-accent text-lg font-mono tracking-widest text-sb-house font-bold"
                />
                <p className="text-[10px] text-sb-text-muted text-center">
                  * ใช้รหัส PIN เพื่อยืนยันตัวตนพนักงานในการส่งผลข้อมูลการวิ่ง
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedUser}
              className={`w-full py-3.5 px-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md ${
                selectedUser
                  ? 'sb-btn-primary'
                  : 'bg-sb-ceramic/50 text-sb-text-muted cursor-not-allowed'
              }`}
            >
              <span>เข้าสู่ระบบเพื่อใช้งาน 🏃</span>
            </button>
          </form>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider">
                ชื่อ-นามสกุลพนักงาน *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น คุณณัฐพล สุขใจ"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sm text-sb-text-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider">
                  หน่วยงาน / แผนก *
                </label>
                <input
                  type="text"
                  required
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sm text-sb-text-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider">
                  กำหนด PIN (4 หลัก) *
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="เช่น 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border border-sb-ceramic bg-white focus:outline-none focus:border-sb-accent text-sm font-mono tracking-widest text-sb-text-black text-center"
                />
              </div>
            </div>

            {/* Profile Avatar Selection Section */}
            <div className="space-y-3 bg-sb-cream p-4 rounded-2xl border border-sb-ceramic/60">
              <label className="text-xs font-bold text-sb-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-sb-accent" />
                รูปโปรไฟล์ประจำตัว GPO South *
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Current Active Preview */}
                <div className="relative group shrink-0">
                  <Avatar photoUrl={photoUrl} name={newName || "G"} className="w-18 h-18 text-2xl" />
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Choices & Upload Trigger */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="text-[11px] text-sb-text-muted">เลือกอิโมจินักกีฬา หรืออัปโหลดรูปจริงของคุณ:</div>
                  
                  {/* Preset Grid */}
                  <div className="grid grid-cols-6 gap-1.5">
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
                          className={`w-8.5 h-8.5 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-base shadow-sm transition-transform active:scale-90 relative ${
                            isActive ? 'ring-2 ring-sb-accent scale-110' : 'hover:scale-105 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <span>{emoji}</span>
                          {isActive && (
                            <div className="absolute -bottom-1 -right-1 bg-sb-accent text-white w-4 h-4 rounded-full flex items-center justify-center border border-white">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload Trigger */}
                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <div className="cursor-pointer text-center py-2 px-3 bg-white hover:bg-slate-50 border border-sb-ceramic rounded-xl text-[11px] font-bold text-sb-house flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-sb-accent" />
                        <span>{uploadLoading ? 'กำลังย่อรูป...' : 'อัปโหลดรูปถ่ายส่วนตัว'}</span>
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
                              setError('ไม่สามารถย่อรูปภาพได้ กรุณาลองอัปโหลดรูปภาพอื่น');
                              console.error(err);
                            } finally {
                              setUploadLoading(false);
                            }
                          }
                        }}
                      />
                    </label>

                    {photoUrl.startsWith('data:image/') && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('emoji:🏃‍♂️:from-amber-400 to-orange-500')}
                        className="text-[11px] font-extrabold text-rose-600 hover:text-rose-800 hover:underline px-1 shrink-0"
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-sb-text-muted leading-relaxed">
              * ข้อมูลพนักงานนี้จะถูกบันทึกไว้ในฐานข้อมูลเพื่อจัดทำสรุปสถิติ แดชบอร์ด และตารางจัดอันดับ (Leaderboard) ของหน่วยงานอย่างมีประสิทธิภาพ
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 sb-btn-primary shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>ลงทะเบียนบัญชีพนักงานใหม่</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
