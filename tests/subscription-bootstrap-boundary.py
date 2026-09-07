"""Public bootstrap tamper test. Never starts queue, gh, Codex or model APIs."""
import hashlib
import json
import pathlib
import socket
import subprocess
import sys
import tempfile
import threading

source = pathlib.Path(__file__).resolve().parents[1]
work = pathlib.Path(tempfile.mkdtemp(prefix="wave-bootstrap-public-"))
installed, candidate = work / "installed", work / "candidate"
(installed / "scripts").mkdir(parents=True)
(candidate / "scripts").mkdir(parents=True)
names = ["subscription-launch.py", "subscription-installed-entry.mjs", "subscription-run-once.mjs", "subscription-sandbox.mjs", "subscription-sandbox.py", "subscription-publish.mjs", "subscription-queue-github.mjs", "subscription-queue-cli.mjs", "subscription-queue.mjs", "subscription-worker.mjs", "subscription-quota.mjs", "check-subscription-codex.mjs"]
files = {}
for name in names:
    relative = "scripts/" + name
    data = (source / relative).read_bytes().replace(b"\r\n", b"\n")
    (installed / relative).write_bytes(data)
    (candidate / relative).write_bytes(data)
    files[relative] = hashlib.sha256(data).hexdigest()
binary = pathlib.Path(sys.executable).resolve()
manifest = installed / "manifest.json"
settings = {"version": 1, "files": files}
for name in ["node", "git", "gh"]:
    settings[name] = str(binary)
    settings[name + "Sha256"] = hashlib.sha256(binary.read_bytes()).hexdigest()
manifest.write_text(json.dumps(settings), encoding="utf-8")
pin = hashlib.sha256(manifest.read_bytes()).hexdigest()
command = [str(binary), "-I", str(installed / "scripts/subscription-launch.py"), "--manifest", str(manifest), "--pin", pin, "--repository", str(candidate)]
assert subprocess.run(command + ["--verify-only"], capture_output=True, timeout=10).returncode == 0
print("PASS: externally installed, pinned bootstrap verifies without queue/model execution")

sentinel, marker = work / "PUBLIC-sentinel.txt", work / "unexpected-execution.txt"
sentinel.write_text("PUBLIC TEST DATA ONLY")
with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    listener.listen()
    listener.settimeout(0.1)
    port = listener.getsockname()[1]
    hits = []
    stopped = threading.Event()
    def receive():
        while not stopped.is_set():
            try:
                conn, _ = listener.accept()
                hits.append(True)
                conn.close()
            except TimeoutError:
                pass
    receiver = threading.Thread(target=receive)
    receiver.start()
    try:
        for tree in [candidate, installed]:
            for name in ["subscription-sandbox.py", "subscription-installed-entry.mjs", "subscription-run-once.mjs"]:
                file = tree / "scripts" / name
                original = file.read_bytes()
                if name.endswith(".py"):
                    attack = f"import pathlib,socket\npathlib.Path({str(marker)!r}).write_text(pathlib.Path({str(sentinel)!r}).read_text())\nsocket.create_connection(('127.0.0.1',{port}))\nsocket.create_connection(('1.1.1.1',443))\n"
                else:
                    attack = f"import fsAttack from 'node:fs';import netAttack from 'node:net';fsAttack.writeFileSync({json.dumps(str(marker))},fsAttack.readFileSync({json.dumps(str(sentinel))}));netAttack.connect({port},'127.0.0.1');netAttack.connect(443,'1.1.1.1');\n"
                file.write_bytes(attack.encode() + original)
                result = subprocess.run(command + ["--phase", "implementation", "--issue", "294", "--codex", str(binary)], capture_output=True, text=True, timeout=10)
                assert result.returncode == 1 and result.stderr.strip() == "BLOCKED_SANDBOX: untrusted bootstrap"
                assert not marker.exists() and not hits
                assert "PUBLIC-sentinel" not in result.stdout + result.stderr
                file.write_bytes(original)
        print("PASS: six target/installed helper and entrypoint mutations rejected before execution")
        manifest.write_text(json.dumps({**settings, "version": 2}), encoding="utf-8")
        result = subprocess.run(command + ["--verify-only"], capture_output=True, timeout=10)
        assert result.returncode == 1 and not marker.exists() and not hits
        print("PASS: manifest mutation rejected by external digest pin; no sentinel/network/queue side effects")
    finally:
        stopped.set()
        receiver.join(timeout=2)
print("PASS: bootstrap probes complete; installation artifacts preserved, automation NOT activated")
