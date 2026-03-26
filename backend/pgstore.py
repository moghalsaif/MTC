import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import asyncpg


SUPPORTED_OPS = {"$gt", "$ne", "$in", "$regex"}


def _is_operator_dict(v: Any) -> bool:
    return isinstance(v, dict) and any(k in SUPPORTED_OPS for k in v.keys())


def _json_path_expr(field: str) -> str:
    # Store documents as JSONB in `doc`; read scalar as text.
    # We intentionally only support top-level keys used by this app.
    return f"(doc ->> '{field}')"


def _build_where(filter_dict: Dict[str, Any]) -> Tuple[str, List[Any]]:
    if not filter_dict:
        return "TRUE", []

    clauses: List[str] = []
    params: List[Any] = []

    for key, value in filter_dict.items():
        # Special-case: Mongo-style {"id": {"$in": [...]}}
        if _is_operator_dict(value):
            ops = value
            if "$regex" in ops:
                # Expected usage in this codebase: {"email":{"$regex":"^foo$","$options":"i"}}
                pattern = ops["$regex"]
                options = ops.get("$options", "")
                # If it's a ^...$ exact-match regex, extract the literal and compare.
                if isinstance(pattern, str) and pattern.startswith("^") and pattern.endswith("$"):
                    literal = pattern[1:-1]
                    if "i" in str(options).lower():
                        clauses.append(f"LOWER({_json_path_expr(key)}) = LOWER(${len(params)+1})")
                        params.append(literal)
                    else:
                        clauses.append(f"{_json_path_expr(key)} = ${len(params)+1}")
                        params.append(literal)
                else:
                    # Fallback: use ILIKE for case-insensitive, LIKE otherwise.
                    like = pattern
                    if "i" in str(options).lower():
                        clauses.append(f"{_json_path_expr(key)} ILIKE ${len(params)+1}")
                    else:
                        clauses.append(f"{_json_path_expr(key)} LIKE ${len(params)+1}")
                    params.append(like)
            if "$gt" in ops:
                clauses.append(f"({(_json_path_expr(key))})::numeric > ${len(params)+1}")
                params.append(ops["$gt"])
            if "$ne" in ops:
                if ops["$ne"] is None:
                    # SQL: col <> NULL is always NULL/false; must use IS NOT NULL
                    clauses.append(f"{_json_path_expr(key)} IS NOT NULL")
                else:
                    clauses.append(f"{_json_path_expr(key)} <> ${len(params)+1}")
                    params.append(ops["$ne"])
            if "$in" in ops:
                arr = ops["$in"]
                clauses.append(f"{_json_path_expr(key)} = ANY(${len(params)+1})")
                params.append(list(arr))
            continue
        # Plain equality
        clauses.append(f"{_json_path_expr(key)} = ${len(params)+1}")
        params.append(value)
    return " AND ".join(clauses) if clauses else "TRUE", params


def _apply_projection(doc: Dict[str, Any], projection: Optional[Dict[str, int]]) -> Dict[str, Any]:
    if not projection:
        return doc
    # This codebase uses projections like {"_id":0,"file_data":0}
    out = dict(doc)
    for k, v in projection.items():
        if v == 0 and k in out:
            out.pop(k, None)
    return out


@dataclass
class _Query:
    store: "PgStore"
    table: str
    where_sql: str
    params: List[Any]
    projection: Optional[Dict[str, int]] = None
    _sort_field: Optional[str] = None
    _sort_dir: int = -1

    def sort(self, field: str, direction: int):
        self._sort_field = field
        self._sort_dir = direction
        return self

    async def to_list(self, limit: int):
        order_sql = ""
        if self._sort_field:
            dir_sql = "DESC" if self._sort_dir == -1 else "ASC"
            # Sort using the JSON string; timestamps in ISO-8601 sort lexicographically.
            order_sql = f" ORDER BY {_json_path_expr(self._sort_field)} {dir_sql}"
        sql = f"SELECT doc FROM {self.table} WHERE {self.where_sql}{order_sql} LIMIT {int(limit)}"
        rows = await self.store._pool.fetch(sql, *self.params)
        docs = [json.loads(r["doc"]) if isinstance(r["doc"], str) else dict(r["doc"]) for r in rows]
        return [_apply_projection(d, self.projection) for d in docs]


