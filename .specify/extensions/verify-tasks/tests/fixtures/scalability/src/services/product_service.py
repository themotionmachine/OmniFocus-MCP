"""Product service — T012."""
import uuid
from models.product import Product
from repos.product_repo import ProductRepository


class ProductService:
    def __init__(self, repo: ProductRepository = None):
        self._repo = repo or ProductRepository()

    def create_product(self, name: str, price: float) -> Product:
        product = Product(id=str(uuid.uuid4()), name=name, price=price, stock=0)
        self._repo.save(product)
        return product
