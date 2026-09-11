from typing import Literal, Any
from pydantic import BaseModel, Field
from .coord import CoordinateDTO 

class ElementConditionsDTO(BaseModel):
    targetDistance: float = Field(gt=0)
    maxSlope: float | None = Field(default=None, ge=0)
    facilityCount: int | None = Field(default=None, ge=0)
    weights: dict[str, int]
    requirements: dict[str, bool]


# 요청 DTO

class RouteRecommendRequestDTO(BaseModel):
    routeType: Literal["LOOP", "ROUND_TRIP", "ONE_WAY"]
    startPoint: CoordinateDTO
    waypoints: list[CoordinateDTO] = []
    endPoint: CoordinateDTO | None = None
    prompt: str | None = None

    elementConditions: ElementConditionsDTO
    maxCandidates: int = Field(default=3, ge=1, le=10)