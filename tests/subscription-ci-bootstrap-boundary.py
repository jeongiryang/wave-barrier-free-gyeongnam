"""Public-only CI bootstrap attacks. Run the immutable external test copy."""
import importlib.util
import io
import json
import pathlib
import socket
import sys
import tempfile

sys.dont_write_bytecode = True
root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ci_bootstrap", root / "scripts/subscription-ci-bootstrap.py")
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)
work = pathlib.Path(tempfile.mkdtemp(prefix="wave-public-ci-bootstrap-"))
repository = work / "candidate"
repository.mkdir()
public = work / "outside-public.txt"
public.write_text("PUBLIC SENTINEL ONLY")
marker = work / "executed-public-probe.txt"
pins = {**bootstrap.TARGET_PINS, **bootstrap.EXTRA_PINS}
data = {name: bootstrap.verified_bytes(root / name, expected) for name, expected in pins.items()}
for name, content in data.items():
    target = repository / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
requests = []


def fetch(url, timeout):
    prefix = f"https://raw.githubusercontent.com/jeongiryang/wave-barrier-free-gyeongnam/{bootstrap.SOURCE_SHA}/"
    assert url.startswith(prefix) and timeout == 30
    requests.append(url)
    return io.BytesIO(data[url.removeprefix(prefix)])


installed = bootstrap.install(repository, work / "verified-distribution", fetch)
assert len(requests) == len(pins)
assert all((installed / name).read_bytes() == content for name, content in data.items())
print("PASS: immutable external distribution bytes match; candidate code is never imported")

with socket.socket() as listener:
    listener.bind(("127.0.0.1", 0))
    listener.listen()
    listener.settimeout(0.1)
    port = listener.getsockname()[1]
    python_attack = f"\nimport pathlib,socket\npathlib.Path({str(marker)!r}).write_text(pathlib.Path({str(public)!r}).read_text())\nsocket.create_connection(('127.0.0.1',{port}))\nsocket.create_connection(('1.1.1.1',443))\n"
    node_attack = f"\nrequire('node:fs').writeFileSync({json.dumps(str(marker))},require('node:fs').readFileSync({json.dumps(str(public))}));require('node:net').connect({port},'127.0.0.1');require('node:net').connect(443,'1.1.1.1');\n"
    for name, attack in [
        ("scripts/subscription-sandbox.py", python_attack.encode()),
        ("scripts/subscription-launch.py", python_attack.encode()),
        ("scripts/subscription-installed-entry.mjs", node_attack.encode()),
        ("scripts/subscription-sandbox.mjs", node_attack.encode()),
        ("package-lock.json", json.dumps({"lockfileVersion": 3, "packages": {"node_modules/playwright": {"resolved": "file:../outside-public.txt", "hasInstallScript": True}}}).encode()),
    ]:
        target = repository / name
        target.write_bytes(attack)
        requests.clear()
        try:
            bootstrap.install(repository, work / "must-not-install", fetch)
        except RuntimeError as error:
            assert str(error) == "BLOCKED_SANDBOX: CI bootstrap mismatch"
        else:
            raise AssertionError("Mutated candidate reached runtime preparation")
        assert not requests and not marker.exists() and not (work / "must-not-install").exists()
        target.write_bytes(data[name])
    try:
        connection, _ = listener.accept()
    except TimeoutError:
        pass
    else:
        connection.close()
        raise AssertionError("Host network probe executed before the boundary")
print("PASS: helper/entrypoint/lockfile attacks rejected before downloads, sentinel access or network code")

try:
    bootstrap.install(repository, work / "tampered-distribution", lambda url, timeout: io.BytesIO(python_attack.encode()))
except RuntimeError:
    pass
else:
    raise AssertionError("Tampered immutable download was accepted")
assert not marker.exists() and not (work / "tampered-distribution").exists()
print("PASS: tampered immutable response is rejected before any file execution")
