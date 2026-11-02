@locations
Feature: User Locations
    As a registered gardener
    I want to keep several named growing locations with optional geographic context
    So that I can apply the right climate context to different beds

    Scenario: Create a location with geography and read it back
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero",
                "postalCode": "C1001",
                "country": "Argentina",
                "timezone": "America/Argentina/Buenos_Aires",
                "hemisphere": "south"
            }
            """
        Then the response status code should be 201
        And the response should have ETag '"0"'
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero",
                "postalCode": "C1001",
                "country": "Argentina",
                "timezone": "America/Argentina/Buenos_Aires",
                "hemisphere": "south"
            }
            """
        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111101"
        Then the response status code should be 200
        And the response body should contain
            """
            {
                "id": "11111111-1111-4111-8111-111111111101",
                "name": "Huerto trasero"
            }
            """

    Scenario: Create a location with only a name omits every geographic field
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111102",
                "name": "Solo nombre"
            }
            """
        Then the response status code should be 201
        And the response body should not contain
            """
            {
                "hemisphere": "north"
            }
            """
        And the response body should not contain
            """
            {
                "hemisphere": "south"
            }
            """

    Scenario: Listing locations returns the owner's active locations
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111103",
                "name": "Mi parcela"
            }
            """
        Then the response status code should be 201
        When I send a GET user request to "/api/v1/locations"
        Then the response status code should be 200
        And the response body should contain a paginated list
        And the response body should contain
            """
            {
                "data": [
                    { "id": "11111111-1111-4111-8111-111111111103" }
                ]
            }
            """

    Scenario: Updating a location's geography persists and bumps the version
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111104",
                "name": "Parcela a editar",
                "country": "Argentina"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a PATCH user request to "/api/v1/locations/11111111-1111-4111-8111-111111111104" with body
            """
            {
                "country": null,
                "timezone": "Europe/Madrid",
                "hemisphere": "north"
            }
            """
        Then the response status code should be 200
        And the response should have ETag '"1"'
        And the response body should contain
            """
            {
                "timezone": "Europe/Madrid",
                "hemisphere": "north"
            }
            """
        And the response body should not contain
            """
            {
                "country": "Argentina"
            }
            """

    Scenario: Creating a second location with a duplicate active name is rejected
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111105",
                "name": "Nombre duplicado"
            }
            """
        Then the response status code should be 201
        When a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111106",
                "name": "nombre duplicado"
            }
            """
        Then the response status code should be 409

    Scenario: A soft-deleted location's name becomes available again
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111107",
                "name": "Nombre reutilizable"
            }
            """
        Then the response status code should be 201
        When I use If-Match '"0"'
        And I send a DELETE user request to "/api/v1/locations/11111111-1111-4111-8111-111111111107"
        Then the response status code should be 204
        When I send a GET user request to "/api/v1/locations/11111111-1111-4111-8111-111111111107"
        Then the response status code should be 404
        And a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111108",
                "name": "Nombre reutilizable"
            }
            """
        Then the response status code should be 201

    Scenario: A different account cannot reach another owner's location
        Given a POST user request to "/api/v1/locations" with body
            """
            {
                "id": "11111111-1111-4111-8111-111111111109",
                "name": "Finca privada"
            }
            """
        Then the response status code should be 201
        Then a GET collaborator request to "/api/v1/locations/11111111-1111-4111-8111-111111111109" should return status 404
