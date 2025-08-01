from fastapi import HTTPException
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging
import json

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Email configuration
EMAIL_ADDRESS = os.getenv("GMAIL_EMAIL")
EMAIL_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    logger.error("Email credentials not found in environment variables")
    raise HTTPException(status_code=500, detail="Email credentials not configured")

async def send_stats_email_logic(data):
    recipient_email = data.email
    employee_name = data.employeeName
    month = data.month
    summary_data = data.stats.get("summary", {})

    # Create email message
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = f"Attendance Summary Report for {employee_name} - {month}"

    # HTML email body
    body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <p>Dear {employee_name},</p>
            <p>Please find below your attendance summary for {month}:</p>
            <h3 style="color: #2563EB;">Attendance Summary</h3>
            <ul>
    """
    for key, value in summary_data.items():
        body += f"<li>{key.replace('_', ' ').title()}: {value}</li>"
    body += "</ul>"

    if "appreciationMessage" in data.stats:
        body += f"""
            <h3 style="color: #2563EB;">Appreciation</h3>
            <p style="color: #16A34A;">{data.stats['appreciationMessage']}</p>
        """

    body += """
            <p>Please contact the HR department for any questions or discrepancies.</p>
            <p>Best regards,<br>Attendance Management Team</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
        logger.info(f"Summary email sent successfully to {recipient_email}")
        return {"message": "Summary email sent successfully"}
    except Exception as e:
        logger.error(f"Failed to send summary email to {recipient_email}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

async def send_detailed_stats_email_logic(data):
    failed_emails = []
    sent_emails = 0

    for employee_data in data.employees:
        recipient_email = employee_data.email
        employee_name = employee_data.employeeName
        month = employee_data.month
        stats = employee_data.stats

        logger.info(f"Processing employee: {employee_name} ({recipient_email}) with stats type: {type(stats)}, value: {stats}")

        if isinstance(stats, str):
            try:
                stats = json.loads(stats)
                logger.info(f"Deserialized stats from string to dict: {stats}")
            except json.JSONDecodeError as e:
                logger.error(f"Invalid stats format for {recipient_email}: {str(e)}")
                failed_emails.append({"email": recipient_email, "error": "Invalid stats format"})
                continue

        summary = stats.get("summary", {})
        if isinstance(summary, str):
            try:
                summary = json.loads(summary)
                logger.info(f"Deserialized stats.summary from string to dict: {summary}")
            except json.JSONDecodeError as e:
                logger.error(f"Invalid stats.summary format for {recipient_email}: {str(e)}")
                failed_emails.append({"email": recipient_email, "error": "Invalid stats.summary format"})
                continue

        details = stats.get("details", {})
        if isinstance(details, str):
            try:
                details = json.loads(details)
                logger.info(f"Deserialized stats details from string to dict: {details}")
            except json.JSONDecodeError as e:
                logger.error(f"Invalid stats.details format for {recipient_email}: {str(e)}")
                failed_emails.append({"email": recipient_email, "error": "Failed to parse details"})
                continue

        dailyStatus = details.get("dailyStatus", [])
        if isinstance(dailyStatus, str):
            try:
                dailyStatus = json.loads(dailyStatus)
                logger.info(f"Deserialized dailyStatus from string to: {dailyStatus}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse dailyStatus for {recipient_email}: {str(e)}")
                failed_emails.append({"email": recipient_email, "error": "Failed to parse dailyStatus"})
                continue

        logger.info(f"Daily status for {recipient_email}: {json.dumps(dailyStatus, indent=2)}")

        try:
            total_hours = float(summary.get("totalHours", 0)) if summary.get("totalHours") else 0.0
            appreciation_message = stats.get("appreciationMessage", None)
            logger.info(f"Appreciation message for {recipient_email}: {appreciation_message} (totalHours: {total_hours}, type: {type(total_hours)})")
            logger.info(f"Message condition check: has_appreciation={bool(appreciation_message)}, hours_20_to_40={20 <= total_hours <= 40}, hours_above_40={total_hours > 40}")
            mapped_stats = {
                "fullDays": summary.get("workingDays", 0),
                "absentDays": summary.get("absentDays", 0),
                "missedPunches": summary.get("missedPunches", 0),
                "missedPunchDates": [
                    entry["date"] for entry in details.get("missedPunchDetails", [])
                ],
                "totalHours": total_hours,
                "appreciation": appreciation_message,
            }
        except Exception as e:
            logger.error(f"Error mapping stats for {recipient_email}: {str(e)}")
            failed_emails.append({"email": recipient_email, "error": f"Failed to map stats: {str(e)}"})
            continue

        # Create email message
        msg = MIMEMultipart()
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = recipient_email
        msg["Subject"] = f"Weekly Attendance Report for {employee_name} - {month}"

        # HTML email body with enhanced formatting
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <p style="font-size: 14px; margin-bottom: 20px;">Dear {employee_name},</p>
                <p style="font-size: 14px;">Please find your detailed attendance report for the week of {summary.get('week', 'Not specified')} ({month}):</p>

                <h3 style="color: #2563eb; font-size: 16px; margin-bottom: 10px;">Attendance Summary</h3>
                <ul style="font-size: 14px; margin-bottom: 20px; padding-left: 20px;">
                    <li>Total Hours Worked: {mapped_stats['totalHours']:.2f} hours</li>
                    <li>Full Days Worked: {mapped_stats['fullDays']}</li>
                    <li>Absent: {mapped_stats['absentDays']}</li>
                    <li>Missed Punches: {mapped_stats['missedPunches']}</li>
                </ul>

                {"<h3 style='color: #2563eb; font-size: 16px; margin-bottom: 10px;'>Missed Punch Dates</h3><ul style='font-size: 14px; margin-bottom: 20px; padding-left: 20px;'>" + "".join([f"<li>{date}</li>" for date in mapped_stats["missedPunchDates"]]) + "</ul>" if mapped_stats["missedPunchDates"] else ""}

                <h3 style="color: #2563eb; font-size: 16px; margin-bottom: 10px;">Daily Attendance Status</h3>
                {"<ul style='font-size: 14px; margin-bottom: 20px; padding-left: 20px;'>" + "".join(
                    [
                        f"<li style='margin-bottom: 5px;'>{entry.get('date', 'Not specified')}: {entry.get('reason', 'No reason provided')}.</li>"
                        if entry.get("status") in ["Working Day", "Present", "Half Day", "Work From Home", "Partial"] and entry.get("reason")
                        else f"<li style='margin-bottom: 5px;'>{entry.get('date', 'Not specified')}: {entry.get('status', 'Not provided')} ({entry.get('hours', 0):.2f} hrs).</li>"
                        for entry in sorted(dailyStatus, key=lambda x: x.get('date', '')) if isinstance(entry, dict)
                    ]
                ) + "</ul>" if dailyStatus else "<p style='font-size: 14px; margin-bottom: 20px;'>No daily status records available.</p>"}

                {
                    f"<h3 style='color: #2563eb; font-size: 16px; margin-bottom: 10px;'>Message</h3><p style='color: #16a34a; font-size: 14px; margin-bottom: 20px;'>{mapped_stats['appreciation']}</p>"
                    if mapped_stats.get("appreciation") and mapped_stats['totalHours'] > 40
                    else f"<h3 style='color: #2563eb; font-size: 16px; margin-bottom: 10px;'>Message</h3><p style='color: #d97706; font-size: 14px; margin-bottom: 20px;'>{mapped_stats['appreciation']}</p>"
                    if mapped_stats.get("appreciation") and 20 <= mapped_stats['totalHours'] <= 40
                    else ""
                }

                <p style="font-size: 14px; margin-bottom: 20px;">Please contact our HR team for any questions or discrepancies.</p>
                <p style="font-size: 14px;">Best regards,<br /><strong>Attendance Management Team</strong></p>
            </body>
        </html>
        """

        # Print the HTML email body to the console for local verification
        print(f"\n=== Email Preview for {recipient_email} ({employee_name}) ===\n")
        print(body)
        print("\n=== End of Email Preview ===\n")

        msg.attach(MIMEText(body, "html"))

        try:
            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
            logger.info(f"Detailed stats email sent successfully to {recipient_email} for {employee_name}")
            sent_emails += 1
        except Exception as e:
            logger.error(f"Failed to send detailed stats email to {recipient_email}: {str(e)}")
            failed_emails.append({"email": recipient_email, "error": str(e)})

    if failed_emails:
        logger.warning(f"Sent {sent_emails} emails successfully, but {len(failed_emails)} failed")
        raise HTTPException(
            status_code=207,
            detail={
                "message": f"Sent {sent_emails} emails successfully, but {len(failed_emails)} failed",
                "failed_emails": failed_emails
            }
        )
    logger.info(f"Successfully sent {sent_emails} detailed stats emails")
    return {"message": f"Successfully sent {sent_emails} detailed stats emails"}