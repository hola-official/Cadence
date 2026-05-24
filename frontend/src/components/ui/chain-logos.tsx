import * as React from 'react'

interface LogoProps {
  className?: string
  size?: number
}

/** USDC Circle logo (blue #2775CA) */
export function USDCLogo({ className, size = 16 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="USDC"
    >
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.022 18.124c0-2.124-1.277-2.852-3.829-3.146-1.828-.234-2.193-.703-2.193-1.523 0-.82.61-1.367 1.828-1.367 1.097 0 1.706.39 2.01 1.367a.37.37 0 0 0 .365.273h.853a.352.352 0 0 0 .352-.352v-.039a3.105 3.105 0 0 0-2.803-2.613V9.656a.352.352 0 0 0-.351-.351H15.4a.352.352 0 0 0-.352.351v1.04c-1.706.234-2.803 1.367-2.803 2.774 0 2.007 1.218 2.773 3.77 3.067 1.706.274 2.252.664 2.252 1.602 0 .937-.85 1.602-2.01 1.602-1.584 0-2.133-.664-2.316-1.602a.35.35 0 0 0-.352-.274h-.913a.352.352 0 0 0-.351.352v.04c.243 1.601 1.218 2.734 3.22 3.066v1.055c0 .195.157.351.352.351h.852a.352.352 0 0 0 .352-.351V20.08c1.706-.274 2.87-1.485 2.87-2.956z"
        fill="white"
      />
      <path
        d="M12.914 23.02c-4.451-1.602-6.766-6.58-5.12-11.01a8.394 8.394 0 0 1 5.12-5.12.37.37 0 0 0 .243-.351v-.82a.352.352 0 0 0-.46-.332C7.818 6.96 5.2 12.68 6.844 17.682c.97 2.891 3.1 5.12 5.876 6.17a.37.37 0 0 0 .46-.352v-.82a.389.389 0 0 0-.266-.66zm6.318-17.351a.37.37 0 0 0-.46.352v.82c0 .156.11.312.266.351 4.451 1.602 6.766 6.58 5.12 11.011a8.394 8.394 0 0 1-5.12 5.12.37.37 0 0 0-.243.352v.82c0 .234.243.39.46.312 4.88-1.563 7.499-6.736 5.876-11.698-.97-2.852-3.1-5.12-5.9-6.44z"
        fill="white"
      />
    </svg>
  )
}

/** Avalanche / Fuji logo */
export function AvalancheLogo({ className, size = 16 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Avalanche"
    >
      <circle cx="16" cy="16" r="16" fill="#E84142" />
      {/* A strokes */}
      <path d="M16 9L24.5 23H21.5L16 12L10.5 23H7.5L16 9Z" fill="white" />
      {/* Crossbar */}
      <path d="M11 18.5H21V20.5H11Z" fill="white" />
    </svg>
  )
}

/** Arc Testnet logo */
export function ArcLogo({ className, size = 16 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Arc"
    >
      <circle cx="16" cy="16" r="16" fill="#1A1A2E" />
      <path
        d="M8 22C8 22 10 10 16 10C22 10 24 22 24 22"
        stroke="#7C3AED"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="10" r="2" fill="#A78BFA" />
    </svg>
  )
}

/** @deprecated Use AvalancheLogo — kept for any external references */
export const ArbitrumLogo = AvalancheLogo
