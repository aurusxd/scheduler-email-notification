from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    """Schema for creating a new booking."""

    user_id: int = Field(
        ...,
        description="ID of the User which need send notification",
    )
    message: str = Field(..., description="ID of the resource to book")
