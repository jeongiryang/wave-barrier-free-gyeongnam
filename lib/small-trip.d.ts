import type {Place} from '../features/planner/types';
export type CoursePurpose='visit'|'food'|'rest';
type Point={lat:number;lng:number};
type Candidate={place:Place;unknownKeys:string[];distanceKm:number};
export function outingCandidates(options:{places:Place[];requiredKeys:string[];includeUnknown?:boolean;origin:Point}):Candidate[];
export function courseCandidates(options:{places:Place[];anchor:Place;savedIds:string[];requiredKeys:string[];includeUnknown:boolean;purpose:CoursePurpose;radiusKm:number}):Array<Candidate&{travelMinutes:number}>;
export type OutingPreview={entries:Array<{place:Place;startsAt:number;endsAt:number;startsAtLabel:string;endsAtLabel:string;travelMinutes:number}>;visitMinutesByPlaceId:Record<string,number>;returnMinutes:number;totalMinutes:number;endLabel:string;deadlineLabel:string;fits:boolean;remainingMinutes:number};
export function previewOuting(options:{places:Place[];date:string;startTime:string;hours:number;stayMinutes:number;origin:Point}):OutingPreview|null;
export function outingFingerprint(value:unknown):string;
