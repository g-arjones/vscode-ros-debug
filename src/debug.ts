import * as path from "path";
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider } from "vscode";
import { OutputChannel, ProviderResult, WorkspaceFolder } from "vscode";
import { EnvLoader } from "./envLoader";
import { IArguments, NodeArguments } from "./nodeArguments";

export class RoslaunchConfigurationProvider implements DebugConfigurationProvider {
    private _launcher = path.join(__dirname, "..", "..", "helpers", "launch.py");
    private _debugger = path.join(__dirname, "..", "..", "helpers", "debugger");
    constructor(private _envLoader: EnvLoader,
                private _nodeArguments: NodeArguments,
                private _outputChannel: OutputChannel) {
    }
    public provideDebugConfigurations(folder: WorkspaceFolder | undefined,
                                      token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return [{
            launchFile: "${workspaceFolder}/launch/node.launch",
            name: "roslaunch",
            node: "/namespace/node_name",
            request: "launch",
            type: "roslaunch",
        }];
    }
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined,
                                           config: DebugConfiguration,
                                           token: CancellationToken | undefined):
                                                Promise<ProviderResult<DebugConfiguration>> {
        const expandableVars = {
            workspaceFolder: folder ? folder!.uri.fsPath : "",
        };

        const env = await this._envLoader.load(folder!.uri.path);
        const launchFile: string = this.expandVariables(config.launchFile, expandableVars);
        try {
            const nodeArgs = await this._nodeArguments.load(env, launchFile, config.node);

            if (nodeArgs.error) { throw new Error(nodeArgs.error); }
            if (!config.MIMode) { config.MIMode = "gdb"; }
            if (!config.environment) { config.environment = []; }
            if (!config.cwd) { config.cwd = "${workspaceFolder}"; }

            const debuggerPath = config.miDebuggerPath || config.MIMode;
            config.miDebuggerPath = this._debugger;
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
            config.program = nodeArgs.args![0];
            config.args = nodeArgs.args!.slice(1);
            config.roslaunch = {
                cmd: [this._launcher, launchFile, config.node],
                env,
            };

            return config;
        } catch (e) {
            const errMsg = this._nodeArguments.lastError();
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
