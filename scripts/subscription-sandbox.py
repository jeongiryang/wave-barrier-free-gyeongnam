"""Trusted coordinator helper. Never imported from, or modified by, a task checkout.

Input is bounded JSON, not shell. Repository commands run only inside bwrap.
Dependencies are installed with scripts disabled in a credential-free mount view;
all repository execution has a separate network namespace. No unsafe fallback.
"""
import json
import os
import pathlib
import socket
import subprocess
import sys
import tarfile
import tempfile
import resource
import time
import uuid
import hashlib
import shutil
from urllib.parse import urlsplit

DEADLINE = time.monotonic() + 20 * 60
WORKSPACE_BYTES = 2 * 1024 * 1024 * 1024
TEMP_BYTES = 512 * 1024 * 1024
MEMORY_BYTES = 6 * 1024 * 1024 * 1024


def assert_process_budget():
    # Read kernel enforcement, never trust an environment variable or receipt.
    # The trusted launcher creates this cgroup before any checkout code runs.
    entry = next((line[3:] for line in pathlib.Path("/proc/self/cgroup").read_text().splitlines()
                  if line.startswith("0::")), None)
    if not entry or not entry.startswith("/") or ".." in pathlib.PurePosixPath(entry).parts:
        fail()
    group = pathlib.Path("/sys/fs/cgroup") / entry.lstrip("/")
    def value(name):
        return (group / name).read_text().strip()
    try:
        memory, swap, pids = (int(value(name)) for name in ["memory.max", "memory.swap.max", "pids.max"])
        quota, period = map(int, value("cpu.max").split())
        if not (0 < memory <= MEMORY_BYTES and swap == 0 and 0 < pids <= 1024
                and 0 < quota <= 2 * period and period > 0 and value("memory.oom.group") == "1"):
            fail()
    except (ValueError, OSError):
        fail()


def fail():
    raise RuntimeError("BLOCKED_SANDBOX")


def fixed_path(value):
    path = pathlib.Path(value)
    if not path.is_absolute() or path.is_symlink() or path.resolve() != path:
        fail()
    return path


