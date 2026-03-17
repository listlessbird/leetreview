import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzle } from "drizzle-orm/d1";
import { Context, Effect, Layer, Schema } from "effect";
import { schema } from "../db/schema";
import { env } from "../env";

type RequestWithCf = Request & {
	cf?: IncomingRequestCfProperties;
};

type CreateAuthOptions = {
	d1?: D1Database;
	cf?: IncomingRequestCfProperties;
};

export function createAuth(_options?: CreateAuthOptions) {
	const d1 = _options?.d1;
	const database = d1
		? drizzleAdapter(
				drizzle(d1, {
					schema,
				}),
				{
					schema,
					provider: "sqlite",
					usePlural: true,
				},
			)
		: drizzleAdapter({} as D1Database, {
				schema,
				provider: "sqlite",
				usePlural: true,
			});

	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database,
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			github: {
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			},
		},
		advanced: {
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
			},
		},
		plugins: [tanstackStartCookies()],
		trustedOrigins: [env.BETTER_AUTH_URL],
	});
}

export const auth = createAuth();

type AuthInstance = ReturnType<typeof createAuth>;
type Session = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

class AuthConfigurationError extends Schema.TaggedError<AuthConfigurationError>()(
	"AuthConfigurationError",
	{
		message: Schema.String,
	},
) {}

class AuthUnavailableError extends Schema.TaggedError<AuthUnavailableError>()(
	"AuthUnavailableError",
	{
		message: Schema.String,
		error: Schema.Defect,
	},
) {}

class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
	"UnauthorizedError",
	{
		message: Schema.String,
	},
) {}

export type AuthError =
	| AuthConfigurationError
	| AuthUnavailableError
	| UnauthorizedError;

export class RequestAuth extends Context.Tag("@/lib/RequestAuth")<
	RequestAuth,
	{
		readonly getAuthForRequest: (
			request: Request,
		) => Effect.Effect<
			AuthInstance,
			AuthConfigurationError | AuthUnavailableError
		>;
		readonly getSession: (
			request: Request,
		) => Effect.Effect<Session, AuthConfigurationError | AuthUnavailableError>;
		readonly requireUserId: (
			request: Request,
		) => Effect.Effect<string, AuthError>;
	}
>() {}

export const requestAuthLayer = Layer.sync(RequestAuth, () => {
	const getAuthForRequest = Effect.fn("RequestAuth.getAuthForRequest")(
		function* (request: Request) {
			const workerModule = yield* Effect.tryPromise({
				try: () => import("cloudflare:workers"),
				catch: (error) =>
					AuthUnavailableError.make({
						message: "Unable to access Cloudflare worker bindings.",
						error,
					}),
			});

			const d1 = workerModule.env?.DB;
			if (!d1) {
				return yield* AuthConfigurationError.make({
					message:
						'Missing D1 binding "DB". Add d1_databases.DB in wrangler.jsonc.',
				});
			}

			const cf = (request as RequestWithCf).cf;
			return createAuth({
				d1,
				...(cf ? { cf } : {}),
			});
		},
	);

	const getSession = Effect.fn("RequestAuth.getSession")(function* (
		request: Request,
	) {
		const auth = yield* getAuthForRequest(request);
		return yield* Effect.tryPromise({
			try: () => auth.api.getSession({ headers: request.headers }),
			catch: (error) =>
				AuthUnavailableError.make({
					message: "Failed to read the current auth session.",
					error,
				}),
		});
	});

	const requireUserId = Effect.fn("RequestAuth.requireUserId")(function* (
		request: Request,
	) {
		const session = yield* getSession(request);
		if (!session?.user?.id) {
			return yield* UnauthorizedError.make({
				message: "Unauthorized",
			});
		}
		return session.user.id;
	});

	return RequestAuth.of({
		getAuthForRequest,
		getSession,
		requireUserId,
	});
});
