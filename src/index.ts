import { Hono } from "hono";
import app from "./app";
import { AssetLoader, CloudflareAssetLoader } from "./loader";

export default {
	async fetch(request, env, ctx): Promise<Response> {
        const loader = new CloudflareAssetLoader(env.ASSETS);
        
        const workerApp = new Hono<{ Variables: { assetLoader: AssetLoader }, Bindings: CloudflareBindings }>();
        
        workerApp.use('*', async (c, next) => {
            c.set('assetLoader', loader);
            await next();
        });
        
        workerApp.route('/', app);
        
        return workerApp.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<CloudflareBindings>;
