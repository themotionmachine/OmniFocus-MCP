"""Application bootstrap — T046."""
from config.settings import Settings
from config.logging_config import configure_logging
from services.user_service import UserService
from services.product_service import ProductService
from services.order_service import OrderService
from handlers.user_handler import UserHandler
from handlers.product_handler import ProductHandler
from handlers.order_handler import OrderHandler
from middleware.auth_middleware import AuthMiddleware
from middleware.logging_middleware import LoggingMiddleware
from middleware.cors_middleware import CorsMiddleware
from router import Router


def create_app(settings: Settings = None) -> Router:
    """Instantiate all services, handlers, and router."""
    settings = settings or Settings.from_env()
    configure_logging(settings.debug and "DEBUG" or "INFO")

    user_svc = UserService()
    product_svc = ProductService()
    order_svc = OrderService()

    user_handler = UserHandler(user_svc)
    product_handler = ProductHandler(product_svc)
    order_handler = OrderHandler(order_svc)

    router = Router()
    router.register("/users", user_handler.create)
    router.register("/products", product_handler.list_all)
    router.register("/orders", order_handler.create)

    return router
