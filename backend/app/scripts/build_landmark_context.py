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
    lat = safe_float(record.get("latitude"))
    lng = safe_float(record.get("longitude"))

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

    return None, None


def build_landmark_context():
    landmark_sites = load_json("landmark_sites.json")
    lpc_buildings = load_json("lpc_buildings.json")

    context = {}

    for row in landmark_sites:
        name = (
            row.get("lm_name")
            or row.get("name")
            or row.get("site_name")
            or row.get("lpc_name")
            or row.get("des_name")
        )
        if not name:
            continue

        lat, lng = extract_lat_lng(row)

        context[name] = {
            "name": name,
            "source": "landmark_sites",
            "type": "landmark",
            "borough": row.get("borough") or row.get("boro_name"),
            "lat": lat,
            "lng": lng,
            "designation_type": row.get("desi_type") or row.get("type") or row.get("desig_type"),
            "description": row.get("notes") or row.get("descriptio") or row.get("style_prim") or "",
            "tags": ["landmark", "historic"],
        }

    for row in lpc_buildings:
        name = (
            row.get("resource_name")
            or row.get("name")
            or row.get("building_name")
            or row.get("site_name")
        )
        if not name:
            continue

        lat, lng = extract_lat_lng(row)

        if name not in context:
            context[name] = {
                "name": name,
                "source": "lpc_buildings",
                "type": "landmark",
                "borough": row.get("borough") or row.get("boro"),
                "lat": lat,
                "lng": lng,
                "designation_type": row.get("resource_type") or row.get("type"),
                "description": row.get("style_prim") or "",
                "tags": ["landmark", "historic_building"],
            }
        else:
            existing = context[name]
            if not existing.get("description"):
                existing["description"] = (
                    row.get("style_prim")
                    or row.get("resource_type")
                    or existing.get("description", "")
                )
            if existing.get("lat") is None and lat is not None:
                existing["lat"] = lat
            if existing.get("lng") is None and lng is not None:
                existing["lng"] = lng

    out_path = PROCESSED_DIR / "landmark_context.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(context, f, indent=2)

    print(f"Saved landmark context -> {out_path} ({len(context)} items)")


if __name__ == "__main__":
    build_landmark_context()
