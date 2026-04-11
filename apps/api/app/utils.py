"""Utility functions for the application."""

from decimal import Decimal

_CR_DISPLAY: dict[Decimal, str] = {
    Decimal("0.125"): "1/8",
    Decimal("0.25"): "1/4",
    Decimal("0.5"): "1/2",
}


def cr_display(value: float | int) -> str:
    """Convert a numeric CR value to a human-friendly display string.

    Uses fractional notation for common fractional CRs (1/8, 1/4, 1/2) and
    otherwise displays the numeric value directly. This is intended for display
    purposes only (e.g., in progress output) and does not affect how CR values
    are stored.

    Args:
        value: The numeric CR value to convert.

    Returns:
        A string representation of the CR, using fractional notation for 1/8,
        1/4, and 1/2 where appropriate.

    Note:
        This function is intended for display purposes only (e.g., in progress
        output) and does not affect how CR values are stored in the database.

    Usage:
        print(f"CR: {cr_display(0.125)}")  # Output: CR: 1/8
        print(f"CR: {cr_display(0.25)}")   # Output: CR: 1/4
        print(f"CR: {cr_display(0.5)}")    # Output: CR: 1/2
        print(f"CR: {cr_display(1)}")      # Output: CR: 1
        print(f"CR: {cr_display(2.5)}")    # Output: CR: 2.5
    """
    d = Decimal(str(value)).quantize(Decimal("0.001"))
    return _CR_DISPLAY.get(d, str(int(value) if value == int(value) else value))
