"""Order service — T013, T014."""
import uuid
from typing import List, Dict
from models.order import Order, OrderItem
from repos.order_repo import OrderRepository


class OrderService:
    def __init__(self, repo: OrderRepository = None):
        self._repo = repo or OrderRepository()

    def place_order(self, user_id: str, items: List[Dict]) -> Order:
        order_items = [OrderItem(**i) for i in items]
        order = Order(id=str(uuid.uuid4()), user_id=user_id, items=order_items)
        self._repo.save(order)
        return order

    def get_user_orders(self, user_id: str) -> List[Order]:
        return self._repo.find_by_user(user_id)
