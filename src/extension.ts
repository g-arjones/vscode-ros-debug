"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as debug from "./debug";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(extensionContext: vscode.ExtensionContext) {
    extensionContext.subscriptions.push(vscode.debug.onDidTerminateDebugSession((session: vscode.DebugSession) => {
        // Kill all nodes
    }));

    const roslaunchDebugProvider = new debug.RoslaunchConfigurationProvider();
    extensionContext.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            "roslaunch",
            roslaunchDebugProvider));
}

// this method is called when your extension is deactivated
export function deactivate() {
    // Extension unloaded
}
