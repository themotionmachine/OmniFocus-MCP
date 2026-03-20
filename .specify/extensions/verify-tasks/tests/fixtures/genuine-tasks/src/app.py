"""
Application entry point — T010.
Imports and uses FileStore, Pipeline, and Calculator.
"""
from calculator import Calculator
from storage import FileStore
from pipeline import Pipeline


def run():
    # Use Calculator
    calc = Calculator()
    result = calc.multiply(6, 7)

    # Use Pipeline
    pipe = Pipeline()
    pipe_result = pipe.process("user@example.com", result, "USD")

    # Use FileStore
    store = FileStore()
    store.save("result", pipe_result)
    loaded = store.load("result")

    print("Result:", loaded)


if __name__ == "__main__":
    run()
