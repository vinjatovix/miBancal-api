Feature: Check Favorite Plant Status
    As a farmer or gardener
    I want to check whether a specific plant is in my bookmarks
    So that the UI can display favorite status indicators

    Scenario: Check bookmark returns bookmarked true for favorite plant
        Given a family exists
        And a plant exists
        And the plant is in my favorites
        When I send a GET user request to "/api/v1/bookmarks/plants/<plantId>"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate bookmarked true

    Scenario: Check bookmark returns bookmarked false for unbookmarked plant
        Given a family exists
        And a plant exists
        When I send a GET user request to "/api/v1/bookmarks/plants/<plantId>"
        Then the response status code should be 200
        And response matches OpenAPI contract
        And the check response should indicate bookmarked false
