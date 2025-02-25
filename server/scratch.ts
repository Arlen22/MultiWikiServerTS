import hapi from "@hapi/hapi";
import inert from "@hapi/inert";
import { PassThrough } from "stream";
import {makeSSE} from "./utils";
import { createSecureServer } from "http2";
type route<T> = hapi.HandlerDecorations
  | hapi.Lifecycle.Method<hapi.ReqRefDefaults, any> | undefined

interface Handler<PARAMS extends string> extends hapi.ReqRefDefaults {
  Params: Record<PARAMS, string>
}

interface SSEEvent {
  eventName: string
  eventData: string
  eventId: string
  retryMilliseconds: number
}

function makeHandler<PARAMS extends string>(fn: hapi.Lifecycle.Method<Handler<PARAMS>, any>) {
  return fn;
}

async function setup() {

  const server = hapi.server({
    port: 8080,
    host: '127.0.0.1',
    listener: createSecureServer(),
    tls: true,
  });

  await server.register(inert);

  server.route({
    method: "GET",
    path: "/wiki/{page}",
    handler: makeHandler<"page">((request, h) => {
      request.params.page

    }),

  });

  server.route({
    method: "GET",
    path: "/recipes/{recipe}/changes",
    handler: makeHandler<"recipe">((request, h) => {
      request.params.recipe;
      const { write, close } = makeSSE(h, 2000);

      // Simulate sending periodic updates
      const interval = setInterval(() => {
        const data = { time: new Date().toISOString() };
        write('update', data, '1');
      }, 2000);

      // Cleanup when client disconnects
      request.raw.req.on('close', () => {
        clearInterval(interval);
        close();
        console.log('Client disconnected');
      });

    }),
  });

  server.route({
    method: "GET",
    path: "/recipes/{recipe}/tiddlers.json",
    handler: makeHandler<"recipe">((request, h) => {
      request.params.recipe
    }),
  });

  server.route({
    method: "GET",
    path: "/recipes/{recipe}/tiddlers/{tiddler}",
    handler: makeHandler<"recipe" | "tiddler">((request, h) => {
      request.params.recipe
      request.params.tiddler
    })
  });

  server.route({
    method: "PUT",
    path: "/recipes/{recipe}/tiddlers/{tiddler}",
    handler: makeHandler<"recipe" | "tiddler">((request, h) => {
      request.params.recipe
      request.params.tiddler
    })
  });

  server.route({
    method: "DELETE",
    path: "/recipes/{recipe}/tiddlers/{tiddler}",
    handler: makeHandler<"recipe" | "tiddler">((request, h) => {
      request.params.recipe
      request.params.tiddler
    })
  })


  await server.start();

  console.log('Server running on %s', server.info.uri);
}