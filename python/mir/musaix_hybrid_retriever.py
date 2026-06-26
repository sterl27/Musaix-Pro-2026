#!/usr/bin/env python3
"""
Musaix Hybrid MIR Retriever

Sovereign/local-first retrieval layer for Musaix Pro.

Default path:
- ChromaDB for local sovereign store
- Weaviate for complex hybrid filters when available
- Pinecone optional cloud burst layer
- MMR reranking for diverse music results

This compact repo version mirrors the uploaded production retriever architecture and is ready to expand with the full implementation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

import numpy as np


@dataclass
class MusicFilter:
    energy_min: Optional[float] = None
    energy_max: Optional[float] = None
    bpm_min: Optional[float] = None
    bpm_max: Optional[float] = None
    valence_min: Optional[float] = None
    valence_max: Optional[float] = None
    key: Optional[str] = None
    genres: Optional[List[str]] = None
    mood_tags: Optional[List[str]] = None
    structure_tags: Optional[List[str]] = None
    vocal_presence: Optional[bool] = None
    artist: Optional[str] = None


@dataclass
class RetrievalResult:
    track_id: str
    title: str
    artist: str
    score: float
    source: Literal["chroma", "weaviate", "pinecone"]
    metadata: Dict[str, Any] = field(default_factory=dict)
    explain: Optional[str] = None


def mmr_rerank(
    query_embedding: np.ndarray,
    doc_embeddings: np.ndarray,
    doc_scores: np.ndarray,
    top_k: int,
    lambda_param: float = 0.5,
) -> List[int]:
    """Maximal Marginal Relevance reranking for diverse music search results."""
    if len(doc_scores) == 0:
        return []
    if top_k >= len(doc_scores):
        return list(range(len(doc_scores)))

    selected: List[int] = []
    candidates = list(range(len(doc_scores)))

    first_idx = int(np.argmax(doc_scores))
    selected.append(first_idx)
    candidates.remove(first_idx)

    while len(selected) < top_k and candidates:
        mmr_scores: List[Tuple[float, int]] = []

        for idx in candidates:
            relevance = float(doc_scores[idx])
            selected_embs = doc_embeddings[selected]
            sims = np.dot(doc_embeddings[idx], selected_embs.T)
            max_sim = float(np.max(sims)) if len(selected_embs) else 0.0
            score = lambda_param * relevance - (1.0 - lambda_param) * max_sim
            mmr_scores.append((score, idx))

        _, best_idx = max(mmr_scores, key=lambda x: x[0])
        selected.append(best_idx)
        candidates.remove(best_idx)

    return selected


class MusaixHybridRetriever:
    """Smart backend router for Musaix music intelligence retrieval."""

    def __init__(
        self,
        chroma_client: Any,
        chroma_collection_name: str = "musaix_music",
        weaviate_client: Optional[Any] = None,
        weaviate_collection: str = "MusicTrack",
        pinecone_index: Optional[Any] = None,
        default_backend: Literal["chroma", "weaviate"] = "chroma",
        embedding_function: Optional[Any] = None,
    ) -> None:
        self.chroma = chroma_client
        self.chroma_collection_name = chroma_collection_name
        self.weaviate = weaviate_client
        self.weaviate_collection_name = weaviate_collection
        self.pinecone = pinecone_index
        self.default_backend = default_backend
        self.embedding_function = embedding_function
        self.chroma_collection = self.chroma.get_or_create_collection(
            name=chroma_collection_name,
            embedding_function=embedding_function,
        )

        self.weaviate_collection = None
        if self.weaviate:
            self.weaviate_collection = self.weaviate.collections.use(weaviate_collection)

    def retrieve(
        self,
        query: str,
        filters: Optional[MusicFilter] = None,
        limit: int = 10,
        alpha: float = 0.65,
        use_mmr: bool = True,
        mmr_lambda: float = 0.5,
        force_backend: Optional[Literal["chroma", "weaviate", "pinecone"]] = None,
    ) -> List[RetrievalResult]:
        backend = force_backend or self._decide_backend(filters)

        if backend == "weaviate" and self.weaviate_collection:
            results = self._retrieve_weaviate(query, filters, limit * 2, alpha)
        elif backend == "pinecone" and self.pinecone:
            results = self._retrieve_pinecone(query, filters, limit)
        else:
            results = self._retrieve_chroma(query, filters, limit * 2 if use_mmr else limit)

        if use_mmr and len(results) > limit:
            results = self._apply_mmr(results, query, limit, mmr_lambda)

        return results[:limit]

    def _decide_backend(self, filters: Optional[MusicFilter]) -> str:
        if not self.weaviate_collection:
            return "chroma"
        if filters and (
            filters.mood_tags
            or filters.structure_tags
            or filters.genres
            or filters.energy_min
            or filters.bpm_min
            or filters.valence_min
        ):
            return "weaviate"
        return self.default_backend

    def _retrieve_chroma(self, query: str, filters: Optional[MusicFilter], limit: int) -> List[RetrievalResult]:
        where = self._build_chroma_where(filters) if filters else None
        raw = self.chroma_collection.query(
            query_texts=[query],
            n_results=limit,
            where=where,
            include=["metadatas", "distances", "embeddings", "documents"],
        )

        ids = raw.get("ids", [[]])[0]
        distances = raw.get("distances", [[]])[0]
        metadatas = raw.get("metadatas", [[]])[0] or []
        embeddings = raw.get("embeddings", [None])[0]

        results: List[RetrievalResult] = []
        for i, row_id in enumerate(ids):
            meta = metadatas[i] or {}
            emb = embeddings[i] if embeddings is not None else None
            results.append(
                RetrievalResult(
                    track_id=meta.get("track_id", row_id),
                    title=meta.get("title", ""),
                    artist=meta.get("artist", ""),
                    score=float(1.0 - distances[i]) if distances else 0.0,
                    source="chroma",
                    metadata={**meta, "embedding": emb},
                )
            )
        return results

    def _retrieve_weaviate(self, query: str, filters: Optional[MusicFilter], limit: int, alpha: float) -> List[RetrievalResult]:
        try:
            from weaviate.classes.query import HybridFusion, MetadataQuery

            response = self.weaviate_collection.query.hybrid(
                query=query,
                alpha=alpha,
                filters=self._build_weaviate_filter(filters) if filters else None,
                limit=limit,
                fusion_type=HybridFusion.RELATIVE_SCORE,
                return_metadata=MetadataQuery(score=True, explain_score=True),
            )
        except Exception:
            return []

        results: List[RetrievalResult] = []
        for obj in response.objects:
            props = obj.properties or {}
            results.append(
                RetrievalResult(
                    track_id=props.get("track_id", ""),
                    title=props.get("title", ""),
                    artist=props.get("artist", ""),
                    score=float(obj.metadata.score or 0.0),
                    source="weaviate",
                    metadata=props,
                    explain=getattr(obj.metadata, "explain_score", None),
                )
            )
        return results

    def _retrieve_pinecone(self, query: str, filters: Optional[MusicFilter], limit: int) -> List[RetrievalResult]:
        return []

    def _apply_mmr(self, results: List[RetrievalResult], query: str, top_k: int, lambda_param: float) -> List[RetrievalResult]:
        embeddings = []
        scores = []
        valid_indices = []

        for idx, result in enumerate(results):
            emb = result.metadata.get("embedding")
            if emb is not None:
                embeddings.append(np.array(emb, dtype=np.float32))
                scores.append(result.score)
                valid_indices.append(idx)

        if len(embeddings) < 2:
            return results[:top_k]

        selected = mmr_rerank(
            query_embedding=self._embed_query(query),
            doc_embeddings=np.vstack(embeddings),
            doc_scores=np.array(scores),
            top_k=min(top_k, len(embeddings)),
            lambda_param=lambda_param,
        )

        return [results[valid_indices[i]] for i in selected]

    def _embed_query(self, query: str) -> np.ndarray:
        if self.embedding_function is not None:
            vec = self.embedding_function([query])
            return np.array(vec[0], dtype=np.float32)
        return np.random.randn(768).astype(np.float32)

    def _build_chroma_where(self, f: MusicFilter) -> Dict[str, Any]:
        where: Dict[str, Any] = {}
        if f.energy_min is not None:
            where["energy"] = {"$gte": f.energy_min}
        if f.bpm_min is not None:
            where["bpm"] = {"$gte": f.bpm_min}
        if f.genres:
            where["genre"] = {"$in": f.genres}
        if f.mood_tags:
            where["mood_tags"] = {"$in": f.mood_tags}
        if f.structure_tags:
            where["structure_tags"] = {"$in": f.structure_tags}
        if f.key:
            where["key"] = f.key
        if f.vocal_presence is not None:
            where["vocal_presence"] = f.vocal_presence
        return where

    def _build_weaviate_filter(self, f: MusicFilter):
        try:
            from weaviate.classes.query import Filter
        except ImportError:
            return None

        conditions = []
        if f.energy_min is not None:
            conditions.append(Filter.by_property("energy").greater_than(f.energy_min))
        if f.bpm_min is not None:
            conditions.append(Filter.by_property("bpm").greater_than(f.bpm_min))
        if f.valence_min is not None:
            conditions.append(Filter.by_property("valence").greater_than(f.valence_min))
        if f.genres:
            conditions.append(Filter.by_property("genre").contains_any(f.genres))
        if f.mood_tags:
            conditions.append(Filter.by_property("mood_tags").contains_any(f.mood_tags))
        if f.structure_tags:
            conditions.append(Filter.by_property("structure_tags").contains_any(f.structure_tags))
        if f.key:
            conditions.append(Filter.by_property("key").equal(f.key))
        if f.vocal_presence is not None:
            conditions.append(Filter.by_property("vocal_presence").equal(f.vocal_presence))

        return Filter.all_of(conditions) if conditions else None


if __name__ == "__main__":
    np.random.seed(42)
    query_emb = np.random.randn(768)
    doc_embs = np.random.randn(12, 768)
    doc_scores = np.random.rand(12) * 0.9 + 0.1
    print(mmr_rerank(query_emb, doc_embs, doc_scores, top_k=5, lambda_param=0.55))
