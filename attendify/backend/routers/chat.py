from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

router = APIRouter()

# Pydantic models for chat
class ChatRequest(BaseModel):
    query: str

class Action(BaseModel):
    intent: str | None
    filters: dict
    message_to_frontend: str | None = None

class ChatResponse(BaseModel):
    actions: list[Action]
    error: str | None = None

async def analyze_query(query: str):
    """Analyzes the user query using Gemini to determine intent and filters,
    ensuring dates in filters are in YYYY-MM-DD format if present.
    """
    try:
        prompt =prompt = f"""
You are an AI assistant designed to understand user queries about attendance data. Your goal is to identify all **intents** within the query and extract the relevant **filters** for each intent as a JSON object. You should return a JSON array of actions, where each action corresponds to an identified intent and has 'intent', 'filters' (with dates inYYYY-MM-DD format if applicable), and a 'message_to_frontend' briefly describing the action.

Here's how you should approach it:

1. **Identify all Intents:** Determine all the distinct requests or questions within the user's query.
  a.) if the intent is not focused on specific point and related analyzing part of the data, then the intent should be 'analytics'
2. **Extract Filters for Each Intent:** For each identified intent, extract the specific criteria that apply to it.
3. **Format Dates:** If a date is mentioned, parse it and return it in YYYY-MM-DD format. Assume the year is 2025 if not specified. Use keywords like 'today', 'yesterday', 'last monday', etc., if present.
4. **Format Names:** Any employee names should be returned in **Title Case**.


Here are some examples:

- Query: "What is Amitesh's status on June 1st?"
  Actions: [{{"intent": "attendance_status", "filters": {{"employee_name": "Amitesh Sharma", "date": "2025-06-01"}}, "message_to_frontend": "Get the attendance status for Amitesh Sharma on 2025-06-01."}}]

- Query: "Reason for Priya's absence last Monday?"
  Actions: [{{"intent": "why_status", "filters": {{"employee_name": "Priya Sharma", "date": "2025-05-26"}}, "message_to_frontend": "Explain why Priya Sharma was absent on 2025-05-26."}}]

- Query: "Who was absent yesterday?"
  Actions: [{{"intent": "list_employees", "filters": {{"status": "Absent", "date": "2025-06-02"}}, "message_to_frontend": "List employees who were absent on 2025-06-02."}}]

- Query: "List employees with partial day on April 29."
  Actions: [{{"intent": "list_partial_day", "filters": {{"date": "2025-04-29"}}, "message_to_frontend": "List employees with a partial day on 2025-04-29."}}]

- Query: "What is the attendance status of Amitesh Sharma on May 4th and list all the employees present on May 4th?"
  Actions: [
    {{"intent": "attendance_status", "filters": {{"employee_name": "Amitesh Sharma", "date": "2025-05-04"}}, "message_to_frontend": "Get the attendance status for Amitesh Sharma on 2025-05-04."}},
    {{"intent": "list_employees", "filters": {{"status": "Present", "date": "2025-05-04"}}, "message_to_frontend": "List all employees present on 2025-05-04."}}
  ]

-Query: "what is the working hour of Amitesh Sharma on may 4th?"
Actions: [
  {{"intent": "working_hour", "filters": {{"employee_name": "Amitesh Sharma", "date": "2025-05-04"}}, "message_to_frontend": "Get the working hour for Amitesh Sharma on 2025-05-04."}}
]

- Query: "Tell me the employees greater than working hour 9 on 2025-05-12?"
  Actions: [{{"intent": "working_hour", "filters": {{"hours": 9, "date": "2025-05-12", "comparison": "greater_than"}}, "message_to_frontend": "List employees with working hours greater than 9 on 2025-05-12."}}]

- Query: "Show employees with working hours less than 8?"
  Actions: [{{"intent": "working_hour", "filters": {{"hours": 8, "comparison": "less_than"}}, "message_to_frontend": "Show employees with working hours less than 8."}}]

 Query: "Analyze the attendance status of Amitesh Sharma for May."
  Actions: [{{
    "intent": "analytics",
    "filters": {{"employee_name": "Amitesh Sharma", "start_date": "2025-05-01", "end_date": "2025-05-31", "analysis_type": "status_distribution"}},
    "message_to_frontend": "Analyzing attendance status for Amitesh Sharma in May."
  }}]

- Query: "Show me a chart of working hours for all employees in the last week."
  Actions: [{{
    "intent": "analytics",
    "filters": {{"employee_name": null, "start_date": "2025-05-28", "end_date": "2025-06-04", "analysis_type": "working_hours"}},
    "message_to_frontend": "Displaying daily working hours for all employees for the last week."
  }}]

  
For the following query:
"{query}"

Return a JSON array of **Actions**. Ensure:
- Dates are in YYYY-MM-DD format.
- Employee names are in Title Case.

If no clear intent, return an empty array.
"""

        response = model.generate_content(prompt)

        if response.prompt_feedback and response.prompt_feedback.block_reason:
            return {"actions": [], "error": f"Gemini blocked the query: {response.prompt_feedback.block_reason}"}

        gemini_output = response.text.strip()

        start_index = gemini_output.find('[')
        end_index = gemini_output.rfind(']')
        if start_index != -1 and end_index != -1 and start_index < end_index:
            json_str = gemini_output[start_index:end_index+1]
            try:
                parsed_data = json.loads(json_str)
                if isinstance(parsed_data, list):
                    actions = []
                    for item in parsed_data:
                        try:
                            action = Action(**item)
                            actions.append(action)
                        except Exception as e:
                            print(f"Error parsing action: {item} - {e}")
                    return {"actions": actions}
                else:
                    return {"actions": [], "error": "Gemini's response was not a JSON array."}
            except json.JSONDecodeError:
                return {"actions": [], "error": "Could not parse Gemini's JSON output."}
        else:
            return {"actions": [], "error": "Could not find JSON array in Gemini's response."}

    except Exception as e:
        return {"actions": [], "error": str(e)}

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Accepts a user query and returns a list of actions."""
    analysis_result = await analyze_query(request.query)
    return ChatResponse(**analysis_result)