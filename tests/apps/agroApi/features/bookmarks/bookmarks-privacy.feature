Feature: Bookmarks Multi-Tenant Privacy and Access Control
    As a system maintainer
    I want to guarantee strict privacy and access control on bookmarks
    So that no user can observe or modify another user's favorite plants

    Scenario: A user does not see bookmarks belonging to another user
        Given a family exists
        And a plant exists
        And another user has the plant in their favorites
        When I send a GET user request to "/api/v1/bookmarks"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the bookmarks list should be empty

    Scenario: A user checking favorite status sees false for plants only favorited by another user
        Given a family exists
        And a plant exists
        And another user has the plant in their favorites
        When I send a GET user request to "/api/v1/bookmarks/plants/<plantId>"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate bookmarked false

    Scenario: Unauthenticated GET bookmarks request returns 401 Unauthorized
        When I send a GET request to "/api/v1/bookmarks"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Unauthenticated POST bookmark request returns 401 Unauthorized
        When I send a POST request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
            }
            """
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Unauthenticated DELETE bookmark request returns 401 Unauthorized
        When I send a DELETE request to "/api/v1/bookmarks/plants/6ba7b810-9dad-11d1-80b4-00c04fd430c8"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Unauthenticated GET bookmark check request returns 401 Unauthorized
        When I send a GET request to "/api/v1/bookmarks/plants/6ba7b810-9dad-11d1-80b4-00c04fd430c8"
        Then the response status code should be 401
        And response matches OpenAPI contract

    Scenario: Bookmark request with invalid UUID returns 400 Bad Request
        When I send a POST user request to "/api/v1/bookmarks/plants" with body
            """
            {
                "plantId": "not-a-valid-uuid"
            }
            """
        Then the response status code should be 400
        And response matches OpenAPI contract
