import { CancellationToken, DebugConfiguration, DebugConfigurationProvider } from "vscode";
import { WorkspaceFolder } from "vscode";

export class RoslaunchConfigurationProvider implements DebugConfigurationProvider {
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined,
                                           config: DebugConfiguration,
                                           token: CancellationToken | undefined): Promise<DebugConfiguration> {
        throw new Error("Not implemented yet");
    }
}
