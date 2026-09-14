# Angular Router Data Fetching

Angular CLI, framework, and router: **22.2.0-next.7**, verified against npm's next tag on September 14, 2026.

The application was scaffolded with:

```sh
npm create @angular@next angular-router-fetching
```

Reference: https://next.angular.dev/guide/routing/data-fetching-with-resources

## How it works

- Angular standalone components, strict TypeScript, signals, and template control flow.
- Two same-origin iframe application instances isolate the routers, allowing independent simultaneous navigation. Parent-to-frame messages are checked against origin and window identity.
- The resolver panel generates nested routes with real `resolve` functions.
- The resources panel generates the same nested hierarchy with `resources`, `resource()`, `nonBlocking()`, and `withRouterResources()`.
- `src/app/demo.routes.ts` builds the actual `Routes` from the UI plan. Each level contains one resolver or resource; Angular determines scheduling. Resolvers on a single route can run concurrently, so the sequential timing here specifically describes nested routes.
- `withComponentInputBinding()` passes resolver payloads to `ResolvedLevel.request` and the full non-blocking resource to `ResourceLevel.request`. These components render the returned data and resource loading/error signals inside nested `router-outlet`s; progress instrumentation does not supply the preview data.
- Resources are blocking by default. The resources panel explicitly opts into `nonBlocking()` to match its UI label. It does not demonstrate dependent resources, guards, or parameter-driven reuse.
- Resolver Observables cancel their simulated I/O when Angular unsubscribes; resource loaders forward Angular's `abortSignal`. Replay navigates back to a real previous-route component before creating a fresh hierarchy.
- Request latency is simulated with abortable timers. Progress is measured from actual loader starts. Route visibility follows actual routed-component activation, not a hard-coded animation schedule.
- Randomization creates 2–6 matched route levels, preserving identical durations across panels. Replay retains the scenario; randomization resets both.
- The monochrome controls and adaptive light/dark theme preserve the previous page design.

## Local development

```sh
npm ci
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

```sh
npm run build
```

This compiles the project and stores the static application in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Formatting

```sh
npm run format
```

Prettier settings live in `.prettierrc`; `npm run format:check` verifies without writing.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```sh
npm test -- --watch=false
```

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```sh
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```sh
ng generate --help
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
