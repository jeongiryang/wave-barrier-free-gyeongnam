import type {Place} from '../features/planner/types';
type DirectRouteDistance = {totalKm:number;longestLegKm:number;originIncluded:boolean};
export type GentleTripPlan = {order:string[];assignments:Record<string,string>;changes:Array<{id:string;name:string;fromDate:string;date:string;minutes:number;breakBefore:number;breakAfter:number}>;distance:{before:DirectRouteDistance|null;after:DirectRouteDistance|null};warnings:string[];basis:string};
export function gentleTripPlan(input:{places:Place[];days:string[];assignments:Record<string,string>;fixed?:Record<string,unknown>;breaks?:Record<string,number>;visits?:Record<string,number>;origin?:unknown;targetDay?:string;startTime?:string}):GentleTripPlan;
