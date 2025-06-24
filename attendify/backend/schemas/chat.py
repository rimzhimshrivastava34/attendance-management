from pydantic import BaseModel
from typing import Union, List, Dict

class ChatRequest(BaseModel):
    query: str
    attendance_data: Union[str, List[Dict[str, str]]]  # support JSON or string

class ChatResponse(BaseModel):
    response: str
