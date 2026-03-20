"""Unit tests for ProductService.create_product — T042."""
from services.product_service import ProductService


def test_create_product():
    svc = ProductService()
    p = svc.create_product("Widget", 9.99)
    assert p.name == "Widget"
    assert p.price == 9.99
    assert p.id
