import React from 'react';

const ICON_URL = 'https://i.ibb.co/M5Dq0xS9/Icon.png';

interface WebsiteLoaderProps {
  label?: string;
  isFadingOut?: boolean;
  minHeight?: string;
  fullScreen?: boolean;
}

/**
 * Branded Website Loading State
 * Features the MUAVER Icon centered on deep navy background with
 * an elegant pulsing aura, rotating gold ring, and gold typography.
 * Respects prefers-reduced-motion and provides smooth 300ms fade transitions.
 */
export const WebsiteLoader: React.FC<WebsiteLoaderProps> = ({
  label = 'Loading the collection...',
  isFadingOut = false,
  minHeight = 'min-h-screen',
  fullScreen = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`w-full ${minHeight} bg-[#0A1A4F] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden transition-opacity duration-400 ease-out ${
        fullScreen ? 'fixed inset-0 z-50' : ''
      } ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Ambient subtle gold radial aura */}
      <div
        className="absolute w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none muaver-loader-aura"
        style={{ animation: 'muaverPulseAura 4s ease-in-out infinite' }}
      />

      {/* Center Icon & Ring assembly */}
      <div className="relative flex items-center justify-center w-32 h-32 sm:w-36 sm:h-36 mb-6">
        {/* Outer slow ambient dashed ring */}
        <div
          className="absolute inset-0 rounded-full border border-dashed border-[#D4AF37]/25 muaver-loader-ring"
          style={{ animation: 'muaverSpinSlow 14s linear infinite' }}
        />

        {/* Inner high-speed rotating gold accent ring */}
        <div
          className="absolute inset-2.5 rounded-full border border-transparent border-t-[#D4AF37] border-r-[#D4AF37]/60 border-b-[#B89025]/30 muaver-loader-ring"
          style={{ animation: 'muaverSpinSlow 3s linear infinite' }}
        />

        {/* Subtle breathing gold aura behind icon */}
        <div
          className="absolute inset-6 rounded-full bg-[#D4AF37]/20 blur-sm muaver-loader-aura"
          style={{ animation: 'muaverPulseAura 2.5s ease-in-out infinite' }}
        />

        {/* MUAVER Icon */}
        <img
          src={ICON_URL}
          alt="MUAVER"
          width={64}
          height={64}
          className="w-14 h-14 sm:w-16 sm:h-16 object-contain relative z-10 filter drop-shadow-[0_0_14px_rgba(212,175,55,0.5)] muaver-loader-anim"
          style={{ animation: 'muaverBreath 3s ease-in-out infinite' }}
        />
      </div>

      {/* Label in gold accent color */}
      <p className="font-heading text-xs sm:text-sm tracking-[0.24em] text-[#D4AF37] uppercase font-semibold text-center mb-3">
        {label}
      </p>

      {/* Slim gold shimmer progress bar */}
      <div className="w-28 sm:w-32 h-[2px] bg-white/15 rounded-full overflow-hidden relative">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent w-full -translate-x-full muaver-loader-anim"
          style={{ animation: 'shimmerSlide 1.8s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
};

interface AdminConsoleLoaderProps {
  label?: string;
  isFadingOut?: boolean;
  minHeight?: string;
  fullScreen?: boolean;
}

/**
 * Branded Admin Panel "Command Console" Loading State
 * Features the MUAVER Icon with radar ring, glowing scanline effect,
 * telemetry indicators, and signature navy (#0A1A4F) / gold theme.
 */
export const AdminConsoleLoader: React.FC<AdminConsoleLoaderProps> = ({
  label = 'INITIALIZING CONSOLE...',
  isFadingOut = false,
  minHeight = 'min-h-screen',
  fullScreen = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`w-full ${minHeight} bg-[#0A1A4F] text-[var(--ivory)] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden transition-opacity duration-400 ease-out ${
        fullScreen ? 'fixed inset-0 z-50' : ''
      } ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Tactical subtle console grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Ambient Console Glow */}
      <div className="absolute w-96 h-96 rounded-full bg-[#142C7D]/35 blur-3xl pointer-events-none" />
      <div
        className="absolute w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-2xl pointer-events-none muaver-loader-aura"
        style={{ animation: 'muaverPulseAura 3s ease-in-out infinite' }}
      />

      {/* HUD Container Card */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-[#0E2263]/90 border border-[#D4AF37]/35 shadow-2xl shadow-black/60 flex flex-col items-center max-w-sm w-full backdrop-blur-md z-10">
        
        {/* Console Header Bar */}
        <div className="flex items-center justify-between w-full pb-3.5 mb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping motion-reduce:animate-none" />
            <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] text-[#D4AF37] uppercase font-semibold">
              COMMAND CONSOLE
            </span>
          </div>
          <span className="font-mono text-[9px] text-white/40 tracking-wider">
            /adminAUHS
          </span>
        </div>

        {/* Center Emblem with Gold Rings & Scanline */}
        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 my-2 overflow-hidden rounded-full">
          {/* Outer radar orbit ring */}
          <div
            className="absolute inset-0 rounded-full border border-[#D4AF37]/25 border-t-[#D4AF37] border-b-[#E5C365] muaver-loader-ring"
            style={{ animation: 'muaverSpinSlow 2.5s linear infinite' }}
          />

          {/* Inner counter-rotating ring */}
          <div
            className="absolute inset-2.5 rounded-full border border-dashed border-[#D4AF37]/20 muaver-loader-ring"
            style={{ animation: 'muaverSpinSlow 7s linear infinite reverse' }}
          />

          {/* Scanning line beam sweeping over the emblem */}
          <div
            className="absolute inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_10px_#D4AF37] z-20 pointer-events-none muaver-loader-scanline"
            style={{ animation: 'muaverScanline 2.2s ease-in-out infinite' }}
          />

          {/* Icon */}
          <img
            src={ICON_URL}
            alt="MUAVER"
            width={52}
            height={52}
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain relative z-10 filter drop-shadow-[0_0_14px_rgba(212,175,55,0.55)]"
          />
        </div>

        {/* Console Status Labels */}
        <div className="text-center mt-4 space-y-1">
          <h3 className="font-mono text-xs sm:text-sm font-semibold tracking-[0.22em] text-[#F0D27A] uppercase">
            {label}
          </h3>
          <p className="font-mono text-[10px] text-white/40 tracking-wider">
            Secure Session • Initializing Modules
          </p>
        </div>

        {/* HUD Data Shimmer Bar */}
        <div className="w-full mt-4 h-1 bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#B89025] via-[#F0D27A] to-[#B89025] w-full -translate-x-full muaver-loader-anim"
            style={{ animation: 'shimmerSlide 1.6s linear infinite' }}
          />
        </div>
      </div>
    </div>
  );
};
