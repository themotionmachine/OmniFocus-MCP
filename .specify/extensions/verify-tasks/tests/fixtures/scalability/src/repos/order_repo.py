"""Order repository — T008, T010."""
from typing import Dict, List
from models.order import Order


class OrderRepository:
    def __init__(self):
        self._store: Dict[str, Order] = {}

    def find_by_user(self, user_id: str) -> List[Order]:
        return [o for o in self._store.values() if o.user_id == user_id]

    def save(self, order: Order) -> None:
        self._store[order.id] = order

    def delete(self, id: str) -> None:
        self._store.pop(id, None)
