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
assert boundary.WORKSPACE_BYTES + boundary.TEMP_BYTES + boundary.HOME_BYTES + boundary.SHARED_BYTES == 3584 * 1024 ** 2
assert boundary.WORKSPACE_BYTES + boundary.INSTALL_TEMP_BYTES + boundary.INSTALL_HOME_BYTES + boundary.SHARED_BYTES == 3584 * 1024 ** 2
assert boundary.OWNER_TEMP_BYTES == 512 * 1024 ** 2
for key in ["WORKSPACE_BYTES", "TEMP_BYTES", "HOME_BYTES", "INSTALL_TEMP_BYTES", "INSTALL_HOME_BYTES", "SHARED_BYTES", "OWNER_TEMP_BYTES"]:
    original_capacity = getattr(boundary, key)
    setattr(boundary, key, original_capacity + 4096)
    try:
        boundary.arguments(config, pathlib.Path(config["scratch"]))
    except RuntimeError:
        pass
    else:
        raise AssertionError("Total writable capacity increase was accepted")
    finally:
        setattr(boundary, key, original_capacity)
print("PASS: repartitioned writable budget is unchanged; every aggregate increase fails closed")
for invalid_shard in [0, 5, True, "1", "1/4; echo unsafe", [], {}]:
    try:
        boundary.application_commands(invalid_shard)
    except RuntimeError:
        pass
    else:
        raise AssertionError("Invalid shard accepted as a command argument")
try:
    boundary.quota_arguments({**config, "quotaBwrap": "/usr/bin/true"}, pathlib.Path(config["scratch"]) / "public-owner-hash")
except RuntimeError:
    pass
else:
    raise AssertionError("Unpinned quota owner executable was accepted")
# Chromium uses file-backed shared buffers for full-page captures. The existing
# mobile profile keeps its real device scale even at the desktop-width cases.
# Exercise that OS resource boundary without changing browser/test dimensions.
buffer_workspace = pathlib.Path(tempfile.mkdtemp(prefix="wave-public-buffer-", dir=config["scratch"]))
buffer_check = """import errno,os
fd=os.memfd_create('public-render-buffer')
os.ftruncate(fd,128*1024*1024)
try:
 os.ftruncate(fd,600*1024*1024)
except OSError as error:
 assert error.errno == errno.EFBIG
else:
 raise AssertionError('file capacity is not bounded')
os.close(fd)
print('PUBLIC_BUFFER_CAPACITY_PASS')
"""
buffer_result = boundary.invoke(boundary.arguments(config, buffer_workspace) + ["/usr/bin/python3", "-I", "-c", buffer_check])
assert buffer_result.returncode == 0 and buffer_result.stdout.strip() == "PUBLIC_BUFFER_CAPACITY_PASS", "render buffer was blocked or file capacity was unbounded"
print("PASS: public render buffers fit; oversized file allocation is still blocked")
# Chromium's default --disable-dev-shm-usage writes shared rendering buffers in
# /tmp. Two unchanged browser workers must be able to allocate simultaneously.
# Touch every byte: ftruncate alone accepts a sparse file even on a full tmpfs.
temporary_check = """import os,tempfile
with tempfile.TemporaryFile(dir='/tmp') as first, tempfile.TemporaryFile(dir='/tmp') as second:
 block=b'P'*(1024*1024)
 for _ in range(160):
  first.write(block)
  second.write(block)
 first.flush()
 second.flush()
 assert os.fstat(first.fileno()).st_size == 160*1024*1024
 assert os.fstat(second.fileno()).st_size == 160*1024*1024
print('PUBLIC_CONCURRENT_TEMP_BUFFERS_PASS')
"""
temporary_result = boundary.invoke(boundary.arguments(config, buffer_workspace) + ["/usr/bin/python3", "-I", "-c", temporary_check])
assert temporary_result.returncode == 0 and temporary_result.stdout.strip() == "PUBLIC_CONCURRENT_TEMP_BUFFERS_PASS", "concurrent public rendering buffers exceeded temporary capacity"
print("PASS: two touched temporary rendering buffers fit without changing aggregate capacity")
cache_check = """import os,pathlib
assert os.statvfs('/tmp').f_blocks*os.statvfs('/tmp').f_frsize == 256*1024*1024
assert os.statvfs('/home/runner').f_blocks*os.statvfs('/home/runner').f_frsize == 384*1024*1024
with open('/home/runner/public-install-cache','wb') as cache:
 for _ in range(200): cache.write(b'P'*(1024*1024))
 cache.flush()
 assert os.fstat(cache.fileno()).st_size == 200*1024*1024
print('PUBLIC_INSTALL_CACHE_PASS')
"""
cache_result = boundary.invoke(boundary.arguments(config, buffer_workspace, network=True) + ["/usr/bin/python3", "-I", "-c", cache_check], dependency_install=True)
assert cache_result.returncode == 0 and cache_result.stdout.strip() == "PUBLIC_INSTALL_CACHE_PASS", "public install cache exceeded its separate phase capacity"
cache_absence = boundary.invoke(boundary.arguments(config, buffer_workspace) + ["/usr/bin/python3", "-I", "-c", "import pathlib;assert not pathlib.Path('/home/runner/public-install-cache').exists();print('PUBLIC_CACHE_ABSENT')"])
assert cache_absence.returncode == 0 and cache_absence.stdout.strip() == "PUBLIC_CACHE_ABSENT", "installation cache crossed into repository execution"
print("PASS: bounded installation cache fits and is absent from the later execution namespace")
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
const caps=fs.readFileSync('/proc/self/status','utf8');
for(const cap of ['CapEff','CapPrm','CapBnd'])if(!/^0+$/.test(caps.split(String.fromCharCode(10)).find(line=>line.startsWith(cap+':'))?.split(':')[1].trim()||'missing'))safe=false;
if(!fs.existsSync('/usr/bin/unshare')||require('node:child_process').spawnSync('/usr/bin/unshare',['--user','--map-root-user','/usr/bin/true']).status===0)safe=false;
for(const [path,bytes] of [['/workspace',2816*1024*1024],['/tmp',512*1024*1024],['/home/runner',128*1024*1024],['/dev/shm',128*1024*1024]]){const stat=fs.statfsSync(path);if(stat.type!==0x01021994||stat.blocks*stat.bsize!==bytes)safe=false;}
for(const path of ['/public-root-write','/dev/public-device-write']){try{fs.writeFileSync(path,'PUBLIC TEST DATA');safe=false;}catch(e){if(!['EROFS','EACCES','EPERM'].includes(e.code))safe=false;}}
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
    for shard in range(1, 5):
        checks = boundary.validate(config, str(archive), {}, shard=shard)
        assert checks == boundary.application_checks(shard)
        assert checks[-1] == f"npm run test:e2e -- --shard={shard}/4"
