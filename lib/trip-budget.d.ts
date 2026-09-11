import type {Place} from '../features/planner/types';
export type TripCostRow={id:string;day:string;category:string;amount:number|null;basis:'person'|'group';label:string};
export type TripBudget={people:number;target:number|null;targetBasis:'person'|'group';admissions:Record<string,{amount:number;basis:'person'|'group'}>;extras:TripCostRow[]};
export type RouteCost={configured:boolean;payment:number|null;paymentType?:'fare'|'toll'};
export const TRIP_BUDGET_KEY:string;
export const COST_CATEGORIES:string[];
export function budgetIdentity(places:Array<{id:string}>,days:string[]):string;
export function knownWon(value:unknown):number|null;
export function cleanBudget(value:unknown,ids:string[],days:string[]):TripBudget;
export function readBudget(storage:Pick<Storage,'getItem'>,identity:string,ids:string[],days:string[],strict?:boolean):TripBudget;
export function readSavedBudget(storage:Pick<Storage,'getItem'>,identity:string,ids:string[],days:string[]):TripBudget|null;
export function writeBudget(storage:Pick<Storage,'getItem'|'setItem'>,identity:string,value:unknown,ids:string[],days:string[]):TripBudget;
export function summarizeBudget(options:{places:Place[];days:string[];assignments?:Record<string,string>;budget:unknown;routes?:Record<string,RouteCost>}):{
 rows:Array<TripCostRow&{placeId:string;source:string;total:number|null}>;total:number;unknown:number;target:number|null;perPerson:number;remaining:number|null;people:number;outOfPeriod:number;days:Array<{day:string;total:number;unknown:number}>
};
export function budgetSummaryLines(summary:ReturnType<typeof summarizeBudget>):string[];
