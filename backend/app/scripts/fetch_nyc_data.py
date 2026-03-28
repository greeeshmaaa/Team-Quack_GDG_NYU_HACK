import json
from pathlib import Path

import requests

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

DATASETS = {
    "landmark_sites": "buis-pvji",
    "lpc_buildings": "gpmc-yuvp",
    "points_of_interest": "t95h-5fsr",
    "parks_properties": "enfh-gkve",
}

BASE_URL = "https://data.cityofnewyork.us/resource/{dataset_id}.json"


def fetch_dataset(name: str, dataset_id: str, limit: int = 5000):
    url = BASE_URL.format(dataset_id=dataset_id)
    params = {"$limit": limit}

    print(f"Fetching {name} from dataset {dataset_id} ...")
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()

    data = response.json()
    out_path = RAW_DIR / f"{name}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved {name}: {len(data)} records -> {out_path}")


def main():
    for name, dataset_id in DATASETS.items():
        try:
            fetch_dataset(name, dataset_id)
        except Exception as e:
            print(f"Failed to fetch {name}: {e}")


if __name__ == "__main__":
    main()
