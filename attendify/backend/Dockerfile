FROM python:3.10-slim

WORKDIR /app

COPY . .

# Install required packages
RUN pip install --no-cache-dir fastapi uvicorn fastapi-mail python-multipart jinja2 email-validator aiosmtplib

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
