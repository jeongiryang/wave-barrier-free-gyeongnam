export type TravelChoice = {id:string;name:string;city:string};
export type TravelCommand = {status:'unrecognized'|'not-found'|'next'|'preview'|'choose';action:'add'|'remove'|'open'|'next'|null;choices:TravelChoice[]};
export function parseTravelCommand(value:unknown,places?:Array<{id:string;name:string;city?:string}>):TravelCommand;
