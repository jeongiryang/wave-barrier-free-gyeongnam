"""Admission tests only: no server, GPU or real image model is invoked."""
import base64
import unittest
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('wave_gateway', Path(__file__).with_name('gateway.py'))
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)

JPEG = bytes([255,216,255,192,0,11,8,0,20,0,20,1,1,17,0,255,218,0,2,1,255,217])


class PhotoAdmission(unittest.TestCase):
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
