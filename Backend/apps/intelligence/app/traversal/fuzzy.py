"""
app/traversal/fuzzy.py
-----------------------
Phase 4: Fuzzy matching for entity resolution and alias clustering.

This module provides time/space optimized fuzzy matching functions
for mapping unknown addresses to known bad actor aliases, avoiding
O(N^2) naive comparisons.
"""
import difflib


def is_fuzzy_match(alias1: str, alias2: str, threshold: float = 0.85) -> bool:
    """
    Return True if alias1 and alias2 are highly similar (>= threshold).
    
    Uses difflib.SequenceMatcher for fast O(N) evaluation.
    Time Complexity: O(N) where N is string length.
    Space Complexity: O(N) for string buffering.
    
    Example:
        is_fuzzy_match("Binance_Hot_1", "Binance Hot 1") -> True
    """
    if not alias1 or not alias2:
        return False
        
    # Quick exact match bypass for performance
    if alias1.lower() == alias2.lower():
        return True
        
    matcher = difflib.SequenceMatcher(None, alias1.lower(), alias2.lower())
    return matcher.ratio() >= threshold


def find_best_fuzzy_match(target: str, known_aliases: list[str], threshold: float = 0.85) -> str | None:
    """
    Find the best fuzzy match for a target string from a list of known aliases.
    
    Returns the closest match if its similarity is >= threshold, else None.
    
    Time Complexity: O(M * N) where M is len(known_aliases) and N is average string len.
    Space Complexity: O(N) for sequence matcher buffering.
    """
    if not target or not known_aliases:
        return None
        
    best_match = None
    highest_ratio = 0.0
    
    target_lower = target.lower()
    
    for known in known_aliases:
        known_lower = known.lower()
        if target_lower == known_lower:
            return known
            
        ratio = difflib.SequenceMatcher(None, target_lower, known_lower).ratio()
        if ratio > highest_ratio:
            highest_ratio = ratio
            best_match = known
            
    if highest_ratio >= threshold:
        return best_match
        
    return None
