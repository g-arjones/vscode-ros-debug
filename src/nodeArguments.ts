import * as child_process from "child_process";
import * as path from "path";

export interface IArguments {
    error: string | null | undefined;
    args: string[] | null | undefined;
    env: any | null | undefined;
}

export class NodeArguments {
    private _helper: string;
    private _lastError: string;
    constructor() {
        this._lastError = "";
        this._helper = path.join(__dirname, "..", "..", "helpers", "node_args.py");
    }
    public lastError(): string {
        return this._lastError;
    }
    public load(parentEnv: any, launchFile: string, nodeName: string): Promise<IArguments> {
        this._lastError = "";
        return new Promise((resolve, reject) => {
            let stdout = "";
            const processOptions: child_process.SpawnOptions = {
                env: parentEnv,
            };

            const proc = child_process.spawn(this._helper, [launchFile, nodeName], processOptions);
            proc.stdout.setEncoding("utf8");
            proc.stderr.setEncoding("utf8");
            proc.stderr.on("data", (chunk: string) => this._lastError += chunk);
            proc.stdout.on("data", (chunk: string) => stdout += chunk);
            proc.on("exit", (code: number, signal: string) => {
                if (code === 0) {
                    try {
                        resolve(JSON.parse(stdout));
                    } catch (e) {
                        reject(new Error("Internal error"));
                    }
                } else {
                    reject(new Error(`Could not parse node arguments (code ${code})`));
                }
            });
        });
    }
}
