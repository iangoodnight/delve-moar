"""Base schema class shared by all API response models."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AppSchema(BaseModel):
    """Base config for all schemas in the app.

    Ensure JSON responses are camelCase and allow population by field name
    (snake_case) for ease of use in Python code.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
