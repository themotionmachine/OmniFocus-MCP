"""
Demo runner — T008.
Imports and exercises Calculator from src/calculator.py.
"""
from calculator import Calculator


def main():
    calc = Calculator()
    print("2 + 3 =", calc.add(2, 3))
    print("10 - 4 =", calc.subtract(10, 4))
    print("6 * 7 =", calc.multiply(6, 7))
    print("15 / 3 =", calc.divide(15, 3))


if __name__ == "__main__":
    main()
