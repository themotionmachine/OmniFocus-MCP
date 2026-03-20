"""
Processing pipeline — T009.
Chains validate_email and format_currency; imported by src/app.py.
"""
from validator import validate_email, validate_phone
from formatter import format_currency, format_date


class Pipeline:
    """Simple data-processing pipeline that validates and formats."""

    def process(self, email: str, amount: float, currency: str = "USD",
                phone: str = "", dt=None, date_fmt: str = "%Y-%m-%d"):
        """Validate inputs and format outputs. Returns a result dict."""
        result = {
            "email_valid": validate_email(email),
            "formatted_amount": format_currency(amount, currency),
        }
        if phone:
            result["phone_valid"] = validate_phone(phone)
        if dt is not None:
            result["formatted_date"] = format_date(dt, date_fmt)
        return result
