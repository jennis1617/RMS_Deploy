"""
utils/scoring.py
Candidate scoring utilities with weighted calculation logic.
"""

import pandas as pd
from config.settings import COLUMN_DISPLAY_NAMES, SCORING_WEIGHTS

def calculate_final_score(row: pd.Series) -> int:
    """
    Calculates the final weighted score based on individual category scores.
    This prevents the 'Simple Sum' error seen in AI hallucinations.
    """
    try:
        # Extract raw scores (default to 0 if missing)
        skills = float(row.get('skills_score', 0))
        experience = float(row.get('experience_score', 0))
        projects = float(row.get('projects_score', 0))
        domain = float(row.get('domain_score', 0))

        # Apply weights from settings
        weighted_total = (
            (skills * SCORING_WEIGHTS['skills_match']) +
            (experience * SCORING_WEIGHTS['experience_match']) +
            (projects * SCORING_WEIGHTS['projects_match']) +
            (domain * SCORING_WEIGHTS['domain_match'])
        )
        
        return int(round(weighted_total))
    except (ValueError, TypeError):
        return 0

def format_dataframe_for_display(df: pd.DataFrame, columns_to_display: list) -> pd.DataFrame:
    """
    Processes the dataframe: calculates the true score, then renames for UI.
    """
    display_df = df.copy()

    # 1. Run the weighted calculation logic
    # This ensures "Jennis Rufina J" gets the correct 23% instead of 70%
    if all(col in display_df.columns for col in ['skills_score', 'experience_score']):
        display_df['ai_match_score'] = display_df.apply(calculate_final_score, axis=1)

    # 2. Filter to requested columns
    available = [c for c in columns_to_display if c in display_df.columns]
    display_df = display_df[available]

    # 3. Rename columns based on settings
    display_df = display_df.rename(columns=COLUMN_DISPLAY_NAMES)
    
    return display_df