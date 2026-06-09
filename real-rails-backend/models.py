"""
Pydantic models for Real Rails API response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class SchemeResponse(BaseModel):
    country_code: str
    country_name: str
    scheme_name: str
    status: str
    maturity: str
    launch_year: Optional[int]
    operator: str
    regulator: str
    transaction_limit_usd: Optional[float]
    iso_standard: Optional[str]
    region: str
    p2p: bool = False
    p2b: bool = False
    b2b: bool = False
    lat: Optional[float]
    lng: Optional[float]
    source: Optional[str]
    description: Optional[str]
    data_source: Optional[str] = "live"


class CountryDetailResponse(SchemeResponse):
    governance_notes: Optional[str]
    api_access: Optional[str]
    interoperability: Optional[str]


class StatsResponse(BaseModel):
    total_countries: int
    live_schemes: int
    pioneer_adopters: int
    avg_transaction_limit_usd: float
    by_region: Dict[str, int]
    by_maturity: Dict[str, int]
    launch_timeline: Dict[str, int]
