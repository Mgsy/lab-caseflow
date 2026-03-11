# Caseflow

> First startup downloads an AI model (~400MB) and bootstraps two tenants. Expect 2-5 minutes before the app is fully ready.

## Scenario

Caseflow is a multi-tenant support ticketing platform. Customers submit tickets, agents respond through a rich text editor (ProseMirror).

The platform recently shipped an AI assistant feature for agents. When an agent clicks "Summarize", the system feeds the customer's last message into a local LLM and inserts the AI-generated summary directly into the agent's editor.

The vulnerability chain: a customer-controlled message contains a payload that survives the rich text pipeline. The AI assistant processes this message and returns a summary that, when inserted into the agent's editor, executes in the agent's browser context. This escalates a seemingly unexploitable self-XSS into a full cross-tenant attack — the attacker can execute code on behalf of the admin and take over the target tenant.

## How to Run

Add hostnames:

```
echo '127.0.0.1 acmecorp.caseflow.io attacker.caseflow.io caseflow.io' | sudo tee -a /etc/hosts
```

Start the lab:

```
docker compose up --build
```

## Environment

Two isolated tenants, each with its own database and sessions:

| Tenant | URL | Purpose |
|--------|-----|---------|
| `attacker` | http://attacker.caseflow.io | Your instance — full admin access, use for testing and building your PoC |
| `acmecorp` | http://acmecorp.caseflow.io | Target organisation — attack surface |

**Attacker tenant credentials** (http://attacker.caseflow.io/agent/login):

| Email | Password | Role |
|-------|----------|------|
| admin@caseflow.io | Admin123! | Admin |

On the acmecorp tenant, you can register a new customer account at http://acmecorp.caseflow.io/customer/register. Agent credentials are not provided.

## Goal

Achieve admin access on the **acmecorp** tenant and retrieve the flag (`mgsy.dev{...}`).

An admin agent on acmecorp checks new tickets every 30 seconds.

## Reset

```
docker compose down -v && docker compose up --build
```
