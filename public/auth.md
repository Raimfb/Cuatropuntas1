---
name: Cuatro Puntas Agent Registration
version: 1.0.0
register_uri: https://www.cuatropuntas.com/api/mcp
instructions: https://www.cuatropuntas.com/auth.md
supported_identity_types:
  - ephemeral
  - delegated
  - anonymous
  - identity_assertion
credential_types:
  - bearer
  - api_key
---

# auth.md - Cuatro Puntas Agent Registration & API Authorization

This document specifies the authorization, registration, and interaction protocols for autonomous AI agents, crawlers, and programmatic integrations interacting with Constructora Cuatropuntas SpA.

## 1. Overview & Audience
- **Target Audience:** Autonomous AI agents (ChatGPT, Claude, Perplexity, Gemini), answer engines, and external tools.
- **Service Scope:** Programmatic exploration of technical construction catalogs, pricing matrices per square meter, Minvu DS1 housing subsidy rules, and quotation calculations.
- **Access Level:** Completely open and public read access. No payment or pre-shared secret is required for quoting or catalog discovery.

## 2. Agent Registration & Provisioning
- **Registration Endpoint:** https://www.cuatropuntas.com/api/mcp
- **Interactive Assistant:** https://www.cuatropuntas.com/api/chat
- **Supported Identity Types:**
  - `anonymous`: Ephemeral agent sessions for instant cost calculation and catalog querying.
  - `identity_assertion`: Verified email assertions and ID-JAG token delegations.
  - `delegated`: Client-assisted authorization workflows.
- **Credential Types:**
  - Standard `Bearer` tokens or anonymous session headers.
  - `api_key` for dedicated automated partner integrations.

## 3. Canonical Discovery Endpoints
- **OAuth Protected Resource:** https://www.cuatropuntas.com/.well-known/oauth-protected-resource
- **OAuth Authorization Server:** https://www.cuatropuntas.com/.well-known/oauth-authorization-server
- **OpenID Configuration:** https://www.cuatropuntas.com/.well-known/openid-configuration
- **Web Bot Signatures Directory:** https://www.cuatropuntas.com/.well-known/http-message-signatures-directory
- **MCP Server Card:** https://www.cuatropuntas.com/.well-known/mcp/server-card.json
- **Agent Skills Index:** https://www.cuatropuntas.com/.well-known/agent-skills/index.json

## 4. Official Contact & Human Escalation
In accordance with official corporate governance (AGENTS.md):
- **Automated Capture & WhatsApp Bot:** +56 9 2738 4075 (https://wa.me/56927384075)
- **Technical On-Site Visit Scheduling:** https://cal.com/cuatropuntas.com/visita-tecnica
- **Support Email:** contacto@cuatropuntas.com
