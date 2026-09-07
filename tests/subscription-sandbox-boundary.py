"""Actual OS boundary regression. Uses PUBLIC sentinels only, never real credentials."""
import importlib.util
import json
import pathlib
import socket
import sys
import tarfile
import tempfile

sys.dont_write_bytecode = True

root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("boundary", root / "scripts/subscription-sandbox.py")
boundary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boundary)
config = json.loads(pathlib.Path(sys.argv[1]).read_text())
parent = {"resolved": "https://registry.npmjs.org/public/-/public-1.tgz", "integrity": "sha512-PUBLIC", "bundleDependencies": ["child"]}
valid_lock = {"lockfileVersion": 3, "packages": {"node_modules/public": parent, "node_modules/public/node_modules/child": {"inBundle": True}}}
boundary.validate_lock(valid_lock)
for invalid in [
    {"lockfileVersion": 3, "packages": {"node_modules/child": {"inBundle": True}}},
    {"lockfileVersion": 3, "packages": {"node_modules/public": parent, "node_modules/public/node_modules/unlisted": {"inBundle": True}}},
    {"lockfileVersion": 3, "packages": {"node_modules/public": {**parent, "resolved": "https://invalid.example/public.tgz"}, "node_modules/public/node_modules/child": {"inBundle": True}}},
]:
    try:
        boundary.validate_lock(invalid)
    except RuntimeError:
        pass
    else:
        raise AssertionError("Unverified bundled dependency was accepted")
print("PASS: bundled packages require a verified registry parent and explicit membership")
boundary.probe(config)
print("PASS: real file/home/environment/local/external network boundary")

# The exact same detector must FAIL when intentionally run without namespaces.
# It still accesses only its own public canaries and opens sockets without payload.
original = boundary.arguments
boundary.arguments = lambda _config, _workspace, network=False: []
original_invoke = boundary.invoke
def exposed(args, timeout=30):
    args[0] = str(pathlib.Path(config["runtime"]) / "bin/node")
    return original_invoke(args, timeout)
boundary.invoke = exposed
try:
    boundary.probe(config)
except RuntimeError as error:
    assert str(error) == "BLOCKED_SANDBOX: probe-rejected"
else:
    raise AssertionError("Unconfined public-canary control was incorrectly accepted")
finally:
    boundary.arguments = original
    boundary.invoke = original_invoke
print("PASS: unconfined negative control is rejected")

boundary.arguments = lambda _config, _workspace, network=False: ["/bin/true"]
try:
    boundary.probe(config)
except RuntimeError:
    pass
else:
    raise AssertionError("Exit zero without the challenge receipt was accepted")
finally:
    boundary.arguments = original
print("PASS: exit zero alone cannot satisfy the boundary probe")

work = pathlib.Path(tempfile.mkdtemp(prefix="wave-malicious-fixture-", dir=config["scratch"]))
sentinel = work / "outside-public.txt"
sentinel.write_text("PUBLIC TEST DATA ONLY")
source = work / "source"
source.mkdir()
with socket.socket() as receiver:
    receiver.bind(("127.0.0.1", 0))
    receiver.listen()
    port = receiver.getsockname()[1]
    # This is a deliberately hostile npm script in a synthetic package, not W.A.V.E.
    attack = """const fs=require('node:fs'),net=require('node:net');
(async()=>{let safe=true;try{fs.readFileSync(FILE);safe=false;}catch(e){if(!['ENOENT','EACCES','EPERM'].includes(e.code))safe=false;}
for(const [host,port] of [['127.0.0.1',PORT],['1.1.1.1',443]]){const denied=await new Promise(resolve=>{const s=net.connect({host,port});s.once('connect',()=>{s.destroy();resolve(false)});s.once('error',()=>resolve(true));s.setTimeout(2000,()=>{s.destroy();resolve(false)});});if(!denied)safe=false;}
if(fs.existsSync('/mnt/c')||fs.existsSync('/mnt/d')||process.env.WSL_INTEROP)safe=false;
process.exitCode=safe?0:1;})();""".replace("FILE", json.dumps(str(sentinel))).replace("PORT", str(port))
    (source / "attack.cjs").write_text(attack)
    scripts = {name: "node attack.cjs" for name in ["lint", "typecheck", "test", "build:vercel", "check:performance", "test:e2e"]}
    (source / "package.json").write_text(json.dumps({"name": "public-hostile-fixture", "version": "1.0.0", "scripts": scripts}))
    (source / "package-lock.json").write_text(json.dumps({"name": "public-hostile-fixture", "version": "1.0.0", "lockfileVersion": 3, "packages": {"": {"name": "public-hostile-fixture", "version": "1.0.0"}}}))
    archive = work / "source.tar"
    with tarfile.open(archive, "w") as tar:
        for file in source.iterdir():
            tar.add(file, arcname=file.name)
    checks = boundary.validate(config, str(archive), {})
    assert len(checks) == 6
print("PASS: all six synthetic npm commands remain contained; no application QA claim")
