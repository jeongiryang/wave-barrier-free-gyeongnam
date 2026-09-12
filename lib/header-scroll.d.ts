export type NavigationScroll = { y: number; direction: number; distance: number; hidden: boolean };
export function navigationScroll(state: NavigationScroll, position: number, locked?: boolean): NavigationScroll;
