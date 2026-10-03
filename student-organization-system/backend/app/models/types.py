import uuid
from sqlalchemy.types import TypeDecorator, BINARY, CHAR, String


class GUID(TypeDecorator):
    """Platform-independent GUID type for SQLAlchemy.
    Stores UUIDs as raw 16-byte BINARY(16) in MySQL 8+, and CHAR(36) in SQLite.
    Returns standard string UUIDs in Python/FastAPI.
    """
    impl = BINARY(16)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "sqlite":
            return dialect.type_descriptor(CHAR(36))
        return dialect.type_descriptor(BINARY(16))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "sqlite":
            if isinstance(value, uuid.UUID):
                return str(value)
            elif isinstance(value, bytes):
                return str(uuid.UUID(bytes=value))
            return str(value)
        else:
            if isinstance(value, uuid.UUID):
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

