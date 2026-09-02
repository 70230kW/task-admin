# タスク管理サイト

Python (FastAPI) + SQLite + バニラJS で構築した、高機能なタスク管理Webアプリです。

## 機能（タブ構成）

- **タスクリスト**: タスク名 / タグ / 顧客名 / 担当者名 / 期日 / 進捗率 / ステータスを一覧表示。検索・絞り込み・並び替えに対応。
- **カンバンボード**: 未着手 / 進行中 / レビュー中 / 完了 の4カラムで、ドラッグ＆ドロップによりステータスを変更可能。
- **期日管理**: 期限超過 / 本日 / 今週中 / それ以降 / 期日未設定 / 完了済み にタスクをグルーピングして表示。
- **顧客別ビュー**: 顧客ごとにタスク数・平均進捗率・期限超過数を集計して表示。
- **担当者別ビュー**: 担当者ごとの負荷状況を同様に集計して表示。

いずれのタブからもタスクをクリックすると編集モーダルが開き、内容の編集・削除ができます。

## セットアップ・起動方法

```bash
cd task-admin
python -m venv .venv
source .venv/bin/activate  # Windowsの場合: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload
```

起動後、ブラウザで http://127.0.0.1:8000 にアクセスしてください。

初回起動時、DBが空の場合はサンプルタスクが自動的に投入されます。

## Vercelへのデプロイ

このリポジトリはVercelの Python Serverless Functions を使ってそのままデプロイできます。

### 事前準備: DBの用意

Vercelの実行環境は `/tmp` 以外のファイルシステムが読み取り専用のため、SQLiteファイルを永続化できません。
本番運用ではPostgres（[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) や [Neon](https://neon.tech/) など）を用意し、接続文字列を控えてください。

> `DATABASE_URL` を設定しない場合でも `/tmp` にSQLiteを作成して動作はしますが、コールドスタートのたびにデータがリセットされるため、動作確認用途に限ります。

### デプロイ手順

1. Vercel CLIを導入してログインする
   ```bash
   npm i -g vercel
   vercel login
   ```
2. プロジェクトディレクトリでリンク（初回のみ）
   ```bash
   cd task-admin
   vercel link
   ```
3. 環境変数 `DATABASE_URL` をVercelプロジェクトに設定する（Vercelダッシュボードの Settings → Environment Variables、またはCLI）
   ```bash
   vercel env add DATABASE_URL production
   # Postgresの接続文字列 (例: postgres://user:pass@host/dbname) を入力
   ```
4. デプロイする
   ```bash
   vercel --prod
   ```

GitHubリポジトリと連携すれば、push時に自動デプロイされる設定も可能です（Vercelダッシュボードの「Import Project」から連携）。

### 構成の仕組み

- `api/index.py`: Vercelのサーバーレス関数エントリポイント。`app.main:app`（FastAPIアプリ）をそのまま公開する。
- `vercel.json`: `/api/*` へのリクエストを `api/index.py` にルーティングし、`/` は `static/index.html` を返すよう設定。`/static/*` のJS/CSSはVercelの静的ホスティングがそのまま配信する。
- `app/database.py`: `DATABASE_URL` が設定されていればPostgres等に接続し、未設定時はローカル用SQLite（Vercel上では `/tmp`）にフォールバックする。

## ディレクトリ構成

```
task-admin/
├── api/
│   └── index.py        # Vercelサーバーレス関数のエントリポイント
├── app/
│   ├── main.py        # FastAPIアプリ本体
│   ├── database.py     # DB接続設定 (SQLite / Postgres)
│   ├── models.py       # SQLAlchemyモデル (Task / Tag)
│   ├── schemas.py       # Pydanticスキーマ
│   ├── crud.py          # DB操作ロジック
│   ├── seed.py           # サンプルデータ投入
│   └── routers/
│       ├── tasks.py     # タスクCRUD API
│       └── meta.py      # 顧客/担当者/タグ/ステータス一覧API
├── static/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── data/                 # SQLiteのDBファイル格納先 (gitignore対象)
├── vercel.json            # Vercelのルーティング設定
└── requirements.txt
```

## API概要

| メソッド | パス                     | 内容                     |
|----------|--------------------------|--------------------------|
| GET      | /api/tasks                | タスク一覧取得（絞り込み可） |
| POST     | /api/tasks                | タスク新規作成             |
| GET      | /api/tasks/{id}            | タスク詳細取得              |
| PUT      | /api/tasks/{id}            | タスク更新                 |
| PATCH    | /api/tasks/{id}/status     | ステータスのみ更新（カンバン用）|
| DELETE   | /api/tasks/{id}            | タスク削除                 |
| GET      | /api/meta/customers        | 顧客名一覧                 |
| GET      | /api/meta/assignees        | 担当者名一覧                |
| GET      | /api/meta/tags             | タグ一覧                   |
| GET      | /api/meta/statuses         | ステータス一覧              |

DBはSQLiteファイル (`data/tasks.db`) に保存されます。データをリセットしたい場合はこのファイルを削除して再起動してください。
