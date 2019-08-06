import * as assert from "assert";
import * as path from "path";
import * as TypeMoq from "typemoq";
import * as vscode from "vscode";
import { RoslaunchConfigurationProvider } from "../src/debug";
import { EnvLoader } from "../src/envLoader";
import { NodeArguments } from "../src/nodeArguments";
import * as helpers from "./helpers";

describe("RoslaunchDebugAdapterTracker", () => {
    let subject: RoslaunchConfigurationProvider;
    let mockOutputChannel: TypeMoq.IMock<vscode.OutputChannel>;
    let mockEnvLoader: TypeMoq.IMock<EnvLoader>;
    let mockNodeArgs: TypeMoq.IMock<NodeArguments>;
    beforeEach(() => {
        mockEnvLoader = TypeMoq.Mock.ofType();
        mockOutputChannel = TypeMoq.Mock.ofType();
        mockNodeArgs = TypeMoq.Mock.ofType();
        subject = new RoslaunchConfigurationProvider(mockEnvLoader.object,
            mockNodeArgs.object, mockOutputChannel.object);
    });
    describe("provideDebugConfigurations()", () => {
        it("returns a static debug configuration", () => {
            subject.provideDebugConfigurations(undefined);
        });
    });
    describe("resolveDebugConfiguration()", () => {
        const env = { HOME: "/home/foo" };
        const workspaceFolder: vscode.WorkspaceFolder = {
            index: 0,
            name: "foo",
            uri: vscode.Uri.file("/home/foo"),
        };
        const debugConfiguration: vscode.DebugConfiguration = {
            launchFile: "/home/foo/upload.launch",
            name: "roslaunch",
            node: "/test_node",
            request: "launch",
            type: "roslaunch",
        };
        const nodeArgs = {
            args: ["/path/to/node", "__name:=node"],
            env: {
                ROS_DISTRO: "kinetic",
            },
            error: null,
        };
        it("throws if env loader throws", async () => {
            mockEnvLoader.setup((x) => x.load("/home/foo")).returns(() => Promise.reject(new Error("Internal error")));
            await helpers.assertThrowsAsync(
                subject.resolveDebugConfiguration(workspaceFolder, debugConfiguration, undefined),
                /Internal error/);
        });
        it("throws if node loader throws", async () => {
            mockEnvLoader.setup((x) => x.load("/home/foo")).returns(() => Promise.resolve(env));
            mockNodeArgs.setup((x) => x.load(env, debugConfiguration.launchFile, debugConfiguration.node))
                .returns(() => Promise.reject(new Error("Fail")));
            mockNodeArgs.setup((x) => x.lastError()).returns(() => "Failed with message");
            await helpers.assertThrowsAsync(
                subject.resolveDebugConfiguration(workspaceFolder, debugConfiguration, undefined),
                /^Fail$/);
            mockOutputChannel.verify((x) => x.show(), TypeMoq.Times.once());
            mockOutputChannel.verify((x) => x.append("Failed with message"), TypeMoq.Times.once());
        });
        it("throws if reports an error", async () => {
            mockEnvLoader.setup((x) => x.load("/home/foo")).returns(() => Promise.resolve(env));
            mockNodeArgs.setup((x) => x.lastError()).returns(() => "");
            mockNodeArgs.setup((x) => x.load(env, debugConfiguration.launchFile, debugConfiguration.node))
                .returns(() => Promise.resolve({ error: "Some error", args: null, env: null }));
            await helpers.assertThrowsAsync(
                subject.resolveDebugConfiguration(workspaceFolder, debugConfiguration, undefined),
                /Some error/);
            mockOutputChannel.verify((x) => x.show(), TypeMoq.Times.never());
            mockOutputChannel.verify((x) => x.append(TypeMoq.It.isAny()), TypeMoq.Times.never());
        });
        it("returns a valid configuration", async () => {
            const testConfig = { ...debugConfiguration };
            mockEnvLoader.setup((x) => x.load("/home/foo")).returns(() => Promise.resolve(env));
            mockNodeArgs.setup((x) => x.load(env, debugConfiguration.launchFile, debugConfiguration.node))
                .returns(() => Promise.resolve(nodeArgs));
            const config = await subject.resolveDebugConfiguration(workspaceFolder, testConfig, undefined);
            assert.equal(config!.MIMode, "gdb");
            assert.equal(config!.cwd, "${workspaceFolder}");
            assert.equal(config!.miDebuggerPath, path.join(__dirname, "..", "..", "helpers", "debugger"));
            assert.equal(config!.type, "cppdbg");
            assert.equal(config!.program, "/path/to/node");
            assert.deepEqual(config!.args, ["__name:=node"]);
            assert.deepEqual(config!.roslaunch, {
                cmd: [
                    path.join(__dirname, "..", "..", "helpers", "launch.py"),
                    "/home/foo/upload.launch",
                    "/test_node"],
                env: { HOME: "/home/foo" },
            });
            assert.deepEqual(config!.environment, [
                { name: "VSCODE_ROS_DEBUG_DEBUGGER", value: "gdb" },
                { name: "ROS_DISTRO", value: "kinetic" },
            ]);
        });
        it("preserves user's settings", async () => {
            const newConfig = {
                ...debugConfiguration,
                MIMode: "lldb",
                cwd: "/tmp",
                environment: [
                    { name: "SOMEVAR", value: "FOO" },
                ],
            };
            mockEnvLoader.setup((x) => x.load("/home/foo")).returns(() => Promise.resolve(env));
            mockNodeArgs.setup((x) => x.load(env, debugConfiguration.launchFile, debugConfiguration.node))
                .returns(() => Promise.resolve(nodeArgs));
            const config = await subject.resolveDebugConfiguration(workspaceFolder, newConfig, undefined);
            assert.equal(config!.MIMode, "lldb");
            assert.equal(config!.cwd, "/tmp");
            assert.deepEqual(config!.environment, [
                { name: "SOMEVAR", value: "FOO" },
                { name: "VSCODE_ROS_DEBUG_DEBUGGER", value: "lldb" },
                { name: "ROS_DISTRO", value: "kinetic" },
            ]);
        });
    });
    describe("expandVariables()", () => {
        it("expands variables in a given string", () => {
            const expandableVars = {
                fooBar: "test",
                workspaceFolder: "/foo/bar",
            };
            assert.equal(subject.expandVariables("${fooBar} ${workspaceFolder}", expandableVars), "test /foo/bar");
        });
        it("throws if a variable is not expandable", () => {
            const expandableVars = { workspaceFolder: "/foo/bar" };
            assert.throws(() => subject.expandVariables("${fooBar} ${workspaceFolder}", expandableVars));
        });
    });
});
