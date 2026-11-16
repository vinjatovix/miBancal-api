@plants @plant-genus-filter
Feature: Filter plants by genus

  # US1: Browse every catalog member of a genus
  Scenario: Filter plants by genus (eq) returns exactly that genus
    Given a family exists
    And the following plants exist:
      | name   | scientificName    |
      | Garlic | allium sativum    |
      | Onion  | allium cepa       |
      | Tomato | solanum lycopersicum |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Allium"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value  |
      | identity.genus | eq       | Allium |
    And response matches OpenAPI contract

  Scenario: Genus filter is case-insensitive (lowercase input)
    Given a family exists
    And the following plants exist:
      | name   | scientificName |
      | Garlic | allium sativum |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=allium"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value  |
      | identity.genus | eq       | Allium |
    And response matches OpenAPI contract

  Scenario: Genus filter is case-insensitive (uppercase input)
    Given a family exists
    And the following plants exist:
      | name   | scientificName |
      | Garlic | allium sativum |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=ALLIUM"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value  |
      | identity.genus | eq       | Allium |
    And response matches OpenAPI contract

  Scenario: Hybrid-prefix plants are excluded from genus filter
    Given a family exists
    And the following plants exist:
      | name           | scientificName       |
      | Hybrid cabbage | ×Brassicoraphanus |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Brassicoraphanus"
    Then the response status code should be 200
    And the list should be empty

  Scenario: Filter plants by genus (in) returns all matching genera
    Given a family exists
    And the following plants exist:
      | name   | scientificName    |
      | Garlic | allium sativum    |
      | Basil  | ocimum basilicum  |
      | Tomato | solanum lycopersicum |
    When I send a GET request to "/api/v1/plants?filter[genus][in]=Allium,Ocimum"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value         |
      | identity.genus | in       | Allium,Ocimum |
    And response matches OpenAPI contract

  # US2: Genus stays correct for new and edited plants
  Scenario: Created plant has correct genus derived from scientific name
    Given a family exists
    And the following plants exist:
      | name   | scientificName |
      | Garlic | allium sativum |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Allium"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value  |
      | identity.genus | eq       | Allium |
    And response matches OpenAPI contract

  Scenario: Plant response includes derived genus on create
    Given a family exists
    And the following plants exist:
      | name   | scientificName |
      | Garlic | allium sativum |
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Allium"
    Then the response status code should be 200
    And the response body should contain
      """
      {
        "data": [
          { "identity": { "genus": "Allium" } }
        ]
      }
      """
    And response matches OpenAPI contract

  # US3: Existing catalog browsable without re-entry (back-fill)
  Scenario: Legacy plant without stored genus is browsable after back-fill
    Given a family exists
    And a legacy plant without genus exists with scientific name "allium sativum"
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Allium"
    Then the response status code should be 200
    And the list should contain at least 1 item
    And every item should match:
      | field          | operator | value  |
      | identity.genus | eq       | Allium |
    And response matches OpenAPI contract

  Scenario: Legacy hybrid plant without stored genus carries no genus after back-fill
    Given a family exists
    And a legacy plant without genus exists with scientific name "×Brassicoraphanus"
    When I send a GET request to "/api/v1/plants?filter[genus][eq]=Brassicoraphanus"
    Then the response status code should be 200
    And the list should be empty
