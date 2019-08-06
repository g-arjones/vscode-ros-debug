import * as assert from "assert";
import { NodeArguments } from "../src/nodeArguments";
import * as helpers from "./helpers";

describe("NodeArguments", () => {
    let subject: NodeArguments;
    const firstArg = "-c";
    const secondArg = "echo \"{ \\\"error\\\": \\\"test\\\", \\\"env\\\": \\\"foo\\\", \\\"args\\\": [\\\"bar\\\"] }\"";
    beforeEach(() => {
        subject = new NodeArguments();
        (subject as any)._helper = "bash";
    });
    describe("load()", () => {
        it("returns the parsed node arguments", async () => {
            const args = await subject.load(process.env, firstArg, secondArg);
            assert.equal("test", args.error);
            assert.equal("foo", args.env);
            assert.deepEqual(["bar"], args.args);
        });
        it("returns the helper's stderr", async () => {
            await helpers.assertThrowsAsync(subject.load(process.env, firstArg,
                "echo test >&2; echo foo; echo bar >&2; echo test2; exit 1"), /Could not parse node arguments/);
            assert.equal("test\nbar\n", subject.lastError());
        });
        it("throws if helper output is invalid", async () => {
            await helpers.assertThrowsAsync(subject.load(process.env, firstArg,
                "echo test"), /Internal error/);
        });
    });
});
