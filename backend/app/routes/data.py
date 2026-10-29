from fastapi import APIRouter
from app.db.database import get_connection

router = APIRouter()

@router.get("/data/{file_id}")
def get_file_data(file_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "SELECT label, value FROM file_data WHERE file_id = %s",
        (file_id,)
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [{"label": r[0], "value": r[1]} for r in rows]
