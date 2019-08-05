"use strict";
import * as vscode from "vscode";
import * as debug from "./debug";

class RoslaunchDebugAdapterTracker implements vscode.DebugAdapterTracker {
    private _terminal: vscode.Terminal;
    constructor(private _config: { cmd: string, env: any }) {
        // no-op
    }
    public onWillStartSession(): void {
        this._terminal = vscode.window.createTerminal({
            env: this._config.env,
            name: "roslaunch",
        });
        this._terminal.sendText(this._config.cmd);
    }
    public onWillStopSession(): void {
        this._terminal.dispose();
    }
}

export function activate(extensionContext: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("ROS (debug)");
    const roslaunchDebugProvider = new debug.RoslaunchConfigurationProvider(outputChannel);
    const subscriptions = extensionContext.subscriptions;
    const trackerFactory: vscode.DebugAdapterTrackerFactory = {
        createDebugAdapterTracker(session) {
            return session.configuration.roslaunch ?
                new RoslaunchDebugAdapterTracker(session.configuration.roslaunch) : undefined;
        },
    };
    subscriptions.push(outputChannel);
    subscriptions.push(vscode.debug.registerDebugConfigurationProvider("roslaunch", roslaunchDebugProvider));
    subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory("*", trackerFactory));
}

export function deactivate() {
    // Extension unloaded
}
