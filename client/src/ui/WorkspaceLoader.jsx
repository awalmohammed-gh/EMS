import DefaultWorkspaceLoader, { WorkspaceLoader as NamedWorkspaceLoader } from "../components/ui/WorkspaceLoader";

export const WorkspaceLoader = NamedWorkspaceLoader || DefaultWorkspaceLoader;
export default DefaultWorkspaceLoader;
