# Inari

The web GUI for a self-hosted agent homelab, branded for **FreedzHost**.

Inari lets you start and drive coding agents across your own machines — local
and in your own cloud — from one interface. It is the front end that the
[Inari Android app](https://github.com/bengua/inari-apk) loads, and it runs the
same everywhere (phone, desktop, browser).

[FreedzHost](https://freedzhost.cloud)

## About this fork

Inari is a fork of [`davidondrej/cloudroom-gui`](https://github.com/davidondrej/cloudroom-gui),
re-branded and adapted for a sovereign, self-hosted setup (own core, own
machines, no dependency on a hosted account). It tracks upstream and keeps the
original architecture; the changes are branding, affiliation links, and a set of
UI refinements.

Licensed under **Apache-2.0**, same as upstream — see [`LICENSE`](LICENSE).
Full credit for the underlying application goes to the Cloudroom authors.

## What's different from upstream

- FreedzHost branding and the Inari fox mascot
- Right panel reworked toward an artifact-style reading experience:
  - terminal at a larger font, inside a rounded card
  - markdown previews with a capped reading width and roomier padding
  - code / CSV / iframe previews as inset, bordered cards
- Affiliation and documentation links point to `freedzhost.cloud`

## Build

The GUI is built and shipped by the companion tooling (branding, packaging,
install) rather than from this repo directly. See the `inari` tooling repo for
the `build-ship` flow.

## Related

- [`inari-apk`](https://github.com/bengua/inari-apk) — the Android client
- [`davidondrej/cloudroom-gui`](https://github.com/davidondrej/cloudroom-gui) — upstream
