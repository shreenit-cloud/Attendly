import numpy as np
from app.config import get_settings

settings = get_settings()

MIN_DETECTION_SCORE = settings.min_detection_score
FACE_MATCH_THRESHOLD = settings.face_match_threshold


def validate_detection(det_score: float) -> bool:
    """Reject low-quality detections (often spoofs/bad lighting)."""
    return det_score >= MIN_DETECTION_SCORE


def validate_match(similarity: float) -> bool:
    """Check if similarity meets the threshold."""
    return similarity >= FACE_MATCH_THRESHOLD


def filter_valid_faces(faces_data: list[dict]) -> list[dict]:
    """Filter out low-quality detections."""
    return [f for f in faces_data if validate_detection(f.get("det_score", 0))]