# Dedicated runtime recovery

These scripts are templates; copying or testing them does not install or restart a service.
Deploy `supervisor_common.py` beside the selected supervisor. Python standard library only.

Windows: default directory `%LOCALAPPDATA%/WAVE/naru-runtime`, private configuration
`private/windows-gateway.env`, existing `gateway.py`, `ollama-0.34.2/ollama.exe` and
`models/`. Start `pythonw supervisor-windows.py` with the existing user-scoped task.
The supervisor warms only `WAVE_GATEWAY_MODEL` using 16384 context, the same explicit
constant as the gateway and Ollama startup environment. A test checks they agree.
An already loaded mismatched context is logged, never evicted during a request.
Both listeners are fixed at loopback 18764/18765. The supervisor never kills a
listener that responds slowly or an unrelated model/process.

Mint: default directory `~/wave-naru`, CLI `~/.lmstudio/bin/lms`. Deploy the two Python
files there and install `wave-naru-mint-supervisor.service` into
`~/.config/systemd/user/`. The release operator can then use
`systemctl --user daemon-reload` and `systemctl --user enable --now wave-naru-mint-supervisor`.
For start at boot without a desktop/login session, an authorized administrator must
enable user lingering with `loginctl enable-linger <runtime-user>`; the service file
alone does not enable lingering. The supervisor runs `lms daemon up`, then binds the
API to 127.0.0.1:1234, then loads only the installed `gemma-4-26b-a4b-it` with the same
16384 context (parallel 1) when no
other model is loaded. It never installs/downloads/unloads models. A busy occupied
port is observed, not replaced. A healthy API with a foreign model needs operator review.

Both: `WAVE_RUNTIME_ROOT` may select another deployment directory. Keep it private.
Single-instance lock is shared with the previous `supervisor.py` at the same root:
the release operator must hand over the supervisor deliberately. Do not start a
second supervisor expecting it to take over. Locks release when the process exits.
`logs/supervisor.log` rotates at 256 KiB with three backups. Child stderr is consumed
as bounded lines and reduced to allowlisted event categories; structured
`naru_gateway_failure` retains only allowed stage/category and numeric HTTP status.
Oversized lines are discarded through the newline. Raw lines, arguments,
request bodies, URLs, exception messages, tokens and user content are never persisted.
Unknown stderr remains visible as `stderr`; inspect safe exit status rather than
enabling raw stderr logs. stdout is discarded. CLI work in progress is not killed
on a timer. An indefinitely hung command is intentionally left for operator review.

Offline tests: `python server/assistant/test-supervisors.py`. They mock HTTP/processes;
only temporary local files and the single-instance lock are exercised.

Operational limits: Mint treats an already loaded matching identifier as healthy;
it does not forcibly resize its context. CLI deduplication is within a supervisor
lifetime, so a supervisor crash during a slow load can lose that job's ownership.
Do not deliberately restart it while a model is loading. A Windows Startup shortcut
runs after user login; it is not a machine boot service. The deployed wrapper retries
the supervisor after 15 seconds. See the dated recovery report for tested boundaries.
