from fastapi import APIRouter, HTTPException
from app.db.database import get_connection
from app.schemas.user import SignupSchema, LoginSchema

router = APIRouter()

@router.post("/auth/signup")
def signup(user: SignupSchema):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO users (name, email, password)
            VALUES (%s, %s, %s)
            """,
            (user.name, user.email, user.password),
        )
        conn.commit()
        return {"message": "Signup successful"}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        cur.close()
        conn.close()


@router.post("/auth/login")
def login(user: LoginSchema):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, name, email FROM users
        WHERE email = %s AND password = %s
        """,
        (user.email, user.password),
    )

    user_row = cur.fetchone()

    cur.close()
    conn.close()

    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "id": user_row[0],
        "name": user_row[1],
        "email": user_row[2],
    }
