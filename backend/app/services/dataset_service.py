import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"


def load_json(filename: str):
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_landmark_context():
    return load_json("landmark_context.json")


def get_unified_places():
    return load_json("unified_places.json")


def get_landmark_by_name(landmark_name: str):
    context = get_landmark_context()
    return context.get(landmark_name)


def get_all_landmark_names():
    context = get_landmark_context()
    return list(context.keys())
