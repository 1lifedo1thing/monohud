# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React component library. Behaviour comes from `@base-ui/react`. TypeScript, pnpm monorepo. Styles are plain CSS, which keeps a future non-React layer possible, but only React ships for now.

## Users

Front-end developers building game interfaces and immersive web experiences. Their players use these screens constantly during play, usually full screen and in a dark room.

## Product Purpose

A ready-to-use set of sci-fi React components, from form controls to a full cockpit scene, so developers get complete motion, depth and sound feedback without handling accessibility, keyboard support or overlay positioning themselves.

## Positioning

A sci-fi UI kit built on the mature headless library Base UI. Base UI guarantees behaviour; this project focuses on visuals, motion and game-specific components.

## Constraints

- Respect `prefers-reduced-motion`; motion has three levels: `off`, `subtle`, `full`.
- Sound is off by default and enabled by the developer.
- Text contrast meets WCAG AA; glow and scanlines must not reduce legibility.
- The default theme is monochrome; colour is reserved for status such as green, orange and red.
- All shipped copy, demo content and documentation are in English.

## Open Decisions

- When to build the non-React (Custom Elements) layer.
- The `@monohud/*` npm scope is not registered yet.
