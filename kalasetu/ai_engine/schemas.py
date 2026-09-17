from pydantic import BaseModel, Field


class PriceSuggestionRequest(BaseModel):
    category: str = Field(..., examples=["pottery"])
    rawMaterialCost: float = Field(..., ge=0, examples=[150])
    hoursSpent: float = Field(..., ge=0, examples=[6])
    skillLevel: str = Field(..., examples=["skilled"])
    weightOrSize: float = Field(default=1.0, ge=0, examples=[1.2])


class PriceBreakdown(BaseModel):
    materialCost: float
    fairArtisanWage: float
    hourlyWageApplied: float
    sizeOverheadFactor: float
    baseCost: float
    marginAppliedPercent: float


class PricePoints(BaseModel):
    suggestedMinimumPrice: float
    recommendedMarketPrice: float
    highDemandFestivalPrice: float


class PriceRationale(BaseModel):
    suggestedMinimum: str
    recommendedMarket: str
    highDemandFestival: str


class PriceSuggestionResponse(BaseModel):
    inputs: dict
    breakdown: PriceBreakdown
    pricePoints: PricePoints
    rationale: PriceRationale


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
