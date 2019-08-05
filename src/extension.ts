"use strict";
import * as vscode from "vscode";
import { RoslaunchDebugAdapterTracker } from "./adapterTracker";
import * as debug from "./debug";
import * as wrappers from "./wrappers";

export function activate(extensionContext: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel("ROS (debug)");
    const roslaunchDebugProvider = new debug.RoslaunchConfigurationProvider(outputChannel);
    const subscriptions = extensionContext.subscriptions;
    const codeWrapper = new wrappers.VSCode(extensionContext);
    const trackerFactory: vscode.DebugAdapterTrackerFactory = {
        createDebugAdapterTracker(session) {
            return session.configuration.roslaunch ?
                new RoslaunchDebugAdapterTracker(session.configuration.roslaunch, codeWrapper) : undefined;
        },
    };
    subscriptions.push(outputChannel);
    subscriptions.push(vscode.debug.registerDebugConfigurationProvider("roslaunch", roslaunchDebugProvider));
    subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory("*", trackerFactory));
}

export function deactivate() {
    // Extension unloaded
}
