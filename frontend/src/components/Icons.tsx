import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const defaultProps = {
  strokeWidth: 1.75,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icons = {
  // Navigation & UI
  Send: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  ),

  History: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7V12L15 15" />
    </svg>
  ),

  Folder: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H12L10 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20Z" />
    </svg>
  ),

  Search: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21L16.5 16.5" />
    </svg>
  ),

  Trash: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M3 6H21" />
      <path d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6" />
      <path d="M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" />
      <path d="M10 11V17" />
      <path d="M14 11V17" />
    </svg>
  ),

  X: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6L18 18" />
    </svg>
  ),

  Plus: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M12 5V19" />
      <path d="M5 12H19" />
    </svg>
  ),

  ChevronDown: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M6 9L12 15L18 9" />
    </svg>
  ),

  ChevronRight: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M9 6L15 12L9 18" />
    </svg>
  ),

  Copy: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" />
    </svg>
  ),

  Check: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M20 6L9 17L4 12" />
    </svg>
  ),

  Edit: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M12 20H21" />
      <path d="M16.5 3.50001C16.8978 3.10219 17.4374 2.87869 18 2.87869C18.2786 2.87869 18.5544 2.93356 18.8118 3.04017C19.0692 3.14677 19.303 3.30303 19.5 3.50001C19.697 3.697 19.8532 3.93085 19.9598 4.18822C20.0665 4.44559 20.1213 4.72144 20.1213 5.00001C20.1213 5.27859 20.0665 5.55444 19.9598 5.81181C19.8532 6.06918 19.697 6.30303 19.5 6.50001L7 19L3 20L4 16L16.5 3.50001Z" />
    </svg>
  ),

  Import: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
      <path d="M7 10L12 15L17 10" />
      <path d="M12 15V3" />
    </svg>
  ),

  Export: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" />
      <path d="M17 8L12 3L7 8" />
      <path d="M12 3V15" />
    </svg>
  ),

  Save: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" />
      <path d="M17 21V13H7V21" />
      <path d="M7 3V8H15" />
    </svg>
  ),

  Settings: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74494 20.1656 6.23584 20.3766 5.705 20.3766C5.17416 20.3766 4.66506 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95235 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87235 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74494 3.62343 6.23584 3.62343 5.705C3.62343 5.17416 3.83445 4.66506 4.21 4.29C4.58506 3.91445 5.09416 3.70343 5.625 3.70343C6.15584 3.70343 6.66494 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95235 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87235 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58506 20.2966 5.09416 20.2966 5.625C20.2966 6.15584 20.0856 6.66494 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" />
    </svg>
  ),

  Bolt: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
    </svg>
  ),

  Globe: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12H22" />
      <path d="M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22C9.5 19.5 8 16 8 12C8 8 9.5 4.5 12 2Z" />
    </svg>
  ),

  Code: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M16 18L22 12L16 6" />
      <path d="M8 6L2 12L8 18" />
    </svg>
  ),

  Sun: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2V4" />
      <path d="M12 20V22" />
      <path d="M4.93 4.93L6.34 6.34" />
      <path d="M17.66 17.66L19.07 19.07" />
      <path d="M2 12H4" />
      <path d="M20 12H22" />
      <path d="M6.34 17.66L4.93 19.07" />
      <path d="M19.07 4.93L17.66 6.34" />
    </svg>
  ),

  Moon: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M21 12.79C20.8427 14.4922 20.2039 16.1144 19.1582 17.4668C18.1126 18.8192 16.7035 19.8458 15.0957 20.4265C13.4879 21.0073 11.748 21.1181 10.0795 20.7461C8.41104 20.3741 6.88302 19.5345 5.67423 18.3258C4.46544 17.117 3.62594 15.589 3.25391 13.9205C2.88188 12.252 2.99272 10.5121 3.57348 8.9043C4.15425 7.29651 5.18083 5.88737 6.53324 4.84175C7.88565 3.79614 9.50782 3.15731 11.21 3C10.2134 4.34827 9.73387 6.00945 9.85856 7.68141C9.98325 9.35338 10.7039 10.9251 11.8894 12.1106C13.0749 13.2961 14.6466 14.0168 16.3186 14.1414C17.9906 14.2661 19.6517 13.7866 21 12.79Z" />
    </svg>
  ),

  Refresh: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M1 4V10H7" />
      <path d="M23 20V14H17" />
      <path d="M20.49 9C19.9828 7.56678 19.1209 6.28385 17.9845 5.27069C16.8482 4.25752 15.4745 3.54689 13.9917 3.20277C12.5089 2.85866 10.9652 2.89188 9.49842 3.29987C8.03168 3.70786 6.68966 4.47681 5.60001 5.53L1.00001 10M23 14L18.4 18.47C17.3104 19.5232 15.9684 20.2922 14.5016 20.7002C13.0348 21.1082 11.4912 21.1414 10.0084 20.7972C8.52552 20.4531 7.15183 19.7425 6.01547 18.7293C4.87912 17.7162 4.01729 16.4332 3.51001 15" />
    </svg>
  ),

  Key: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M21 2L19 4M11.39 8.61C12.3 9.5 12.84 10.71 12.84 12C12.84 13.28 12.3 14.5 11.39 15.39C10.5 16.28 9.28 16.84 8 16.84C6.71 16.84 5.5 16.28 4.61 15.39C3.72 14.5 3.16 13.28 3.16 12C3.16 10.71 3.72 9.5 4.61 8.61C5.5 7.72 6.72 7.16 8 7.16C9.29 7.16 10.5 7.72 11.39 8.61Z" />
      <path d="M11 12L19 4" />
      <path d="M16 7L19 10" />
    </svg>
  ),

  Eye: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  EyeOff: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <path d="M17.94 17.94C16.23 19.24 14.18 20 12 20C5 20 1 12 1 12C2.24 9.68 3.97 7.65 6.06 6.06M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.39 13.13 21.66 14.19 20.83 15.17M14.12 14.12C13.87 14.42 13.57 14.67 13.22 14.86C12.88 15.05 12.5 15.18 12.11 15.23C11.72 15.28 11.32 15.25 10.94 15.15C10.56 15.05 10.21 14.88 9.9 14.66C9.59 14.44 9.33 14.16 9.14 13.85C8.94 13.53 8.81 13.18 8.76 12.81C8.71 12.44 8.73 12.07 8.83 11.71C8.93 11.35 9.1 11.02 9.34 10.73" />
      <path d="M1 1L23 23" />
    </svg>
  ),

  Lock: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" />
    </svg>
  ),

  Spinner: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      className={`animate-spin ${props.className || ""}`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
};

export default Icons;
