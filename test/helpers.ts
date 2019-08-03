"use strict";
import * as FS from "fs";
import * as Temp from "fs-temp";
import * as Path from "path";

export async function assertThrowsAsync(p, msg: RegExp): Promise<Error> {
    try {
        await p;
    } catch (e) {
        if (!msg.test(e.message)) {
            throw new Error(`expected message "${e.message}" to match "${msg}"`);
        }
        return e;
    }
    throw new Error("expected promise failure but it succeeded");
}

let root;
let createdFS: string[][] = [];

export function init(): string {
    root = Temp.mkdirSync();
    return root;
}
export function fullPath(...path: string[]): string {
    return Path.join(root, ...path);
}
export function mkdir(...path: string[]): string {
    let joinedPath = root;
    path.forEach((element) => {
        joinedPath = Path.join(joinedPath, element);
        if (!FS.existsSync(joinedPath)) {
            FS.mkdirSync(joinedPath);
            createdFS.push([joinedPath, "dir"]);
        }
    });
    return joinedPath;
}
export function rmdir(...path: string[]) {
    const joinedPath = fullPath(...path);
    FS.rmdirSync(joinedPath);
}
export function rmfile(...path: string[]) {
    const joinedPath = fullPath(...path);
    FS.unlinkSync(joinedPath);
}
export function mkfile(data: string, ...path: string[]): string {
    const joinedPath = fullPath(...path);
    FS.writeFileSync(joinedPath, data);
    createdFS.push([joinedPath, "file"]);
    return joinedPath;
}
export function registerDir(...path: string[]) {
    const joinedPath = fullPath(...path);
    createdFS.push([joinedPath, "dir"]);
}
export function registerFile(...path: string[]) {
    const joinedPath = fullPath(...path);
    createdFS.push([joinedPath, "file"]);
}
export function clear() {
    createdFS.reverse().forEach((entry) => {
        try {
            if (entry[1] === "file") {
                FS.unlinkSync(entry[0]);
            } else if (entry[1] === "dir") {
                FS.rmdirSync(entry[0]);
            }
        } catch (error) {
            if (!(error.code === "ENOENT")) {
                throw error;
            }
        }
    });
    createdFS = [];
    FS.rmdirSync(root);
    root = null;
}
