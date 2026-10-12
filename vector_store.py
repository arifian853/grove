from uuid import uuid4
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct
)
# Embedding model
embedding_model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
# Local persistent Qdrant database
qdrant = QdrantClient(
    path="qdrant_data"
)
COLLECTION_NAME = "grove_notes"
VECTOR_SIZE = (
    embedding_model.get_sentence_embedding_dimension()
)
# Create collection if it does not exist
if not qdrant.collection_exists(
    collection_name=COLLECTION_NAME
):
    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE
        )
    )
def embed_text(text: str):
    embedding = embedding_model.encode(text)
    return embedding.tolist()
def store_note(text: str):
    vector = embed_text(text)
    note_id = str(uuid4())
    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=note_id,
                vector=vector,
                payload={
                    "text": text
                }
            )
        ]
    )
    return note_id
def search_notes(
    query: str,
    limit: int = 3
):
    query_vector = embed_text(query)
    response = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit,
        with_payload=True
    )
    results = []
    for point in response.points:
        payload = point.payload or {}
        results.append({
            "id": str(point.id),
            "text": payload.get("text", ""),
            "score": float(point.score)
        })
    return results