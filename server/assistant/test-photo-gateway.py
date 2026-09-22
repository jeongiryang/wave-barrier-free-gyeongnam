"""Admission tests only: no server, GPU or real image model is invoked."""
import base64
import unittest
import importlib.util
from pathlib import Path
from unittest.mock import patch
import json
import io

spec = importlib.util.spec_from_file_location('wave_gateway', Path(__file__).with_name('gateway.py'))
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)

JPEG = bytes([255,216,255,192,0,11,8,0,20,0,20,1,1,17,0,255,218,0,2,1,255,217])


class PhotoAdmission(unittest.TestCase):
    def test_photo_schema_retains_reviewable_trip_facts_without_actions(self):
        schema = gateway.PHOTO_FORMAT
        self.assertIn('facts', schema['required'])
        facts = schema['properties']['facts']
        self.assertEqual(facts['maxItems'], 4)
        self.assertEqual(set(facts['items']['required']),
                         {'name', 'region', 'date', 'startTime', 'endTime', 'address'})
        self.assertEqual(schema['properties']['proposal'], {'type': 'null'})

    def test_duration_generation_requires_target_and_minutes(self):
        branches = gateway.FORMAT['properties']['proposal']['anyOf']
        for action in ('visit', 'break'):
            matching = [branch for branch in branches if action in
                        branch.get('properties', {}).get('action', {}).get('enum', [])]
            self.assertEqual(len(matching), 1)
            self.assertTrue({'action', 'placeId', 'minutes'}.issubset(matching[0]['required']))

    def test_lm_studio_photo_uses_image_url_and_bounded_json_schema(self):
        messages = [self.message()]
        with patch.object(gateway, 'BACKEND', 'lmstudio'):
            request = gateway.model_request(messages, True, False)
        payload = json.loads(request.data)
        self.assertEqual(payload['messages'][0]['content'][1]['image_url']['url'],
                         'data:image/jpeg;base64,' + messages[0]['images'][0])
        self.assertEqual(payload['response_format']['json_schema']['schema'], gateway.PHOTO_FORMAT)
        self.assertEqual(payload['reasoning_effort'], 'none')
        self.assertEqual(payload['max_tokens'], 900)
        self.assertNotIn('images', payload['messages'][0])

    def test_lm_studio_readiness_requires_loaded_instance_not_download(self):
        for instances, expected in [([], False), ([{'id': gateway.MODEL}], True)]:
            body = json.dumps({'models': [{'key': gateway.MODEL, 'loaded_instances': instances}]}).encode()
            with patch.object(gateway, 'BACKEND', 'lmstudio'), patch.object(
                    gateway.urllib.request, 'urlopen', return_value=io.BytesIO(body)):
                self.assertEqual(gateway.model_ready(), expected)

    def message(self, data=JPEG):
        return {'role': 'user', 'content': 'read poster', 'images': [base64.b64encode(data).decode()]}

    def test_photo_only_on_latest_user(self):
        self.assertTrue(gateway.validate_photo_messages([self.message()]))
        self.assertFalse(gateway.validate_photo_messages([{'role': 'user', 'content': 'text'}]))
        for messages in [[self.message(), {'role': 'user', 'content': 'next'}], [{**self.message(), 'role': 'assistant'}], [{**self.message(), 'images': ['broken']}]]:
            with self.assertRaises(ValueError):
                gateway.validate_photo_messages(messages)

    def test_metadata_is_rejected_before_and_after_scan(self):
        for marker in (225, 237, 254):
            metadata = bytes([255, marker, 0, 4, 1, 1])
            for data in [JPEG[:2] + metadata + JPEG[2:], JPEG[:-2] + metadata + JPEG[-2:]]:
                with self.assertRaises(ValueError):
                    gateway.validate_photo_messages([self.message(data)])

    def test_dimensions_and_trailing_payload_are_rejected(self):
        data = bytearray(JPEG)
        data[7:9] = (2000).to_bytes(2, 'big')
        for invalid in [bytes(data), JPEG + JPEG[-2:], JPEG[:-3]]:
            with self.assertRaises(ValueError):
                gateway.validate_photo_messages([self.message(invalid)])


if __name__ == '__main__':
    unittest.main()
