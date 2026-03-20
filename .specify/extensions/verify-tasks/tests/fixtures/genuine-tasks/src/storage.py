"""
File-based key-value store — T007.
FileStore is imported and used by src/app.py.
"""
import json
import os


class FileStore:
    """Persist arbitrary data as JSON files under a base directory."""

    def __init__(self, base_dir: str = "/tmp/filestore"):
        self._base = base_dir
        os.makedirs(base_dir, exist_ok=True)

    def save(self, key: str, data) -> None:
        """Serialize data as JSON and write to key file."""
        path = os.path.join(self._base, f"{key}.json")
        with open(path, "w") as fh:
            json.dump(data, fh)

    def load(self, key: str):
        """Read and deserialize JSON data for key. Returns None if not found."""
        path = os.path.join(self._base, f"{key}.json")
        if not os.path.exists(path):
            return None
        with open(path) as fh:
            return json.load(fh)
