from app.db.database import get_connection

def init_chat_db():
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Create conversations table if it doesn't exist
        # We store messages as a JSON array for simplicity
        cur.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                title TEXT DEFAULT 'New Chat',
                messages JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Create index on user_id for faster sidebar loading
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
        """)

        conn.commit()
        print("Chat database initialized successfully.")
    except Exception as e:
        print(f"Error initializing chat database: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    init_chat_db()
