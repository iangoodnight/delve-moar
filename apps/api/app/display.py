"""Pure display-formatting helpers with no application-level dependencies.

Kept separate from app.utils so that schema modules can import these without
creating a circular dependency (schemas → utils → schemas).
"""

from decimal import Decimal

_CR_DISPLAY: dict[Decimal, str] = {
    Decimal("0.125"): "1/8",
    Decimal("0.25"): "1/4",
    Decimal("0.5"): "1/2",
}


def cr_display(value: float | int) -> str:
    """Convert a numeric CR value to a human-friendly display string.

    Uses fractional notation for common fractional CRs (1/8, 1/4, 1/2) and
    otherwise displays the numeric value directly.

    Args:
        value: The numeric CR value to convert.

    Returns:
        A string representation of the CR, using fractional notation for 1/8,
        1/4, and 1/2 where appropriate.

    Example:
        >>> cr_display(0.125)
        '1/8'
        >>> cr_display(0.25)
        '1/4'
        >>> cr_display(0.5)
        '1/2'
        >>> cr_display(5)
        '5'
    """
    d = Decimal(str(value)).quantize(Decimal("0.001"))
    return _CR_DISPLAY.get(d, str(int(value) if value == int(value) else value))
