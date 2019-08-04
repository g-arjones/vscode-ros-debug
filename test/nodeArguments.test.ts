import * as assert from "assert";
import { NodeArguments } from "../src/nodeArguments";
import * as helpers from "./helpers";

describe("NodeArguments", () => {
    let subject: NodeArguments;
    beforeEach(() => {
        subject = new NodeArguments(process.env, "upload.launch", "/test_node");
        (subject as any)._helper = [
            "bash",
            "-c",
            "echo \"{ \\\"error\\\": \\\"test\\\", \\\"env\\\": \\\"foo\\\", \\\"args\\\": [\\\"bar\\\"] }\"",
        ];
    });
    describe("args()", () => {
        it("returns the parsed node arguments", async () => {
            const args = await subject.args();
            assert.equal("test", args.error);
            assert.equal("foo", args.env);
            assert.deepEqual(["bar"], args.args);
        });
        it("returns the helper's stderr", async () => {
            (subject as any)._helper = [
                "bash",
                "-c",
                "echo test >&2; echo foo; echo bar >&2; echo test2; exit 1",
            ];
            await helpers.assertThrowsAsync(subject.args(), /Could not parse node arguments/);
            assert.equal("test\nbar\n", subject.stderr());
        });
        it("throws if helper output is invalid", async () => {
            (subject as any)._helper = [
                "bash",
                "-c",
                "echo test",
            ];
            await helpers.assertThrowsAsync(subject.args(), /Internal error/);
        });
    });
});