def arguments(config, workspace, network=False):
    bwrap = fixed_path(config["bwrap"])
    runtime = fixed_path(config["runtime"])
    if not bwrap.is_file() or bwrap.stat().st_mode & 0o6000 or not (runtime / "bin/node").is_file():
        fail()
    for binary, expected in [(bwrap, config["bwrapSha256"]), (runtime / "bin/node", config["nodeSha256"])]:
        if binary.is_symlink():
            fail()
        with binary.open("rb") as source:
            if hashlib.file_digest(source, "sha256").hexdigest() != expected:
                fail()
    args = [str(bwrap), "--unshare-user", "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--disable-userns", "--assert-userns-disabled", "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--clearenv"]
    if not network:
        args += ["--unshare-net"]
    for name in ["bin", "lib", "lib64"]:
        args += ["--ro-bind", f"/usr/{name}", f"/usr/{name}", "--symlink", f"usr/{name}", f"/{name}"]
    args += ["--proc", "/proc", "--dev", "/dev",
             "--size", str(TEMP_BYTES), "--tmpfs", "/tmp",
             "--size", str(TEMP_BYTES), "--tmpfs", "/home/runner",
             "--size", str(TEMP_BYTES), "--tmpfs", "/dev/shm",
             "--remount-ro", "/dev", "--ro-bind", str(runtime), "/runtime",
             "--bind", str(workspace), "/workspace", "--chdir", "/workspace"]
    if network:
        # Resolver/certificate files only, never all of /etc or a user directory.
        args += ["--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf", "--ro-bind", "/etc/ssl/certs", "/etc/ssl/certs"]
    else:
        browsers = fixed_path(config["browsers"])
        if not browsers.is_dir():
            fail()
        args += ["--ro-bind", str(browsers), "/browsers"]
        # Public system font assets only; never mount the host's home or /etc.
        for name in ["/usr/share/fonts", "/usr/share/fontconfig", "/etc/fonts"]:
            if pathlib.Path(name).is_dir():
                args += ["--ro-bind", name, name]
    for key, value in {"PATH": "/runtime/bin:/usr/bin", "HOME": "/home/runner", "APPDATA": "/home/runner/AppData", "USERPROFILE": "/home/runner", "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "CI": "true", "PLAYWRIGHT_BROWSERS_PATH": "/browsers", "npm_config_userconfig": "/tmp/npm-user.conf", "npm_config_globalconfig": "/tmp/npm-global.conf"}.items():
        args += ["--setenv", key, value]
    # No unbounded writable root or /dev escape beside the bounded mounts.
    return args + ["--remount-ro", "/", "--"]


def invoke(args, timeout=30, *, dependency_install=False, input_data=None):
    assert_process_budget()
    # bwrap's own PID 1/environment must not inherit coordinator credentials either.
    remaining = DEADLINE - time.monotonic()
    if remaining <= 0:
        fail()
    def limits():
        # RLIMIT_FSIZE also caps Chromium's memfd/shared rendering buffers, not
        # just logs. A 2560px full-page capture at the existing mobile DPR can
        # exceed 64MiB before PNG encoding. Keep a bounded 512MiB working-file
        # capacity; diagnostic reads and artifact export retain separate caps.
        # Trusted dependency extraction has its own smaller 256MiB limit.
        file_limit = (256 if dependency_install else 512) * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_FSIZE, (file_limit, file_limit))
        # Linux counts Chromium threads, including axe's extra contexts. Keep
        # the original two Playwright workers; do not throttle the test contract.
        resource.setrlimit(resource.RLIMIT_NPROC, (1024, 1024))
    with tempfile.TemporaryFile() as log:
        try:
            stream = {"stdin": subprocess.DEVNULL} if input_data is None else {"input": input_data.encode("utf-8")}
            result = subprocess.run(args, **stream, stdout=log, stderr=subprocess.STDOUT, timeout=min(timeout, remaining), preexec_fn=limits, env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"})
        except subprocess.TimeoutExpired:
            # subprocess.run has killed/waited for bwrap. Retain the diagnostic
            # stream, and leave CI enough time to upload it before job timeout.
            result = subprocess.CompletedProcess(args, 124)
        log.seek(0)
        result.stdout = log.read(64 * 1024 * 1024).decode("utf-8", errors="replace")
        result.stderr = ""
        return result


def probe(config):
    root = pathlib.Path(tempfile.mkdtemp(prefix="wave-boundary-probe-", dir=fixed_path(config["scratch"])))
    inside = root / "inside"
    inside.mkdir()
    outside = root / "outside"
    outside.mkdir()
    files = []
    for name in ["file", "HOME", "APPDATA", "USERPROFILE"]:
        folder = outside / name
        folder.mkdir()
        sentinel = folder / "public-sentinel.txt"
        sentinel.write_text("PUBLIC TEST DATA ONLY")
        if sentinel.read_text() != "PUBLIC TEST DATA ONLY":
            fail()
        files.append(str(sentinel))
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        port = listener.getsockname()[1]
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            pass
        control, _ = listener.accept()
        control.close()
        # Positive control, no application payload. A timeout is NOT a probe PASS.
        with socket.create_connection(("1.1.1.1", 443), timeout=5):
            pass
        nonce = uuid.uuid4().hex
        code = """const fs=require('node:fs'),net=require('node:net');
const input=JSON.parse(process.argv[1]);
(async()=>{let ok=true;
for(const file of input.files){try{fs.readFileSync(file);ok=false;}catch(e){if(!['ENOENT','EACCES','EPERM'].includes(e.code))ok=false;}}
for(const key of ['HOME','APPDATA','USERPROFILE'])if(fs.existsSync(process.env[key]+'/public-sentinel.txt'))ok=false;
if(fs.existsSync('/mnt/c')||fs.existsSync('/mnt/d')||fs.existsSync('/run/WSL')||process.env.WSL_INTEROP||process.env.WSLENV)ok=false;
for(const [host,port] of input.network){const denied=await new Promise(resolve=>{const s=net.connect({host,port});s.once('connect',()=>{s.destroy();resolve(false)});s.once('error',()=>resolve(true));s.setTimeout(2000,()=>{s.destroy();resolve(false)});});if(!denied)ok=false;}
if(ok)console.log('WAVE_BOUNDARY:'+input.nonce);process.exitCode=ok?0:1;})();"""
        result = invoke(arguments(config, inside) + ["/runtime/bin/node", "-e", code, json.dumps({"files": files, "network": [["127.0.0.1", port], ["1.1.1.1", 443]], "nonce": nonce})])
        if result.returncode or result.stdout.strip() != "WAVE_BOUNDARY:" + nonce:
            text = result.stdout.lower()
            category = next((label for label, fragment in [
                ("namespace-permission", "operation not permitted"),
                ("namespace-permission", "no permissions to create"),
                ("runtime-dependency", "error while loading shared libraries"),
                ("runtime-path", "no such file or directory"),
                ("process-limit", "resource temporarily unavailable"),
            ] if fragment in text), "probe-rejected")
            raise RuntimeError("BLOCKED_SANDBOX: " + category)


def validate_lock(lock):
    if lock.get("lockfileVersion") != 3 or not isinstance(lock.get("packages"), dict):
        fail()
    packages = lock["packages"]
    for name, package in packages.items():
        if not name:
            continue
        if package.get("link"):
            fail()
        # npm records bundled entries without separate URLs/integrity. Their
        # bytes are inside the verified parent tarball, never another download.
        if package.get("inBundle") and not package.get("resolved") and not package.get("integrity"):
            parent, separator, child = name.rpartition("/node_modules/")
            container = packages.get(parent, {})
            if not separator or child not in container.get("bundleDependencies", []) or not container.get("integrity", "").startswith("sha512-"):
                fail()
            continue
        url = urlsplit(package.get("resolved", ""))
        if url.scheme != "https" or url.hostname != "registry.npmjs.org" or url.username or url.password or url.port or not package.get("integrity", "").startswith("sha512-"):
            fail()


def quota_arguments(config, workspace, capacity=WORKSPACE_BYTES):
    # This outer namespace runs ONLY this pinned trusted helper. It owns the
    # dedicated mount for the entire install/check/export lifetime. Repository
    # commands still enter arguments()'s separate filesystem/network boundary.
    bwrap = arguments(config, workspace)[0]  # verifies tool hashes first
    owner = fixed_path(config.get("quotaBwrap", bwrap))
    if not owner.is_file() or owner.stat().st_mode & 0o6000:
        fail()
    with owner.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != config["bwrapSha256"]:
            fail()
    if capacity <= 0 or capacity > WORKSPACE_BYTES:
        fail()
    scratch = fixed_path(config["scratch"])
    if workspace.parent != scratch:
        fail()
    return [str(owner), "--unshare-user", "--unshare-pid", "--unshare-ipc", "--unshare-uts",
            "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--clearenv",
            "--ro-bind", "/", "/", "--bind", str(scratch), str(scratch),
            "--proc", "/proc", "--dev", "/dev", "--remount-ro", "/dev",
            "--size", str(TEMP_BYTES), "--tmpfs", "/tmp",
            "--size", str(capacity), "--tmpfs", str(workspace),
            "--setenv", "PATH", "/usr/bin:/bin", "--setenv", "LANG", "C.UTF-8", "--"]


def assert_workspace_quota(workspace):
    # CLI flags are never sufficient evidence that a real quota was mounted.
    mounts = pathlib.Path("/proc/self/mountinfo").read_text().splitlines()
    bounded_mount = any(line.split(" - ")[1].split()[0] == "tmpfs"
                        and line.split()[4].replace("\\040", " ") == str(workspace) for line in mounts)
    capacity = os.statvfs(workspace)
    if not bounded_mount or capacity.f_blocks * capacity.f_frsize > WORKSPACE_BYTES:
        fail()


def validate(config, archive, edits):
    workspace = pathlib.Path(tempfile.mkdtemp(prefix="wave-validation-", dir=fixed_path(config["scratch"])))
    request = json.dumps({"action": "validate", "config": config, "archive": archive, "edits": edits})
    outcome = invoke(quota_arguments(config, workspace) + ["/usr/bin/python3", "-I", "-B", str(pathlib.Path(__file__).resolve()), "--quota-workspace", str(workspace)], timeout=25 * 60, input_data=request)
    if outcome.returncode:
        fail()
    # The inner helper prints fixed CHECK lines, never arbitrary PR output.
    lines = outcome.stdout.strip().splitlines()
    receipt = json.loads(lines[-1]) if lines else {}
    if receipt.get("result") != "PASS" or receipt.get("workspaceBytes") != WORKSPACE_BYTES:
        fail()
    for line in lines[:-1]:
        if line.startswith("CHECK: "):
            print(line, file=sys.stderr)
    return receipt["checks"]


def validate_in_workspace(config, archive, edits, workspace):
    assert_workspace_quota(workspace)
    with tarfile.open(fixed_path(archive)) as source:
        for member in source.getmembers():
            name = pathlib.PurePosixPath(member.name)
            if name.is_absolute() or ".." in name.parts or not (member.isfile() or member.isdir()):
                fail()
            if any(part == ".git" or part == ".npmrc" or (part.startswith(".env") and part not in [".env.example", ".env.local.example"]) for part in name.parts):
                continue
            source.extract(member, workspace, filter="data")
    for name, content in edits.items():
        target = workspace / name
        if not name.startswith("docs/") or not name.endswith(".md") or ".." in pathlib.PurePosixPath(name).parts or not target.is_file() or len(content) > 100_000:
            fail()
        target.write_text(content)
    npm = ["/runtime/bin/node", "/runtime/lib/node_modules/npm/bin/npm-cli.js"]
    lock = json.loads((workspace / "package-lock.json").read_text())
    validate_lock(lock)
    # This trusted npm operation never invokes repository/dependency lifecycle code.
    # Match this repository's reviewed lockfile mode without importing .npmrc.
    installed = invoke(arguments(config, workspace, network=True) + npm + ["ci", "--ignore-scripts", "--legacy-peer-deps", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org"], timeout=300, dependency_install=True)
    (workspace.parent / (workspace.name + "-install.log")).write_text(installed.stdout)
    print("CHECK: dependency preparation " + ("FAIL" if installed.returncode else "PASS"), file=sys.stderr)
    if installed.returncode:
        fail()
    checks = [["run", "lint"], ["run", "typecheck"], ["test"], ["run", "build:vercel"], ["run", "check:performance"], ["run", "test:e2e"]]
    for command in checks:
        outcome = invoke(arguments(config, workspace) + npm + command, timeout=25 * 60)
        # Only local, private diagnostic files; never returned as PR comment text.
        (workspace.parent / (workspace.name + "-" + command[-1].replace(":", "-") + ".log")).write_text(outcome.stdout + outcome.stderr)
        print("CHECK: npm " + " ".join(command) + (" FAIL" if outcome.returncode else " PASS"), file=sys.stderr)
        if command[-1] == "test:e2e":
            export_artifacts(workspace)
        if outcome.returncode:
            fail()
    return ["npm " + " ".join(command) for command in checks]


def export_artifacts(workspace):
    # Never hand a PR-controlled symlink to a credential-bearing uploader.
    # The PID namespace has exited before this copy; output is a new sibling
    # directory which was never writable from the repository sandbox.
    target = workspace.parent / (workspace.name + "-artifacts")
    target.mkdir()
    total = 0
    for folder in ["test-results", "playwright-report"]:
        source = workspace / folder
        if source.is_symlink():
            fail()
        if not source.is_dir():
            continue
        for file in source.rglob("*"):
            if file.is_symlink() or file.resolve() != file:
                fail()
            if not file.is_file() or file.suffix not in [".png", ".zip", ".md", ".json", ".html"]:
                continue
            size = file.stat().st_size
            if size > 25 * 1024 * 1024 or total + size > 128 * 1024 * 1024:
                raise RuntimeError("BLOCKED_SANDBOX: artifact capacity reached; retain workspace")
            destination = target / file.relative_to(workspace)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(file, destination, follow_symlinks=False)
            total += size


def main():
    raw = sys.stdin.read(2_000_001)
    if len(raw) > 2_000_000:
        fail()
    request = json.loads(raw)
    if request["action"] not in ["probe", "validate"]:
        fail()
    config = request["config"]
    if len(sys.argv) == 3 and sys.argv[1] == "--quota-workspace":
        workspace = fixed_path(sys.argv[2])
        if request["action"] != "validate" or workspace.parent != fixed_path(config["scratch"]):
            fail()
        checks = validate_in_workspace(config, request["archive"], request["edits"], workspace)
        print(json.dumps({"result": "PASS", "workspaceBytes": WORKSPACE_BYTES, "checks": checks}))
        return
    probe(config)
    checks = ["outside-files", "home-appdata-userprofile", "external-network", "local-network", "host-mounts"]
    if request["action"] == "validate":
        checks += validate(config, request["archive"], request["edits"])
    print(json.dumps({"result": "PASS", "boundary": "linux-bwrap-v1", "network": "isolated", "filesystem": "isolated", "checks": checks}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({"result": "FAIL", "reason": "BLOCKED_SANDBOX"}))
        sys.exit(1)
