from os import environ as env

from pydantic import BaseModel, Field


from .database import DbConfig


class Config(BaseModel):
    database: DbConfig = Field(default_factory=lambda: DbConfig(**env))


config = Config()
