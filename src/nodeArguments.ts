import * as child_process from "child_process";
import * as path from "path";

export interface IArguments {
    error: string;
    args: string[];
    env: any;
}

export class NodeArguments {
    private _cachedArgs: any;
    private _stderr: string;
    private _helper: string[];

    constructor(private _parentEnv: any, launchFile: string, nodeName: string) {
        this._stderr = "";
        this._helper = [
            path.join(__dirname, "..", "..", "helpers", "node_args.py"),
            launchFile,
            nodeName,
        ];
    }

    public stderr(): string {
        return this._stderr;
    }

    public args(): Promise<IArguments> {
        if (!this._cachedArgs) { this.reload(); }
        return this._cachedArgs;
    }

    public reload(): Promise<IArguments> {
        this._stderr = "";
        this._cachedArgs = new Promise((resolve, reject) => {
            let stdout = "";
            const processOptions: child_process.SpawnOptions = {
                env: this._parentEnv,
            };

            const proc = child_process.spawn(this._helper[0], this._helper.slice(1), processOptions);
            proc.stdout.setEncoding("utf8");
            proc.stderr.setEncoding("utf8");
            proc.stderr.on("data", (chunk: string) => this._stderr += chunk);
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
        return this._cachedArgs;
    }
}
