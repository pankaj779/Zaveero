"""Tests for canonical table naming."""

import unittest

from app.services.table_names import canonical_table_name, resolve_table_to_known


class TestTableNames(unittest.TestCase):
    def test_databricks_full_name(self):
        out = canonical_table_name(
            "DATABRICKS",
            "agentops.agent_logs.events",
            {"catalog": "agentops", "schema": "agent_logs"},
        )
        self.assertEqual(out, "agentops.agent_logs.events")

    def test_snowflake_three_part(self):
        out = canonical_table_name(
            "SNOWFLAKE",
            "MYDB.PUBLIC.ORDERS",
            {"database": "MYDB"},
        )
        self.assertEqual(out, "MYDB.PUBLIC.ORDERS")

    def test_resolve_short_name(self):
        known = {"agentops.agent_logs.agentops_test_payload", "agentops.agent_logs.other"}
        self.assertEqual(
            resolve_table_to_known("agentops_test_payload", known),
            "agentops.agent_logs.agentops_test_payload",
        )

    def test_resolve_full_name(self):
        known = {"agentops.agent_logs.agentops_test_payload"}
        self.assertEqual(
            resolve_table_to_known("agentops.agent_logs.agentops_test_payload", known),
            "agentops.agent_logs.agentops_test_payload",
        )


if __name__ == "__main__":
    unittest.main()
