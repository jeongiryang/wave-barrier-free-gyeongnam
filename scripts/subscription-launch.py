"""Distribution source, NOT a command to run from a PR checkout.

An operator reviews and copies this complete release outside all checkouts and
pins its manifest in the external launch configuration. Invoke Python with -I.
The installed copy verifies every coordinator byte before importing/running it.
Candidate checkout files are read as data only and may not replace this code.
"""
import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import sys

FILES = {
    "scripts/subscription-launch.py", "scripts/subscription-installed-entry.mjs",
    "scripts/subscription-run-once.mjs", "scripts/subscription-sandbox.mjs",
    "scripts/subscription-sandbox.py", "scripts/subscription-publish.mjs",
    "scripts/subscription-queue-github.mjs", "scripts/subscription-queue-cli.mjs",
    "scripts/subscription-queue.mjs", "scripts/subscription-worker.mjs",
    "scripts/subscription-quota.mjs", "scripts/check-subscription-codex.mjs",
}


def reject():
    raise RuntimeError("BLOCKED_SANDBOX: untrusted bootstrap")


def digest(file, text=False):
    if file.is_symlink() or file.resolve() != file or not file.is_file():
        reject()
    data = file.read_bytes()
    if text:
        data = data.replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def verify(manifest, pin, repository):
    if not sys.flags.isolated:
        reject()
    manifest = pathlib.Path(manifest)
    repository = pathlib.Path(repository)
    if not manifest.is_absolute() or not repository.is_absolute() or repository.resolve() != repository:
        reject()
    root = manifest.parent
    if root == repository or root.is_relative_to(repository) or repository.is_relative_to(root):
        reject()
    if any((parent / ".git").exists() for parent in [root, *root.parents]):
        reject()
    if digest(manifest) != pin:
        reject()
    config = json.loads(manifest.read_text(encoding="utf-8"))
    if config.get("version") != 1 or set(config.get("files", {})) != FILES:
        reject()
    if pathlib.Path(__file__).resolve() != root / "scripts/subscription-launch.py":
        reject()
    for name, expected in config["files"].items():
        if digest(root / name, text=True) != expected or digest(repository / name, text=True) != expected:
            reject()
    for name in ["node", "git", "gh"]:
        executable = pathlib.Path(config[name])
        if not executable.is_absolute() or executable.is_relative_to(repository) or digest(executable) != config[name + "Sha256"]:
            reject()
    return root, config


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--pin", required=True)
    parser.add_argument("--repository", required=True)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--phase", choices=["implementation", "qa", "tick", "queue"])
    parser.add_argument("--command", choices=["init", "scan", "observe", "enqueue", "show", "refresh", "resume", "ack-report"])
    parser.add_argument("--digest", default="")
    parser.add_argument("--issue", type=int)
    parser.add_argument("--codex")
    args = parser.parse_args()
    root, config = verify(args.manifest, args.pin, args.repository)
    if args.verify_only:
        print("PASS: fixed external bootstrap; target files were never executed")
        return
    if not args.phase or (args.phase != "queue" and not args.codex) or (args.phase in ["implementation", "qa"] and (not args.issue or args.issue < 1)) or (args.phase == "queue" and not args.command):
        reject()
    env = {key: value for key, value in os.environ.items() if key not in ["NODE_OPTIONS", "NODE_PATH", "PYTHONPATH", "PYTHONHOME", "WSLENV"]}
    env.update({"WAVE_TRUSTED_INSTALLATION": str(root), "WAVE_TRUSTED_GIT": config["git"], "WAVE_TRUSTED_GH": config["gh"]})
    # All executable JS/Python imports resolve in the fixed installation. The
    # candidate path is only data for Git/archive; cwd is never the target PR.
    result = subprocess.run([config["node"], str(root / "scripts/subscription-installed-entry.mjs"), args.phase, str(args.issue or 0), args.codex or "", args.repository, args.command or "", args.digest], cwd=root, env=env)
    sys.exit(result.returncode)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("BLOCKED_SANDBOX: untrusted bootstrap", file=sys.stderr)
        sys.exit(1)
