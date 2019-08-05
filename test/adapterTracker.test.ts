import * as TypeMoq from "typemoq";
import * as vscode from "vscode";
import { RoslaunchDebugAdapterTracker } from "../src/adapterTracker";
import * as wrappers from "../src/wrappers";

describe("RoslaunchDebugAdapterTracker", () => {
    let subject: RoslaunchDebugAdapterTracker;
    let mockWrapper: TypeMoq.IMock<wrappers.VSCode>;
    let mockTerminal: TypeMoq.IMock<vscode.Terminal>;
    const config = {
        cmd: "roslaunch upload.launch /node",
        env: { HOME: "/home/robot" },
    };
    beforeEach(() => {
        mockWrapper = TypeMoq.Mock.ofType<wrappers.VSCode>();
        mockTerminal = TypeMoq.Mock.ofType<vscode.Terminal>();

        subject = new RoslaunchDebugAdapterTracker(config, mockWrapper.object);
        mockWrapper.setup((x) => x.createTerminal(TypeMoq.It.isAny())).returns(() => mockTerminal.object);
    });
    it("creates terminal and runs roslaunch", () => {
        subject.onWillStartSession();
        mockWrapper.verify((x) => x.createTerminal({ name: "roslaunch", env: config.env }), TypeMoq.Times.once());
        mockTerminal.verify((x) => x.sendText(config.cmd), TypeMoq.Times.once());
    });
    it("disposes terminal", () => {
        subject.onWillStartSession();
        subject.onWillStopSession();
        mockTerminal.verify((x) => x.dispose(), TypeMoq.Times.once());
    });
});
