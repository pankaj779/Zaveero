"""Tests for chat vs SQL intent routing."""

import unittest

from app.services.query_intent import classify_intent


class TestQueryIntent(unittest.TestCase):
    def test_conversational_auto(self):
        self.assertEqual(
            classify_intent("Give me information about the data we have"),
            "conversational",
        )
        self.assertEqual(
            classify_intent("What data do we have in this connection?"),
            "conversational",
        )

    def test_sql_auto(self):
        self.assertEqual(
            classify_intent("Show 10 rows from agentops_test_payload"),
            "sql",
        )

    def test_row_counts_use_metadata(self):
        self.assertEqual(
            classify_intent("How many rows are in each table?"),
            "conversational",
        )

    def test_catalog_auto(self):
        self.assertEqual(
            classify_intent("List all tables in the catalog"),
            "catalog",
        )

    def test_chat_mode_forces_conversational(self):
        self.assertEqual(
            classify_intent("Show 10 rows from t", "chat"),
            "conversational",
        )

    def test_query_mode_forces_sql(self):
        self.assertEqual(
            classify_intent("Give me information about the data we have", "query"),
            "sql",
        )


if __name__ == "__main__":
    unittest.main()
