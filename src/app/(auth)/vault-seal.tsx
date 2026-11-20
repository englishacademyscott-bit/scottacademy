"use client";

import * as React from "react";
import Image from "next/image";

type VaultPhase = "spin" | "lock" | "open" | "done";

/**
 * Selo concêntrico da Scott English Academy com anel externo ("SCOTT ENGLISH ACADEMY")
 * e núcleo central (Águia, Coroa, Escudo e Livro) girando em sentidos opostos.
 */
export function SpinningSeal({
  size = 112,
  spinning = false,
  onClick,
  className = "",
}: {
  size?: number;
  spinning?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scott English Academy"
      style={{ width: size, height: size }}
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {/* Halo energético */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-tr from-brand-500/35 via-accent-400/25 to-brand-400/35 blur-md transition-opacity duration-500 ${
          spinning ? "opacity-100" : "opacity-60 group-hover:opacity-100"
        }`}
      />

      {/* Anel mecânico HUD tracejado externo */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] text-brand-400/60"
        style={{
          animation: spinning
            ? "sea-spin-ccw 3.2s linear infinite"
            : undefined,
        }}
      >
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="10 6 2 6"
        />
      </svg>

      {/* Camada 1: Anel externo ("SCOTT · ENGLISH ACADEMY") */}
      <span
        className="pointer-events-none absolute inset-0 transition-transform duration-1000 ease-out group-hover:rotate-180"
        style={{
          animation: spinning
            ? "sea-spin-cw 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite"
            : undefined,
        }}
      >
        <Image
          src="/brand/seal-ring.png"
          alt=""
          width={256}
          height={256}
          priority
          className="h-full w-full select-none object-contain drop-shadow-[0_6px_20px_rgba(15,23,42,0.55)]"
        />
      </span>

      {/* Camada 2: Brasão central (Águia, Coroa da Liberdade, Escudo e Livro) */}
      <span
        className="pointer-events-none absolute inset-0 transition-transform duration-1000 ease-out group-hover:-rotate-90"
        style={{
          animation: spinning
            ? "sea-spin-core 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite"
            : undefined,
        }}
      >
        <Image
          src="/brand/seal-core.png"
          alt="Scott English Academy"
          width={256}
          height={256}
          priority
          className="h-full w-full select-none object-contain"
        />
      </span>
    </button>
  );
}

/**
 * Metade (esquerda ou direita) do selo mecânico para quando a comporta se parte ao meio e abre.
 */
function SealHalf({
  side,
  phase,
}: {
  side: "left" | "right";
  phase: VaultPhase;
}) {
  const isLeft = side === "left";
  // No estágio "open", cada metade gira levemente como engrenagem destravando enquanto as portas abrem
  const unlatchRotate =
    phase === "open" ? (isLeft ? -22 : 22) : 0;

  return (
    <div
      className="relative h-64 w-64 sm:h-80 sm:w-80"
      style={{
        clipPath: isLeft
          ? "polygon(0 0, 50% 0, 50% 100%, 0 100%)"
          : "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
      }}
    >
      {/* Anel mecânico HUD */}
      <svg
        viewBox="0 0 320 320"
        className="pointer-events-none absolute -inset-5 h-[calc(100%+40px)] w-[calc(100%+40px)] text-accent-400/70"
        style={{
          transform:
            phase === "spin"
              ? "rotate(-180deg)"
              : `rotate(${unlatchRotate * -1.2}deg)`,
          transition: "transform 1.15s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <circle
          cx="160"
          cy="160"
          r="152"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="18 8 4 8"
        />
        <circle
          cx="160"
          cy="160"
          r="142"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 12"
          opacity="0.65"
        />
      </svg>

      {/* Anel externo "SCOTT · ENGLISH ACADEMY" */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${unlatchRotate}deg)`,
          transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          animation:
            phase === "spin"
              ? "sea-vault-ring-in 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : undefined,
        }}
      >
        <Image
          src="/brand/seal-ring.png"
          alt=""
          width={512}
          height={512}
          priority
          className="h-full w-full select-none object-contain drop-shadow-[0_0_35px_rgba(99,102,241,0.55)]"
        />
      </div>

      {/* Núcleo central (Águia + Escudo + Livro) */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${-unlatchRotate * 0.6}deg)`,
          transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          animation:
            phase === "spin"
              ? "sea-vault-core-in 1.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : undefined,
        }}
      >
        <Image
          src="/brand/seal-core.png"
          alt=""
          width={512}
          height={512}
          priority
          className="h-full w-full select-none object-contain"
        />
      </div>

      {/* Pulso de travamento quando o anel e a águia se alinham */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-full border-2 border-accent-400 transition-all duration-500 ${
          phase === "lock" || phase === "open"
            ? "scale-110 opacity-0"
            : "scale-95 opacity-80"
        }`}
      />
    </div>
  );
}

/**
 * Animação estilo Vingadores / S.H.I.E.L.D. Vault:
 * O círculo oficial da Scott English Academy gira seus anéis concêntricos,
 * trava no centro com um feixe luminoso e as comportas se abrem ao meio revelando o login.
 */
