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
        // TODO: Print NodeArgument's stderr to an output channel
        // TODO: Interactively populate config
        const expandableVars = {
            workspaceFolder: folder ? folder!.uri.fsPath : "",
        };

        const env = await new EnvLoader(folder!.uri.path).env();
        const launchFile: string = this.expandVariables((config as any).launchFile, expandableVars);
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
    public expandVariables(value: string, vars: any): string {
        return value.replace(/\${\w+}/g, (match) => {
            const mode = match.substring(2, match.length - 1);
            if (vars[mode]) {
                return vars[mode];
            } else {
                throw new Error(`Unsupported variable expansion: ${match}`);
            }
        });
    }
}
