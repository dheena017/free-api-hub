import pytest
import json
import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.models import ApiItem

@pytest.fixture(scope="session")
def apis_raw():
    """Returns raw parsed JSON list from apis.json."""
    data_path = settings.DATA_FILE_PATH
    assert os.path.exists(data_path), f"apis.json not found at {data_path}"
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list), "apis.json root must be a JSON array"
    return data

@pytest.fixture(scope="session")
def apis_models(apis_raw):
    """Returns validated Pydantic model objects for all catalog entries."""
    models = []
    for item in apis_raw:
        models.append(ApiItem(**item))
    return models
