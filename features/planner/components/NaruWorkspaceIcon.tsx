const paths = {
  chat: 'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z',
  tools: 'M8 7V4h8v3M4 7h16v14H4zM9 7v14M15 7v14',
  saved: 'M6 3h12v19l-6-4-6 4Z',
  history: 'M3 10a9 9 0 1 1 1 7M3 3v7h7M12 7v6l4 2',
  expand: 'M14 3h7v7M21 3l-7 7M10 21H3v-7M3 21l7-7',
  compact: 'M21 8h-5V3M16 8l6-6M3 16h5v5M8 16l-6 6',
  attach: 'M8 12l7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3M6 15l9-9a2 2 0 0 1 3 3L9 18',
};
export default function NaruWorkspaceIcon({ name }: { name: keyof typeof paths }) {
  return <svg className="naru-workspace-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
