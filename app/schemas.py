from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    customer: Optional[str] = ""
    assignee: Optional[str] = ""
    due_date: Optional[date] = None
    progress: int = Field(0, ge=0, le=100)
    status: str = "未着手"
    memo: Optional[str] = ""
    tags: List[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    customer: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[date] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    status: Optional[str] = None
    memo: Optional[str] = None
    tags: Optional[List[str]] = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskOut(BaseModel):
    id: int
    name: str
    customer: str
    assignee: str
    due_date: Optional[date] = None
    progress: int
    status: str
    memo: str
    tags: List[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
