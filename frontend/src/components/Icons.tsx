import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const defaultProps: IconProps = {
  size: 16,
  strokeWidth: 1.5,
  fill: "none",
  stroke: "currentColor",
};

export const Icons = {
  // Navigation & UI
  Send: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  History: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Folder: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Search: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Trash: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  X: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Plus: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M12 5V19M5 12H19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  ChevronDown: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M19 9L12 16L5 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  ChevronRight: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M9 5L16 12L9 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Copy: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24264C20 6.71221 19.7893 6.20351 19.4142 5.82843L16.1716 2.58579C15.7965 2.21071 15.2878 2 14.7574 2H10C8.89543 2 8 2.89543 8 4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Check: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // HTTP Methods
  ArrowRight: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  ArrowUp: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M12 19V5M12 5L5 12M12 5L19 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  ArrowDown: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M12 5V19M12 19L19 12M12 19L5 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Refresh: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Settings: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317C13.7389 4.5808 13.8642 4.82578 14.0407 5.032C14.2172 5.23822 14.4399 5.39985 14.6907 5.50375C14.9414 5.60764 15.2132 5.65085 15.4838 5.62987C15.7544 5.60889 16.0162 5.5243 16.248 5.383C17.791 4.443 19.558 6.209 18.618 7.753C18.4769 7.98466 18.3924 8.24634 18.3715 8.51677C18.3506 8.78721 18.3938 9.05877 18.4975 9.30938C18.6013 9.55999 18.7627 9.78258 18.9687 9.95905C19.1747 10.1355 19.4194 10.2609 19.683 10.325C21.439 10.751 21.439 13.249 19.683 13.675C19.4192 13.7389 19.1742 13.8642 18.968 14.0407C18.7618 14.2172 18.6001 14.4399 18.4963 14.6907C18.3924 14.9414 18.3491 15.2132 18.3701 15.4838C18.3911 15.7544 18.4757 16.0162 18.617 16.248C19.557 17.791 17.791 19.558 16.247 18.618C16.0153 18.4769 15.7537 18.3924 15.4832 18.3715C15.2128 18.3506 14.9412 18.3938 14.6906 18.4975C14.44 18.6013 14.2174 18.7627 14.0409 18.9687C13.8645 19.1747 13.7391 19.4194 13.675 19.683C13.249 21.439 10.751 21.439 10.325 19.683C10.2611 19.4192 10.1358 19.1742 9.95929 18.968C9.7828 18.7618 9.56011 18.6001 9.30935 18.4963C9.05859 18.3924 8.78683 18.3491 8.51621 18.3701C8.24559 18.3911 7.98375 18.4757 7.752 18.617C6.209 19.557 4.442 17.791 5.382 16.247C5.5231 16.0153 5.60755 15.7537 5.62848 15.4832C5.64942 15.2128 5.60624 14.9412 5.50247 14.6906C5.3987 14.44 5.23726 14.2174 5.03127 14.0409C4.82529 13.8645 4.58056 13.7391 4.317 13.675C2.561 13.249 2.561 10.751 4.317 10.325C4.5808 10.2611 4.82578 10.1358 5.032 9.95929C5.23822 9.7828 5.39985 9.56011 5.50375 9.30935C5.60764 9.05859 5.65085 8.78683 5.62987 8.51621C5.60889 8.24559 5.5243 7.98375 5.383 7.752C4.443 6.209 6.209 4.442 7.753 5.382C8.753 5.99 10.049 5.452 10.325 4.317Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Bolt: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Globe: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C13.6569 21 15 16.9706 15 12C15 7.02944 13.6569 3 12 3M12 21C10.3431 21 9 16.9706 9 12C9 7.02944 10.3431 3 12 3M3 12C3 7.02944 7.02944 3 12 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Code: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
    >
      <path d="M16 18L22 12L16 6M8 6L2 12L8 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  Spinner: (props: IconProps) => (
    <svg
      {...defaultProps}
      {...props}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      className={`animate-spin ${props.className || ""}`}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

export default Icons;
