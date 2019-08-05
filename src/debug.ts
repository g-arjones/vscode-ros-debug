import * as path from "path";
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider } from "vscode";
import { OutputChannel, ProviderResult, WorkspaceFolder } from "vscode";
import { EnvLoader } from "./envLoader";
import { IArguments, NodeArguments } from "./nodeArguments";

export class RoslaunchConfigurationProvider implements DebugConfigurationProvider {
    constructor(private _outputChannel: OutputChannel) {
    }
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined,
                                           config: DebugConfiguration,
                                           token: CancellationToken | undefined):
                                                Promise<ProviderResult<DebugConfiguration>> {
        const expandableVars = {
            workspaceFolder: folder ? folder!.uri.fsPath : "",
        };

        const env = await new EnvLoader(folder!.uri.path).env();
        const launchFile: string = this.expandVariables((config as any).launchFile, expandableVars);
        const launcher = path.join(__dirname, "..", "..", "helpers", "launch.py");
        const node: string = (config as any).node;
        const nodeArgsLoader = new NodeArguments(env, launchFile, node);

        try {
            const nodeArgs = await nodeArgsLoader.args();

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
        } catch (e) {
            const errMsg = nodeArgsLoader.stderr();
            if (errMsg.length > 0) {
                this._outputChannel.append(errMsg);
                this._outputChannel.show();
            }
            throw e;
        }
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
