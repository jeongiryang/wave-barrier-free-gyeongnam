"""Bounded startup regressions, using no network or installed model."""
import importlib.util
import io
import json
from pathlib import Path
import unittest
from urllib.error import URLError

spec = importlib.util.spec_from_file_location('warm', Path(__file__).with_name('warm-model.py'))
warm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(warm)


class WarmModelTest(unittest.TestCase):
    def test_waits_for_runtime_then_loads_once(self):
        calls, clock = [], [0]

        def open_url(request, timeout):
            calls.append((request, timeout))
            if len(calls) == 1:
                raise URLError('connection refused')
            return io.BytesIO(json.dumps({'version': 'fixture'} if isinstance(request, str) else {'done': True}).encode())

        warm.warm_model(open_url, lambda: clock[0], lambda delay: clock.__setitem__(0, clock[0] + delay), {})
        self.assertEqual(len(calls), 3)
        self.assertEqual([request for request, _ in calls[:2]], ['http://127.0.0.1:18764/api/version'] * 2)
        payload = json.loads(calls[-1][0].data)
        self.assertNotIn('prompt', payload)
        self.assertEqual(payload['keep_alive'], -1)
        self.assertLessEqual(calls[-1][1], 179)

    def test_unavailable_runtime_has_a_finite_deadline(self):
        clock, calls = [0], []

        def open_url(request, timeout):
            calls.append(request)
            raise URLError('connection refused')

        with self.assertRaisesRegex(RuntimeError, 'did not become ready'):
            warm.warm_model(open_url, lambda: clock[0], lambda delay: clock.__setitem__(0, clock[0] + delay), {})
        self.assertEqual(clock[0], 30)
        self.assertEqual(len(calls), 30)
        self.assertTrue(all(isinstance(request, str) for request in calls))

    def test_failed_load_is_not_retried(self):
        calls = []

        def open_url(request, timeout):
            calls.append(request)
            if isinstance(request, str):
                return io.BytesIO(b'{"version":"fixture"}')
            raise URLError('model unavailable')

        with self.assertRaises(URLError):
            warm.warm_model(open_url, environment={})
        self.assertEqual(len(calls), 2)


if __name__ == '__main__':
    unittest.main()
