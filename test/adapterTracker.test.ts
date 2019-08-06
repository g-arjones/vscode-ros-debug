import * as assert from "assert";
import * as TypeMoq from "typemoq";
import * as vscode from "vscode";
import { RoslaunchDebugAdapterTracker } from "../src/adapterTracker";

describe("RoslaunchDebugAdapterTracker", () => {
    let subject: RoslaunchDebugAdapterTracker;
    let mockOutputChannel: TypeMoq.IMock<vscode.OutputChannel>;
    let mockSession: TypeMoq.IMock<vscode.DebugSession>;
    const config = {
        name: "roslaunch",
        request: "launch",
        roslaunch: {
            cmd: ["bash", "-c", "exit 0"],
            env: { HOME: "/home/robot" },
        },
        type: "roslaunch",
    };
    beforeEach(() => {
        mockOutputChannel = TypeMoq.Mock.ofType();
        mockSession = TypeMoq.Mock.ofType();
        mockSession.setup((x) => x.configuration).returns(() => config);

        subject = new RoslaunchDebugAdapterTracker(mockSession.object, mockOutputChannel.object);
    });
    it("terminates debug session", async () => {
        config.roslaunch.cmd = ["bash", "-c", "exit 0"];
        subject.onWillStartSession();
        assert.equal(await subject.exitCode, 0);
        mockSession.verify((x) => x.customRequest("disconnect", { terminateDebuggee: true }), TypeMoq.Times.once());
    });
    it("terminates roslaunch", async () => {
        config.roslaunch.cmd = ["bash", "-c", "sleep 120"];
        subject.onWillStartSession();
        subject.onWillStopSession();
        assert.equal(await subject.exitCode, null);
    });
    it("does not terminate roslaunch twice", async () => {
        config.roslaunch.cmd = ["bash", "-c", "exit 0"];
        subject.onWillStartSession();
        assert.equal(await subject.exitCode, 0);
        subject.onWillStopSession();
    });
});
