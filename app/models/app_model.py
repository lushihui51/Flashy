import re

from sqlalchemy.orm import declared_attr
from sqlmodel import SQLModel


def _camel_to_snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


class AppModel(SQLModel):
    @declared_attr.directive
    def __tablename__(cls) -> str:
        return _camel_to_snake(cls.__name__)
