import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";
import path from "node:path";
import ts from "typescript";
const root=new URL("../",import.meta.url);
const registry=JSON.parse(readFileSync(new URL(".wave/provider-budget.json",root),"utf8"));
const source=file=>readFileSync(new URL(file,root),"utf8");
function serverFiles(directory="server") {
  return readdirSync(new URL(directory+"/",root),{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?serverFiles(`${directory}/${entry.name}`):/\.[jt]s$/.test(entry.name)?[`${directory}/${entry.name}`]:[]);
}
test("every server provider transport uses the registered request boundary",()=>{
  const registered=new Set(registry.providers.map(p=>p.request_file));
  const observed=new Set();
  for(const file of serverFiles()) {
    const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true);
    function visit(node) {
      if(ts.isCallExpression(node)) {
        const name=node.expression.getText(ast);
        assert.notEqual(name,"fetch",`Unregistered direct server fetch: ${file}`);
        if(name==="requestProvider" && node.arguments.length) {observed.add(file);assert.ok(registered.has(file),file);}
        if(name==="fetcher")assert.equal(file,"server/shared/provider-request.js");
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
  }
  assert.deepEqual([...observed].sort(),[...registered].sort());
  assert.equal(observed.size,9);
});
test("all literal KTO operations plus dynamic language/facility services are inventoried",()=>{
  const operations=new Set(registry.providers.find(p=>p.id==="kto").operations);
  for(const file of serverFiles("server/tourism")) {
    const ast=ts.createSourceFile(file,source(file),ts.ScriptTarget.Latest,true);
    function visit(node) {
      if(ts.isCallExpression(node)&&["fetchKto","fetchTourismData","fetchRegionalList"].includes(node.expression.getText(ast))) {
        const service=node.arguments[1],operation=node.arguments[2];
        if(ts.isStringLiteral(service)&&ts.isStringLiteral(operation))assert.ok(operations.has(`${service.text}/${operation.text}`),`${file}: ${service.text}/${operation.text}`);
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
  }
  for(const service of ["KorService2","EngService2","KorWithService2"])assert.ok(operations.has(`${service}/areaBasedList2`));
  const actualSdk=new Set(["kakao-sdk.ts","kakao-map-renderer.ts","useNearbyPlaces.ts","useRoadviewController.ts","leaflet-map-renderer.ts"]);
  assert.deepEqual(new Set(registry.browser_dependencies.flatMap(p=>p.files.map(f=>path.basename(f)))),actualSdk);
  assert.ok(!serverFiles().some(file=>source(file).includes("/loadLane")),"New loadLane caller needs quota/inventory review");
});
test("registry makes account-specific limits and incomplete activation explicit",()=>{
  assert.equal(registry.defaults.numeric_limit,"ACCOUNT_SPECIFIC");
  assert.equal(registry.defaults.reset,"UNVERIFIED");
  assert.equal(registry.defaults.automatic_retries_per_request,0);
  assert.match(registry.activation_status,/blocked/);
  assert.match(registry.verified_at,/^\d{4}-\d{2}-\d{2}$/);
  for(const provider of [...registry.providers,...registry.browser_dependencies]) {
    assert.equal(new URL(provider.source).protocol,"https:");
    assert.ok(Array.isArray(provider.operations)&&provider.operations.length);
    assert.ok(Array.isArray(provider.key_sources));
  }
});
