import { Cause, Effect, Exit, Layer, Logger, LogLevel, Option } from "effect";

const backendLoggerLayer = Layer.merge(
	Logger.structured,
	Logger.minimumLogLevel(LogLevel.Info),
);

export async function runBackendEffect<A, E>(
	effect: Effect.Effect<A, E>,
): Promise<A> {
	const exit = await Effect.runPromiseExit(
		effect.pipe(Effect.provide(backendLoggerLayer)),
	);

	return Exit.match(exit, {
		onSuccess: (value) => value,
		onFailure: (cause) => {
			const failure = Cause.failureOption(cause);
			const value = Option.isSome(failure) ? failure.value : Cause.squash(cause);

			if (value instanceof Error) {
				throw value;
			}

			if (
				typeof value === "object" &&
				value !== null &&
				"message" in value &&
				typeof value.message === "string"
			) {
				throw new Error(value.message);
			}

			throw new Error("Unexpected backend failure");
		},
	});
}
