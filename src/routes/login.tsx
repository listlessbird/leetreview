import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="17"
			height="17"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

function LoginPage() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!isPending && session?.user) {
			void navigate({ to: "/" });
		}
	}, [session, isPending, navigate]);

	async function handleGitHubSignIn() {
		setIsLoading(true);
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/",
		});
	}

	if (isPending) return null;

	return (
		<>
			<style>{CSS}</style>
			<div className="lr-root">
				<div className="lr-container">
					<header className="lr-logo">
						<span className="lr-dot" aria-hidden="true" />
						<span className="lr-wordmark">leet-review</span>
					</header>

					<main className="lr-card">
						<h1 className="lr-title">Welcome back</h1>
						<p className="lr-subtitle">Code review for serious developers.</p>

						<button
							type="button"
							className="lr-btn"
							onClick={handleGitHubSignIn}
							disabled={isLoading}
							aria-label={
								isLoading ? "Connecting to GitHub" : "Sign in with GitHub"
							}
						>
							{isLoading ? (
								<>
									<span className="lr-spinner" aria-hidden="true" />
									<span>Connecting…</span>
								</>
							) : (
								<>
									<GitHubIcon />
									<span>Continue with GitHub</span>
								</>
							)}
						</button>
					</main>

					<footer className="lr-footer">
						By continuing, you agree to our terms of service
					</footer>
				</div>
			</div>
		</>
	);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700&display=swap');

:root {
  --lr-bg: #07070e;
  --lr-text: #ededf5;
  --lr-muted: rgba(237, 237, 245, 0.38);
  --lr-accent: #6366f1;
  --lr-accent-glow: rgba(99, 102, 241, 0.55);
  --lr-card-bg: rgba(255, 255, 255, 0.028);
  --lr-card-border: rgba(255, 255, 255, 0.072);
  --lr-btn-bg: rgba(255, 255, 255, 0.057);
  --lr-btn-border: rgba(255, 255, 255, 0.1);
  --lr-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}

.lr-root {
  min-height: 100vh;
  background: var(--lr-bg);
  background-image:
    radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.07) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 85% 90%, rgba(139,92,246,0.04) 0%, transparent 50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  font-family: 'Syne', system-ui, sans-serif;
}

/* Drifting grid */
.lr-root::before {
  content: '';
  position: absolute;
  inset: -48px;
  background-image:
    linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: lr-grid 24s linear infinite;
  pointer-events: none;
}

@keyframes lr-grid {
  from { transform: translateY(0); }
  to   { transform: translateY(48px); }
}

/* Ambient orb */
.lr-root::after {
  content: '';
  position: absolute;
  width: 640px;
  height: 640px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: lr-orb 9s ease-in-out infinite;
  pointer-events: none;
}

@keyframes lr-orb {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.12); }
}

/* ── Container ── */
.lr-container {
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Staggered entrance */
.lr-logo   { animation: lr-up 0.55s var(--lr-ease-out) both; animation-delay: 0ms; }
.lr-card   { animation: lr-up 0.55s var(--lr-ease-out) both; animation-delay: 80ms; }
.lr-footer { animation: lr-up 0.55s var(--lr-ease-out) both; animation-delay: 150ms; }

@keyframes lr-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Logo ── */
.lr-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
}

.lr-dot {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lr-accent);
  box-shadow: 0 0 10px var(--lr-accent-glow), 0 0 22px rgba(99,102,241,0.18);
  animation: lr-blink 2.4s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes lr-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

.lr-wordmark {
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--lr-text);
}

/* ── Card ── */
.lr-card {
  background: var(--lr-card-bg);
  border: 1px solid var(--lr-card-border);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2.25rem;
  position: relative;
  overflow: hidden;
}

/* Indigo shimmer top line */
.lr-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--lr-accent) 50%, transparent 100%);
  opacity: 0.6;
}

/* Corner glow */
.lr-card::after {
  content: '';
  position: absolute;
  top: -40px; left: -40px;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%);
  pointer-events: none;
}

.lr-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--lr-text);
  letter-spacing: -0.035em;
  margin: 0 0 0.5rem;
  line-height: 1.15;
}

.lr-subtitle {
  font-size: 0.875rem;
  color: var(--lr-muted);
  margin: 0 0 2rem;
  line-height: 1.55;
  font-weight: 400;
}

/* ── GitHub button ── */
.lr-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.875rem 1.5rem;
  background: var(--lr-btn-bg);
  border: 1px solid var(--lr-btn-border);
  color: var(--lr-text);
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    background    150ms ease,
    border-color  150ms ease,
    box-shadow    150ms ease,
    transform     200ms var(--lr-ease-out);
}

/* Gradient wash on hover */
.lr-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, transparent 55%);
  opacity: 0;
  transition: opacity 200ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .lr-btn:not(:disabled):hover {
    background: rgba(255,255,255,0.09);
    border-color: rgba(255,255,255,0.18);
    box-shadow:
      0 0 0 1px rgba(99,102,241,0.22),
      0 8px 32px rgba(0,0,0,0.45);
    transform: translateY(-1px);
  }
  .lr-btn:not(:disabled):hover::before {
    opacity: 1;
  }
}

.lr-btn:not(:disabled):active {
  transform: scale(0.975) !important;
  transition-duration: 80ms !important;
}

.lr-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* ── Spinner ── */
.lr-spinner {
  display: block;
  width: 15px;
  height: 15px;
  border: 1.5px solid rgba(237,237,245,0.18);
  border-top-color: var(--lr-text);
  border-radius: 50%;
  animation: lr-spin 0.65s linear infinite;
  flex-shrink: 0;
}

@keyframes lr-spin {
  to { transform: rotate(360deg); }
}

/* ── Footer ── */
.lr-footer {
  text-align: center;
  font-family: 'IBM Plex Mono', 'Courier New', monospace;
  font-size: 0.6875rem;
  color: var(--lr-muted);
  letter-spacing: 0.045em;
  line-height: 1.6;
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .lr-card  { padding: 1.75rem; }
  .lr-title { font-size: 1.625rem; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .lr-root::before,
  .lr-root::after,
  .lr-dot,
  .lr-spinner { animation: none; }
  .lr-logo, .lr-card, .lr-footer { animation: none; opacity: 1; }
  .lr-btn { transition: none; }
}
`;
