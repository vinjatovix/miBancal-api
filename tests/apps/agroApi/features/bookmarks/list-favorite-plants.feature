Feature: List Favorite Plants in Personal Bookmarks
    As a farmer or gardener
    I want to view my bookmarks collection
    So that I can see my saved plants and their catalog details

    Scenario: Read bookmarks returns empty list when user has no bookmarks
        When I send a GET user request to "/api/v1/bookmarks"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the bookmarks list should be empty

    Scenario: Read bookmarks returns lightweight plant items by default
        Given a family exists
        And a plant exists
        And the plant is in my favorites
        When I send a GET user request to "/api/v1/bookmarks"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the bookmarks list should contain lightweight items

    Scenario: Read bookmarks with include=plant embeds enriched catalog summaries sorted A-Z
        Given a family exists
        And a plant exists with primary name "Zucchini" and scientific name "Cucurbita pepo"
        And the plant is in my favorites
        And a plant exists with primary name "Albahaca" and scientific name "Ocimum basilicum"
        And the plant is in my favorites
        When I send a GET user request to "/api/v1/bookmarks?include=plant"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the bookmarks list should contain enriched plant items sorted alphabetically

    Scenario: Soft-deleted plants are omitted from enriched bookmarks
        Given a family exists
        And a plant exists with primary name "Tomate" and scientific name "Solanum lycopersicum"
        And the plant is in my favorites
        And a soft-deleted plant exists
        And the plant is in my favorites
        When I send a GET user request to "/api/v1/bookmarks?include=plant"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the bookmarks list should only contain active plants
