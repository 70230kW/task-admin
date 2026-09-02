import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _build_engine():
    database_url = os.environ.get("DATABASE_URL", "").strip()

    if database_url:
        # Vercel PostgresやNeon等が発行するURLは `postgres://` 形式のことがあるが、
        # SQLAlchemyの標準ドライバ名は `postgresql://` を要求するため補正する。
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        # サーバーレス環境では同時に張れるDBコネクション数が限られるため、
        # プールを小さく保ち、切れたコネクションは自動で張り直す。
        return create_engine(
            database_url,
            pool_pre_ping=True,
            pool_size=1,
            max_overflow=2,
            pool_recycle=300,
        )

    # DATABASE_URL未設定時はローカル開発用にSQLiteを使用する。
    # Vercelの本番実行環境は /tmp 以外が読み取り専用なので、
    # Vercel上でDATABASE_URLを設定し忘れた場合は /tmp に一時的なDBを作る
    # （コールドスタートのたびにリセットされるため本番運用には非推奨）。
    if os.environ.get("VERCEL"):
        db_path = "/tmp/tasks.db"
    else:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data")
        os.makedirs(data_dir, exist_ok=True)
        db_path = os.path.join(data_dir, "tasks.db")

    return create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
