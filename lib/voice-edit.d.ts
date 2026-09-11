import type { Place } from '../features/planner/types';
import type { FixedVisit, DayDeadline } from './trip-time-constraints.js';
import type { StopPurpose, TripComfort } from './trip-comfort.js';
export type VoiceState={saved:string[];order:string[];manualOrder:string[];mode:'auto'|'manual';days:string[];activeDay:string;startTime:string;assignments:Record<string,string>;visits:Record<string,number>;breaks:Record<string,number>;purposes:Record<string,StopPurpose>;fixed:Record<string,FixedVisit>;deadlines:Record<string,DayDeadline>;comfort:TripComfort};
export type VoiceEditReceipt={ok:true;action:'add'|'remove';place:Place;day:string;before:VoiceState;after:VoiceState;beforeKey:string;afterKey:string};
export function voiceStateKey(state:VoiceState):string;
export function planVoiceEdit(state:VoiceState,action:'add'|'remove',place:Place,day:string):VoiceEditReceipt|{ok:false;reason:string};
export function canUndoVoiceEdit(state:VoiceState,receipt:VoiceEditReceipt):boolean;
