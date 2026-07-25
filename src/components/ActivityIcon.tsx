import React from 'react';
import {
  Footprints,
  Bike,
  Waves,
  HeartPulse,
  Dumbbell,
  Music,
  Activity,
  CircleDot
} from 'lucide-react';

interface ActivityIconProps {
  activityType: string;
  className?: string;
}

export default function ActivityIcon({ activityType, className = "w-4 h-4" }: ActivityIconProps) {
  const name = (activityType || '').toLowerCase();

  if (name.includes('วิ่ง') || name.includes('เดิน') || name.includes('trail') || name.includes('run') || name.includes('walk')) {
    return <Footprints className={className} />;
  }
  if (name.includes('จักรยาน') || name.includes('ปั่น') || name.includes('cycle') || name.includes('bike')) {
    return <Bike className={className} />;
  }
  if (name.includes('ว่ายน้ำ') || name.includes('swim')) {
    return <Waves className={className} />;
  }
  if (name.includes('โยคะ') || name.includes('ยืดเหยียด') || name.includes('yoga')) {
    return <HeartPulse className={className} />;
  }
  if (name.includes('เวท') || name.includes('ฟิตเนส') || name.includes('หลายรูปแบบ') || name.includes('gym') || name.includes('fitness')) {
    return <Dumbbell className={className} />;
  }
  if (name.includes('เต้น') || name.includes('แอโรบิค') || name.includes('dance')) {
    return <Music className={className} />;
  }
  if (name.includes('แบดมินตัน') || name.includes('เทนนิส') || name.includes('ฟุตบอล') || name.includes('บอล')) {
    return <CircleDot className={className} />;
  }

  return <Activity className={className} />;
}