class _Collection:
    def __init__(self, store: "PgStore", table: str):
        self._store = store
        self._table = table

    def find(self, filter_dict: Dict[str, Any], projection: Optional[Dict[str, int]] = None) -> _Query:
        where_sql, params = _build_where(filter_dict)
        return _Query(store=self._store, table=self._table, where_sql=where_sql, params=params, projection=projection)

    async def find_one(self, filter_dict: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        where_sql, params = _build_where(filter_dict)
        sql = f"SELECT doc FROM {self._table} WHERE {where_sql} LIMIT 1"
        row = await self._store._pool.fetchrow(sql, *params)
        if not row:
            return None
        doc = json.loads(row["doc"]) if isinstance(row["doc"], str) else dict(row["doc"])
        return _apply_projection(doc, projection)

    async def insert_one(self, doc: Dict[str, Any]):
        if "id" not in doc:
            raise ValueError("Document missing 'id'")
        sql = f"INSERT INTO {self._table} (id, doc) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO UPDATE SET doc=EXCLUDED.doc"
        await self._store._pool.execute(sql, doc["id"], json.dumps(doc))
        return {"inserted_id": doc["id"]}

    async def update_one(self, filter_dict: Dict[str, Any], update: Dict[str, Any]):
        existing = await self.find_one(filter_dict)
        if not existing:
            return {"matched_count": 0, "modified_count": 0}
        if "$set" in update:
            existing.update(update["$set"])
        if "$push" in update:
            # Append a single value to an array field (Mongo $push semantics)
            for k, v in update["$push"].items():
                if isinstance(existing.get(k), list):
                    existing[k] = existing[k] + [v]
                else:
                    existing[k] = [v]
        if "$set" not in update and "$push" not in update:
            existing.update(update)
        sql = f"UPDATE {self._table} SET doc=$2::jsonb WHERE id=$1"
        await self._store._pool.execute(sql, existing["id"], json.dumps(existing))
        return {"matched_count": 1, "modified_count": 1}

    async def update_many(self, filter_dict: Dict[str, Any], update: Dict[str, Any]):
        # Fetch IDs, then update each (simple + safe for current scale)
        q = self.find(filter_dict)
        docs = await q.to_list(5000)
        modified = 0
        for d in docs:
            await self.update_one({"id": d["id"]}, update)
            modified += 1
        return type("Result", (), {"modified_count": modified})()

    async def delete_one(self, filter_dict: Dict[str, Any]):
        where_sql, params = _build_where(filter_dict)
        sql = f"DELETE FROM {self._table} WHERE {where_sql}"
        status = await self._store._pool.execute(sql, *params)
        # asyncpg returns e.g. "DELETE 1"
        deleted = int(status.split()[-1])
        return type("Result", (), {"deleted_count": deleted})()

    async def delete_many(self, filter_dict: Dict[str, Any]):
        where_sql, params = _build_where(filter_dict)
        sql = f"DELETE FROM {self._table} WHERE {where_sql}"
        status = await self._store._pool.execute(sql, *params)
        deleted = int(status.split()[-1])
        return type("Result", (), {"deleted_count": deleted})()

    async def count_documents(self, filter_dict: Dict[str, Any]):
        where_sql, params = _build_where(filter_dict)
        sql = f"SELECT COUNT(*) AS c FROM {self._table} WHERE {where_sql}"
        row = await self._store._pool.fetchrow(sql, *params)
        return int(row["c"])


class PgStore:
    """
    Minimal Mongo-like adapter over Postgres JSONB tables.
    Each collection is a table with:
      - id TEXT PRIMARY KEY
      - doc JSONB NOT NULL
    """

    def __init__(self, database_url: str, tables: Sequence[str]):
        self._database_url = database_url
        self._tables = list(tables)
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if not self._database_url:
            raise RuntimeError("DATABASE_URL is required for Postgres/Supabase")
        self._pool = await asyncpg.create_pool(dsn=self._database_url, min_size=1, max_size=10, statement_cache_size=0, ssl='require')
        await self._ensure_tables()

    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def _ensure_tables(self):
        assert self._pool is not None
        for t in self._tables:
            await self._pool.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {t} (
                    id TEXT PRIMARY KEY,
                    doc JSONB NOT NULL
                );
                """
            )

    def __getattr__(self, item: str):
        if item in self._tables:
            return _Collection(self, item)
        raise AttributeError(item)
