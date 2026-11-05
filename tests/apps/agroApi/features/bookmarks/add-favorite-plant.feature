Feature: Add Favorite Plant to Personal Bookmarks
    As a farmer or gardener
    I want to save favorite plants to my personal bookmarks collection
    So that I can quickly reference them without searching the public catalog every time

    Scenario: Add a plant to favorites successfully
        Given a family exists
        And a plant exists
        When I send a POST user request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "<plantId>"
            }
            """
        Then the response status code should be 201
        And response matches OpenAPI contract
        And the response should contain the bookmarked plantId
        And the plant should be saved in my favorites

    Scenario: Duplicate addition returns 200 OK idempotently
        Given a family exists
        And a plant exists
        And the plant is in my favorites
        When I send a POST user request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "<plantId>"
            }
            """
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the response should contain the bookmarked plantId
        And the plant should be saved in my favorites

    Scenario: Adding a non-existent plant returns 404 Not Found
        When I send a POST user request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c9"
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract

    Scenario: Adding a soft-deleted plant returns 404 Not Found
        Given a family exists
        And a soft-deleted plant exists
        When I send a POST user request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "<plantId>"
            }
            """
        Then the response status code should be 404
        And response matches OpenAPI contract
