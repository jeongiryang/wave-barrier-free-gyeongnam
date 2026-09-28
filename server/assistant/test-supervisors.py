"""Bounded offline safety/recovery tests. No live model or subprocess is started."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
sys.path.insert(0, str(Path(__file__).resolve().parent))
import supervisor_common as common


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).with_name(name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


windows, mint = load('supervisor-windows'), load('supervisor-mint')


class SafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.log = Mock()
        self.env = {'WAVE_GATEWAY_MODEL': 'dedicated', 'WAVE_GATEWAY_TOKEN': 'never-log-token'}

    def tearDown(self):
        self.temp.cleanup()

    def test_windows_live_busy_listeners_never_restart(self):
        unit = windows.Supervisor(self.root, self.env, self.log)
        unit.jobs = Mock()
        with patch.object(windows, 'request', side_effect=TimeoutError('secret prompt')), patch.object(windows, 'listening', return_value=True):
            unit.tick()
        unit.jobs.start.assert_not_called()

    def test_windows_only_missing_dedicated_listener_restarts(self):
        unit = windows.Supervisor(self.root, self.env, self.log)
        unit.jobs = Mock()
        with patch.object(windows, 'request', side_effect=OSError()), patch.object(windows, 'listening', side_effect=[False, True]):
            unit.tick()
        unit.jobs.start.assert_called_once_with('ollama', [str(self.root / 'ollama-0.34.2' / 'ollama.exe'), 'serve'])

    def test_windows_warm_matches_gateway_context_without_prompt(self):
        unit = windows.Supervisor(self.root, self.env, self.log)
        with patch.object(windows, 'request', return_value={'done': True}) as request:
            unit.warm_model()
        payload = request.call_args.args[2]
        self.assertEqual(payload['options']['num_ctx'], 16384)
        self.assertNotIn('prompt', payload)
        self.assertNotIn('messages', payload)

    def test_windows_foreign_model_or_wrong_context_never_unloaded(self):
        for model in [{'name': 'someone-else'}, {'name': 'dedicated', 'context_length': 8192}]:
            unit = windows.Supervisor(self.root, self.env, self.log)
            with patch.object(windows, 'request', side_effect=[{'models': [model]}, {}]) as request:
                unit.tick()
            self.assertEqual(request.call_count, 2)
            self.assertIsNone(unit.warm)

    def test_windows_env_context_and_private_values_not_logged(self):
        (self.root / 'private').mkdir()
        (self.root / 'private' / 'windows-gateway.env').write_text('WAVE_GATEWAY_MODEL=dedicated\nWAVE_GATEWAY_TOKEN=secret\n')
        env = windows.runtime_env(self.root)
        self.assertEqual(env['OLLAMA_CONTEXT_LENGTH'], '16384')
        self.assertEqual(env['OLLAMA_HOST'], '127.0.0.1:18764')

    def test_mint_busy_or_foreign_model_never_starts_cli(self):
        unit = mint.Supervisor(self.root, self.log)
        unit.jobs = Mock()
        with patch.object(mint, 'request', side_effect=TimeoutError()), patch.object(mint, 'listening', return_value=True):
            unit.tick()
        with patch.object(mint, 'request', return_value={'models': [{'loaded_instances': [{'id': 'other'}]}]}):
            unit.tick()
        unit.jobs.start.assert_not_called()

    def test_mint_missing_model_loads_only_dedicated_identifier(self):
        unit = mint.Supervisor(self.root, self.log)
        unit.jobs = Mock()
        with patch.object(mint, 'request', return_value={'models': []}):
            unit.tick()
        args = unit.jobs.start.call_args.args[1]
        self.assertEqual(args[1:3], ['load', mint.MODEL])
        self.assertEqual(args[args.index('--context-length') + 1], '16384')
        self.assertNotIn('unload', args)

    def test_mint_headless_boot_and_later_daemon_recovery_sequence(self):
        unit = mint.Supervisor(self.root, self.log)
        unit.jobs = Mock(children={}, attempts={})
        with patch.object(mint, 'request', side_effect=OSError()), patch.object(mint, 'listening', return_value=False):
            unit.tick()
            self.assertEqual(unit.jobs.start.call_args.args[0], 'daemon')
            child = Mock(); child.poll.return_value = 0
            unit.jobs.children = {'daemon': child}
            unit.jobs.attempts = {'daemon': 10}
            unit.tick()
            self.assertEqual(unit.jobs.start.call_args.args[0], 'server')
            unit.jobs.children['server'] = child
            unit.jobs.attempts['server'] = 20
            unit.tick()
            self.assertEqual(unit.jobs.start.call_args.args[0], 'daemon')

    def test_live_child_is_not_killed_or_duplicated(self):
        jobs = common.Jobs(self.root, {}, self.log)
        child = Mock(); child.poll.return_value = None
        jobs.children['model'] = child
        with patch.object(common, 'spawn') as spawn:
            self.assertIs(jobs.start('model', ['lms', 'load']), child)
        spawn.assert_not_called()
        child.kill.assert_not_called()
        child.terminate.assert_not_called()

    def test_stderr_is_classified_without_logging_tokens_or_user_content(self):
        log = common.Diagnostics(self.root)
        common.drain_stderr(io.BytesIO(b'Authorization: Bearer secret\nuser: private trip\nout of memory'), log, 'gateway')
        log.event('gateway', 'private user words', code='secret')
        for handler in log.logger.handlers:
            handler.flush(); handler.close()
        text = (self.root / 'supervisor.log').read_text()
        self.assertIn('stderr-memory', text)
        self.assertNotIn('secret', text)
        self.assertNotIn('private', text)
        self.assertEqual(len(text.splitlines()), 3)

    def test_gateway_small_line_preserves_only_allowlisted_diagnostic_fields(self):
        log = common.Diagnostics(self.root)
        line = b'naru_gateway_failure {"stage":"response_json","category":"http_error","status":503,"token":"secret","prompt":"private trip"}\n'
        common.drain_stderr(io.BytesIO(line), log, 'gateway')
        for handler in log.logger.handlers:
            handler.flush(); handler.close()
        text = (self.root / 'supervisor.log').read_text()
        self.assertIn('response_json', text)
        self.assertIn('http_error', text)
        self.assertIn('503', text)
        self.assertNotIn('secret', text)
        self.assertNotIn('private', text)

    def test_oversized_line_cannot_inject_a_diagnostic_from_later_fragment(self):
        log = common.Diagnostics(self.root)
        line = b'x' * 2048 + b'naru_gateway_failure {"stage":"stream","category":"timeout"}\n'
        common.drain_stderr(io.BytesIO(line), log, 'gateway')
        for handler in log.logger.handlers:
            handler.flush(); handler.close()
        text = (self.root / 'supervisor.log').read_text()
        self.assertNotIn('gateway-failure', text)
        self.assertNotIn('stream', text)

    def test_diagnostics_rotate_instead_of_growing_unbounded(self):
        log = common.Diagnostics(self.root)
        handler = log.logger.handlers[0]
        handler.maxBytes = 180
        for code in range(30):
            log.event('gateway', 'exited', code)
        handler.close()
        self.assertLessEqual(len(list(self.root.glob('supervisor.log*'))), 4)
        self.assertTrue((self.root / 'supervisor.log.1').exists())

    def test_single_instance_lock(self):
        import os
        lock = common.acquire_lock(self.root, windows=os.name == 'nt')
        self.assertIsNotNone(lock)
        try:
            self.assertIsNone(common.acquire_lock(self.root, windows=os.name == 'nt'))
        finally:
            lock.close()
        next_lock = common.acquire_lock(self.root, windows=os.name == 'nt')
        self.assertIsNotNone(next_lock)
        next_lock.close()

    def test_context_matches_gateway_constant_without_loading_private_config(self):
        import ast
        tree = ast.parse(Path(__file__).with_name('gateway.py').read_text(encoding='utf-8'))
        values = [node.value.value for node in tree.body if isinstance(node, ast.Assign)
                  and any(isinstance(target, ast.Name) and target.id == 'MODEL_CONTEXT' for target in node.targets)
                  and isinstance(node.value, ast.Constant)]
        self.assertEqual(values, [common.MODEL_CONTEXT])


if __name__ == '__main__':
    unittest.main()
