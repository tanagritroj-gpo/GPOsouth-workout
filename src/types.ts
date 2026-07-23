export interface User {
  id: string;
  name: string;
  department: string;
  pin: string;
  photoUrl?: string; // Base64 profile photo or preset avatar
  createdAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  submissionFormat: 'daily' | 'weekly' | 'monthly'; // 'daily' | 'weekly' | 'monthly'
  period: string; // e.g. "20 ก.ค. 2569"
  activityType: string; // วิ่ง, เดินเร็ว, ว่ายน้ำ, เต้นแอโรบิค, เดิน Trail, อื่นๆ
  steps: number;
  calories: number;
  durationMinutes?: number;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
}

export interface WorkoutStats {
  totalSteps: number;
  totalCalories: number;
  totalDurationMinutes: number;
  totalWorkouts: number;
  byActivity: { [key: string]: { steps: number; calories: number; durationMinutes?: number; count: number } };
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  totalSteps: number;
  totalCalories: number;
  totalDurationMinutes: number;
  totalWorkouts: number;
  rank?: number;
}
