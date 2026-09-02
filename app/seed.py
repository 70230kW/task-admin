from datetime import date, timedelta

from sqlalchemy.orm import Session

from . import crud, models, schemas

_TODAY = date.today()

SAMPLE_TASKS = [
    dict(
        name="Webサイトリニューアル提案書作成",
        customer="株式会社アルファ",
        assignee="田中 太郎",
        due_date=_TODAY + timedelta(days=2),
        progress=60,
        status="進行中",
        tags=["営業", "資料作成"],
    ),
    dict(
        name="月次請求書の発行",
        customer="ベータ商事株式会社",
        assignee="佐藤 花子",
        due_date=_TODAY - timedelta(days=3),
        progress=40,
        status="進行中",
        tags=["経理"],
    ),
    dict(
        name="新機能の要件定義レビュー",
        customer="ガンマ工業株式会社",
        assignee="鈴木 一郎",
        due_date=_TODAY + timedelta(days=1),
        progress=80,
        status="レビュー中",
        tags=["開発", "要件定義"],
    ),
    dict(
        name="キックオフミーティング設定",
        customer="デルタ物流株式会社",
        assignee="田中 太郎",
        due_date=_TODAY,
        progress=10,
        status="未着手",
        tags=["営業"],
    ),
    dict(
        name="サーバー移行作業",
        customer="株式会社アルファ",
        assignee="伊藤 健",
        due_date=_TODAY + timedelta(days=10),
        progress=25,
        status="進行中",
        tags=["インフラ", "開発"],
    ),
    dict(
        name="契約書の最終確認",
        customer="イプシロン株式会社",
        assignee="佐藤 花子",
        due_date=_TODAY - timedelta(days=1),
        progress=90,
        status="レビュー中",
        tags=["法務"],
    ),
    dict(
        name="デザインカンプ修正対応",
        customer="ガンマ工業株式会社",
        assignee="高橋 美咲",
        due_date=_TODAY + timedelta(days=5),
        progress=50,
        status="進行中",
        tags=["デザイン"],
    ),
    dict(
        name="納品物の最終テスト",
        customer="デルタ物流株式会社",
        assignee="鈴木 一郎",
        due_date=_TODAY + timedelta(days=14),
        progress=0,
        status="未着手",
        tags=["開発", "QA"],
    ),
    dict(
        name="定例報告資料の共有",
        customer="ベータ商事株式会社",
        assignee="高橋 美咲",
        due_date=None,
        progress=100,
        status="完了",
        tags=["資料作成"],
    ),
    dict(
        name="問い合わせ対応フロー整備",
        customer="イプシロン株式会社",
        assignee="伊藤 健",
        due_date=_TODAY + timedelta(days=30),
        progress=15,
        status="未着手",
        tags=["カスタマーサポート"],
    ),
    dict(
        name="社内勉強会の準備",
        customer="",
        assignee="田中 太郎",
        due_date=_TODAY + timedelta(days=7),
        progress=35,
        status="進行中",
        tags=["社内"],
    ),
    dict(
        name="請求システムのバグ修正",
        customer="株式会社アルファ",
        assignee="鈴木 一郎",
        due_date=_TODAY - timedelta(days=7),
        progress=100,
        status="完了",
        tags=["開発", "バグ修正"],
    ),
]


def seed_if_empty(db: Session) -> None:
    if db.query(models.Task).count() > 0:
        return
    for item in SAMPLE_TASKS:
        crud.create_task(db, schemas.TaskCreate(**item))
