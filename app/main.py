from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import models
from .database import SessionLocal, engine
from .routers import meta, tasks
from .seed import seed_if_empty

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

# サーバーレス環境ではASGIのlifespanイベントが呼ばれない実行系もあるため、
# DB初期化とシードはモジュール読み込み時（コールドスタート時）に必ず実行する。
models.Base.metadata.create_all(bind=engine)

_db = SessionLocal()
try:
    seed_if_empty(_db)
finally:
    _db.close()

app = FastAPI(title="タスク管理サイト")

app.include_router(tasks.router)
app.include_router(meta.router)

# Vercelのデプロイ構成によっては静的ファイルが関数バンドルに含まれず、
# ディレクトリが存在しない場合があるため防御的にチェックする。
if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index():
    index_file = STATIC_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {"status": "ok", "message": "task-admin API"}
