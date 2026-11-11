import numpy as np
from functools import lru_cache
from insightface.app import FaceAnalysis
from app.config import get_settings

settings = get_settings()


@lru_cache()
def load_face_model():
    app = FaceAnalysis(
        name="buffalo_l",
        providers=[settings.execution_provider, "CPUExecutionProvider"],
    )
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def _l2_normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def get_face_embedding(image_np):
    """Return list of (embedding, det_score) tuples for every detected face."""
    app = load_face_model()
    # InsightFace's OpenCV-backed detector expects BGR, while API image decoding supplies RGB.
    faces = app.get(np.ascontiguousarray(image_np[:, :, ::-1]))

    results = []
    for face in faces:
        embedding = _l2_normalize(np.array(face.normed_embedding, dtype=np.float32))
        det_score = float(getattr(face, "det_score", 1.0))
        results.append((embedding, det_score))
    return results


def get_face_embeddings_only(image_np):
    """Return only the embedding arrays (drops det_score)."""
    return [emb for emb, _ in get_face_embedding(image_np)]