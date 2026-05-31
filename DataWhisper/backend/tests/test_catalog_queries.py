"""Tests for catalog metadata answers and SHOW→SELECT rewrite."""

import unittest

from app.services.catalog_queries import extract_schema_scope, is_catalog_list_intent, list_tables_from_metadata
from app.services.sql_catalog_rewrite import prepare_sql_for_execution, rewrite_show_tables


class TestCatalogQueries(unittest.TestCase):
    def test_list_tables_intent(self):
        self.assertTrue(is_catalog_list_intent("List the tables in the schema"))
        self.assertTrue(is_catalog_list_intent(None, "SHOW TABLES IN agentops.agent_logs"))
        self.assertFalse(is_catalog_list_intent("What is total revenue last month?"))

    def test_metadata_answer(self):
        meta = {
            "tables": [
                {"name": "agentops.agent_logs.events", "row_count": 100},
                {"name": "agentops.agent_logs.users", "row_count": 50},
                {"name": "other.schema.t", "row_count": 1},
            ]
        }
        out = list_tables_from_metadata(
            meta,
            question="List the tables in the schema agentops.agent_logs",
            sql="SHOW TABLES IN agentops.agent_logs",
        )
        self.assertIsNotNone(out)
        assert out is not None
        self.assertEqual(out["row_count"], 2)
        names = {r["full_name"] for r in out["rows"]}
        self.assertIn("agentops.agent_logs.events", names)

    def test_generic_schema_phrase_lists_all(self):
        meta = {
            "tables": [
                {"name": "agentops.agent_logs.a", "row_count": 1},
                {"name": "agentops.agent_logs.b", "row_count": 2},
            ]
        }
        out = list_tables_from_metadata(meta, question="List the tables in the schema")
        self.assertIsNotNone(out)
        assert out is not None
        self.assertEqual(out["row_count"], 2)

    def test_generic_catalog_phrase_lists_all(self):
        meta = {
            "tables": [
                {"name": "agentops.agent_logs.t1", "row_count": 1},
                {"name": "agentops.agent_logs.t2", "row_count": 2},
                {"name": "agentops.agent_logs.t3", "row_count": 3},
            ]
        }
        out = list_tables_from_metadata(meta, question="show all the tables in the catalog")
        self.assertIsNotNone(out)
        assert out is not None
        self.assertEqual(out["row_count"], 3)

    def test_catalog_with_trailing_period_lists_all(self):
        meta = {
            "tables": [
                {"name": "agentops.agent_logs.t1", "row_count": 1},
            ]
        }
        out = list_tables_from_metadata(meta, question="show all the tables in the catalog.")
        self.assertIsNotNone(out)
        assert out is not None
        self.assertEqual(out["row_count"], 1)
        self.assertIsNone(extract_schema_scope("show all the tables in the catalog.", None, meta))


class TestSqlCatalogRewrite(unittest.TestCase):
    def test_show_rewritten_for_databricks(self):
        sql = "SHOW TABLES IN agentops.agent_logs"
        out, ok = rewrite_show_tables(sql, "DATABRICKS")
        self.assertTrue(ok)
        self.assertTrue(out.upper().startswith("SELECT"))
        self.assertIn("information_schema", out.lower())

    def test_prepare_adds_limit_to_rewrite_not_show(self):
        sql = "SHOW TABLES IN agentops.agent_logs"
        out = prepare_sql_for_execution(sql, 500, "DATABRICKS")
        self.assertNotIn("SHOW TABLES", out.upper())
        self.assertIn("LIMIT 500", out)


if __name__ == "__main__":
    unittest.main()
