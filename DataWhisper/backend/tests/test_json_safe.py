"""Tests for JSON-safe row coercion."""

import unittest
from datetime import datetime
from decimal import Decimal


class TestJsonSafe(unittest.TestCase):
    def test_nested_and_decimal(self):
        from app.services.json_safe import json_safe_row

        row = {
            "payload": {"nested": True, "count": Decimal("1.5")},
            "ts": datetime(2026, 5, 30, 12, 0, 0),
        }
        safe = json_safe_row(row)
        self.assertEqual(safe["payload"]["count"], 1.5)
        self.assertEqual(safe["ts"], "2026-05-30T12:00:00")


if __name__ == "__main__":
    unittest.main()