export function VaultDoorIntro({
  runKey,
}: {
  runKey: number;
}) {
  const [phase, setPhase] = React.useState<VaultPhase>("spin");

  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }

    setPhase("spin");
    const tLock = window.setTimeout(() => setPhase("lock"), 1200);
    const tOpen = window.setTimeout(() => setPhase("open"), 1550);
    const tDone = window.setTimeout(() => setPhase("done"), 2550);

    return () => {
      window.clearTimeout(tLock);
      window.clearTimeout(tOpen);
      window.clearTimeout(tDone);
    };
  }, [runKey]);

  if (phase === "done") return null;

  const isOpen = phase === "open";
  const isLocked = phase === "lock" || phase === "open";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
    >
      <style>{`
        @keyframes sea-vault-ring-in {
          0% { transform: rotate(-300deg) scale(0.84); opacity: 0; }
          25% { opacity: 1; }
          82% { transform: rotate(12deg) scale(1.02); }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes sea-vault-core-in {
          0% { transform: rotate(220deg) scale(0.75); opacity: 0; }
          25% { opacity: 1; }
          82% { transform: rotate(-10deg) scale(1.03); }
          100% { transform: rotate(0deg) scale(1); opacity: 1; }
        }
        @keyframes sea-spin-cw {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sea-spin-ccw {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes sea-spin-core {
          0% { transform: rotate(0deg) scale(1); }
          45% { transform: rotate(-180deg) scale(1.04); }
          100% { transform: rotate(-360deg) scale(1); }
        }
      `}</style>

      {/* COMPORTA ESQUERDA */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 border-r border-accent-400/40 bg-[#060c1a]"
        style={{
          transform: isOpen ? "translateX(-104%)" : "translateX(0%)",
          transition: "transform 0.95s cubic-bezier(0.7, 0, 0.2, 1)",
          backgroundImage:
            "radial-gradient(circle at 100% 50%, rgba(99,102,241,0.22), transparent 60%), linear-gradient(135deg, #0b152c 0%, #050a16 100%)",
          boxShadow: "12px 0 50px rgba(2,6,23,0.85)",
        }}
      >
        {/* Linhas táticas estilo comporta Avengers */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute right-0 top-1/2 h-40 w-1.5 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-transparent via-accent-400 to-transparent opacity-80" />
        <div className="absolute inset-y-0 right-12 w-px bg-white/5" />
        <div className="absolute left-8 top-1/2 hidden h-px w-1/3 -translate-y-1/2 bg-gradient-to-r from-transparent to-brand-400/40 sm:block" />

        {/* Metade esquerda do Selo posicionada exatamente no centro da tela */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
          <SealHalf side="left" phase={phase} />
        </div>
      </div>

      {/* COMPORTA DIREITA */}
      <div
        className="absolute inset-y-0 right-0 w-1/2 border-l border-accent-400/40 bg-[#060c1a]"
        style={{
          transform: isOpen ? "translateX(104%)" : "translateX(0%)",
          transition: "transform 0.95s cubic-bezier(0.7, 0, 0.2, 1)",
          backgroundImage:
            "radial-gradient(circle at 0% 50%, rgba(6,182,212,0.22), transparent 60%), linear-gradient(225deg, #0b152c 0%, #050a16 100%)",
          boxShadow: "-12px 0 50px rgba(2,6,23,0.85)",
        }}
      >
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute left-0 top-1/2 h-40 w-1.5 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-transparent via-accent-400 to-transparent opacity-80" />
        <div className="absolute inset-y-0 left-12 w-px bg-white/5" />
        <div className="absolute right-8 top-1/2 hidden h-px w-1/3 -translate-y-1/2 bg-gradient-to-l from-transparent to-brand-400/40 sm:block" />

        {/* Metade direita do Selo posicionada exatamente no centro da tela */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <SealHalf side="right" phase={phase} />
        </div>
      </div>

      {/* Feixe laser central no momento do destravamento */}
      <div
        className={`absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-gradient-to-b from-transparent via-accent-300 to-transparent shadow-[0_0_30px_6px_rgba(34,211,238,0.85)] transition-opacity duration-300 ${
          isLocked && !isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Onda de choque circular quando o brasão trava */}
      <div
        className={`absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-300/80 shadow-[0_0_60px_rgba(99,102,241,0.7)] transition-all duration-500 sm:h-96 sm:w-96 ${
          phase === "lock"
            ? "scale-110 opacity-100"
            : isOpen
              ? "scale-150 opacity-0"
              : "scale-75 opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * Cabeçalho institucional com o brasão oficial da Scott English Academy.
 */
export function LoginVaultHeader() {
  const [runKey, setRunKey] = React.useState(0);

  return (
    <>
      <VaultDoorIntro runKey={runKey} />
      <div className="mb-6 flex items-center gap-3.5">
        <SpinningSeal
          size={56}
          onClick={() => setRunKey((k) => k + 1)}
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">
            Scott English Academy
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Inglês para quem quer FALAR.
          </p>
        </div>
      </div>
    </>
  );
}
