from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Any
import logging
from routers.email import send_stats_email_logic, send_detailed_stats_email_logic

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Attendance Email and Chat API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for email (remain the same)
class SummaryStats(BaseModel):
    week: str
    totalHours: float
    workingDays: int
    absentDays: int
    missedPunches: int

class DetailsStats(BaseModel):
    missedPunchDetails: List[Dict[str, Any]]
    absenceDetails: List[Dict[str, Any]]
    dailyStatus: List[Dict[str, Any]]

class EmployeeData(BaseModel):
    email: EmailStr
    employeeName: str
    month: str
    stats: Dict[str, Any]  # Contains summary, details, appreciationMessage

class SummaryEmailRequest(BaseModel):
    email: EmailStr
    employeeName: str
    month: str
    stats: Dict[str, Any]  # Contains summary, details, appreciationMessage

class DetailedEmailRequest(BaseModel):
    employees: List[EmployeeData]  # Handles array of employees

# API endpoint for sending summary email
@app.post("/api/send-stats-email", response_model=dict)
async def send_stats_email(data: SummaryEmailRequest):
    try:
        result = await send_stats_email_logic(data)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in send_stats_email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# API endpoint for sending detailed stats email
@app.post("/api/send-detailed-stats-email", response_model=dict)
async def send_detailed_stats_email(data: DetailedEmailRequest):
    try:
        logger.info(f"Received detailed email payload: {data.model_dump()}")
        result = await send_detailed_stats_email_logic(data)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in send_detailed_stats_email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)