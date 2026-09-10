export type AccountTripPayload = {
  version: number; title: string; region: string; travelStart: string; travelEnd: string;
  dayStartTime: string; themes: string[]; placeIds: string[]; scheduleAssignments: Record<string, string>;
  status: "planned" | "visited"; note: string;
};
export type AccountTrip = { id: string; payload: AccountTripPayload; revision: number; updatedAt: number; role: "owner" | "member" };
export type TripDetail = AccountTrip & {
  members: Array<{ userId: string; name: string }>;
  votes: Array<{ userId: string; placeId: string }>;
  comments: Array<{ id: string; userId: string; name: string; content: string; createdAt: number }>;
  invitationActive: boolean;
};
