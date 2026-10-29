import csv
import io
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.db.database import get_connection
import os
from openpyxl import load_workbook

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload CSV, JSON, or Excel file.
    Returns file_id and parsed data in the format:
    [{"label": "A", "value": 10}, {"label": "B", "value": 20}]
    """
    content = await file.read()
    filename = file.filename
    file_type = file.content_type.lower() if file.content_type else "unknown"

    print(f"DEBUG: Uploading file: {filename}, type: {file_type}, size: {len(content)}")

    data_rows = []

    # --- Parse CSV ---
    csv_types = ["text/csv", "application/vnd.ms-excel", "text/x-csv", "application/csv", "application/x-csv", "text/comma-separated-values", "text/x-comma-separated-values"]
    if filename.lower().endswith(".csv") or any(t in file_type for t in csv_types):
        import pandas as pd
        try:
            df = pd.read_csv(io.BytesIO(content))
            df = df.dropna(how='all') # Drop completely empty rows
            
            if len(df) > 0:
                headers = list(df.columns)
                label_key = next((h for h in headers if str(h).lower() in ["label", "name", "category", "item"]), headers[0])
                value_key = next((h for h in headers if str(h).lower() in ["value", "amount", "count", "quantity", "price"]), None)
                
                if not value_key:
                    for h in headers:
                        if h != label_key:
                            try:
                                pd.to_numeric(df[h].replace('[\$,]', '', regex=True))
                                value_key = h
                                break
                            except: continue
                
                for _, row in df.iterrows():
                    try:
                        raw_val = str(row[value_key] if value_key else 0).replace('$', '').replace(',', '')
                        data_rows.append({
                            "label": str(row[label_key] if label_key in row else "Unknown"),
                            "value": float(raw_val or 0)
                        })
                    except (ValueError, TypeError):
                        continue
            else:
                 raise HTTPException(status_code=400, detail="CSV file appears to be empty")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    # --- Parse JSON ---
    elif filename.lower().endswith(".json") or "json" in file_type:
        try:
            json_data = json.loads(content)
            if not isinstance(json_data, list):
                # If it's a single object, wrap it in a list
                if isinstance(json_data, dict):
                    json_data = [json_data]
                else:
                    raise HTTPException(status_code=400, detail="JSON must be an object or a list of objects")
            
            for item in json_data:
                keys = list(item.keys())
                l_key = next((k for k in keys if k.lower() in ["label", "name", "category", "item"]), "label")
                v_key = next((k for k in keys if k.lower() in ["value", "amount", "count", "quantity", "price"]), "value")
                
                try:
                    data_rows.append({
                        "label": str(item.get(l_key, "Unknown")),
                        "value": float(str(item.get(v_key, 0)).replace('$', '').replace(',', ''))
                    })
                except: continue
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON format")

    # --- Parse Excel ---
    elif filename.lower().endswith((".xlsx", ".xls")) or "spreadsheet" in file_type or "excel" in file_type:
        import pandas as pd
        try:
            df = pd.read_excel(io.BytesIO(content))
            df = df.dropna(how='all') # Drop completely empty rows
            
            if len(df) > 0:
                headers = list(df.columns)
                label_key = next((h for h in headers if str(h).lower() in ["label", "name", "category", "item"]), headers[0])
                value_key = next((h for h in headers if str(h).lower() in ["value", "amount", "count", "quantity", "price"]), None)
                
                if not value_key:
                    for h in headers:
                        if h != label_key:
                            try:
                                pd.to_numeric(df[h].replace('[\$,]', '', regex=True))
                                value_key = h
                                break
                            except: continue
                
                if not value_key and len(headers) > 1:
                    value_key = headers[1]

                for _, row in df.iterrows():
                    try:
                        raw_val = str(row[value_key] if value_key else 0).replace('$', '').replace(',', '')
                        data_rows.append({
                            "label": str(row[label_key] if label_key in row else "Unknown"),
                            "value": float(raw_val or 0)
                        })
                    except (ValueError, TypeError):
                        continue
            else:
                 raise HTTPException(status_code=400, detail="Excel file is empty")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Excel format: {str(e)}")

    # --- Parse XML (Simple) ---
    elif filename.lower().endswith(".xml") or "xml" in file_type:
        import xml.etree.ElementTree as ET
        try:
            tree = ET.parse(io.BytesIO(content))
            root = tree.getroot()
            # Very basic assumption: <item><label>A</label><value>10</value></item>
            for child in root:
                l_text = "Unknown"
                v_val = 0.0
                for sub in child:
                    if sub.tag.lower() in ["label", "name"]: l_text = sub.text
                    if sub.tag.lower() in ["value", "amount"]: 
                        try: v_val = float(str(sub.text).replace('$', '').replace(',', ''))
                        except: pass
                data_rows.append({"label": l_text, "value": v_val})
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Invalid XML format: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_type} (file: {filename})")

    if not data_rows and filename:
         raise HTTPException(status_code=400, detail="No valid data could be extracted from the file. Please ensure it has at least one numeric column.")

    # --- Save file in DB ---
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO uploads (filename, file_data) VALUES (%s, %s) RETURNING id",
            (filename, content),
        )
        file_id = cur.fetchone()[0]
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

    return {
        "file_id": file_id,
        "data": data_rows[:1000] if len(data_rows) > 1000 else data_rows
    }

@router.get("/upload/{file_id}")
def get_file_info(file_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT filename FROM uploads WHERE id = %s", (file_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="File not found")
        return {"filename": result[0]}
    finally:
        cur.close()
        conn.close()


def _parse_file_to_rows(filename: str, content: bytes) -> list[dict]:
    """Re-parse raw file bytes into a list of dicts preserving all original columns."""
    import json
    import pandas as pd
    import io

    data_rows = []
    file_lower = filename.lower()

    if file_lower.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(content))
            # we must convert to object type first, otherwise pandas will keep NaN in float columns
            df = df.astype(object).replace([float('inf'), float('-inf')], None)
            df = df.where(pd.notnull(df), None)
            data_rows = df.to_dict(orient='records')
        except Exception as e:
            print(f"Error parsing CSV with pandas: {e}")

    elif file_lower.endswith(".json"):
        json_data = json.loads(content)
        if isinstance(json_data, dict):
            json_data = [json_data]
        data_rows = json_data

    elif file_lower.endswith((".xlsx", ".xls")):
        try:
            df = pd.read_excel(io.BytesIO(content))
            df = df.astype(object).replace([float('inf'), float('-inf')], None)
            df = df.where(pd.notnull(df), None)
            data_rows = df.to_dict(orient='records')
        except Exception as e:
            print(f"Error parsing Excel with pandas: {e}")

    return data_rows


@router.get("/upload/{file_id}/columns")
def get_file_columns(file_id: int):
    """Return all column names from the uploaded file stored in the database."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT filename, file_data FROM uploads WHERE id = %s", (file_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="File not found")
        filename, file_data = result
    finally:
        cur.close()
        conn.close()

    # file_data may be memoryview or bytes
    content = bytes(file_data) if not isinstance(file_data, bytes) else file_data
    rows = _parse_file_to_rows(filename, content)
    if not rows:
        return {"columns": []}
    return {"columns": list(rows[0].keys())}


@router.get("/upload/{file_id}/rows")
def get_file_rows(file_id: int, sample: bool = False):
    """Return parsed rows from the uploaded file. If sample=True, returns at most 5000 rows."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT filename, file_data FROM uploads WHERE id = %s", (file_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="File not found")
        filename, file_data = result
    finally:
        cur.close()
        conn.close()

    content = bytes(file_data) if not isinstance(file_data, bytes) else file_data
    rows = _parse_file_to_rows(filename, content)
    total_count = len(rows)
    
    if sample and total_count > 5000:
        import pandas as pd
        df = pd.DataFrame(rows)
        # Take a representative sample: calculate step to get roughly 5000 points
        step = max(1, total_count // 5000)
        df_sampled = df.iloc[::step].head(5000)
        df_sampled = df_sampled.astype(object).replace([float('inf'), float('-inf')], None)
        df_sampled = df_sampled.where(pd.notnull(df_sampled), None)
        rows = df_sampled.to_dict(orient='records')
        
    return {"rows": rows, "total_rows": total_count}
