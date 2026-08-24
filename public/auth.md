# auth.md - Cuatro Puntas Agent Registration & API Authorization

This document describes authentication, authorization, and terms of interaction for automated AI agents and API clients interacting with Cuatro Puntas services.

## Overview
Cuatro Puntas provides public programmatic access to read service information, pricing tables, subsidy guidelines, and request project quotes.

## Authentication Methods
- **Public Read & Discovery:** No authentication credentials required for discovery endpoints (`llms.txt`, `/.well-known/*`, and pricing metadata).
- **Interactive Quoting & Messaging:** Agents may submit quote requests and lead submissions via public endpoints (`/api/quote`, `/api/chat`) using anonymous client identifiers.
- **WebMCP:** Browser agents can execute client-side tools registered via `navigator.modelContext` without additional auth.

## OAuth / OIDC Discovery Endpoints
- **Authorization Server:** `https://cuatropuntas.com/.well-known/oauth-authorization-server`
- **OpenID Configuration:** `https://cuatropuntas.com/.well-known/openid-configuration`
- **Protected Resource:** `https://cuatropuntas.com/.well-known/oauth-protected-resource`

## Contact & Terms
- Constructora Cuatropuntas SpA
- Support: contacto@cuatropuntas.com