print("PASS: all six synthetic npm commands remain contained; no application QA claim")
print("PASS: all four fixed shards stay contained and identify their exact coverage")

# Exercise the same validate path with a small *stricter* test mount. Each file
# is below RLIMIT_FSIZE; only the aggregate kernel tmpfs quota stops the attack.
original_quota = boundary.quota_arguments
boundary.quota_arguments = lambda conf, folder: original_quota(conf, folder, 32 * 1024 * 1024)
(source / "fill.cjs").write_text("""const fs=require('node:fs');
const block=Buffer.alloc(1024*1024,1);
for(let file=0;file<4;file++){
 const fd=fs.openSync('public-capacity-'+file,'w');
 for(let part=0;part<16;part++)fs.writeSync(fd,block);
 fs.closeSync(fd);
}
process.exitCode=0;
""")
package = json.loads((source / "package.json").read_text())
package["scripts"]["lint"] = "node fill.cjs"
(source / "package.json").write_text(json.dumps(package))
capacity_archive = work / "capacity.tar"
with tarfile.open(capacity_archive, "w") as tar:
    for file in source.iterdir():
        tar.add(file, arcname=file.name)
try:
    boundary.validate(config, str(capacity_archive), {})
except RuntimeError:
    pass
else:
    raise AssertionError("Aggregate workspace exhaustion reached a passing receipt")
finally:
    boundary.quota_arguments = original_quota
capacity_logs = sorted(pathlib.Path(config["scratch"]).glob("wave-validation-*-lint.log"), key=lambda path: path.stat().st_mtime)
assert capacity_logs and "ENOSPC" in capacity_logs[-1].read_text(), "quota test failed for another reason"
assert not list(pathlib.Path(config["scratch"]).glob("wave-validation-*/public-capacity-*")), "quota contents leaked into host scratch volume"
try:
    boundary.assert_workspace_quota(source)
except RuntimeError:
    pass
else:
    raise AssertionError("An ordinary host directory was accepted as a quota mount")
print("PASS: multiple individually allowed files hit aggregate quota; no passing validation receipt or host volume writes")

safe = pathlib.Path(tempfile.mkdtemp(prefix="wave-public-artifact-", dir=config["scratch"]))
(safe / "test-results").mkdir()
(safe / "test-results/public.md").write_text("PUBLIC TEST DATA ONLY")
boundary.export_artifacts(safe)
assert (safe.parent / (safe.name + "-artifacts") / "test-results/public.md").read_text() == "PUBLIC TEST DATA ONLY"
unsafe = pathlib.Path(tempfile.mkdtemp(prefix="wave-public-artifact-", dir=config["scratch"]))
(unsafe / "test-results").mkdir()
(unsafe / "test-results/outside.md").symlink_to(sentinel)
try:
    boundary.export_artifacts(unsafe)
except RuntimeError:
    pass
else:
    raise AssertionError("PR-controlled artifact symlink was accepted")
assert not (unsafe.parent / (unsafe.name + "-artifacts") / "test-results/outside.md").exists()
print("PASS: regular artifacts preserved; outside symlink rejected before upload")
