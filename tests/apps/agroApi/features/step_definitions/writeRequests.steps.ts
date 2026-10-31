import { Given, When } from '@cucumber/cucumber';

import { prepareRequest, type AgroWorld, type Role } from './utils/index.js';

Given(
  'a POST request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, body });
  }
);

Given(
  'a POST request to {string} with query {string} and body',
  function (this: AgroWorld, route: string, query: string, body: string) {
    prepareRequest(this, { method: 'POST', route, query, body });
  }
);

Given(
  'a POST {role} request to {string} with query {string} and body',
  function (
    this: AgroWorld,
    role: Role,
    route: string,
    query: string,
    body: string
  ) {
    prepareRequest(this, {
      method: 'POST',
      route,
      role,
      query,
      body
    });
  }
);

Given(
  'a POST {role} request to {string} with body',
  function (this: AgroWorld, role: Role, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, role, body });
  }
);

When(
  'I send a POST {role} request to {string} with body',
  function (this: AgroWorld, role: Role, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, role, body });
  }
);

When(
  'I send a POST request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'POST', route, body });
  }
);

When(
  'I send a PATCH {role} request to {string} with body',
  function (this: AgroWorld, role: Role, route: string, body: string) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role,
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH {role} request to {string} with query {string} and body',
  function (
    this: AgroWorld,
    role: Role,
    route: string,
    query: string,
    body: string
  ) {
    prepareRequest(this, {
      method: 'PATCH',
      route,
      role,
      query,
      body,
      conditional: true
    });
  }
);

When(
  'I send a PATCH request to {string} with body',
  function (this: AgroWorld, route: string, body: string) {
    prepareRequest(this, { method: 'PATCH', route, body, conditional: true });
  }
);

When(
  'I send a DELETE {role} request to {string}',
  function (this: AgroWorld, role: Role, route: string) {
    prepareRequest(this, {
      method: 'DELETE',
      route,
      role,
      conditional: true
    });
  }
);

When(
  'I send a DELETE request to {string}',
  function (this: AgroWorld, route: string) {
    prepareRequest(this, { method: 'DELETE', route, conditional: true });
  }
);
