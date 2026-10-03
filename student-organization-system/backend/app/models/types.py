import uuid
from sqlalchemy.types import TypeDecorator, BINARY


class GUID(TypeDecorator):
    """Platform-independent GUID type for SQLAlchemy.
    Stores UUIDs as raw 16-byte BINARY(16) in MySQL 8+.
    Returns standard string UUIDs in Python/FastAPI.
    """
    impl = BINARY(16)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif isinstance(value, uuid.UUID):
            return value.bytes
        elif isinstance(value, bytes):
            return value
        elif isinstance(value, str):
            return uuid.UUID(value).bytes
        else:
            raise ValueError(f"Invalid UUID value: {value}")

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, bytes):
            return str(uuid.UUID(bytes=value))
        return str(value)
