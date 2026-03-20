"""
Calculator — T001, T002.
All methods implemented and referenced by src/runner.py and src/app.py.
"""


class Calculator:
    """Simple arithmetic calculator."""

    def add(self, a: float, b: float) -> float:
        """Return a + b."""
        return a + b

    def subtract(self, a: float, b: float) -> float:
        """Return a - b."""
        return a - b

    def multiply(self, a: float, b: float) -> float:
        """Return a * b."""
        return a * b

    def divide(self, a: float, b: float) -> float:
        """Return a / b. Raises ZeroDivisionError if b is zero."""
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b
