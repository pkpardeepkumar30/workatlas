export const actionRegistry = {
  createAccount: { kind: "link", href: "/sign-up" },
  signIn: { kind: "link", href: "/sign-in" },
  signOut: { kind: "form", endpoint: "/api/auth/signout", method: "post" },
  openDashboard: { kind: "link", href: "/dashboard" },
  manageProjects: { kind: "link", href: "/dashboard/projects" },
  readDocs: { kind: "link", href: "/docs" },
  readArchitecture: { kind: "link", href: "/docs/architecture" },
  goHome: { kind: "link", href: "/" },
} as const;

export type ActionId = keyof typeof actionRegistry;

export const actionIds = Object.keys(actionRegistry) as [ActionId, ...ActionId[]];

export function getRegisteredAction(actionId: ActionId) {
  return actionRegistry[actionId];
}

