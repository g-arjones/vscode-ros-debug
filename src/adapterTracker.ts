import * as child_process from "child_process";
import * as vscode from "vscode";

export class RoslaunchDebugAdapterTracker implements vscode.DebugAdapterTracker {
    public exitCode: Promise<number>;

    private _process: child_process.ChildProcess | undefined;
    private _config: { cmd: string[], env: any };
    constructor(private _session: vscode.DebugSession, private _channel: vscode.OutputChannel) {
        this._config = _session.configuration.roslaunch;
    }
    public onWillStartSession(): void {
        const processOptions: child_process.SpawnOptions = {
            env: this._config.env,
        };

        this.exitCode = new Promise((resolve, reject) => {
            this._process = child_process.spawn(this._config.cmd[0], this._config.cmd.slice(1), processOptions);
            this._process.stdout.setEncoding("utf8");
            this._process.stderr.setEncoding("utf8");
            this._process.stderr.on("data", (chunk: string) => this._channel.append(chunk));
            this._process.stdout.on("data", (chunk: string) => this._channel.append(chunk));

            this._process.on("exit", (code: number, signal: string) => {
                this._process = undefined;
                this._session.customRequest("disconnect", { terminateDebuggee: true });
                resolve(code);
            });
        });
    }
    public onWillStopSession(): void {
        if (this._process) {
            this._process.kill("SIGINT");
        }
    }
}
