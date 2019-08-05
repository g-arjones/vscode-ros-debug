import * as vscode from "vscode";
import * as wrappers from "./wrappers";

export class RoslaunchDebugAdapterTracker implements vscode.DebugAdapterTracker {
    private _terminal: vscode.Terminal;
    constructor(private _config: { cmd: string, env: any }, private _wrapper: wrappers.VSCode) {
    }
    public onWillStartSession(): void {
        this._terminal = this._wrapper.createTerminal({
            env: this._config.env,
            name: "roslaunch",
        });
        this._terminal.sendText(this._config.cmd);
    }
    public onWillStopSession(): void {
        this._terminal.dispose();
    }
}
