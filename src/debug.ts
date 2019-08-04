import * as path from "path";
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider } from "vscode";
import { ProviderResult, WorkspaceFolder } from "vscode";
import { EnvLoader } from "./envLoader";
import { NodeArguments } from "./nodeArguments";

export class RoslaunchConfigurationProvider implements DebugConfigurationProvider {
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined,
                                           config: DebugConfiguration,
                                           token: CancellationToken | undefined):
                                                Promise<ProviderResult<DebugConfiguration>> {
        // TODO: expland stuff like ${workspaceFolder}
        // TODO: Print NodeArgument's stderr to an output channel
        // TODO: Interactively populate config
        const env = await new EnvLoader(folder!.uri.path).env();
        const launchFile: string = (config as any).launchFile;
        const node: string = (config as any).node;
        const nodeArgs = await new NodeArguments(env, launchFile, node).args();
        const launcher = path.join(__dirname, "..", "..", "helpers", "launch.py");

        if (nodeArgs.error) { throw new Error(nodeArgs.error); }

        (config as any).type = "cppdbg";
        (config as any).program = nodeArgs.args[0];
        (config as any).args = nodeArgs.args.slice(1);
        (config as any).env = nodeArgs.env;
        (config as any).roslaunch = {
            cmd: `"${launcher}" "${launchFile}" "${node}"`,
            env,
        };
        return config;
    }
}