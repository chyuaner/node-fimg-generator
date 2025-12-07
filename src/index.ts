import app from "./app";
import { CloudflareAssetLoader } from "./loader";

export default {
	async fetch(request, env, ctx): Promise<Response> {
        // Initialize App with specific bindings or middleware injection
        // We can't easily use app.use inside the fetch handler for the same global app instance 
        // without potentially adding it multiple times if we are not careful (though pure fetch handler is per request usually).
        // Better: create a new app instance or clone? standard Hono pattern for workers:
        
        // We can just use the exported app, but we need to inject the loader.
        // The loader needs the ASSETS binding.
        
        const loader = new CloudflareAssetLoader(env.ASSETS);
        
        // Context/Env injection in Hono:
        // app.fetch(request, env, ctx) automatically passes env to c.env
        // But our middleware checks c.get('assetLoader'). 
        // We can set it in executionCtx or custom param? 
        // Best way: Create a small wrapper or execution-time middleware.
        
        // Since we are exporting a default object with fetch, we can call app.fetch
        // But we want to inject variables.
        
        const res = await app.fetch(request, { 
            ...env, 
            Variables: {
                assetLoader: loader 
            }
        }, ctx);
        
        return res;
	},
} satisfies ExportedHandler<CloudflareBindings>;
