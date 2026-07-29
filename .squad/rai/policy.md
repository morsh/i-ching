# RAI Policy — I-Ching Oracle

## Critical checks (cannot be disabled)

- **Credential exposure** — no API keys, tokens, or secrets in code, config, or docs.
- **Injection** — no `innerHTML` with unsanitized input; no `eval`; no unsafe DOM sinks.
- **Harmful content** — no readings or copy that encourage self-harm, violence, or hazardous action.
- **Advice boundary** — divination copy must not present itself as medical, legal, financial, or psychiatric advice.
- **PII** — the site is stateless; no collection, transmission, or logging of user questions or identifiers.

## Advisory checks

- **Framing/disclaimer** — a visible, non-preachy note that readings are for reflection and entertainment.
- **Exclusionary language** — inclusive, respectful treatment of the I-Ching as a cultural and philosophical tradition; no caricature or mysticism-as-mockery.
- **Cultural accuracy** — hexagram names and texts attributed to their translation source where applicable; respect public-domain licensing.
- **Accessibility** — line diagrams must have text equivalents; color must not be the only signal for changing lines.

## Terminology standards

- Use "reading" or "casting", not "fortune telling".
- Use "changing lines" / "old yin" / "old yang" consistently.
- Avoid absolute predictive claims ("this will happen"). Prefer reflective phrasing.

## Opt-out

Advisory checks may be temporarily disabled with a justification logged to `audit-trail.md`. Auto re-enables after 30 days. Critical checks may never be disabled.
