@plant-relations @hierarchical-companion
Feature: Hierarchical and Broadcast Companion Resolution
  In order to plan diverse polycultures and companion plantings
  As an ecological gardener or system
  I want companion evaluations to resolve across taxonomic hierarchies and broadcast services with strict specificity shadowing

  Scenario: Genus-level fallback applies to crops of the same genus
    Given a catalog plant "French Marigold" with scientific name "Tagetes patula"
    And a catalog plant "Eggplant" with scientific name "Solanum melongena"
    And a scoped relation from genus "Tagetes" to genus "Solanum" with mechanism "pest_repellent"
    When I evaluate companions for "French Marigold" at (0, 0) and "Eggplant" at (30, 0)
    Then an active companion interaction is resolved with:
      | mechanism      | tier  | specificityScore |
      | pest_repellent | genus | 70               |

  Scenario: Broadcast relation provides neighborhood ecosystem services
    Given a catalog plant "White Clover" with scientific name "Trifolium repens"
    And a catalog plant "Tomato" with scientific name "Solanum lycopersicum"
    And a broadcast relation from genus "Trifolium" targeting all with mechanism "nitrogen_fixer"
    When I evaluate companions for "White Clover" at (0, 0) and "Tomato" at (40, 0)
    Then an active companion interaction is resolved with:
      | mechanism      | tier      | specificityScore |
      | nitrogen_fixer | broadcast | 20               |

  Scenario: Specific species antagonism strictly shadows broad family synergy
    Given a catalog family "Apiaceae"
    And a catalog family "Solanaceae"
    And a catalog plant "Fennel" with scientific name "Foeniculum vulgare" in family "Apiaceae"
    And a catalog plant "Tomato" with scientific name "Solanum lycopersicum" in family "Solanaceae"
    And a scoped relation from family "Apiaceae" to family "Solanaceae" with mechanism "allelopathy" and type "beneficial"
    And a scoped relation from plant "Fennel" to plant "Tomato" with mechanism "allelopathy" and type "detrimental"
    When I evaluate companions for "Fennel" at (0, 0) and "Tomato" at (25, 0)
    Then an active companion interaction is resolved with:
      | mechanism   | tier    | type        |
      | allelopathy | species | detrimental |
    And the shadowed rules count should be 1

  Scenario: Proximity distance threshold excludes out-of-range crops
    Given a catalog plant "Basil" with scientific name "Ocimum basilicum"
    And a catalog plant "Tomato" with scientific name "Solanum lycopersicum"
    And a scoped relation from plant "Basil" to plant "Tomato" with mechanism "pest_repellent" within max distance 20 cm
    When I evaluate companions for "Basil" at (0, 0) and "Tomato" at (30, 0)
    Then no active companion interactions are resolved
