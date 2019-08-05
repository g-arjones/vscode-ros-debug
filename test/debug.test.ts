import * as TypeMoq from "typemoq";
import * as vscode from "vscode";
import { RoslaunchConfigurationProvider } from "../src/debug";

describe("RoslaunchDebugAdapterTracker", () => {
    let subject: RoslaunchConfigurationProvider;
    let mockOutputChannel: TypeMoq.IMock<vscode.OutputChannel>;
    beforeEach(() => {
        mockOutputChannel = TypeMoq.Mock.ofType();
        subject = new RoslaunchConfigurationProvider(mockOutputChannel.object);
    });
    describe("provideDebugConfigurations()", () => {
        it("returns a static debug configuration", () => {
            subject.provideDebugConfigurations(undefined);
        });
    });
});
