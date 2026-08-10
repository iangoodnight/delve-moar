"""Unit tests for the SRD seed script's pure helpers."""

import pytest

from scripts.seed_srd import parse_magic_item_preamble


@pytest.mark.parametrize(
    ("first_line", "expected_attunement"),
    [
        (
            "Wondrous item, rare (requires attunement)",
            "requires attunement",
        ),
        (
            "Staff, very rare (requires attunement by a sorcerer, warlock, "
            "or wizard)",
            "requires attunement by a sorcerer, warlock, or wizard",
        ),
        (
            "Ring, uncommon (requires attunement by a spellcaster)",
            "requires attunement by a spellcaster",
        ),
        ("Wondrous item, uncommon", None),
    ],
)
def test_parses_attunement_and_trims_preamble(
    first_line: str, expected_attunement: str | None
) -> None:
    attunement, description = parse_magic_item_preamble(
        [first_line, "Body text."]
    )
    assert attunement == expected_attunement
    assert description == ["Body text."]


def test_tolerates_source_category_typo() -> None:
    # The SRD data ships "Wondous item" (sic) for bracers-of-defense.
    attunement, description = parse_magic_item_preamble(
        ["Wondous item, rare (requires attunement)", "Body."]
    )
    assert attunement == "requires attunement"
    assert description == ["Body."]


@pytest.mark.parametrize(
    "first_line",
    [
        "Armor (shield), very rare (requires attunement)",
        "Weapon (any ammunition), uncommon (+1), rare (+2), or very rare (+3)",
        "Wondrous item, rarity by figurine",
    ],
)
def test_detects_richer_preamble_forms(first_line: str) -> None:
    _attunement, description = parse_magic_item_preamble([first_line, "Body."])
    assert description == ["Body."]


def test_item_level_attunement_only_reads_the_preamble() -> None:
    # Hammer of Thunderbolts has no item-level attunement; a property-level
    # "(Requires Attunement)" lives in a later line and must stay in prose.
    desc = [
        "Weapon (maul), legendary",
        "You gain a +1 bonus to attack and damage rolls with this weapon.",
        "Giant's Bane (Requires Attunement). You must be wearing a belt...",
    ]
    attunement, description = parse_magic_item_preamble(desc)
    assert attunement is None
    assert description[0].startswith("You gain")
    assert any("Requires Attunement" in line for line in description)


def test_passes_through_non_preamble_description() -> None:
    # Homebrew / non-SRD content: a real first sentence is left untouched.
    desc = ["A shimmering blade forged in dragonfire.", "More lore."]
    attunement, description = parse_magic_item_preamble(desc)
    assert attunement is None
    assert description == desc


def test_handles_empty_description() -> None:
    assert parse_magic_item_preamble([]) == (None, [])
