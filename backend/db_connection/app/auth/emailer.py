import logging
import os

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType


logger = logging.getLogger(__name__)


def _bool_env(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


def _mail_config() -> ConnectionConfig | None:
    mail_from = os.getenv("MAIL_FROM")
    mail_server = os.getenv("MAIL_SERVER")
    if not mail_from or not mail_server:
        return None

    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
        MAIL_FROM=mail_from,
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_SERVER=mail_server,
        MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "EduPulse"),
        MAIL_STARTTLS=_bool_env("MAIL_STARTTLS", True),
        MAIL_SSL_TLS=_bool_env("MAIL_SSL_TLS", False),
        USE_CREDENTIALS=_bool_env("MAIL_USE_CREDENTIALS", True),
        VALIDATE_CERTS=_bool_env("MAIL_VALIDATE_CERTS", True),
        SUPPRESS_SEND=_bool_env("MAIL_SUPPRESS_SEND", False),
    )


async def send_auth_email(subject: str, recipient: str, html: str) -> bool:
    config = _mail_config()
    if not config:
        logger.warning("Mail configuration missing; skipping email to %s", recipient)
        logger.info("Email subject: %s", subject)
        logger.info("Email html: %s", html)
        return False

    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html,
        subtype=MessageType.html,
    )
    await FastMail(config).send_message(message)
    return True
