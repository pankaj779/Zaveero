import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from app.db import prisma
from app.deps import get_current_user
from app.schemas.lineage import LineageOut, LineagePathOut
from app.services.lineage_builder import lineage_graph_stats
from app.services.lineage_read import get_merged_edges_from_mv, shortest_join_path

router = APIRouter(prefix="/lineage", tags=["lineage"])


async def _get_mv_for_connection(
    connection_id: uuid.UUID,
    workspace_id: str,
    version: int | None,
):
    conn = await prisma.dbconnection.find_first(
        where={"id": str(connection_id), "workspaceId": workspace_id}
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    if version is not None:
        mv = await prisma.metadataversion.find_first(
            where={"connectionId": str(connection_id), "version": version},
            include={"lineageEdges": True},
        )
    else:
        mv = await prisma.metadataversion.find_first(
            where={"connectionId": str(connection_id)},
            order={"version": "desc"},
            include={"lineageEdges": True},
        )

    if not mv:
        raise HTTPException(status_code=404, detail="No lineage data. Run a metadata scan first.")
    return conn, mv


@router.get("/{connection_id}/path", response_model=LineagePathOut)
async def get_join_path(
    connection_id: uuid.UUID,
    from_table: str = Query(..., min_length=1, description="Fully qualified table name as in metadata"),
    to_table: str = Query(..., min_length=1),
    user=Depends(get_current_user),
    version: int | None = None,
):
    _, mv = await _get_mv_for_connection(connection_id, str(user.workspaceId), version)
    edges = get_merged_edges_from_mv(mv)
    result = shortest_join_path(edges, from_table.strip(), to_table.strip())
    if result is None:
        return LineagePathOut(
            connection_id=connection_id,
            version=mv.version,
            from_table=from_table.strip(),
            to_table=to_table.strip(),
            found=False,
            table_path=[],
            edges=[],
        )
    path, path_edges = result
    return LineagePathOut(
        connection_id=connection_id,
        version=mv.version,
        from_table=from_table.strip(),
        to_table=to_table.strip(),
        found=True,
        table_path=path,
        edges=path_edges,
    )


@router.get("/{connection_id}", response_model=LineageOut)
async def get_lineage(connection_id: uuid.UUID, user=Depends(get_current_user), version: int | None = None):
    _, mv = await _get_mv_for_connection(connection_id, str(user.workspaceId), version)
    edges = get_merged_edges_from_mv(mv)
    adj = mv.lineageAdjacency if isinstance(mv.lineageAdjacency, dict) else {}
    facts = list(mv.factTables) if isinstance(mv.factTables, list) else []
    dims = list(mv.dimensionTables) if isinstance(mv.dimensionTables, list) else []
    stats = lineage_graph_stats(edges, facts, dims)

    return LineageOut(
        connection_id=connection_id,
        version=mv.version,
        adjacency=adj,
        edges=edges,
        fact_tables=facts,
        dimension_tables=dims,
        scanned_at=mv.scannedAt,
        stats=stats,
    )
