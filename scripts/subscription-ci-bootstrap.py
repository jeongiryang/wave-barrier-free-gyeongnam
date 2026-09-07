"""CI distribution source. Execute only an immutable, externally hash-pinned copy.

The candidate checkout is data, never a source of pre-boundary Python/Node code.
Updating these reviewed inputs requires a new explicit bootstrap distribution.
"""
import argparse
import hashlib
import json
import pathlib
import sys
import urllib.request

SOURCE_SHA = '81c7e8c83863396e422141d3446c9f547f79b5c6'
TARGET_PINS = {'scripts/subscription-launch.py': '0313c4f5d4c1f8e09388b18e25127795843dd58940adf52b76df2dcb7921c55c', 'scripts/subscription-installed-entry.mjs': 'ba9c48ae691c06abc58a7da5f95c025c98a65b051960e18af70b20310c2aa5a4', 'scripts/subscription-run-once.mjs': '89af60a07c4a58d5ffe1f0f87dc8ee11dfb2ab58674adfc8724d6fdcf95ff529', 'scripts/subscription-sandbox.mjs': 'fe1c60ceee390931492e073c933b8617a4b208a43a4492c6be4877c103b1aab2', 'scripts/subscription-sandbox.py': '2ccc66a932b748e657dd01f13c92b435aac0fe9fdc02513feee72464863f5090', 'scripts/subscription-publish.mjs': 'd90e850bd811f9854f3c4abcf5f73568d4471a40a087cbf8ac696ae518b8e3ba', 'scripts/subscription-queue-github.mjs': '0bbdf0553fbcc1fc569eae9d47f311664237fb993406dfcc34c79dc13b923418', 'scripts/subscription-queue-cli.mjs': '0e7c902f71360ca3b590b0ceafdce81b15808b6871601829d5c6f6fbed026570', 'scripts/subscription-queue.mjs': 'c2bc9652d6156394228952e8a86dc9c039912ab360f0f1c63f80404df64d85e3', 'scripts/subscription-worker.mjs': 'd017938fb1e8b9e3c49e10c7fee8aae5c577ca1fe942a26b747ce86a92debc60', 'scripts/subscription-quota.mjs': '8b94d08d656508124a917d80ee99a52346c6943a535a81ff2f1754e5c2b21ab5', 'scripts/check-subscription-codex.mjs': '4826138d4a6d8127bb39b93c27da79d7b88c6a0705cc104164b5d4abe49c8a46', 'package-lock.json': '300edb4b5176378a517d87a488375e9125242deca614440756a962d707965275'}
EXTRA_PINS = {'tests/subscription-bootstrap-boundary.py': 'ae9c56273ddc6fee0df7b6cfdee39716eab50c9b6213ed80493f25fde27a0652', 'tests/subscription-sandbox-boundary.py': '962e7a104ce8535c64341375af9bceebee941c7229741bcdbceb3c5eaadb8224', 'tests/subscription-resource-boundary.py': '7c9f19febb860350e5f9330e9270b5a90d2de34b8d806b0a8c7e943b1afc460a', '.github/security/quota-owner.apparmor': '5569873ac76c043f90aa14292b77109177b30d3b5c2f90fa28fa0b91a6688b35'}


def reject():
    raise RuntimeError("BLOCKED_SANDBOX: CI bootstrap mismatch")


def verified_bytes(file, expected):
    if file.is_symlink() or file.resolve() != file or not file.is_file():
        reject()
    data = file.read_bytes().replace(b"\r\n", b"\n")
    if hashlib.sha256(data).hexdigest() != expected:
        reject()
    return data


def verify_checkout(repository):
    repository = pathlib.Path(repository)
    if not repository.is_absolute() or repository.resolve() != repository:
        reject()
    for name, expected in TARGET_PINS.items():
        verified_bytes(repository / name, expected)
    return repository


def install(repository, destination, fetch=None):
    # Complete verification before the first download or import. Never import
    # the candidate even when bytes match: execution uses the separate copy.
    repository = verify_checkout(repository)
    destination = pathlib.Path(destination)
    if not destination.is_absolute() or destination.resolve() != destination or destination.exists() or destination.is_relative_to(repository) or repository.is_relative_to(destination):
        reject()
    fetch = fetch or urllib.request.urlopen
    payloads = {}
    for name, expected in {**TARGET_PINS, **EXTRA_PINS}.items():
        url = f"https://raw.githubusercontent.com/jeongiryang/wave-barrier-free-gyeongnam/{SOURCE_SHA}/{name}"
        with fetch(url, timeout=30) as response:
            data = response.read(2_000_001)
        if len(data) > 2_000_000 or hashlib.sha256(data).hexdigest() != expected:
            reject()
        payloads[name] = data
    destination.mkdir()
    for name, data in payloads.items():
        file = destination / name
        file.parent.mkdir(parents=True, exist_ok=True)
        with file.open("xb") as target:
            target.write(data)
    return destination


def main():
    if not sys.flags.isolated:
        reject()
    parser = argparse.ArgumentParser()
    parser.add_argument("--repository", required=True)
    parser.add_argument("--destination", required=True)
    args = parser.parse_args()
    install(args.repository, args.destination)
    print(json.dumps({"result": "PASS", "sourceSha": SOURCE_SHA, "candidateExecuted": False}))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print(json.dumps({"result": "FAIL", "reason": "BLOCKED_SANDBOX"}))
        sys.exit(1)
