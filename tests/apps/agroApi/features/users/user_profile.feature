@users @user-profile
Feature: User Profile (Identity and Roles Only)
    As a registered gardener
    I want to read my account identity and roles
    So that the platform never exposes or accepts geographic data on my account
    (geographic context now lives on Locations, see /locations)

    Scenario: Retrieve profile exposes identity and roles only, with ETag concurrency
        Given I send a GET user request to "/api/v1/users/profile"
        Then the response status code should be 200
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "roles": ["user"],
                "version": 0
            }
            """
        And the response body should not contain
            """
            {
                "hemisphere": "north"
            }
            """

    Scenario: Update profile accepts only an empty body and confirms the version precondition
        Given I send a GET user request to "/api/v1/users/profile"
        Then the response status code should be 200
        And the response should have ETag '"0"'
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/users/profile" with body
            """
            {}
            """
        Then the response status code should be 200
        And the response should have ETag '"0"'

    Scenario: Update profile rejects any geographic field
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/users/profile" with body
            """
            {
                "hemisphere": "south"
            }
            """
        Then the response status code should be 400

    Scenario: Enforces optimistic concurrency control with If-Match header
        When I send a PATCH user request to "/api/v1/users/profile" with body
            """
            {}
            """
        Then the response status code should be 428
        When I use If-Match '"999"'
        And I send a PATCH user request to "/api/v1/users/profile" with body
            """
            {}
            """
        Then the response status code should be 412

    Scenario: Issued JWT token payload carries no geographic claims
        Then the user's JWT token payload must not contain any geographic fields
