// Scoped layout tokens for the compact course/outing tools.
export const courseCard={padding:'clamp(16px,3vw,28px)',border:'1px solid var(--line)',borderRadius:24,background:'var(--white)',minWidth:0,display:'grid',gap:16} as const;
export const courseGrid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:16} as const;
export const courseActions={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:12} as const;
export const courseLabel={display:'grid',gap:8,fontSize:14,lineHeight:1.6,minWidth:0} as const;
export const courseInput={minHeight:48,width:'100%',minWidth:0,padding:'10px 12px',fontSize:16,border:'1px solid var(--line)',borderRadius:12,background:'var(--paper)',color:'var(--ink)'} as const;
export const courseCopy={margin:0,fontSize:14,lineHeight:1.7,color:'var(--muted)'} as const;
export const coursePrimary={background:'var(--accent)',color:'var(--white)',borderColor:'var(--accent)'} as const;
