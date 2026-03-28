import json
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
PROCESSED_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def load_json(filename: str):
    path = RAW_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_float(value):
    try:
        return float(value)
    except Exception:
        return None


def extract_first_coordinate(coords):
    """
    Recursively walk through nested coordinate lists until we find
    a valid [lng, lat] pair.
    """
    if not isinstance(coords, list):
        return None, None

    if (
        len(coords) >= 2
        and isinstance(coords[0], (int, float))
        and isinstance(coords[1], (int, float))
    ):
        return safe_float(coords[1]), safe_float(coords[0])

    for item in coords:
        lat, lng = extract_first_coordinate(item)
        if lat is not None and lng is not None:
            return lat, lng

    return None, None


def extract_lat_lng(record):
    lat = (
        safe_float(record.get("latitude"))
        or safe_float(record.get("lat"))
        or safe_float(record.get("y_coord"))
    )
    lng = (
        safe_float(record.get("longitude"))
        or safe_float(record.get("lon"))
        or safe_float(record.get("lng"))
        or safe_float(record.get("x_coord"))
    )

    if lat is not None and lng is not None:
        return lat, lng

    the_geom = record.get("the_geom")
    if isinstance(the_geom, dict):
        coords = the_geom.get("coordinates")
        if coords is not None:
            return extract_first_coordinate(coords)

    multipolygon = record.get("multipolygon")
    if isinstance(multipolygon, dict):
        coords = multipolygon.get("coordinates")
        if coords is not None:
            return extract_first_coordinate(coords)

    point = record.get("point")
    if isinstance(point, dict):
        coords = point.get("coordinates")
        if coords is not None:
            return extract_first_coordinate(coords)

    location = record.get("location")
    if isinstance(location, dict):
        coords = location.get("coordinates")
        if coords is not None:
            return extract_first_coordinate(coords)

    return None, None


def normalize_poi(row):
    name = (
        row.get("feature_name")
        or row.get("name")
        or row.get("poi")
        or row.get("place_name")
    )
    if not name:
        return None

    lat, lng = extract_lat_lng(row)

    return {
        "name": name,
        "type": "place",
        "subtype": row.get("facility_type") or row.get("facgroup") or "poi",
        "lat": lat,
        "lng": lng,
        "borough": row.get("borough") or row.get("boroughcode") or row.get("boro"),
        "tags": ["poi", "place"],
    }


def normalize_park(row):
    name = row.get("signname") or row.get("park_name") or row.get("name311") or row.get("name")
    if not name:
        return None

    lat, lng = extract_lat_lng(row)

    return {
        "name": name,
        "type": "resource",
        "subtype": "park",
        "lat": lat,
        "lng": lng,
        "borough": row.get("borough") or row.get("boro"),
        "tags": ["park", "green_space", "public_resource"],
    }


def build_unified_places():
    points_of_interest = load_json("points_of_interest.json")
    parks_properties = load_json("parks_properties.json")

    unified = []

    for row in points_of_interest:
        item = normalize_poi(row)
        if item:
            unified.append(item)

    for row in parks_properties:
        item = normalize_park(row)
        if item:
            unified.append(item)

    out_path = PROCESSED_DIR / "unified_places.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(unified, f, indent=2)

    print(f"Saved unified places -> {out_path} ({len(unified)} items)")


if __name__ == "__main__":
    build_unified_places()
