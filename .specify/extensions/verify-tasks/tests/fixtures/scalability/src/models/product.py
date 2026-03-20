"""Product model — T002, T004, T005."""
from dataclasses import dataclass, asdict


@dataclass
class Product:
    id: str
    name: str
    price: float
    stock: int

    def to_dict(self):
        return asdict(self)
