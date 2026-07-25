import React from 'react';

interface AvatarProps {
  photoUrl?: string;
  name: string;
  className?: string; // e.g., "w-12 h-12"
  textClassName?: string; // e.g., "text-sm font-bold"
}

export default function Avatar({ photoUrl, name, className = "w-12 h-12", textClassName = "text-sm font-bold" }: AvatarProps) {
  const getInitials = (n: string) => {
    return n.trim().charAt(0).toUpperCase();
  };

  // 1. If photoUrl is an emoji preset (starts with "emoji:")
  if (photoUrl && photoUrl.startsWith('emoji:')) {
    const parts = photoUrl.split(':');
    const emoji = parts[1] || '🏃‍♂️';
    const gradient = parts[2] || 'from-amber-400 to-orange-500';

    return (
      <div className={`${className} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm select-none shrink-0`}>
        <span className="text-xl">{emoji}</span>
      </div>
    );
  }

  // 2. If photoUrl is a custom base64 or standard URL
  if (photoUrl && (photoUrl.startsWith('data:image/') || photoUrl.startsWith('http'))) {
    return (
      <div className={`${className} rounded-full overflow-hidden border border-sb-ceramic/40 shadow-sm shrink-0 bg-white flex items-center justify-center`}>
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 3. Default Fallback to Initials
  return (
    <div className={`${className} bg-[#eceae4] text-sb-house rounded-full border border-sb-ceramic flex items-center justify-center shrink-0 shadow-inner ${textClassName}`}>
      {getInitials(name)}
    </div>
  );
}
