export type PhotoCourseStop = {
  id: string;
  order: number;
  region: string;
  photoCount: number;
  timeLabel: string;
  minutes: number;
  hasPoint: boolean;
  suggestedName: string;
};

export type PhotoCourseDay = {
  date: string;
  region: string;
  regions: string[];
  stops: PhotoCourseStop[];
};

export type PhotoCourse = {
  days: PhotoCourseDay[];
  regions: string[];
  skipped: { withoutDate: number; withoutPoint: number };
  photoCount: number;
};

export type PhotoCourseApplied = {
  region: string;
  travelStart: string;
  travelEnd: string;
  dayCount: number;
  stopCount: number;
};
