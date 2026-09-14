export type AccountTripPayload = {
  version: number; title: string; region: string; travelStart: string; travelEnd: string;
  dayStartTime: string; themes: string[]; placeIds: string[]; scheduleAssignments: Record<string, string>;
  profiles?: string[];
  guidancePreferences?: import('../../lib/guidance-preferences.js').GuidancePreferences;
  comfort?: import('../../lib/trip-comfort.js').TripComfort;
  travelMode?: import("../../lib/trip-travel-mode.js").TripTravelMode;
  status: "planned" | "visited"; note: string;
  breakMinutesByPlaceId?: Record<string, number>; restPurposeByPlaceId?: Record<string, import("../../lib/trip-comfort.js").StopPurpose>;
  visitMinutesByPlaceId?: Record<string, number>;
  fixedVisits?: Record<string, import("../../lib/trip-time-constraints.js").FixedVisit>;
  dayDeadlines?: Record<string, import("../../lib/trip-time-constraints.js").DayDeadline>;
};
export type AccountTrip = { id: string; payload: AccountTripPayload; revision: number; updatedAt: number; role: "owner" | "member" };
export type TripDetail = AccountTrip & {
  members: Array<{ userId: string; name: string }>;
  votes: Array<{ userId: string; placeId: string }>;
  comments: Array<{ id: string; userId: string; name: string; content: string; createdAt: number }>;
  invitationActive: boolean;
};
