"""Product repository — T007, T010."""
from typing import Dict, List, Optional
from models.product import Product


class ProductRepository:
    def __init__(self):
        self._store: Dict[str, Product] = {}

    def find_by_id(self, id: str) -> Optional[Product]:
        return self._store.get(id)

    def find_all(self) -> List[Product]:
        return list(self._store.values())

    def save(self, product: Product) -> None:
        self._store[product.id] = product

    def delete(self, id: str) -> None:
        self._store.pop(id, None)
