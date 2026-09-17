"""
KalaSetu Smart Dynamic Pricing Engine
--------------------------------------
Heuristic + market-benchmark pricing logic for artisan products.
Computes a fair, transparent price breakdown so artisans are never
undercut by middlemen and always see the reasoning behind a number.
"""

from typing import Dict

# Minimum fair hourly craft wage (INR) — anchored to Ministry of Skill
# Development & Entrepreneurship (MSDE) unskilled/semi-skilled wage floors,
# with a craft-labor premium baked in.
MIN_HOURLY_CRAFT_WAGE = 55.0

# Category-level complexity multipliers. Higher = more skill-intensive,
# justifying a wider fair-profit margin band.
CATEGORY_COMPLEXITY: Dict[str, float] = {
    "handloom_weaving": 1.35,
    "pottery": 1.15,
    "woodcarving": 1.30,
    "block_printing": 1.10,
    "bamboo_craft": 1.05,
    "metal_craft": 1.25,
    "embroidery": 1.20,
    "jewelry": 1.40,
    "leather_craft": 1.15,
    "other": 1.00,
}

# Skill tier multipliers, reflecting years of practice / certification /
# National Award recognition under MoSJE / handicrafts board schemes.
SKILL_TIER_MULTIPLIER: Dict[str, float] = {
    "apprentice": 0.90,
    "skilled": 1.00,
    "master": 1.20,
    "national_awardee": 1.45,
}

# Base margin band by complexity (min_margin, max_margin) as a fraction.
BASE_MARGIN_MIN = 0.25
BASE_MARGIN_MAX = 0.40

# Festival/high-demand season uplift applied to the recommended market price.
FESTIVAL_UPLIFT = 0.18

# Size/weight scaling: larger or heavier pieces carry proportionally more
# material handling & logistics overhead.
def _size_overhead_factor(weight_or_size: float) -> float:
    if weight_or_size <= 0:
        return 1.0
    if weight_or_size <= 0.5:
        return 1.00
    if weight_or_size <= 2:
        return 1.04
    if weight_or_size <= 5:
        return 1.08
    return 1.15


def calculate_price(
    category: str,
    raw_material_cost: float,
    hours_spent: float,
    skill_level: str,
    weight_or_size: float = 1.0,
) -> Dict:
    """
    Computes a structured, explainable pricing breakdown.

    Returns a dict with base cost, fair wage, margin details, and three
    price points: suggested minimum, recommended market price, and
    high-demand festival price — each with a plain-language rationale.
    """
    category_key = category.strip().lower().replace(" ", "_")
    skill_key = skill_level.strip().lower().replace(" ", "_")

    complexity = CATEGORY_COMPLEXITY.get(category_key, CATEGORY_COMPLEXITY["other"])
    skill_mult = SKILL_TIER_MULTIPLIER.get(skill_key, SKILL_TIER_MULTIPLIER["skilled"])
    size_factor = _size_overhead_factor(weight_or_size)

    raw_material_cost = max(0.0, float(raw_material_cost))
    hours_spent = max(0.0, float(hours_spent))

    # Fair artisan wage component, scaled by skill tier.
    fair_wage = hours_spent * MIN_HOURLY_CRAFT_WAGE * skill_mult

    # Base cost = materials + fair labor wage, scaled for handling overhead.
    base_cost = (raw_material_cost + fair_wage) * size_factor

    # Margin scales with category complexity, capped within the fair band.
    margin_fraction = min(
        BASE_MARGIN_MAX,
        max(BASE_MARGIN_MIN, BASE_MARGIN_MIN * complexity),
    )

    suggested_minimum_price = round(base_cost * (1 + BASE_MARGIN_MIN), 2)
    recommended_market_price = round(base_cost * (1 + margin_fraction), 2)
    high_demand_festival_price = round(
        recommended_market_price * (1 + FESTIVAL_UPLIFT), 2
    )

    return {
        "inputs": {
            "category": category,
            "rawMaterialCost": round(raw_material_cost, 2),
            "hoursSpent": round(hours_spent, 2),
            "skillLevel": skill_level,
            "weightOrSize": round(weight_or_size, 2),
        },
        "breakdown": {
            "materialCost": round(raw_material_cost, 2),
            "fairArtisanWage": round(fair_wage, 2),
            "hourlyWageApplied": round(MIN_HOURLY_CRAFT_WAGE * skill_mult, 2),
            "sizeOverheadFactor": size_factor,
            "baseCost": round(base_cost, 2),
            "marginAppliedPercent": round(margin_fraction * 100, 1),
        },
        "pricePoints": {
            "suggestedMinimumPrice": suggested_minimum_price,
            "recommendedMarketPrice": recommended_market_price,
            "highDemandFestivalPrice": high_demand_festival_price,
        },
        "rationale": {
            "suggestedMinimum": (
                f"Covers your material cost (₹{raw_material_cost:.0f}) and a fair "
                f"wage of ₹{MIN_HOURLY_CRAFT_WAGE * skill_mult:.0f}/hr for "
                f"{hours_spent:.1f} hrs, plus a minimum {BASE_MARGIN_MIN*100:.0f}% "
                f"safety margin. Never sell below this to avoid a loss."
            ),
            "recommendedMarket": (
                f"Adds a fair {margin_fraction*100:.0f}% profit margin based on the "
                f"skill and complexity of {category.replace('_', ' ')}, benchmarked "
                f"against retail handicraft pricing in local and online markets."
            ),
            "highDemandFestival": (
                f"Applies an {FESTIVAL_UPLIFT*100:.0f}% seasonal uplift for festival "
                f"and high-demand periods (Diwali, wedding season, state emporium "
                f"fairs) when buyer willingness-to-pay for authentic handmade "
                f"craft rises."
            ),
        },
    }
