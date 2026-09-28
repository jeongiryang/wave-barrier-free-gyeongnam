export type DemoStop = {
  id: string;
  label: string;
  day: number;
  visitMinutes: number;
  breakMinutes: number;
  fixedTime?: string;
};

export type DemoScenario = {
  title: string;
  description: string;
  image: string;
  days: string[];
  startTime: string;
  stops: DemoStop[];
};

// These are visitor-entered planning fields only. No place, facility, weather,
// festival, route, or public-data response is represented here.
export const demoScenarios: DemoScenario[] = [
  {
    title: '천천히 보내는 하루',
    description: '방문 세 곳 사이에 쉬는 시간을 넣고 체류 시간을 바꿔 보세요.',
    image: '/media/demo/coast-illustration.webp',
    days: ['1일차'], startTime: '10:00',
    stops: [
      { id: 'a', label: '방문지 A', day: 0, visitMinutes: 60, breakMinutes: 20 },
      { id: 'b', label: '방문지 B', day: 0, visitMinutes: 45, breakMinutes: 30 },
      { id: 'c', label: '방문지 C', day: 0, visitMinutes: 90, breakMinutes: 0 },
    ],
  },
  {
    title: '이틀로 나눈 여행',
    description: '방문 순서를 바꾸거나 한 장소를 다음 날로 옮겨 보세요.',
    image: '/media/demo/garden-illustration.webp',
    days: ['1일차', '2일차'], startTime: '09:30',
    stops: [
      { id: 'a', label: '방문지 A', day: 0, visitMinutes: 90, breakMinutes: 20 },
      { id: 'b', label: '방문지 B', day: 0, visitMinutes: 60, breakMinutes: 0 },
      { id: 'c', label: '방문지 C', day: 1, visitMinutes: 75, breakMinutes: 15 },
      { id: 'd', label: '방문지 D', day: 1, visitMinutes: 45, breakMinutes: 0 },
    ],
  },
  {
    title: '약속 시각이 있는 날',
    description: '고정 방문 시각과 앞선 체류·휴식의 관계를 확인해 보세요.',
    image: '/media/demo/rain-illustration.webp',
    days: ['1일차'], startTime: '10:00',
    stops: [
      { id: 'a', label: '방문지 A', day: 0, visitMinutes: 90, breakMinutes: 30 },
      { id: 'b', label: '예약한 방문지 B', day: 0, visitMinutes: 60, breakMinutes: 15, fixedTime: '12:00' },
      { id: 'c', label: '방문지 C', day: 0, visitMinutes: 45, breakMinutes: 0 },
    ],
  },
  {
    title: '늦게 시작하는 일정',
    description: '방문과 휴식만 더해도 자정을 넘는 경우를 살펴보세요.',
    image: '/media/demo/coast-illustration.webp',
    days: ['1일차'], startTime: '20:30',
    stops: [
      { id: 'a', label: '방문지 A', day: 0, visitMinutes: 120, breakMinutes: 30 },
      { id: 'b', label: '방문지 B', day: 0, visitMinutes: 150, breakMinutes: 30 },
      { id: 'c', label: '방문지 C', day: 0, visitMinutes: 60, breakMinutes: 0 },
    ],
  },
  {
    title: '중간에 쉬는 날짜',
    description: '비어 있는 날을 유지하고 방문을 옮기면 일정이 어떻게 달라지는지 확인하세요.',
    image: '/media/demo/garden-illustration.webp',
    days: ['1일차', '2일차', '3일차'], startTime: '10:00',
    stops: [
      { id: 'a', label: '방문지 A', day: 0, visitMinutes: 75, breakMinutes: 20 },
      { id: 'b', label: '방문지 B', day: 0, visitMinutes: 60, breakMinutes: 0 },
      { id: 'c', label: '방문지 C', day: 2, visitMinutes: 90, breakMinutes: 20 },
      { id: 'd', label: '방문지 D', day: 2, visitMinutes: 45, breakMinutes: 0 },
    ],
  },
];

export function formatDemoTime(minutes: number) {
  const day = Math.floor(minutes / 1440);
  const clock = minutes % 1440;
  return `${day ? `+${day}일 ` : ''}${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
}

function parseDemoTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function buildDemoSchedule(stops: DemoStop[], days: string[], startTime: string) {
  return days.map((label, day) => {
    let cursor = parseDemoTime(startTime);
    const entries = stops.filter((stop) => stop.day === day).map((stop) => {
      const earliestStart = cursor;
      const fixed = stop.fixedTime ? parseDemoTime(stop.fixedTime) : null;
      const start = fixed === null ? cursor : Math.max(cursor, fixed);
      const end = start + stop.visitMinutes + stop.breakMinutes;
      cursor = end;
      return { ...stop, earliestStart, start, end, fixedConflict: fixed !== null && earliestStart > fixed };
    });
    return { label, entries };
  });
}
