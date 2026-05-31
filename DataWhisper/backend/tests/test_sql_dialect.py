"""Tests for dialect SQL fixes."""

import unittest

from app.services.sql_dialect import fix_sql_for_execution, quote_table_name


class TestSqlDialect(unittest.TestCase):
    def test_databricks_split_backticks(self):
        sql = "SELECT * FROM `agentops.agent_logs.agentops_test_payload` LIMIT 10"
        fixed = fix_sql_for_execution(sql, "DATABRICKS")
        self.assertIn("FROM agentops.agent_logs.agentops_test_payload", fixed)

    def test_databricks_unquotes_simple_identifiers(self):
        sql = "SELECT * FROM `agentops`.`agent_logs`.`agentops_test_payload` LIMIT 10"
        fixed = fix_sql_for_execution(sql, "DATABRICKS")
        self.assertIn("FROM agentops.agent_logs.agentops_test_payload", fixed)

    def test_quote_table_databricks(self):
        q = quote_table_name("agentops.agent_logs.events", "DATABRICKS")
        self.assertEqual(q, "`agentops`.`agent_logs`.`events`")


if __name__ == "__main__":
    unittest.main()
