# JalalAI Next-Level Implementation

This release preserves the audited v1.9.x core and adds the complete product-surface contract for the website and Android application.

## Website information architecture

Home · AI Chat · Research · Create Image · Create Video · 34 Expert Agents · Office & Documents · Data Analysis · Web & App Design · Code & Development · Projects · Knowledge Vault · Files · Tools & Integrations · Pricing · Account · Security & Settings · Help & Support.

Every dashboard must use the shared shell: global navigation, project selector, new-task action, upload area, task progress, agent activity, output/artifact panel, history, export controls, loading states, empty states, error states and responsive mobile navigation.

## Android information architecture

Splash · Authentication · Home · Chat · Voice · Research · Agents · Files · Office · Creative Studio · Projects · Knowledge Vault · Notifications · Profile · Settings · Subscription.

The Android client shares the same backend account, project, file, task and entitlement identifiers as the website. The production app must use Play Billing for digital subscriptions distributed through Google Play.

## External deployment gates

Production authentication, database, provider credentials, payment gateway, Play Billing credentials, cloud infrastructure, monitoring, signing keys and Play Store approval are intentionally configuration/deployment gates rather than fake local completions.
