from config.gemini import configure_gemini

model = configure_gemini()

def format_prompt(attendance_data, query: str) -> str:
    # Convert data to readable format if it's in JSON list
    if isinstance(attendance_data, list):
        attendance_lines = ["\n".join([f"{k}: {v}" for k, v in entry.items()]) for entry in attendance_data]
        attendance_text = "\n\n".join(attendance_lines)
    else:
        attendance_text = str(attendance_data)

    prompt = f"""You are an AI assistant analyzing student attendance.
Here is the attendance data:

{attendance_text}

Now, answer the following query based on the attendance data:
{query}
"""
    return prompt

def get_gemini_response(query: str, attendance_data) -> str:
    prompt = format_prompt(attendance_data, query)
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        raise RuntimeError(f"Gemini API Error: {str(e)}")
