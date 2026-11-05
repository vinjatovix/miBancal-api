Feature: Remove Favorite Plant from Personal Bookmarks
    As a farmer or gardener
    I want to remove plants from my personal favorites collection
    So that my bookmarks collection remains relevant and up to date

    Scenario: Remove a plant from favorites successfully
        Given a family exists
        And a plant exists
        And the plant is in my favorites
        When I send a DELETE user request to "/api/v1/bookmarks/plants/<plantId>"
        Then the response status code should be 204
        And the plant should not be in my favorites

    Scenario: Duplicate removal returns 204 No Content idempotently
        Given a family exists
        And a plant exists
        When I send a DELETE user request to "/api/v1/bookmarks/plants/<plantId>"
        Then the response status code should be 204
        And the plant should not be in my favorites
