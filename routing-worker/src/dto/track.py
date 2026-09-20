from typing import Annotated
from pydantic import BaseModel, Field
from .coord import CoordinateDTO


class TrackAnalysisRequest(BaseModel):
    segments: list[Annotated[list[CoordinateDTO], Field(min_length=2, max_length=20000)]] = Field(max_length=200)
