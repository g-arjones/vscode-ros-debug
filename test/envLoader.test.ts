import * as assert from "assert";
import * as ros from "../src/envLoader";
import * as helpers from "./helpers";

const envData = "\
#!/bin/bash\n\
export ROS_ROOT=/opt/ros/kinetic\n\
export ROS_DISTRO=kinetic\n";

const corruptedEnv = "\
#!/bin/bash\n\
_invalid_command ROS_ROOT=/opt/ros/kinetic\n\
_invalid_command ROS_DISTRO=kinetic\n";

const otherEnv = "\
#!/bin/bash\n\
export ROS_ROOT=/opt/ros/melodic\n\
export ROS_DISTRO=melodic\n";

describe("EnvLoader", () => {
    let subject: ros.EnvLoader;
    beforeEach(() => {
        helpers.init();
        helpers.mkdir("devel");

        helpers.mkfile(envData, "devel", "setup.bash");
        subject = new ros.EnvLoader();
    });
    afterEach(() => {
        helpers.clear();
    });
    describe("load()", () => {
        it("returns the parsed env", async () => {
            const env = await subject.load(helpers.fullPath());
            assert.equal("/opt/ros/kinetic", env.ROS_ROOT);
            assert.equal("kinetic", env.ROS_DISTRO);
        });
        it("throws if env file does not exist", async () => {
            helpers.rmfile("devel", "setup.bash");
            await helpers.assertThrowsAsync(subject.load(helpers.fullPath()), /Could not find/);
        });
        it("throws if env file is invalid", async () => {
            helpers.mkfile(corruptedEnv, "devel", "setup.bash");
            await helpers.assertThrowsAsync(subject.load(helpers.fullPath()), new RegExp(""));
        });
    });
});
