"""Tests for dialect-aware row limit rewriting."""

import unittest

from app.services.sql_row_limit import (
    apply_execution_limit,
    get_statement_type,
    uses_client_row_cap_only,
)


class TestSqlRowLimit(unittest.TestCase):
    def test_select_gets_limit_all_dialects(self):
        sql = "SELECT * FROM agentops.agent_logs.events"
        for dialect in ("DATABRICKS", "POSTGRES", "MYSQL", "SNOWFLAKE", "BIGQUERY", "REDSHIFT"):
            out = apply_execution_limit(sql, 500, dialect=dialect)
            self.assertEqual(out, f"{sql} LIMIT 500", dialect)

    def test_select_existing_limit_unchanged(self):
        sql = "SELECT * FROM t LIMIT 10"
        self.assertEqual(apply_execution_limit(sql, 500, "DATABRICKS"), sql)

    def test_with_gets_limit(self):
        sql = "WITH cte AS (SELECT 1 AS n) SELECT n FROM cte"
        out = apply_execution_limit(sql, 100, "POSTGRES")
        self.assertTrue(out.endswith("LIMIT 100"))

    def test_show_never_gets_limit_databricks(self):
        sql = "SHOW TABLES IN agentops.agent_logs"
        out = apply_execution_limit(sql, 500, "DATABRICKS")
        self.assertEqual(out, sql)
        self.assertNotIn("LIMIT", out)

    def test_show_never_gets_limit_postgres(self):
        sql = "SHOW TABLES"
        self.assertEqual(apply_execution_limit(sql, 500, "POSTGRES"), sql)

    def test_describe_never_gets_limit(self):
        sql = "DESCRIBE TABLE agentops.agent_logs.events"
        for dialect in ("DATABRICKS", "BIGQUERY", "SNOWFLAKE"):
            self.assertEqual(apply_execution_limit(sql, 500, dialect), sql)

    def test_explain_never_gets_limit(self):
        sql = "EXPLAIN SELECT 1"
        self.assertEqual(apply_execution_limit(sql, 500, "DATABRICKS"), sql)

    def test_sqlserver_select_no_limit_rewrite(self):
        sql = "SELECT * FROM dbo.orders"
        self.assertEqual(apply_execution_limit(sql, 500, "SQLSERVER"), sql)

    def test_statement_type_detection(self):
        self.assertEqual(get_statement_type("  show tables"), "show")
        self.assertEqual(get_statement_type("SELECT 1"), "select")
        self.assertEqual(get_statement_type("WITH x AS (SELECT 1) SELECT * FROM x"), "with")

    def test_uses_client_row_cap_only(self):
        self.assertTrue(uses_client_row_cap_only("SHOW TABLES"))
        self.assertFalse(uses_client_row_cap_only("SELECT 1"))


if __name__ == "__main__":
    unittest.main()
