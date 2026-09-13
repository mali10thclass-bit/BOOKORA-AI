// Thin compatibility layer so the ported pages can keep their original
// react-router-style call sites while running on TanStack Router.
import type { ReactNode } from "react";
import {
  Link as TanStackLink,
  useNavigate as useTanStackNavigate,
  useParams as useTanStackParams,
  useRouterState,
} from "@tanstack/react-router";

type LinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
};

export function Link({ to, children, className, onClick, title }: LinkProps) {
  return (
    <TanStackLink
      to={to as never}
      className={className ?? ""}
      onClick={onClick ?? (() => {})}
      title={title ?? ""}
    >
      {children}
    </TanStackLink>
  );
}

type NavLinkProps = {
  to: string;
  children: ReactNode;
  end?: boolean;
  onClick?: () => void;
  className?: string | ((state: { isActive: boolean }) => string);
};

export function NavLink({ to, children, end, onClick, className }: NavLinkProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const resolved = typeof className === "function" ? className({ isActive }) : (className ?? "");

  return (
    <TanStackLink to={to as never} className={resolved} onClick={onClick ?? (() => {})}>
      {children}
    </TanStackLink>
  );
}

export function useNavigate() {
  const navigate = useTanStackNavigate();
  return (to: string, options?: { replace?: boolean }) =>
    navigate({ to: to as never, replace: options?.replace ?? false });
}

export function useParams<T extends Record<string, string>>(): Partial<T> {
  return useTanStackParams({ strict: false } as never) as Partial<T>;
}
