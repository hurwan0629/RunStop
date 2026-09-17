from typing import Literal
from pydantic import BaseModel, Field


class CoordinateDTO(BaseModel):
    lat: float
    lng: float