from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/tags", response_model=List[str])
def list_tags(db: Session = Depends(get_db)):
    return [t.name for t in db.query(models.Tag).order_by(models.Tag.name).all()]


@router.get("/customers", response_model=List[str])
def list_customers(db: Session = Depends(get_db)):
    rows = db.query(models.Task.customer).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@router.get("/assignees", response_model=List[str])
def list_assignees(db: Session = Depends(get_db)):
    rows = db.query(models.Task.assignee).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


@router.get("/statuses", response_model=List[str])
def list_statuses():
    return models.STATUS_CHOICES
