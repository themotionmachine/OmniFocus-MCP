"""Product handler — T017."""
from services.product_service import ProductService


class ProductHandler:
    def __init__(self, service: ProductService = None):
        self._svc = service or ProductService()

    def list_all(self, request):
        return {"status": 200, "body": []}

    def get(self, request):
        return {"status": 200, "body": {}}
