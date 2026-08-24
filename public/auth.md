# auth.md - Cuatro Puntas Agent Registration & API Authorization

This document describes authentication, authorization, and terms of interaction for automated AI agents and API clients interacting with Cuatro Puntas services.

## Overview
Cuatro Puntas provides public programmatic access to read service information, pricing tables, subsidy guidelines, and request project quotes.

## Agent Audience & Permissions
- **Audience:** AI Agents, autonomous assistants (ChatGPT, Claude, Perplexity, Gemini, etc.), search engines, and developers.
- **Read Access:** Free, unrestricted public access to documentation, pricing tables, and project catalogs.
- **Quote & Interaction API:** Free public access to submit quotes and interact with the AI construction assistant.

## Registration & Provisioning
- Registration Endpoint: https://cuatropuntas.com/api/chat
- Supported Flow: Anonymous & Verified Email
- Credential Use: Standard Bearer Token or Anonymous session headers

## Discovery Endpoints
- OAuth Authorization Server: https://cuatropuntas.com/.well-known/oauth-authorization-server
- OpenID Configuration: https://cuatropuntas.com/.well-known/openid-configuration
- Protected Resource Metadata: https://cuatropuntas.com/.well-known/oauth-protected-resource

## Contact
- Constructora Cuatropuntas SpA
- Email: contacto@cuatropuntas.com
- Support WhatsApp: https://wa.me/56963482439
