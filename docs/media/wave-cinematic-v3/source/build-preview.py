"""Bundle the two original browser modules without third-party build tools."""
from pathlib import Path
p=Path(__file__).resolve().parents[1]
a=(p/'source/journey-scene.mjs').read_text().replace('export const','const').replace('export function','function')
b=(p/'preview/cinematic.mjs').read_text().split('\n',1)[1]
(p/'preview/cinematic.js').write_text('// Generated from source/journey-scene.mjs + preview/cinematic.mjs; no bundler dependency.\n(()=>{\n'+a+'\n'+b+'\n})();\n')
