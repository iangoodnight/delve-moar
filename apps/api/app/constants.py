"""Application-wide domain constants."""

# The source namespace for the official SRD 5.1 content.  All seeded catalog
# entries are stored under this namespace.  Homebrew content uses the
# "user:{user_id}" pattern.
SRD_NAMESPACE: str = "srd-5.1"

# Stable slug for the system SRD book (the collection holding all SRD
# content). Distinct axis from the namespace above: provenance vs. collection.
SRD_BOOK_SLUG: str = "srd-5.1"

# Name of the default book auto-created for each user (a placeholder title;
# users can rename it).
DEFAULT_BOOK_NAME: str = "My Collection"
