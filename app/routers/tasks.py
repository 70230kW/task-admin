from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=List[schemas.TaskOut])
def read_tasks(
    customer: Optional[str] = None,
    assignee: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tasks = crud.list_tasks(db, customer=customer, assignee=assignee, tag=tag, status=status, q=q)
    return [crud.task_to_out(t) for t in tasks]


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(data: schemas.TaskCreate, db: Session = Depends(get_db)):
    task = crud.create_task(db, data)
    return crud.task_to_out(task)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def read_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    return crud.task_to_out(task)


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, data: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    task = crud.update_task(db, task, data)
    return crud.task_to_out(task)


@router.patch("/{task_id}/status", response_model=schemas.TaskOut)
def update_status(task_id: int, data: schemas.TaskStatusUpdate, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    task = crud.update_task(db, task, schemas.TaskUpdate(status=data.status))
    return crud.task_to_out(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    crud.delete_task(db, task)
    return None
