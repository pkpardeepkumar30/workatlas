export type MutationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialMutationState: MutationActionState = { status: "idle", message: "" };
