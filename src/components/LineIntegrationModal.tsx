import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LeaderboardEntry, WorkoutStats } from '../types';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Sparkles,
  Settings,
  Calendar,
  ShieldCheck,
  Zap,
  X,
  BellRing,
  Info,
  Play,
  Clock,
  CheckCircle,
  RefreshCw,
  Code,
  Layout,
  ExternalLink
} from 'lucide-react';

interface LineIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  stats: WorkoutStats;
}

export default function LineIntegrationModal({
  isOpen,
  onClose,
  leaderboard,
  stats,
}: LineIntegrationModalProps) {
  const [channelAccessToken, setChannelAccessToken] = useState<string>(
    localStorage.getItem('gpo_line_channel_access_token') || localStorage.getItem('gpo_line_notify_token') || ''
  );
  const [targetId, setTargetId] = useState<string>(
    localStorage.getItem('gpo_line_target_id') || ''
  );

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'auto' | 'config'>('send');
  const [previewMode, setPreviewMode] = useState<'visual' | 'json'>('visual');

  // Server Cron Settings State
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string>('ยังไม่มีการส่งข้อความ');
  const [isTestingAuto, setIsTestingAuto] = useState(false);

  const [hasServerToken, setHasServerToken] = useState(false);

  // Fetch settings on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/line/settings')
        .then((res) => {
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data) {
            setAutoEnabled(data.enabled ?? true);
            if (data.hasToken) {
              setHasServerToken(true);
            }
            if (data.targetId) {
              setTargetId((prev) => prev || data.targetId);
            }
            if (data.lastSentAt) setLastSentAt(data.lastSentAt);
            if (data.lastStatus) setLastStatus(data.lastStatus);
          }
        })
        .catch((err) => console.error('Failed to load LINE settings:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const top5 = leaderboard.slice(0, 5);
  const todayTh = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Construct standard LINE Flex Message object
  const flexMessageObject = {
    type: "flex",
    altText: `🏆 [GPO South Healthy Life] สรุปตาราง Leaderboard ประจำสัปดาห์ (${todayTh})`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#006241",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "GPO SOUTH HEALTHY LIFE 🏃‍♂️",
            color: "#cba258",
            weight: "bold",
            size: "xs",
          },
          {
            type: "text",
            text: "🏆 สรุปอันดับประจำสัปดาห์",
            color: "#FFFFFF",
            weight: "bold",
            size: "lg",
            margin: "xs",
          },
          {
            type: "text",
            text: `ประจำวันที่ ${todayTh}`,
            color: "#d4e9e2",
            size: "xs",
            margin: "xs",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "🥇 Top 5 ผู้นำก้าวเดินสูงสุดประจำสัปดาห์",
            weight: "bold",
            color: "#006241",
            size: "xs",
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            contents: top5.length === 0 ? [
              {
                type: "text",
                text: "ยังไม่มีรายการบันทึกผลประจำสัปดาห์นี้",
                size: "xs",
                color: "#94A3B8",
                align: "center",
                margin: "md",
              }
            ] : top5.map((item, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
              const medalBg = idx === 0 ? "#FEF3C7" : idx === 1 ? "#F1F5F9" : idx === 2 ? "#FFEDD5" : "#F8FAFC";
              const rankColor = idx === 0 ? "#D97706" : idx === 1 ? "#475569" : idx === 2 ? "#C2410C" : "#64748B";

              return {
                type: "box",
                layout: "horizontal",
                backgroundColor: medalBg,
                cornerRadius: "md",
                paddingAll: "8px",
                margin: "xs",
                alignItems: "center",
                contents: [
                  { type: "text", text: medal, size: "xs", weight: "bold", color: rankColor, flex: 0 },
                  { type: "text", text: item.userName, size: "xs", weight: "bold", color: "#1E293B", flex: 1, margin: "sm" },
                  { type: "text", text: `${item.totalSteps.toLocaleString()} ก้าว`, size: "xs", weight: "bold", color: "#006241", align: "end", flex: 0 },
                ],
              };
            }),
          },
          { type: "separator", margin: "md", color: "#E2E8F0" },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📊 ก้าวเดินสะสมรวมองค์กร:", size: "xs", color: "#64748B" },
                  { type: "text", text: `${stats.totalSteps.toLocaleString()} ก้าว`, size: "xs", color: "#006241", weight: "bold", align: "end" },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📝 บันทึกสุขภาพรวม:", size: "xs", color: "#64748B" },
                  { type: "text", text: `${stats.totalWorkouts.toLocaleString()} รายการ`, size: "xs", color: "#006241", weight: "bold", align: "end" },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F8FAFC",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "📲 เปิดดูตารางอันดับเต็ม & บันทึกผล",
              uri: window.location.origin,
            },
            style: "primary",
            color: "#006241",
            height: "sm",
          },
        ],
      },
    },
  };

  const flexJsonText = JSON.stringify(flexMessageObject, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(flexJsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = async () => {
    localStorage.setItem('gpo_line_channel_access_token', channelAccessToken.trim());
    localStorage.setItem('gpo_line_target_id', targetId.trim());

    try {
      await fetch('/api/line/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken: channelAccessToken.trim(),
          targetId: targetId.trim(),
          enabled: autoEnabled
        }),
      });
      setSendSuccess('บันทึกการตั้งค่า LINE Messaging API เรียบร้อยแล้ว');
      setTimeout(() => setSendSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    try {
      await fetch('/api/line/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          channelAccessToken: channelAccessToken.trim(),
          targetId: targetId.trim(),
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerAutoTest = async () => {
    setIsTestingAuto(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      let res = await fetch('/api/line/trigger-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        // Fallback to lightweight endpoint
        res = await fetch('/api/line-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelAccessToken: channelAccessToken.trim(),
            targetId: targetId.trim(),
          }),
        });
      }

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status} (${res.statusText}): ${cleanSnippet || 'ข้อผิดพลาดบนเซิร์ฟเวอร์'}`);
      }

      if (res.ok && data.success) {
        setSendSuccess(data.message || 'รันระบบส่ง Flex Message อัตโนมัติเรียบร้อยแล้ว!');
        setLastStatus(`ส่งสำเร็จล่าสุด ${new Date().toLocaleTimeString('th-TH')}`);
        setLastSentAt(new Date().toISOString());
      } else {
        setSendError(data.error || 'เกิดข้อผิดพลาดในการรันระบบ');
      }
    } catch (err: any) {
      console.error(err);
      setSendError(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsTestingAuto(false);
    }
  };

  const handleSendFlexMessage = async () => {
    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    const tokenVal = channelAccessToken.trim();
    const targetVal = targetId.trim();

    try {
      // Primary: Call dedicated lightweight Vercel Function /api/line-send
      let response = await fetch('/api/line-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken: tokenVal,
          targetId: targetVal,
        }),
      });

      // Secondary: Fallback to /api/line/notify if 404 or fails
      if (response.status === 404) {
        response = await fetch('/api/line/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelAccessToken: tokenVal,
            targetId: targetVal,
          }),
        });
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response from server:', text);
        const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
        throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${response.status} (${response.statusText}): ${cleanSnippet || 'ข้อผิดพลาดบนเซิร์ฟเวอร์'}`);
      }

      if (response.ok && data.success) {
        setSendSuccess(data.message || 'ส่ง Flex Message เข้า LINE สำเร็จเรียบร้อยแล้ว!');
        if (data.isSimulated) {
          setSendError('หมายเหตุ: นี่เป็นการส่งในโหมดจำลอง (ให้ใส่ Channel Access Token ในส่วนตั้งค่าเพื่อส่งเข้า LINE จริง)');
        }
      } else {
        setSendError(data.error || 'ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบ Channel Access Token ในส่วนตั้งค่า');
      }
    } catch (err: any) {
      console.error('Error sending LINE Flex Message:', err);
      setSendError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none cursor-pointer overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[88vh] sm:max-h-[90vh] cursor-default my-auto relative animate-fade-in select-text"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <MessageSquare className="w-6 h-6 text-emerald-100 fill-emerald-100/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-900/80 text-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/30">
                  LINE Messaging API (Flex Message)
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display mt-0.5">
                ส่ง Flex Message การ์ดสรุปอันดับเข้ากลุ่ม LINE
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'send'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>ส่ง Flex Message ทันที</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'auto'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ส่งอัตโนมัติเช้าวันจันทร์</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>ตั้งค่า Messaging API Bot</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 grow">
          
          {/* TAB 1: FLEX MESSAGE PREVIEW & SEND */}
          {activeTab === 'send' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
                <BellRing className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  ระบบเปลี่ยนรูปแบบจากการส่งข้อความธรรมดาเป็น <strong>Flex Message (การ์ดสวยงาม)</strong> ผ่าน LINE Messaging API เพื่อเพิ่มความน่าสนใจ กระตุ้นให้พนักงานเข้ามาบันทึกสุขภาพ
                </p>
              </div>

              {/* Flex Message Preview Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    ตัวอย่าง Flex Message การ์ดที่จะแสดงใน LINE:
                  </label>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('visual')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                        previewMode === 'visual'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>รูปการ์ด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('json')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                        previewMode === 'json'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>JSON Schema</span>
                    </button>
                  </div>
                </div>

                {/* VISUAL FLEX MESSAGE CARD PREVIEW */}
                {previewMode === 'visual' ? (
                  <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl flex justify-center items-center">
                    {/* Mock Phone LINE Message Bubble */}
                    <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 text-slate-800">
                      {/* Flex Header */}
                      <div className="bg-[#006241] p-4 text-white">
                        <div className="text-[10px] font-extrabold text-[#cba258] tracking-wider uppercase">
                          GPO SOUTH HEALTHY LIFE 🏃‍♂️
                        </div>
                        <div className="text-base font-bold mt-0.5">
                          🏆 สรุปอันดับประจำสัปดาห์
                        </div>
                        <div className="text-xs text-[#d4e9e2] mt-0.5">
                          ประจำวันที่ {todayTh}
                        </div>
                      </div>

                      {/* Flex Body */}
                      <div className="p-4 space-y-3 bg-white">
                        <div className="text-xs font-bold text-[#006241]">
                          🥇 Top 5 ผู้นำก้าวเดินสูงสุดประจำสัปดาห์
                        </div>

                        <div className="space-y-1.5">
                          {top5.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-2">
                              ยังไม่มีรายการบันทึกผลประจำสัปดาห์นี้
                            </div>
                          ) : (
                            top5.map((item, idx) => {
                              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                              const medalBg = idx === 0 ? 'bg-amber-50' : idx === 1 ? 'bg-slate-50' : idx === 2 ? 'bg-orange-50' : 'bg-slate-50/50';

                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2 rounded-xl text-xs ${medalBg}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{medal}</span>
                                    <span className="font-bold text-slate-800">{item.userName}</span>
                                  </div>
                                  <span className="font-bold text-[#006241]">
                                    {item.totalSteps.toLocaleString()} ก้าว
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <hr className="border-slate-200" />

                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>📊 ก้าวเดินสะสมรวมองค์กร:</span>
                            <span className="font-bold text-[#006241]">{stats.totalSteps.toLocaleString()} ก้าว</span>
                          </div>
                          <div className="flex justify-between">
                            <span>📝 บันทึกสุขภาพรวม:</span>
                            <span className="font-bold text-[#006241]">{stats.totalWorkouts.toLocaleString()} รายการ</span>
                          </div>
                        </div>
                      </div>

                      {/* Flex Footer Button */}
                      <div className="p-3 bg-slate-50 border-t border-slate-100">
                        <div className="w-full py-2.5 bg-[#006241] text-white text-xs font-bold text-center rounded-xl shadow-xs cursor-pointer hover:bg-[#004e34] transition-colors">
                          📲 เปิดดูตารางอันดับเต็ม & บันทึกผล
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* RAW JSON FLEX CODE PREVIEW */
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="absolute top-3 right-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-900/80 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors border border-emerald-700 z-10"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'คัดลอก JSON แล้ว!' : 'คัดลอก JSON'}</span>
                    </button>
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto border border-slate-800">
                      {flexJsonText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Status Alert Messages */}
              {sendSuccess && (
                <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl border border-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              {sendError && (
                <div className="bg-amber-100 text-amber-900 p-3 rounded-xl border border-amber-300 text-xs font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Send Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleSendFlexMessage}
                  disabled={isSending}
                  className="grow bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'กำลังส่ง Flex Message...' : 'ส่ง Flex Message เข้า LINE ทันที'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SERVER BUILT-IN AUTO SCHEDULER */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">ระบบส่ง Flex Message อัตโนมัติทุกเช้าวันจันทร์</h4>
                      <p className="text-[11px] text-emerald-200/80">ทำงานระดับ Server (Background Cron Job)</p>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEnabled}
                      onChange={(e) => handleToggleAuto(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 space-y-1">
                    <span className="text-slate-300 text-[11px] block">เวลาส่งอัตโนมัติ:</span>
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      ทุกเช้าวันจันทร์ เวลา 08:00 น.
                    </span>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 space-y-1">
                    <span className="text-slate-300 text-[11px] block">สถานะระบบ Cron:</span>
                    <span className={`font-bold flex items-center gap-1.5 ${autoEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {autoEnabled ? 'เปิดทำงาน (Active)' : 'ปิดใช้งานชั่วคราว'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-xl p-3 text-xs font-mono text-emerald-200 border border-emerald-900/50 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-bold">บันทึกสถานะล่าสุด:</div>
                  <div className="truncate">{lastStatus}</div>
                  {lastSentAt && (
                    <div className="text-[10px] text-slate-400">
                      เวลาล่าสุด: {new Date(lastSentAt).toLocaleString('th-TH')}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Alerts */}
              {sendSuccess && (
                <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl border border-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{sendSuccess}</span>
                </div>
              )}

              {sendError && (
                <div className="bg-amber-100 text-amber-900 p-3 rounded-xl border border-amber-300 text-xs font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Test Auto Trigger Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">ทดสอบรันส่ง Flex Message ทันที (Manual Test Run)</h5>
                    <p className="text-[11px] text-slate-500">จำลองการสร้างและส่ง Flex Message ตารางอันดับเหมือนเช้าวันจันทร์จริง</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerAutoTest}
                    disabled={isTestingAuto}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {isTestingAuto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isTestingAuto ? 'กำลังรัน...' : 'ทดสอบส่งทันที'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIG MESSAGING API */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Settings className="w-4 h-4 text-emerald-600" />
                  <span>ตั้งค่า LINE Messaging API (Channel Access Token)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ระบุ <strong>Channel Access Token (long-lived)</strong> จาก LINE Developers Console เพื่อให้เซิร์ฟเวอร์ยิง Flex Message ตรงเข้า LINE กลุ่มหรือส่งแบบ Broadcast ได้
                </p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>LINE Channel Access Token (จำเป็นสำหรับ Flex Message):</span>
                      {hasServerToken && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ บันทึก Token ไว้ในเซิร์ฟเวอร์แล้ว
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      value={channelAccessToken}
                      onChange={(e) => setChannelAccessToken(e.target.value)}
                      placeholder={hasServerToken ? "•••••••••••• (มี Token ในระบบแล้ว - ป้อนใหม่เฉพาะเมื่อต้องการเปลี่ยน)" : "วาง Channel Access Token จาก LINE Developers..."}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      LINE Target ID / Group ID (ตัวเลือกเสริม):
                    </label>
                    <input
                      type="text"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      placeholder="เช่น C123456789... (เว้นว่างไว้หากต้องการส่งแบบ Broadcast ให้ผู้ติดตามทั้งหมด)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500">
                      *หากเว้นว่างไว้ ระบบจะส่งแบบ <strong>Broadcast</strong> ไปยังเพื่อนทุกคนหรือทุกกลุ่มที่ดึง LINE Bot เข้าไป
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-2xs"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </div>

              {/* Step by step guide */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>วิธีรับ LINE Channel Access Token สั้นๆ:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-emerald-900/90 pl-1">
                  <li>
                    เข้าสู่ระบบ <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800 inline-flex items-center gap-0.5">developers.line.biz <ExternalLink className="w-3 h-3" /></a>
                  </li>
                  <li>สร้าง Provider และสร้าง <strong>Messaging API Channel</strong></li>
                  <li>ไปที่แถบ <strong>Messaging API</strong> -&gt; เลื่อนลงไปที่ <strong>Channel access token (long-lived)</strong> แล้วกด Issue</li>
                  <li>คัดลอก Token มาวางในช่องด้านบน</li>
                  <li>ดึง LINE Official Account / Bot ดังกล่าวเข้ากลุ่ม LINE พนักงาน GPO South</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}