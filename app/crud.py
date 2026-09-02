from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


def get_or_create_tags(db: Session, tag_names: List[str]) -> List[models.Tag]:
    tags = []
    seen = set()
    for raw in tag_names:
        name = raw.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        tag = db.query(models.Tag).filter(models.Tag.name == name).first()
        if not tag:
            tag = models.Tag(name=name)
            db.add(tag)
            db.flush()
        tags.append(tag)
    return tags


def task_to_out(task: models.Task) -> schemas.TaskOut:
    return schemas.TaskOut(
        id=task.id,
        name=task.name,
        customer=task.customer or "",
        assignee=task.assignee or "",
        due_date=task.due_date,
        progress=task.progress,
        status=task.status,
        memo=task.memo or "",
        tags=sorted(t.name for t in task.tags),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def list_tasks(
    db: Session,
    customer: Optional[str] = None,
    assignee: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
) -> List[models.Task]:
    query = db.query(models.Task)
    if customer:
        query = query.filter(models.Task.customer == customer)
    if assignee:
        query = query.filter(models.Task.assignee == assignee)
    if status:
        query = query.filter(models.Task.status == status)
    if q:
        query = query.filter(models.Task.name.contains(q))
    if tag:
        query = query.join(models.Task.tags).filter(models.Tag.name == tag)
    tasks = query.all()
    tasks.sort(key=lambda t: (t.due_date is None, t.due_date or t.due_date, t.id))
    return tasks


def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.get(models.Task, task_id)


def create_task(db: Session, data: schemas.TaskCreate) -> models.Task:
    task = models.Task(
        name=data.name,
        customer=data.customer or "",
        assignee=data.assignee or "",
        due_date=data.due_date,
        progress=data.progress,
        status=data.status,
        memo=data.memo or "",
    )
    task.tags = get_or_create_tags(db, data.tags)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: models.Task, data: schemas.TaskUpdate) -> models.Task:
    update_data = data.model_dump(exclude_unset=True)
    tags = update_data.pop("tags", None)
    for key, value in update_data.items():
        setattr(task, key, value)
    if tags is not None:
        task.tags = get_or_create_tags(db, tags)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: models.Task) -> None:
    db.delete(task)
    db.commit()
