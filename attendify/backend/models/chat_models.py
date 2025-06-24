from pydantic import BaseModel
from typing import List, Optional, Any

class AttendanceEntry(BaseModel):
    date: str
    employeeCode: str
    reason: str
    status: str

class ChatRequest(BaseModel):
    query: str
    attendance_data: List[AttendanceEntry]
    initialize: bool
    session_id: Optional[str] = None

class Message(BaseModel):
    sender: str
    text: str

class ChatResponse(BaseModel):
    session_id: str
    messages: List[Message]
