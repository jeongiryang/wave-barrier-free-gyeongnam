"""Public-only cgroup attacks on disposable CI; never run on an operator host."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import uuid

root = pathlib.Path(__file__).resolve().parents[1]


def run_public(code, *, memory="128M", pids="32", cpu="25%"):
    compile(code, "public-resource-probe", "exec")
    # Fixed source written by this test, no Issue/PR body interpolation. The
    # unprivileged process tree dies together; the controller stays outside it.
    unit = "wave-public-resource-" + uuid.uuid4().hex
    args = ["sudo", "systemd-run", "--quiet", "--wait", "--pipe", "--collect",
            "--unit=" + unit, "--uid=" + str(os.getuid()), "--gid=" + str(os.getgid()),
            "-p", "MemoryMax=" + memory, "-p", "MemorySwapMax=0", "-p", "TasksMax=" + pids,
            "-p", "CPUQuota=" + cpu, "-p", "OOMPolicy=kill", "-p", "KillMode=control-group",
            "-p", "RuntimeMaxSec=15", "/usr/bin/python3", "-I", "-B", "-c", code]
    return subprocess.run(args, capture_output=True, text=True, timeout=25)


if os.environ.get("GITHUB_ACTIONS") != "true" or not pathlib.Path("/run/systemd/system").is_dir():
    raise SystemExit("BLOCKED_SANDBOX: disposable systemd CI required")

# More than one child and many individually-small allocations must still meet
# one aggregate limit. OOMPolicy=kill ensures no survivor can emit a PASS.
for allocation in [
    "blocks=[bytearray(16*1024*1024) for _ in range(4)]",
    "fds=[]\nfor _ in range(4):\n f=os.memfd_create('public'); os.write(f,b'x'*(16*1024*1024)); fds.append(f)",
]:
    child = "import os,time\n" + allocation + "\ntime.sleep(8)"
    attack = "import subprocess,time\nprint('PUBLIC_ATTACK_STARTED',flush=True)\nchildren=[subprocess.Popen(['/usr/bin/python3','-I','-c'," + repr(child) + "]) for _ in range(4)]\nfor p in children: p.wait()\nprint('UNEXPECTED_PASS')"
    result = run_public(attack)
    assert "PUBLIC_ATTACK_STARTED" in result.stdout and result.returncode != 0 and "UNEXPECTED_PASS" not in result.stdout, "aggregate memory escaped or attack did not execute"
print("PASS: anonymous memory and multiple memfd allocations cannot exceed aggregate capacity")

pid_attack = """import errno,subprocess
children=[]
try:
 for _ in range(64): children.append(subprocess.Popen(['/usr/bin/sleep','5']))
except OSError as error:
 assert error.errno == errno.EAGAIN
 print('PUBLIC_PID_CAP_PASS')
else:
 raise AssertionError('PID limit escaped')
finally:
 for child in children: child.terminate()
 for child in children: child.wait()
"""
result = run_public(pid_attack, memory="256M", pids="16")
assert result.returncode == 0 and result.stdout.strip() == "PUBLIC_PID_CAP_PASS"
print("PASS: total child-process capacity is enforced")

cpu_attack = r"""import json,pathlib,subprocess
group=pathlib.Path('/sys/fs/cgroup') / pathlib.Path('/proc/self/cgroup').read_text().strip().split('0::')[1].lstrip('/')
def throttled(): return int(dict(line.split() for line in (group/'cpu.stat').read_text().splitlines())['nr_throttled'])
before=throttled()
code='import time\nend=time.monotonic()+2\nwhile time.monotonic()<end: pass'
children=[subprocess.Popen(['/usr/bin/python3','-I','-c',code]) for _ in range(4)]
for child in children: assert child.wait()==0
after=throttled()
maximum=(group/'cpu.max').read_text().strip()
print(json.dumps({'probe':'cpu','before':before,'after':after,'cpuMax':maximum}),flush=True)
assert after>before
"""
result = run_public(cpu_attack, memory="256M")
try:
    metrics = json.loads(result.stdout)
except ValueError:
    metrics = None
diagnostic = {"probe": "cpu", "returncode": result.returncode, "metrics": metrics,
              "errorKind": next((kind for kind in ["SyntaxError", "PermissionError", "FileNotFoundError", "AssertionError"] if kind in result.stderr), None)}
(pathlib.Path(os.environ["RUNNER_TEMP"]) / "wave-public-resources.json").write_text(json.dumps(diagnostic))
assert result.returncode == 0 and metrics and metrics["probe"] == "cpu" and metrics["after"] > metrics["before"]
quota, period = map(int, metrics["cpuMax"].split())
assert quota * 4 == period
print("PASS: aggregate CPU quota throttles all child processes")

# The identical kernel-verification function must refuse a group with missing
# limits before invoke() starts bwrap or repository code.
helper = root / "scripts/subscription-sandbox.py"
check = "import importlib.util\ns=importlib.util.spec_from_file_location('boundary'," + repr(str(helper)) + ")\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint('PUBLIC_BUDGET_CHECK',flush=True)\nm.assert_process_budget()"
positive = run_public(check)
assert positive.returncode == 0 and positive.stdout.strip() == "PUBLIC_BUDGET_CHECK"
for properties in [["MemoryMax=infinity"], ["MemorySwapMax=infinity"], ["TasksMax=infinity"], ["CPUQuota="], ["OOMPolicy=continue"]]:
    args = ["sudo", "systemd-run", "--quiet", "--wait", "--pipe", "--collect",
            "--uid=" + str(os.getuid()), "--gid=" + str(os.getgid()),
            "-p", "MemoryMax=6G", "-p", "MemorySwapMax=0", "-p", "TasksMax=1024", "-p", "CPUQuota=200%", "-p", "OOMPolicy=kill"]
    for prop in properties:
        args += ["-p", prop]
    result = subprocess.run(args + ["/usr/bin/python3", "-I", "-B", "-c", check], capture_output=True, text=True, timeout=15)
    assert "PUBLIC_BUDGET_CHECK" in result.stdout and "BLOCKED_SANDBOX" in result.stderr and result.returncode != 0, "unbounded group was accepted or negative control never executed"
print("PASS: incomplete kernel budgets fail closed before repository execution")

# Exact bytes are checked with the same sha256sum gate used before the root
# parser. Includes, extra profiles, and rule edits never reach that parser.
policy = pathlib.Path(os.environ["RUNNER_TEMP"]) / "quota-owner.apparmor"
expected = "5569873ac76c043f90aa14292b77109177b30d3b5c2f90fa28fa0b91a6688b35"
original = policy.read_bytes()
assert hashlib.sha256(original).hexdigest() == expected
for mutation in [original + b'\ninclude "/tmp/public-policy"\n', original + b'\nprofile other { allow all, }\n', original.replace(b"/opt/wave-quota/bwrap", b"/usr/bin/python3")]:
    with tempfile.NamedTemporaryFile() as file:
        file.write(mutation); file.flush()
        result = subprocess.run(["sha256sum", "--check", "--status"], input=f"{expected}  {file.name}\n", text=True)
        assert result.returncode != 0
print("PASS: tampered privileged policy rejected before parser")
