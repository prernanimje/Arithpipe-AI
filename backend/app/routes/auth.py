from fastapi import APIRouter, HTTPException
import bcrypt
from app.db.database import get_connection
from app.schemas.user import SignupSchema, LoginSchema

router = APIRouter()

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify password with bcrypt."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

@router.post("/auth/signup")
def signup(user: SignupSchema):
    name = user.name.strip()
    email = user.email.lower().strip()
    password = user.password

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long")
    if not password or len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    conn = get_connection()
    cur = conn.cursor()

    try:
        hashed_pwd = hash_password(password)
        cur.execute(
            """
            INSERT INTO users (name, email, password, login_count)
            VALUES (%s, %s, %s, 0)
            RETURNING id, name, email
            """,
            (name, email, hashed_pwd),
        )
        new_user = cur.fetchone()
        conn.commit()
        return {
            "id": new_user[0],
            "name": new_user[1],
            "email": new_user[2],
            "message": "Signup successful",
            "is_first_login": True,
        }
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already registered. Please log in.")
    finally:
        cur.close()
        conn.close()


@router.post("/auth/login")
def login(user: LoginSchema):
    email = user.email.lower().strip()
    password = user.password

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id, name, email, password, COALESCE(login_count, 0), last_login 
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,),
        )

        user_row = cur.fetchone()

        if not user_row:
            cur.execute(
                """
                INSERT INTO login_history (email, login_time, status)
                VALUES (%s, CURRENT_TIMESTAMP, 'FAILED')
                """,
                (email,),
            )
            conn.commit()
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id, name, user_email, stored_password, current_login_count, last_login = user_row

        # Verify password: check bcrypt hash first
        password_valid = verify_password(password, stored_password)
        needs_migration = False

        if not password_valid:
            # Check for legacy plaintext passwords and automatically upgrade them
            if stored_password == password:
                password_valid = True
                needs_migration = True
            else:
                cur.execute(
                    """
                    INSERT INTO login_history (user_id, email, login_time, status)
                    VALUES (%s, %s, CURRENT_TIMESTAMP, 'FAILED')
                    """,
                    (user_id, email),
                )
                conn.commit()
                raise HTTPException(status_code=401, detail="Invalid email or password")

        # Upgrade legacy unhashed password to bcrypt
        if needs_migration:
            upgraded_hash = hash_password(password)
            cur.execute("UPDATE users SET password = %s WHERE id = %s", (upgraded_hash, user_id))

        is_first_time = (current_login_count == 0 or last_login is None)

        # Update login metrics
        cur.execute(
            """
            UPDATE users
            SET login_count = COALESCE(login_count, 0) + 1,
                last_login = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (user_id,),
        )

        # Record successful login in history
        cur.execute(
            """
            INSERT INTO login_history (user_id, email, login_time, status)
            VALUES (%s, %s, CURRENT_TIMESTAMP, 'SUCCESS')
            """,
            (user_id, email),
        )
        conn.commit()

        return {
            "id": user_id,
            "name": name,
            "email": user_email,
            "is_first_login": is_first_time,
            "login_count": current_login_count + 1,
            "last_login": str(last_login) if last_login else None,
        }
    finally:
        cur.close()
        conn.close()


@router.get("/auth/history/{user_id}")
def get_user_login_history(user_id: int):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, login_time, status FROM login_history
            WHERE user_id = %s
            ORDER BY login_time DESC
            LIMIT 20
            """,
            (user_id,),
        )
        rows = cur.fetchall()
        return [{"id": r[0], "login_time": str(r[1]), "status": r[2]} for r in rows]
    finally:
        cur.close()
        conn.close()
