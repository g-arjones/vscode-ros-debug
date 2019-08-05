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
        const launchFile: string = this.expandVariables(config.launchFile, expandableVars);
        const launcher = path.join(__dirname, "..", "..", "helpers", "launch.py");
        const nodeArgsLoader = new NodeArguments(env, launchFile, config.node);

        try {
            const nodeArgs = await nodeArgsLoader.args();

            if (nodeArgs.error) { throw new Error(nodeArgs.error); }
            if (!config.MIMode) { config.MIMode = "gdb"; }
            if (!config.environment) { config.environment = []; }

            const debuggerPath = config.miDebuggerPath || config.MIMode;
            config.miDebuggerPath = path.join(__dirname, "..", "..", "helpers", "debugger");
            config.environment = config.environment.concat([
                { name: "VSCODE_ROS_DEBUG_DEBUGGER", value: debuggerPath },
            ]);

            for (const key in nodeArgs.env) {
                if (!nodeArgs.env.hasOwnProperty(key)) { continue; }
                config.environment = config.environment.concat([
                    { name: key, value: nodeArgs.env[key] },
                ]);
            }

            config.type = "cppdbg";
            config.program = nodeArgs.args[0];
            config.args = nodeArgs.args.slice(1);
            config.roslaunch = {
                cmd: `"${launcher}" "${launchFile}" "${config.node}"`,
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
