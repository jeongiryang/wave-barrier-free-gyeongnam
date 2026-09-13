export const NARU_HELP: Array<{id:string;title:string;example:string;result:string}>;
export function naruLocalHelp(text: string): 'help' | 'inquiry' | 'preview' | 'compare' | 'transcript' | null;
