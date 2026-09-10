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

SOURCE_SHA = 'ea5078abb3bd6dd6a8572464495f4563f746e15d'
TARGET_PINS = {'scripts/subscription-launch.py': '0313c4f5d4c1f8e09388b18e25127795843dd58940adf52b76df2dcb7921c55c', 'scripts/subscription-installed-entry.mjs': 'ba9c48ae691c06abc58a7da5f95c025c98a65b051960e18af70b20310c2aa5a4', 'scripts/subscription-run-once.mjs': '8ba68a45c4cdf83e4527462c6a081af934b26aafe5f4d50c1f7fd1abab90cdef', 'scripts/subscription-sandbox.mjs': '18d7bb11075cd7f0374dd12419c62f2b7a9731f9c378e0c320bc490f01b3858e', 'scripts/subscription-sandbox.py': '5eeae6aa2a8d7aea3be3f0a01186c6d7c6ce773f52fbd112d5483e46ded4541b', 'scripts/subscription-publish.mjs': 'd90e850bd811f9854f3c4abcf5f73568d4471a40a087cbf8ac696ae518b8e3ba', 'scripts/subscription-queue-github.mjs': '0bbdf0553fbcc1fc569eae9d47f311664237fb993406dfcc34c79dc13b923418', 'scripts/subscription-queue-cli.mjs': 'a249a991a76816a70400d86af4d95eff3e18a3b9ffaa3682f18dfa4a9fae42aa', 'scripts/subscription-queue.mjs': 'c2bc9652d6156394228952e8a86dc9c039912ab360f0f1c63f80404df64d85e3', 'scripts/subscription-worker.mjs': 'd017938fb1e8b9e3c49e10c7fee8aae5c577ca1fe942a26b747ce86a92debc60', 'scripts/subscription-quota.mjs': '8b94d08d656508124a917d80ee99a52346c6943a535a81ff2f1754e5c2b21ab5', 'scripts/check-subscription-codex.mjs': '4826138d4a6d8127bb39b93c27da79d7b88c6a0705cc104164b5d4abe49c8a46', 'package-lock.json': 'ae0ef08fa49232fc4b36fc81c0c5328c563800767a353a9b810f185b6a3fb25b'}
EXTRA_PINS = {'tests/subscription-bootstrap-boundary.py': 'ae9c56273ddc6fee0df7b6cfdee39716eab50c9b6213ed80493f25fde27a0652', 'tests/subscription-sandbox-boundary.py': '7d65ac606d70fed9dc29f33ae4a0015855dc34b57d9fa51b445232643993b853', 'tests/subscription-resource-boundary.py': '7c9f19febb860350e5f9330e9270b5a90d2de34b8d806b0a8c7e943b1afc460a', '.github/security/quota-owner.apparmor': '5569873ac76c043f90aa14292b77109177b30d3b5c2f90fa28fa0b91a6688b35'}


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
