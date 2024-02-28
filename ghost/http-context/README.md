# HTTP Context

Uses [AsyncLocalStorage](https://nodejs.org/api/async_context.html) to create a 
context for a HTTP request so that values can be stored and retrieved without
having to directly pass them around

## Usage

The default export is an initialized singleton so that the context can be
accessed anywhere within the application. Typical usage in an Express application 
would be to add a middleware early in the request lifecycle to setup the context:

```js
import HttpContext from '@ghost/http-context';

// ...

app.use((req, res, next) => {
  HttpContext.start(() => {

    req.on('close', () => {
        HttpContext.end();
    });

    HttpContext.set('foo', 'bar');

    next();
  });
});

app.use((req, res, next) => {
  const foo = HttpContext.get('foo');

  // ...
});
```

In the example above, because `next` was called within `HttpContext.start`, any 
subsequent middleware or route handlers will have access to the context

## API

### `HttpContext.start(fn: () => void): void`

Start a new context and runs the provided function within it

This should be called at the beginning of a request lifecycle

### `HttpContext.set(key: string, value: any, fn: (v: any) => {}): void`

Set a value in the current context. Optionally, a function can be provided that
will be called (with the original value) when the context ends. This is useful 
for disposing of resources that may have been stored in the context

### `HttpContext.get(key: string): any`

Retrieve a value from the current context

### `HttpContext.end(): void`

End the current context. This function should be called at the end of a request
lifecycle. Any functions provided to `HttpContext.set` will be executed at this time.

## Develop

This is a monorepo package.

Follow the instructions for the top-level repo.

1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies

## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests
